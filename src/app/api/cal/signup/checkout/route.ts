import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { getCalDinner, getRemainingSeats } from "@/lib/cal-dinner";

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface InvitationRow {
  id: number;
  bring_item_slot: number | null;
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

    // Get Cal dinner
    const dinner = await getCalDinner();
    if (!dinner) {
      return NextResponse.json(
        { error: "Cal Alumni dinner not found" },
        { status: 404 }
      );
    }

    // Check seats with race condition protection
    const remainingSeats = await getRemainingSeats(dinner.id);
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
      `SELECT id, bring_item_slot
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
              name: `Cal Alumni Dinner - ${dinnerDate}`,
              description: "San Diego Cal Alumni Club x Con-Vive Dinner",
            },
            unit_amount: dinner.price_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: guest.email,
      success_url: `${baseUrl}/cal/thank-you?session_id={CHECKOUT_SESSION_ID}&token=${token}`,
      cancel_url: `${baseUrl}/cal`,
      metadata: {
        invitation_id: invitation.id.toString(),
        dinner_id: dinner.id.toString(),
        guest_id: guestId.toString(),
        token: token,
        bring_item_slot: invitation.bring_item_slot?.toString() || "",
        signup_source: "cal-alumni",
      },
    });

    // Update invitation with checkout session ID
    await query(
      `UPDATE invitations
       SET stripe_checkout_session_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [session.id, invitation.id]
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Cal checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
