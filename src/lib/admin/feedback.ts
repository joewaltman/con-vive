import { pool } from '@/lib/db';
import { generateFeedbackToken } from '@/lib/tokens';
import type { FeedbackToken, FeedbackResults, FeedbackAggregate } from '@/lib/types/admin';

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  phone_clean: string | null;
}

interface TokenRow {
  id: number;
  token: string;
  guest_id: number;
  first_name: string;
  last_name: string;
  phone_clean: string | null;
  completed_at: string | null;
}

interface AggregateRow {
  ratee_guest_id: number;
  first_name: string;
  last_name: string;
  yes_count: string;
  no_count: string;
  not_sure_count: string;
}

interface CommentRow {
  comment: string;
}

/**
 * Get confirmed attendees for a dinner (for feedback generation)
 * Checks both new booking system (status='booked') and legacy (response='Accepted')
 */
async function getConfirmedAttendees(dinnerId: number): Promise<GuestRow[]> {
  const result = await pool.query<GuestRow>(`
    SELECT DISTINCT g.id, g.first_name, g.last_name, g.phone_clean
    FROM invitations i
    JOIN guests g ON g.id = i.guest_id
    LEFT JOIN attendance a ON a.invitation_id = i.id
    WHERE i.dinner_id = $1
      AND (i.status = 'booked' OR i.response = 'Accepted')
      AND (a.no_show IS NULL OR a.no_show = FALSE)
  `, [dinnerId]);

  return result.rows;
}

/**
 * Generate feedback tokens for all confirmed attendees of a dinner.
 * Idempotent: existing tokens are preserved.
 */
export async function generateFeedbackTokens(dinnerId: number): Promise<FeedbackToken[]> {
  const attendees = await getConfirmedAttendees(dinnerId);

  if (attendees.length === 0) {
    return [];
  }

  // 14-day expiry
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 14);

  // Generate tokens for each attendee (skip if already exists)
  for (const attendee of attendees) {
    const token = generateFeedbackToken();

    await pool.query(`
      INSERT INTO feedback_tokens (dinner_id, guest_id, token, expires_at)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (dinner_id, guest_id) DO NOTHING
    `, [dinnerId, attendee.id, token, expiresAt]);
  }

  // Return all tokens for this dinner
  return getFeedbackTokensForDinner(dinnerId);
}

/**
 * Get all feedback tokens for a dinner with guest info and completion status.
 */
export async function getFeedbackTokensForDinner(dinnerId: number): Promise<FeedbackToken[]> {
  const result = await pool.query<TokenRow>(`
    SELECT ft.id, ft.token, ft.guest_id, ft.completed_at,
           g.first_name, g.last_name, g.phone_clean
    FROM feedback_tokens ft
    JOIN guests g ON g.id = ft.guest_id
    WHERE ft.dinner_id = $1
    ORDER BY g.first_name, g.last_name
  `, [dinnerId]);

  return result.rows.map(row => ({
    id: row.id,
    token: row.token,
    guest: {
      id: row.guest_id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone_clean,
    },
    completedAt: row.completed_at,
  }));
}

/**
 * Get anonymized feedback results for a dinner.
 * Returns aggregate counts per ratee and a list of anonymized comments.
 */
export async function getFeedbackResults(dinnerId: number): Promise<FeedbackResults> {
  // Get total and completed token counts
  const tokenCountResult = await pool.query<{ total: string; completed: string }>(`
    SELECT
      COUNT(*) as total,
      COUNT(completed_at) as completed
    FROM feedback_tokens
    WHERE dinner_id = $1
  `, [dinnerId]);

  const totalTokens = parseInt(tokenCountResult.rows[0]?.total || '0');
  const completedCount = parseInt(tokenCountResult.rows[0]?.completed || '0');

  // Get aggregate ratings per ratee
  const aggregatesResult = await pool.query<AggregateRow>(`
    SELECT
      fr.ratee_guest_id,
      g.first_name,
      g.last_name,
      COUNT(*) FILTER (WHERE fr.rating = 'yes') as yes_count,
      COUNT(*) FILTER (WHERE fr.rating = 'no') as no_count,
      COUNT(*) FILTER (WHERE fr.rating = 'not_sure') as not_sure_count
    FROM feedback_responses fr
    JOIN guests g ON g.id = fr.ratee_guest_id
    WHERE fr.dinner_id = $1
    GROUP BY fr.ratee_guest_id, g.first_name, g.last_name
    ORDER BY g.first_name, g.last_name
  `, [dinnerId]);

  const aggregates: FeedbackAggregate[] = aggregatesResult.rows.map(row => ({
    guestId: row.ratee_guest_id,
    firstName: row.first_name,
    lastInitial: row.last_name ? row.last_name[0] + '.' : '',
    yesCount: parseInt(row.yes_count),
    noCount: parseInt(row.no_count),
    notSureCount: parseInt(row.not_sure_count),
  }));

  // Get anonymized comments (no rater attribution)
  const commentsResult = await pool.query<CommentRow>(`
    SELECT comment
    FROM feedback_comments
    WHERE dinner_id = $1
    ORDER BY created_at
  `, [dinnerId]);

  const comments = commentsResult.rows.map(row => row.comment);

  return {
    totalTokens,
    completedCount,
    aggregates,
    comments,
  };
}
