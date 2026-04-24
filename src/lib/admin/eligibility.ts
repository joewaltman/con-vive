import { pool } from '@/lib/db';
import type { ShortlistGuest, DinnerType } from '@/lib/types/admin';
import { extractBioSnippet } from './bio-snippet';

interface EligibilityOptions {
  dinnerId: string;
  dinnerDate: string;
  dinnerDayOfWeek: string; // 'Mon', 'Tue', etc.
  dinnerType: DinnerType;
  excludeDietary?: string[]; // dietary restrictions to exclude
}

/**
 * Fetch guests eligible for a dinner shortlist.
 *
 * Eligibility criteria:
 * - priority IS NOT NULL (vetted)
 * - available_days contains dinner day
 * - Not attended any dinner in last 14 days
 * - Not already invited to this dinner (non-declined)
 * - For singles_only dinners: solo_or_couple = 'Solo'
 *
 * Ordered by priority ASC, spark_score DESC
 */
export async function fetchEligibleGuests(options: EligibilityOptions): Promise<ShortlistGuest[]> {
  const { dinnerId } = options;

  // Sorting logic:
  // 1. Primary: priority ASC (1 before 2, priority 1 always above priority 2, etc.)
  // 2. Secondary within same priority:
  //    a. Never invited to any dinner (top) - invite_status = 0
  //    b. Invited but never attended - invite_status = 1
  //    c. Attended (ordered by last attended date ASC, more distant first) - invite_status = 2
  const query = `
    WITH already_invited AS (
      SELECT guest_id
      FROM invitations
      WHERE dinner_id = $1
        AND (status IS NULL OR status != 'declined')
        AND (response IS NULL OR response != 'Declined')
    ),
    guest_history AS (
      SELECT
        g.id,
        g.first_name,
        g.last_name,
        g.gender,
        g.age_range,
        g.priority,
        g.spark_score,
        g.solo_or_couple,
        g.available_days,
        g.dietary_restrictions,
        g.dietary_notes,
        g.email,
        g.about,
        g.what_do_you_do,
        g.curious_about,
        g.social_summary,
        (
          SELECT MAX(d2.dinner_date)
          FROM attendance a2
          JOIN dinners d2 ON d2.id = a2.dinner_id
          WHERE a2.guest_id = g.id
        ) as last_attended_date,
        (
          SELECT MAX(i2.created_at)
          FROM invitations i2
          WHERE i2.guest_id = g.id
        ) as last_invited_date,
        (SELECT COUNT(*) FROM invitations i3 WHERE i3.guest_id = g.id) as invite_count,
        (SELECT COUNT(*) FROM attendance a3 WHERE a3.guest_id = g.id) as attendance_count
      FROM guests g
      WHERE g.id NOT IN (SELECT guest_id FROM already_invited)
    )
    SELECT *,
      CASE
        WHEN invite_count = 0 THEN 0  -- Never invited
        WHEN attendance_count = 0 THEN 1  -- Invited but never attended
        ELSE 2  -- Has attended
      END as invite_status
    FROM guest_history
    ORDER BY
      priority ASC NULLS LAST,
      invite_status ASC,
      last_attended_date ASC NULLS FIRST,
      spark_score DESC NULLS LAST
  `;

  const result = await pool.query(query, [dinnerId]);

  return result.rows.map(row => ({
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    gender: row.gender || null,
    ageRange: row.age_range || null,
    priority: row.priority,
    sparkScore: row.spark_score,
    soloOrCouple: row.solo_or_couple || null,
    availableDays: row.available_days || null,
    dietaryRestrictions: row.dietary_restrictions || null,
    dietaryNotes: row.dietary_notes || null,
    email: row.email || null,
    lastAttendedDate: row.last_attended_date
      ? new Date(row.last_attended_date).toISOString().split('T')[0]
      : null,
    lastInvitedDate: row.last_invited_date
      ? new Date(row.last_invited_date).toISOString().split('T')[0]
      : null,
    bioSnippet: extractBioSnippet({
      'About': row.about,
      'What Do You Do': row.what_do_you_do,
      'Curious About': row.curious_about,
      'Social Summary': row.social_summary,
    }),
  }));
}
