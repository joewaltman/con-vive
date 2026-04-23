import { pool } from './pool';
import type { Guest, GuestFields, AttentionQueueItem, AttentionQueueData } from './types';

function rowToGuest(row: Record<string, unknown>): Guest {
  const fields: GuestFields = {};

  if (row.first_name != null) fields['First Name'] = String(row.first_name);
  if (row.last_name != null) fields['Last Name'] = String(row.last_name);
  if (row.email != null) fields['Email'] = String(row.email);
  if (row.phone != null) fields['Phone'] = String(row.phone);
  if (row.age_range != null) fields['Age Range'] = String(row.age_range);
  if (row.funnel_stage != null) fields['Funnel Stage'] = String(row.funnel_stage);
  if (row.curiosity_score != null) fields['Curiosity Score'] = Number(row.curiosity_score);
  if (row.spark_score != null) fields['Spark Score'] = Number(row.spark_score);
  if (row.call_complete != null) fields['Call Complete'] = Boolean(row.call_complete);
  if (row.call_date != null) fields['Call Date'] = String(row.call_date);
  if (row.priority != null) fields['Priority'] = String(row.priority);
  if (row.what_do_you_do != null) fields['What Do You Do'] = String(row.what_do_you_do);
  if (row.about != null) fields['About'] = String(row.about);
  if (row.one_thing != null) fields['OneThing'] = String(row.one_thing);
  if (row.curious_about != null) fields['Curious About'] = String(row.curious_about);
  if (row.surprising_knowledge != null) fields['Surprising Knowledge'] = String(row.surprising_knowledge);
  if (row.solo_or_couple != null) fields['Solo or Couple'] = String(row.solo_or_couple);
  if (row.available_days != null) fields['Available Days'] = row.available_days as string[];
  if (row.dietary_restrictions != null) fields['Dietary Restrictions'] = row.dietary_restrictions as string[];
  if (row.dietary_notes != null) fields['Dietary Notes'] = String(row.dietary_notes);
  if (row.hosting_interest != null) fields['Hosting Interest'] = String(row.hosting_interest);
  if (row.created_at != null) fields['Created Time'] = new Date(row.created_at as string).toISOString();
  if (row.routing_status != null) fields['Routing Status'] = String(row.routing_status);
  if (row.last_replied_at != null) fields['Last Replied At'] = new Date(row.last_replied_at as string).toISOString();
  if (row.last_message_sent_at != null) fields['Last Message Sent At'] = new Date(row.last_message_sent_at as string).toISOString();
  if (row.sequence_completed != null) fields['Sequence Completed'] = Boolean(row.sequence_completed);
  if (row.sequence_paused != null) fields['Sequence Paused'] = Boolean(row.sequence_paused);
  if (row.sequence_step != null) fields['Sequence Step'] = Number(row.sequence_step);
  if (row.attention_archived_at != null) fields['Attention Archived At'] = new Date(row.attention_archived_at as string).toISOString();
  if (row.social_summary != null) fields['Social Summary'] = row.social_summary as GuestFields['Social Summary'];
  if (row.m2_variant != null) fields['M2 Variant'] = String(row.m2_variant);
  if (row.m3_variant != null) fields['M3 Variant'] = String(row.m3_variant);

  return {
    id: String(row.id),
    fields,
    createdTime: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
  };
}

// Fetch guests that need attention: priority IS NULL + have inbound messages + not archived (or new message since archive)
async function fetchNeedsAttention(): Promise<AttentionQueueItem[]> {
  const result = await pool.query(`
    SELECT g.id, g.first_name, g.last_name, g.curious_about, g.surprising_knowledge,
           g.one_thing, g.about, g.what_do_you_do, g.social_summary, g.age_range,
           g.created_at, g.attention_archived_at, g.priority,
           g.m2_variant, g.m3_variant, g.sequence_step,
           MAX(m.sent_at) AS last_inbound_at,
           (SELECT body FROM messages WHERE guest_id = g.id AND direction = 'inbound' ORDER BY sent_at DESC LIMIT 1) AS last_inbound_message
    FROM guests g
    JOIN messages m ON m.guest_id = g.id AND m.direction = 'inbound'
    WHERE g.priority IS NULL
      AND (g.attention_archived_at IS NULL OR m.sent_at > g.attention_archived_at)
    GROUP BY g.id
    ORDER BY MAX(m.sent_at) DESC
  `);

  return result.rows.map(row => ({
    guest: rowToGuest(row),
    lastActivityAt: row.last_inbound_at
      ? new Date(row.last_inbound_at as string).toISOString()
      : new Date().toISOString(),
    lastInboundAt: row.last_inbound_at
      ? new Date(row.last_inbound_at as string).toISOString()
      : undefined,
    lastInboundMessage: row.last_inbound_message
      ? String(row.last_inbound_message)
      : undefined,
  }));
}

