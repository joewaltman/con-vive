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
    `SELECT id, guest_id, dinner_id, status
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

  // Check if already booked
  if (invitation.status === "booked") {
    return NextResponse.json(
      { error: "You have already booked this dinner" },
      { status: 400 }
    );
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
    `SELECT id, dinner_name, dinner_date, COALESCE(price_cents, 7500) as price_cents
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
  const constraint = checkGenderConstraint(genderCounts, guest.gender);

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

    // Update invitation with checkout session ID
    await query(
      `UPDATE invitations
       SET stripe_checkout_session_id = $1,
           bring_item_slot = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [session.id, bringItemSlot, invitation.id]
    );

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Failed to create checkout session:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
