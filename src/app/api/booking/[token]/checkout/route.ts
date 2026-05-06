import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { stripe, getBaseUrl } from "@/lib/stripe";
import {
  checkGenderConstraint,
  checkCoupleGenderConstraint,
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
  dinner_type: string | null;
}

interface CompanionInfo {
  is_couple_booking: boolean;
  companion_first_name?: string;
  companion_last_name?: string;
  companion_email?: string;
  companion_gender?: string;
}

interface ExistingGuestRow {
  id: number;
  first_name: string;
  last_name: string;
  gender: string | null;
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

  // Parse optional fields from request body
  let bringItemSlot: number | null = null;
  let companionInfo: CompanionInfo = { is_couple_booking: false };
  try {
    const body = await request.json();
    if (body.bring_item_slot !== undefined) {
      bringItemSlot = body.bring_item_slot;
    }
    if (body.is_couple_booking) {
      companionInfo = {
        is_couple_booking: true,
        companion_first_name: body.companion_first_name || undefined,
        companion_last_name: body.companion_last_name || undefined,
        companion_email: body.companion_email || undefined,
        companion_gender: body.companion_gender || undefined,
      };
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
            COALESCE(total_seats, 8) as total_seats,
            dinner_type
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

  // Validate couple booking request
  const isCoupleBooking = companionInfo.is_couple_booking;
  let companionGuestId: number | null = null;
  let effectiveCompanionGender = companionInfo.companion_gender || null;

  if (isCoupleBooking) {
    // Check if dinner allows couples
    if (dinner.dinner_type === 'singles_only') {
      return NextResponse.json(
        { error: "This dinner is for singles only. Couple bookings are not allowed." },
        { status: 400 }
      );
    }

    // If companion email provided, check for existing guest
    if (companionInfo.companion_email) {
      const existingCompanion = await query<ExistingGuestRow>(
        `SELECT id, first_name, last_name, gender FROM guests WHERE email = $1`,
        [companionInfo.companion_email.toLowerCase()]
      );
      if (existingCompanion?.length) {
        companionGuestId = existingCompanion[0].id;
        // Use their gender from profile if not provided
        if (!effectiveCompanionGender && existingCompanion[0].gender) {
          effectiveCompanionGender = existingCompanion[0].gender;
        }
      }
    }

    // Check couple gender constraint (validates 2 seats available and both genders)
    const coupleConstraint = checkCoupleGenderConstraint(
      genderCounts,
      guest.gender,
      effectiveCompanionGender,
      dinner.total_seats
    );

    if (!coupleConstraint.allowed) {
      return NextResponse.json(
        { error: coupleConstraint.reason || "Cannot complete couple booking at this time" },
        { status: 400 }
      );
    }
  } else {
    // Standard single booking constraint check
    const constraint = checkGenderConstraint(genderCounts, guest.gender, dinner.total_seats);

    if (!constraint.allowed) {
      return NextResponse.json(
        { error: constraint.reason || "Cannot book at this time" },
        { status: 400 }
      );
    }
  }

  // Calculate price (doubled for couple booking)
  const totalPrice = isCoupleBooking ? dinner.price_cents * 2 : dinner.price_cents;

  // Format dinner date for display
  const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });

  const baseUrl = getBaseUrl();

  try {
    // Build product description based on booking type
    const productName = isCoupleBooking
      ? `Con-Vive Dinner (2 guests) - ${dinnerDate}`
      : `Con-Vive Dinner - ${dinnerDate}`;
    const productDescription = isCoupleBooking
      ? `Dinner for two at ${dinner.dinner_name}`
      : `Dinner at ${dinner.dinner_name}`;

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: productName,
              description: productDescription,
            },
            unit_amount: totalPrice,
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
        is_couple_booking: isCoupleBooking ? "true" : "false",
      },
    });

    // Update invitation with checkout session ID, companion info, and append to attempts array
    await query(
      `UPDATE invitations
       SET stripe_checkout_session_id = $1,
           bring_item_slot = $2,
           is_couple_booking = $4,
           companion_first_name = $5,
           companion_last_name = $6,
           companion_email = $7,
           companion_gender = $8,
           companion_guest_id = $9,
           stripe_checkout_attempts = COALESCE(stripe_checkout_attempts, '[]'::jsonb) || $10::jsonb,
           updated_at = NOW()
       WHERE id = $3`,
      [
        session.id,
        bringItemSlot,
        invitation.id,
        isCoupleBooking,
        companionInfo.companion_first_name || null,
        companionInfo.companion_last_name || null,
        companionInfo.companion_email || null,
        effectiveCompanionGender || null,
        companionGuestId,
        JSON.stringify({
          session_id: session.id,
          created_at: new Date().toISOString(),
          amount_cents: totalPrice,
          is_couple_booking: isCoupleBooking,
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
