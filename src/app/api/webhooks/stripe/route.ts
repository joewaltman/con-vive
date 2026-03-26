import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not set");
    return NextResponse.json(
      { error: "Webhook secret not configured" },
      { status: 500 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    const payload = await request.text();
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook signature verification failed:", message);
    return NextResponse.json(
      { error: `Webhook signature verification failed: ${message}` },
      { status: 400 }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("Checkout session completed:", session.id);

        const makeWebhookUrl = process.env.MAKE_WEBHOOK_URL;
        if (makeWebhookUrl) {
          const payload = {
            event: "reservation_confirmed",
            guest_email: session.metadata?.guest_email || session.customer_details?.email || "",
            guest_name: session.metadata?.guest_name || session.customer_details?.name || "",
            verification_session_id: session.metadata?.verification_session_id || "",
            checkout_session_id: session.id,
            amount_paid: session.amount_total,
            currency: session.currency,
            timestamp: new Date().toISOString(),
          };

          try {
            const res = await fetch(makeWebhookUrl, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

            if (!res.ok) {
              console.error("Make.com webhook failed:", await res.text());
            } else {
              console.log("Make.com webhook sent successfully");
            }
          } catch (webhookError) {
            console.error("Failed to send Make.com webhook:", webhookError);
          }
        }
        break;
      }

      case "identity.verification_session.verified":
      case "identity.verification_session.requires_input":
      case "identity.verification_session.canceled": {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        console.log(`Verification session ${event.type}:`, verificationSession.id, verificationSession.status);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook handler error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}
