import { pool } from './pool';
import type { ShortlistGuest, DinnerType } from './types';
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
  const { dinnerId, dinnerDate, dinnerDayOfWeek, dinnerType, excludeDietary = [] } = options;

  // Build dietary exclusion clause
  let dietaryClause = '';
  const params: unknown[] = [dinnerId, dinnerDate, dinnerDayOfWeek];

  if (excludeDietary.length > 0) {
    const placeholders = excludeDietary.map((_, i) => `$${params.length + i + 1}`).join(', ');
    dietaryClause = `AND NOT (g.dietary_restrictions && ARRAY[${placeholders}]::text[])`;
    params.push(...excludeDietary);
  }

  // Build dinner type clause
  const dinnerTypeClause = dinnerType === 'singles_only'
    ? `AND g.solo_or_couple = 'Solo'`
    : '';

  const query = `
    WITH recent_attendance AS (
      SELECT DISTINCT a.guest_id
      FROM attendance a
      JOIN dinners d ON d.id = a.dinner_id
      WHERE d.dinner_date >= ($2::date - INTERVAL '14 days')
        AND d.dinner_date < $2::date
    ),
    already_invited AS (
      SELECT guest_id
      FROM invitations
      WHERE dinner_id = $1
        AND (status IS NULL OR status != 'declined')
        AND (response IS NULL OR response != 'Declined')
    )
    SELECT
      g.id,
      g.first_name,
      g.last_name,
      g.gender,
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
      ) as last_invited_date
    FROM guests g
    WHERE g.priority IS NOT NULL
      AND g.priority < 3
      AND g.available_days @> ARRAY[$3]::text[]
      AND g.id NOT IN (SELECT guest_id FROM recent_attendance)
      AND g.id NOT IN (SELECT guest_id FROM already_invited)
      ${dinnerTypeClause}
      ${dietaryClause}
    ORDER BY g.priority ASC, spark_score DESC NULLS LAST
  `;

  const result = await pool.query(query, params);

  return result.rows.map(row => ({
    id: row.id,
    firstName: row.first_name || '',
    lastName: row.last_name || '',
    gender: row.gender || null,
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
