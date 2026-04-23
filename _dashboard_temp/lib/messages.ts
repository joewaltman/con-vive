import { pool } from './pool';
import type { Message } from './types';

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
