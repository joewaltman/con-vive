import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { verifyQuoSignature } from "@/lib/quo";

interface QuoWebhookPayload {
  type: string;
  data: {
    object: {
      id: string;
      conversationId: string;
      from: string;
      to: string;
      body: string;
      direction: "incoming" | "outgoing";
      status?: string;
      createdAt: string;
    };
  };
}

interface Guest {
  id: number;
  first_name: string;
  sequence_step: number;
  curious_about: string | null;
}

/**
 * Determines the flagged reason for an inbound message
 */
function determineFlaggedReason(body: string, sequenceStep: number): string | null {
  const lowerBody = body.toLowerCase();

  // Check for URLs or social handles
  const hasUrl = /https?:\/\/|www\./i.test(body);
  const hasSocialHandle = /@[\w]+|instagram\.com|linkedin\.com|twitter\.com|x\.com|tiktok\.com/i.test(body);

  // If at step 1 or 2 and contains URL/social link
  if ((sequenceStep === 1 || sequenceStep === 2) && (hasUrl || hasSocialHandle)) {
    return "social_link_received";
  }

  // Check if conversational or contains question
  const hasQuestion = body.includes("?");
  const conversationalPatterns = [
    "how are you",
    "what do you",
    "can you",
    "could you",
    "would you",
    "tell me",
    "let me know",
    "thanks",
    "thank you",
    "sounds good",
    "great",
    "perfect",
    "yes",
    "no",
    "sure",
    "okay",
    "ok",
  ];
  const isConversational = conversationalPatterns.some((pattern) => lowerBody.includes(pattern));

  if (hasQuestion || isConversational) {
    return "needs_manual_response";
  }

  // If at step 3 or 4 and substantive reply (more than 5 words)
  const wordCount = body.trim().split(/\s+/).length;
  if ((sequenceStep === 3 || sequenceStep === 4) && wordCount > 5) {
    return "unrouted_reply";
  }

  return null;
}

/**
 * Clean phone number to 10-digit format for matching
 */
function cleanPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    return digits.slice(1);
  }
  return digits;
}

export async function POST(request: Request) {
  // Get signature header
  const signature = request.headers.get("openphone-signature");
  if (!signature) {
    console.error("Missing openphone-signature header");
    return NextResponse.json({ error: "Missing signature" }, { status: 401 });
  }

  // Get raw body for signature verification
  const rawBody = await request.text();

  // Verify signature
  if (!verifyQuoSignature(rawBody, signature)) {
    console.error("Invalid webhook signature");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Parse payload after verification
  let payload: QuoWebhookPayload;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    console.error("Failed to parse webhook payload");
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { type, data } = payload;
  const message = data.object;

  console.log(`[Quo Webhook] Received ${type} event`);

  try {
    if (type === "message.received") {
      // Inbound message
      const phoneClean = cleanPhoneNumber(message.from);

      // Find guest by phone
      const guests = await query<Guest>(
        `SELECT id, first_name, sequence_step, curious_about FROM guests WHERE phone_clean = $1`,
        [phoneClean]
      );

      if (!guests || guests.length === 0) {
        console.log(`[Quo Webhook] No guest found for phone ***${phoneClean.slice(-4)}`);
        // Still insert message without guest_id
        await query(
          `INSERT INTO messages (direction, body, quo_message_id, conversation_id, flagged, flagged_reason, message_type)
           VALUES ('inbound', $1, $2, $3, TRUE, 'unknown_sender', 'inbound')`,
          [message.body, message.id, message.conversationId]
        );
        return NextResponse.json({ received: true });
      }

      const guest = guests[0];
      const flaggedReason = determineFlaggedReason(message.body, guest.sequence_step);

      // Insert message
      await query(
        `INSERT INTO messages (guest_id, direction, body, quo_message_id, conversation_id, sequence_step, message_type, flagged, flagged_reason)
         VALUES ($1, 'inbound', $2, $3, $4, $5, 'inbound', TRUE, $6)`,
        [guest.id, message.body, message.id, message.conversationId, guest.sequence_step, flaggedReason]
      );

      // Update guest: set last replied (pulls them out of sequence)
      await query(
        `UPDATE guests SET last_replied_at = NOW(), updated_at = NOW() WHERE id = $1`,
        [guest.id]
      );

      console.log(`[Quo Webhook] Recorded inbound message from ${guest.first_name}, flagged: ${flaggedReason}`);
    } else if (type === "message.delivered") {
      // Outbound message delivered
      // Try to update existing message
      const updated = await query<{ id: number }>(
        `UPDATE messages SET delivered = TRUE WHERE quo_message_id = $1 RETURNING id`,
        [message.id]
      );

      if (!updated || updated.length === 0) {
        // Message doesn't exist, insert as manual message
        const phoneClean = cleanPhoneNumber(message.to);

        // Find guest by phone
        const guests = await query<{ id: number }>(
          `SELECT id FROM guests WHERE phone_clean = $1`,
          [phoneClean]
        );

        const guestId = guests && guests.length > 0 ? guests[0].id : null;

        await query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, conversation_id, message_type, delivered)
           VALUES ($1, 'outbound', $2, $3, $4, 'manual', TRUE)`,
          [guestId, message.body, message.id, message.conversationId]
        );

        console.log(`[Quo Webhook] Inserted manual outbound message`);
      } else {
        console.log(`[Quo Webhook] Marked message ${message.id} as delivered`);
      }
    } else {
      console.log(`[Quo Webhook] Unhandled event type: ${type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Quo Webhook] Error processing webhook:", error);
    // Still return 200 to prevent retries
    return NextResponse.json({ received: true, error: "Processing failed" });
  }
}