export async function fetchAttentionQueue(): Promise<AttentionQueueData> {
  const items = await fetchNeedsAttention();

  return {
    items,
    totalCount: items.length,
  };
}

export async function fetchAttentionCount(): Promise<number> {
  const result = await pool.query(`
    SELECT COUNT(DISTINCT g.id) AS total
    FROM guests g
    JOIN messages m ON m.guest_id = g.id AND m.direction = 'inbound'
    WHERE g.priority IS NULL
      AND (g.attention_archived_at IS NULL OR m.sent_at > g.attention_archived_at)
  `);

  return Number(result.rows[0]?.total ?? 0);
}

// Check if a specific guest currently needs attention
export async function checkGuestNeedsAttention(guestId: number): Promise<boolean> {
  const result = await pool.query(`
    SELECT EXISTS(
      SELECT 1 FROM guests g
      JOIN messages m ON m.guest_id = g.id AND m.direction = 'inbound'
      WHERE g.id = $1
        AND g.priority IS NULL
        AND (g.attention_archived_at IS NULL OR m.sent_at > g.attention_archived_at)
    ) AS needs_attention
  `, [guestId]);

  return Boolean(result.rows[0]?.needs_attention);
}

// Archive a guest from the attention queue (can reappear if they send a new message)
// This is COSMETIC only - just hides from queue, does NOT affect the onboarding sequence
export async function archiveGuest(guestId: number): Promise<void> {
  console.log('[archiveGuest] Starting for guest:', guestId);
  console.log('[archiveGuest] ONLY setting attention_archived_at - NOT touching sequence fields');
  await pool.query(
    `UPDATE guests SET attention_archived_at = NOW(), updated_at = NOW() WHERE id = $1`,
    [guestId]
  );
  console.log('[archiveGuest] Complete');
}

// Approve a guest: set priority = 1 and STOP the onboarding sequence
// Guest has been manually handled, no more automated messages needed
export async function approveGuest(guestId: number): Promise<void> {
  console.log('[approveGuest] Starting for guest:', guestId);
  await pool.query(
    `UPDATE guests SET
      priority = 1,
      sequence_completed = true,
      updated_at = NOW()
    WHERE id = $1`,
    [guestId]
  );
  console.log('[approveGuest] Complete');
}

// Reject a guest: set priority = 3 and STOP the onboarding sequence
// Guest should not receive any more automated messages
export async function rejectGuest(guestId: number): Promise<void> {
  console.log('[rejectGuest] Starting for guest:', guestId);
  await pool.query(
    `UPDATE guests SET
      priority = 3,
      sequence_completed = true,
      updated_at = NOW()
    WHERE id = $1`,
    [guestId]
  );
  console.log('[rejectGuest] Complete');
}

// Fetch guest profile data for AI message generation
export async function fetchGuestProfileForMessage(guestId: number): Promise<Record<string, unknown> | null> {
  const result = await pool.query(`
    SELECT first_name, last_name, age_range, what_do_you_do, about, one_thing,
           curious_about, surprising_knowledge, social_summary
    FROM guests WHERE id = $1
  `, [guestId]);

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  const profile: Record<string, unknown> = {};

  if (row.first_name) profile.firstName = row.first_name;
  if (row.last_name) profile.lastName = row.last_name;
  if (row.age_range) profile.ageRange = row.age_range;
  if (row.what_do_you_do) profile.whatDoYouDo = row.what_do_you_do;
  if (row.about) profile.about = row.about;
  if (row.one_thing) profile.oneThing = row.one_thing;
  if (row.curious_about) profile.curiousAbout = row.curious_about;
  if (row.surprising_knowledge) profile.surprisingKnowledge = row.surprising_knowledge;
  if (row.social_summary) profile.socialSummary = row.social_summary;

  return profile;
}
