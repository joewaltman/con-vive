import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { getTrojanDinner, getTrojanRemainingSeats } from "@/lib/trojan-dinner";

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface InvitationRow {
  id: number;
  bring_item_slot: number | null;
  status: string | null;
  booked_at: string | null;
  stripe_checkout_session_id: string | null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { guestId, token } = body;

    if (!guestId || !token) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get Trojan dinner
    const dinner = await getTrojanDinner();
    if (!dinner) {
      return NextResponse.json(
        { error: "Trojan Alumni dinner not found" },
        { status: 404 }
      );
    }

    // Check seats with race condition protection
    const remainingSeats = await getTrojanRemainingSeats(dinner.id);
    if (remainingSeats <= 0) {
      return NextResponse.json(
        { error: "This dinner is now full. Please join the waitlist." },
        { status: 400 }
      );
    }

    // Get guest info
    const guests = await query<GuestRow>(
      `SELECT id, first_name, last_name, email
       FROM guests
       WHERE id = $1`,
      [parseInt(guestId, 10)]
    );

    if (!guests || guests.length === 0) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    const guest = guests[0];

    // Get invitation
    const invitations = await query<InvitationRow>(
      `SELECT id, bring_item_slot, status, booked_at, stripe_checkout_session_id
       FROM invitations
       WHERE token = $1 AND guest_id = $2`,
      [token, parseInt(guestId, 10)]
    );

    if (!invitations || invitations.length === 0) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    const invitation = invitations[0];

    // Check if already booked
    if (invitation.status === "booked" || invitation.booked_at) {
      return NextResponse.json(
        { error: "You have already booked this dinner", alreadyBooked: true },
        { status: 400 }
      );
    }

    // Check if there's an existing active Stripe session we can reuse
    if (invitation.stripe_checkout_session_id) {
      try {
        const existingSession = await stripe.checkout.sessions.retrieve(
          invitation.stripe_checkout_session_id
        );

        // If session is still open and has at least 60 seconds left, reuse it
        const hasTimeLeft = existingSession.expires_at * 1000 > Date.now() + 60000;
        if (existingSession.status === "open" && hasTimeLeft) {
          console.log(`[Trojan Checkout] Reusing existing session ${existingSession.id}`);
          return NextResponse.json({ url: existingSession.url, reused: true });
        }

        // If session is complete and paid, reconcile
        if (existingSession.status === "complete" && existingSession.payment_status === "paid") {
          console.log(`[Trojan Checkout] Found completed session, reconciling invitation ${invitation.id}`);
          await query(
            `UPDATE invitations
             SET status = 'booked',
                 booked_at = NOW(),
                 response = 'Accepted',
                 confirmed_at = NOW(),
                 stripe_payment_intent_id = $1,
                 payment_intent_id = $1,
                 price_paid_cents = $2,
                 updated_at = NOW()
             WHERE id = $3`,
            [existingSession.payment_intent, existingSession.amount_total, invitation.id]
          );
          return NextResponse.json(
            { error: "You have already booked this dinner", alreadyBooked: true, reconciled: true },
            { status: 400 }
          );
        }
      } catch (error) {
        console.log(`[Trojan Checkout] Could not retrieve existing session: ${error}`);
      }
    }

    // Format dinner date for display
    const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: "UTC",
    });

    const baseUrl = getBaseUrl();

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Trojan Alumni Dinner - ${dinnerDate}`,
              description: "San Diego Trojan Network x Con-Vive Dinner",
            },
            unit_amount: dinner.price_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: guest.email,
      success_url: `${baseUrl}/trojan/thank-you?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
      cancel_url: `${baseUrl}/trojan`,
      metadata: {
        invitation_id: invitation.id.toString(),
        dinner_id: dinner.id.toString(),
        guest_id: guestId.toString(),
        token: token,
        bring_item_slot: invitation.bring_item_slot?.toString() || "",
        signup_source: "trojan-alumni",
      },
    });

    // Update invitation with checkout session ID and append to attempts array
    await query(
      `UPDATE invitations
       SET stripe_checkout_session_id = $1,
           stripe_checkout_attempts = COALESCE(stripe_checkout_attempts, '[]'::jsonb) || $3::jsonb,
           updated_at = NOW()
       WHERE id = $2`,
      [
        session.id,
        invitation.id,
        JSON.stringify({
          session_id: session.id,
          created_at: new Date().toISOString(),
          amount_cents: dinner.price_cents,
        }),
      ]
    );

    console.log(`[Trojan Checkout] Created new session ${session.id} for invitation ${invitation.id}`);
    return NextResponse.json({ url: session.url, created: true });
  } catch (error) {
    console.error("Trojan checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
