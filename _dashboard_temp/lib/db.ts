import { pool } from './pool';
import type { Guest, GuestFields } from './types';

const GUEST_QUERY = `
  SELECT g.*, t.summarized_transcript
  FROM guests g
  LEFT JOIN transcripts t ON t.guest_id = g.id
`;

function rowToGuest(row: Record<string, unknown>): Guest {
  const fields: GuestFields = {};

  if (row.first_name != null) fields['First Name'] = String(row.first_name);
  if (row.last_name != null) fields['Last Name'] = String(row.last_name);
  if (row.email != null) fields['Email'] = String(row.email);
  if (row.phone != null) fields['Phone'] = String(row.phone);
  if (row.gender != null) fields['Gender'] = String(row.gender);
  if (row.zip_code != null) fields['Zip Code'] = String(row.zip_code);
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
  if (row.summarized_transcript != null) fields['Summarized Transcript'] = String(row.summarized_transcript);
  if (row.created_at != null) fields['Created Time'] = new Date(row.created_at as string).toISOString();
  if (row.routing_status != null) fields['Routing Status'] = String(row.routing_status);
  if (row.last_replied_at != null) fields['Last Replied At'] = new Date(row.last_replied_at as string).toISOString();
  if (row.last_message_sent_at != null) fields['Last Message Sent At'] = new Date(row.last_message_sent_at as string).toISOString();
  if (row.sequence_completed != null) fields['Sequence Completed'] = Boolean(row.sequence_completed);
  if (row.social_summary != null) fields['Social Summary'] = row.social_summary as GuestFields['Social Summary'];
  if (row.attention_archived_at != null) fields['Attention Archived At'] = new Date(row.attention_archived_at as string).toISOString();

  return {
    id: String(row.id),
    fields,
    createdTime: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
  };
}

// Map GuestFields Title Case keys back to snake_case column names
const fieldToColumn: Record<string, string> = {
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Email': 'email',
  'Phone': 'phone',
  'Gender': 'gender',
  'Zip Code': 'zip_code',
  'Age Range': 'age_range',
  'Funnel Stage': 'funnel_stage',
  'Curiosity Score': 'curiosity_score',
  'Spark Score': 'spark_score',
  'Call Complete': 'call_complete',
  'Call Date': 'call_date',
  'Priority': 'priority',
  'What Do You Do': 'what_do_you_do',
  'About': 'about',
  'OneThing': 'one_thing',
  'Curious About': 'curious_about',
  'Surprising Knowledge': 'surprising_knowledge',
  'Solo or Couple': 'solo_or_couple',
  'Available Days': 'available_days',
  'Dietary Restrictions': 'dietary_restrictions',
  'Dietary Notes': 'dietary_notes',
  'Hosting Interest': 'hosting_interest',
  'Routing Status': 'routing_status',
  'Last Replied At': 'last_replied_at',
  'Last Message Sent At': 'last_message_sent_at',
  'Sequence Completed': 'sequence_completed',
  'Social Summary': 'social_summary',
  'Attention Archived At': 'attention_archived_at',
};

export async function fetchAllGuests(): Promise<Guest[]> {
  const result = await pool.query(`${GUEST_QUERY} ORDER BY g.created_at DESC`);
  return result.rows.map(rowToGuest);
}

export async function fetchGuest(id: string): Promise<Guest> {
  const result = await pool.query(`${GUEST_QUERY} WHERE g.id = $1`, [id]);
  if (result.rows.length === 0) {
    throw new Error(`Guest not found: ${id}`);
  }
  return rowToGuest(result.rows[0]);
}

export async function updateGuest(id: string, fields: Partial<GuestFields>): Promise<Guest> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [fieldName, value] of Object.entries(fields)) {
    const column = fieldToColumn[fieldName];
    if (!column) continue;

    setClauses.push(`${column} = $${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return fetchGuest(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE guests SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values,
  );

  return fetchGuest(id);
}
