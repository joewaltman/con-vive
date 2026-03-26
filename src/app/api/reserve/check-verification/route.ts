import { NextResponse } from "next/server";
import { stripe, RESERVATION_PRICE, getBaseUrl } from "@/lib/stripe";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Missing session ID" },
        { status: 400 }
      );
    }

    const verificationSession = await stripe.identity.verificationSessions.retrieve(sessionId);
    const status = verificationSession.status;

    if (status === "verified") {
      const baseUrl = getBaseUrl();
      const email = verificationSession.metadata?.email || "";
      const name = verificationSession.metadata?.name || "";

      const checkoutSession = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_creation: "always",
        billing_address_collection: "required",
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: { name: "Con-Vive Dinner Reservation" },
              unit_amount: RESERVATION_PRICE,
            },
            quantity: 1,
          },
        ],
        metadata: {
          verification_session_id: sessionId,
          guest_email: email,
          guest_name: name,
        },
        success_url: `${baseUrl}/reserve/confirmed?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${baseUrl}/reserve/cancelled`,
      });

      return NextResponse.json({ checkoutUrl: checkoutSession.url });
    }

    if (status === "processing") {
      return NextResponse.json({ status: "processing" });
    }

    if (status === "requires_input") {
      return NextResponse.json({
        status: "requires_input",
        continueUrl: verificationSession.url,
      });
    }

    // canceled or other failure
    return NextResponse.json(
      { error: "Verification was not successful" },
      { status: 400 }
    );
  } catch (error) {
    console.error("Check verification error:", error);
    return NextResponse.json(
      { error: "Failed to check verification status" },
      { status: 500 }
    );
  }
}
