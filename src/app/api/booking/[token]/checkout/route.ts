import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe, getBaseUrl } from "@/lib/stripe";
import {
  checkGenderConstraint,
  getGenderCountsFromBookings,
} from "@/lib/booking-constraints";

interface InvitationRow {
  id: number;
  guest_id: number;
  dinner_id: number;
  status: string;
  booked_at: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
}

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  gender: string | null;
}

interface DinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: string;
  price_cents: number;
  total_seats: number;
}

interface BookedGuestRow {
  gender: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Parse optional bring_item_slot from request body
  let bringItemSlot: number | null = null;
  try {
    const body = await request.json();
    if (body.bring_item_slot !== undefined) {
      bringItemSlot = body.bring_item_slot;
    }
  } catch {
    // No body or invalid JSON is fine
  }

  // Find invitation by token
  const invitations = await query<InvitationRow>(
    `SELECT id, guest_id, dinner_id, status, booked_at,
            stripe_checkout_session_id, stripe_payment_intent_id
     FROM invitations
     WHERE token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Check if already booked (check both status and booked_at for safety)
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
        console.log(`[Checkout] Reusing existing session ${existingSession.id} for invitation ${invitation.id}`);
        return NextResponse.json({ url: existingSession.url, reused: true });
      }

      // If session is complete and paid, the webhook may have been missed - reconcile
      if (existingSession.status === "complete" && existingSession.payment_status === "paid") {
        console.log(`[Checkout] Found completed session ${existingSession.id}, reconciling invitation ${invitation.id}`);
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
      // Session retrieval failed (expired, invalid, etc.) - proceed to create new one
      console.log(`[Checkout] Could not retrieve existing session, will create new: ${error}`);
    }
  }

  // Get guest info
  const guests = await query<GuestRow>(
    `SELECT id, first_name, last_name, email, gender
     FROM guests
     WHERE id = $1`,
    [invitation.guest_id]
  );

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const guest = guests[0];

  // Get dinner info
  const dinners = await query<DinnerRow>(
    `SELECT id, dinner_name, dinner_date,
            COALESCE(price_cents, 4000) as price_cents,
            COALESCE(total_seats, 8) as total_seats
     FROM dinners
     WHERE id = $1`,
    [invitation.dinner_id]
  );

  if (!dinners || dinners.length === 0) {
    return NextResponse.json({ error: "Dinner not found" }, { status: 404 });
  }

  const dinner = dinners[0];

  // Check gender constraint
  const bookedGuests = await query<BookedGuestRow>(
    `SELECT g.gender
     FROM invitations i
     JOIN guests g ON i.guest_id = g.id
     WHERE i.dinner_id = $1
       AND i.status = 'booked'
       AND i.id != $2`,
    [invitation.dinner_id, invitation.id]
  );

  const genderCounts = getGenderCountsFromBookings(bookedGuests || []);
  const constraint = checkGenderConstraint(genderCounts, guest.gender, dinner.total_seats);

  if (!constraint.allowed) {
    return NextResponse.json(
      { error: constraint.reason || "Cannot book at this time" },
      { status: 400 }
    );
  }

  // Format dinner date for display
  const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const baseUrl = getBaseUrl();

  try {
    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Con-Vive Dinner - ${dinnerDate}`,
              description: `Dinner at ${dinner.dinner_name}`,
            },
            unit_amount: dinner.price_cents,
          },
          quantity: 1,
        },
      ],
      customer_email: guest.email,
      success_url: `${baseUrl}/d/${token}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/d/${token}`,
      metadata: {
        invitation_id: invitation.id.toString(),
        dinner_id: invitation.dinner_id.toString(),
        guest_id: invitation.guest_id.toString(),
        token: token,
        bring_item_slot: bringItemSlot?.toString() || "",
      },
    });

    // Update invitation with checkout session ID and append to attempts array
    await query(
      `UPDATE invitations
       SET stripe_checkout_session_id = $1,
           bring_item_slot = $2,
           stripe_checkout_attempts = COALESCE(stripe_checkout_attempts, '[]'::jsonb) || $4::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [
        session.id,
        bringItemSlot,
        invitation.id,
        JSON.stringify({
          session_id: session.id,
          created_at: new Date().toISOString(),
          amount_cents: dinner.price_cents,
        }),
      ]
    );

    console.log(`[Checkout] Created new session ${session.id} for invitation ${invitation.id}`);
    return NextResponse.json({ url: session.url, created: true });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
