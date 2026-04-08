import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sendSms } from "@/lib/quo";

interface Guest {
  id: number;
  phone_clean: string;
}

interface Message {
  id: number;
  guest_id: number;
  direction: string;
  body: string;
  sent_at: string;
  delivered: boolean;
  quo_message_id: string | null;
  message_type: string;
}

export async function POST(request: Request) {
  // Verify dashboard secret
  const secret = request.headers.get("x-dashboard-secret");
  if (!secret || secret !== process.env.DASHBOARD_API_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { guest_id: number; body: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { guest_id, body: messageBody } = body;

  if (!guest_id || !messageBody) {
    return NextResponse.json({ error: "Missing guest_id or body" }, { status: 400 });
  }

  // Get guest phone
  const guests = await query<Guest>(`SELECT id, phone_clean FROM guests WHERE id = $1`, [guest_id]);

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const guest = guests[0];

  if (!guest.phone_clean) {
    return NextResponse.json({ error: "Guest has no phone number" }, { status: 400 });
  }

  try {
    // Send SMS
    const to = `+1${guest.phone_clean}`;
    const { id: quoMessageId } = await sendSms(to, messageBody);

    // Insert message record
    const messages = await query<Message>(
      `INSERT INTO messages (guest_id, direction, body, quo_message_id, message_type, delivered)
       VALUES ($1, 'outbound', $2, $3, 'manual', FALSE)
       RETURNING id, guest_id, direction, body, sent_at, delivered, quo_message_id, message_type`,
      [guest_id, messageBody, quoMessageId]
    );

    if (!messages || messages.length === 0) {
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 });
    }

    console.log(`[Send SMS] Sent message to guest ${guest_id}`);
    return NextResponse.json(messages[0]);
  } catch (error) {
    console.error("[Send SMS] Error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send SMS" },
      { status: 500 }
    );
  }
}
