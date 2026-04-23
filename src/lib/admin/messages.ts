import { pool } from '@/lib/db';
import { sendSms } from '@/lib/quo';
import type { Message } from '@/lib/types/admin';

function rowToMessage(row: Record<string, unknown>): Message {
  return {
    id: Number(row.id),
    guest_id: Number(row.guest_id),
    direction: row.direction as 'inbound' | 'outbound',
    body: String(row.body ?? ''),
    sent_at: row.sent_at ? new Date(row.sent_at as string).toISOString() : new Date().toISOString(),
    delivered: Boolean(row.delivered),
    message_type: row.message_type ? String(row.message_type) : null,
    sequence_step: row.sequence_step != null ? Number(row.sequence_step) : null,
    flagged: Boolean(row.flagged),
    flagged_reason: row.flagged_reason ? String(row.flagged_reason) : null,
  };
}

export async function fetchMessagesByGuestId(guestId: number): Promise<Message[]> {
  const result = await pool.query(
    `SELECT * FROM messages WHERE guest_id = $1 ORDER BY sent_at ASC`,
    [guestId]
  );
  return result.rows.map(rowToMessage);
}

export async function createMessage(
  guestId: number,
  body: string,
  direction: 'inbound' | 'outbound' = 'outbound'
): Promise<Message> {
  const result = await pool.query(
    `INSERT INTO messages (guest_id, direction, body, sent_at, delivered, message_type)
     VALUES ($1, $2, $3, NOW(), false, 'manual')
     RETURNING *`,
    [guestId, direction, body]
  );
  return rowToMessage(result.rows[0]);
}

export async function markMessageDelivered(messageId: number): Promise<void> {
  await pool.query(
    `UPDATE messages SET delivered = true WHERE id = $1`,
    [messageId]
  );
}

/**
 * Send an SMS message to a guest and mark as delivered
 * @param guestId Guest ID to send to
 * @param body Message content
 * @returns The message record (with delivered=true if SMS succeeded)
 */
export async function sendMessageToGuest(guestId: number, body: string): Promise<Message> {
  // Create the message record first
  const message = await createMessage(guestId, body);

  // Look up guest phone number
  const guestResult = await pool.query(
    `SELECT phone FROM guests WHERE id = $1`,
    [guestId]
  );

  if (guestResult.rows.length === 0) {
    console.error(`Guest ${guestId} not found`);
    return message;
  }

  const phone = guestResult.rows[0].phone;
  if (!phone) {
    console.error(`Guest ${guestId} has no phone number`);
    return message;
  }

  // Send via Quo (OpenPhone)
  try {
    await sendSms(phone, body);
    await markMessageDelivered(message.id);
    message.delivered = true;
  } catch (error) {
    console.error(`Failed to send SMS to guest ${guestId}:`, error);
  }

  return message;
}
