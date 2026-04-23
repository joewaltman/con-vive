import { NextResponse } from "next/server";
import { stripe, getBaseUrl } from "@/lib/stripe";
import { query } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import {
  generateGoogleCalendarUrl,
  generateOutlookUrl,
} from "@/lib/calendar";
import BookingConfirmationEmail from "@/emails/booking-confirmation";
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
  const updateResult = await query(
    `UPDATE invitations
     SET status = 'booked',
         booked_at = NOW(),
         stripe_payment_intent_id = $1,
         updated_at = NOW()
     WHERE id = $2`,
    [session.payment_intent, invitationId]
  );

  if (!updateResult) {
    console.error("Failed to update invitation:", invitationId);
    return;
  }

  console.log("Booking confirmed for invitation:", invitationId);

  // Get dinner details for confirmation email
  const dinners = await query<DinnerRow>(
    `SELECT id, dinner_name, dinner_date, dinner_time, address, google_maps_link,
            parking_instructions, what_to_bring, host_name, host, bring_items
     FROM dinners
     WHERE id = $1`,
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
  const hostName = dinner.host_name || dinner.host;

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

  // Generate calendar URLs
  const calendarDinner = {
    name: dinner.dinner_name,
    date: dinner.dinner_date,
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
}
