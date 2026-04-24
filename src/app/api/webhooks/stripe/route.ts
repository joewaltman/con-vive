import { NextResponse } from "next/server";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
} from "@/lib/calendar";
import BookingConfirmationEmail from "@/emails/booking-confirmation";
import HostGuestConfirmedEmail from "@/emails/host-guest-confirmed";
import Stripe from "stripe";

interface DinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: string;
  dinner_time: string | null;
  address: string | null;
  google_maps_link: string | null;
  parking_instructions: string | null;
  what_to_bring: string | null;
  host_name: string | null;
  host: string;
  bring_items: Array<{ slot: number; name: string }> | null;
  host_guest_id: number | null;
  host_first_name: string | null;
  host_email: string | null;
}

interface GuestRow {
  id: number;
  first_name: string;
  email: string;
}

interface InvitationRow {
  bring_item_slot: number | null;
}

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

        // Check if this is a dinner booking (has invitation_id in metadata)
        const invitationId = session.metadata?.invitation_id;
        if (invitationId) {
          await handleBookingCheckoutCompleted(session);
        } else {
          // Existing reservation flow - send to Make.com
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

async function handleBookingCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const invitationId = session.metadata?.invitation_id;
  const guestId = session.metadata?.guest_id;
  const dinnerId = session.metadata?.dinner_id;
  const token = session.metadata?.token;

  if (!invitationId || !guestId || !dinnerId) {
    console.error("Missing booking metadata in checkout session:", session.id);
    return;
  }

  // Update invitation to booked status
  // Also set response/confirmed_at for dashboard compatibility
  const updateResult = await query(
    `UPDATE invitations
     SET status = 'booked',
         booked_at = NOW(),
         response = 'Accepted',
         confirmed_at = NOW(),
         stripe_payment_intent_id = $1,
         payment_intent_id = $1,
         price_paid_cents = $3,
         updated_at = NOW()
     WHERE id = $2`,
    [session.payment_intent, invitationId, session.amount_total]
  );

  if (!updateResult) {
    console.error("Failed to update invitation:", invitationId);
    return;
  }

  console.log("Booking confirmed for invitation:", invitationId);

  // Get dinner details for confirmation email
  const dinners = await query<DinnerRow>(
    `SELECT d.id, d.dinner_name, d.dinner_date, d.dinner_time, d.address, d.google_maps_link,
            d.parking_instructions, d.what_to_bring, d.host_name, d.host, d.bring_items,
            d.host_guest_id, h.first_name as host_first_name, h.email as host_email
     FROM dinners d
     LEFT JOIN guests h ON h.id = d.host_guest_id
     WHERE d.id = $1`,
    [dinnerId]
  );

  const guests = await query<GuestRow>(
    `SELECT id, first_name, email FROM guests WHERE id = $1`,
    [guestId]
  );

  const invitations = await query<InvitationRow>(
    `SELECT bring_item_slot FROM invitations WHERE id = $1`,
    [invitationId]
  );

  if (!dinners?.length || !guests?.length) {
    console.error("Failed to fetch dinner or guest for confirmation email");
    return;
  }

  const dinner = dinners[0];
  const guest = guests[0];
  const invitation = invitations?.[0];

  // Format date and time
  const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
  const dinnerTime = dinner.dinner_time || "7:00 PM";
  const hostName = dinner.host_first_name || dinner.host_name || dinner.host || "Your Host";

  // Get bring item assignment if any
  let bringItemAssignment: string | null = null;
  if (invitation?.bring_item_slot && Array.isArray(dinner.bring_items)) {
    const item = dinner.bring_items.find(
      (i) => i.slot === invitation.bring_item_slot
    );
    bringItemAssignment = item?.name || null;
  }

  const baseUrl = getBaseUrl();
  const icsDownloadUrl = `${baseUrl}/api/calendar/${token}`;
  const bringItemsUrl = `${baseUrl}/bring/${token}`;

  // Generate calendar URLs
  // Convert date to string if it's a Date object
  const dinnerDateStr = typeof dinner.dinner_date === 'string'
    ? dinner.dinner_date
    : new Date(dinner.dinner_date).toISOString().split('T')[0];

  const calendarDinner = {
    name: dinner.dinner_name,
    date: dinnerDateStr,
    time: dinnerTime,
    hostName,
    address: dinner.address || "",
  };

  const googleCalendarUrl = generateGoogleCalendarUrl(calendarDinner);
  const outlookCalendarUrl = generateOutlookUrl(calendarDinner);

  // Send confirmation email
  try {
    const emailResult = await sendEmail({
      to: guest.email,
      subject: `You're in! ${hostName}'s Con-Vive Dinner on ${dinnerDate}`,
      react: BookingConfirmationEmail({
        guestName: guest.first_name,
        dinnerDate,
        dinnerTime,
        hostName,
        address: dinner.address || "Address will be sent separately",
        googleMapsLink: dinner.google_maps_link,
        parkingInstructions: dinner.parking_instructions,
        whatToBring: dinner.what_to_bring,
        bringItemAssignment,
        bringItemsUrl,
        googleCalendarUrl,
        outlookCalendarUrl,
        icsDownloadUrl,
      }),
    });

    if (emailResult.success) {
      // Update confirmation_email_sent_at
      await query(
        `UPDATE invitations SET confirmation_email_sent_at = NOW() WHERE id = $1`,
        [invitationId]
      );
      console.log("Confirmation email sent to:", guest.email);
    } else {
      console.error("Failed to send confirmation email:", emailResult.error);
    }
  } catch (emailError) {
    console.error("Error sending confirmation email:", emailError);
  }

  // Send host notification email
  if (dinner.host_email) {
    try {
      // Get confirmed count and total seats
      const statsResult = await query<{ confirmed_count: number; total_seats: number }>(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'booked') as confirmed_count,
          COALESCE(d.total_seats, 8) as total_seats
         FROM invitations i
         JOIN dinners d ON d.id = i.dinner_id
         WHERE i.dinner_id = $1
         GROUP BY d.total_seats`,
        [dinnerId]
      );

      const confirmedCount = statsResult?.[0]?.confirmed_count || 1;
      const totalSeats = statsResult?.[0]?.total_seats || 8;

      const hostEmailResult = await sendEmail({
        to: dinner.host_email,
        subject: `${guest.first_name} confirmed for your dinner on ${dinnerDate}`,
        react: HostGuestConfirmedEmail({
          hostName,
          guestName: guest.first_name,
          guestEmail: guest.email,
          dinnerDate,
          dinnerTime,
          confirmedCount: Number(confirmedCount),
          totalSeats: Number(totalSeats),
        }),
      });

      if (hostEmailResult.success) {
        console.log("Host notification sent to:", dinner.host_email);
      } else {
        console.error("Failed to send host notification:", hostEmailResult.error);
      }
    } catch (hostEmailError) {
      console.error("Error sending host notification:", hostEmailError);
    }
  }
}
