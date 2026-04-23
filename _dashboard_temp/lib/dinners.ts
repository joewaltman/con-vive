import { pool } from './pool';
import type { Dinner, DinnerFields, Host, HostFields, BringSlots, DinnerStatus, DinnerType } from './types';

function rowToDinner(row: Record<string, unknown>): Dinner {
  const fields: DinnerFields = {};

  if (row.dinner_name != null) fields['Dinner Name'] = String(row.dinner_name);
  if (row.dinner_date != null) fields['Dinner Date'] = new Date(row.dinner_date as string).toISOString().split('T')[0];
  if (row.start_time != null) fields['Start Time'] = String(row.start_time).slice(0, 5); // HH:MM
  if (row.host_id != null) fields['Host ID'] = Number(row.host_id);
  if (row.host != null) fields['Host'] = String(row.host);
  if (row.location != null) fields['Location'] = String(row.location);
  if (row.guest_count != null) fields['Guest Count'] = Number(row.guest_count);
  if (row.menu != null) fields['Menu'] = String(row.menu);
  if (row.notes != null) fields['Notes'] = String(row.notes);
  if (row.payment_link != null) fields['Payment Link'] = String(row.payment_link);
  if (row.created_at != null) fields['Created Time'] = new Date(row.created_at as string).toISOString();

  // New booking fields
  if (row.total_seats != null) fields['Total Seats'] = Number(row.total_seats);
  if (row.min_per_gender != null) fields['Min Per Gender'] = Number(row.min_per_gender);
  if (row.bring_slots != null) {
    const slots = typeof row.bring_slots === 'string' ? JSON.parse(row.bring_slots) : row.bring_slots;
    fields['Bring Slots'] = slots as BringSlots;
  }
  if (row.price_cents != null) fields['Price Cents'] = Number(row.price_cents);
  if (row.parking_note != null) fields['Parking Note'] = String(row.parking_note);
  if (row.dinner_type != null) fields['Dinner Type'] = row.dinner_type as DinnerType;
  if (row.booking_cutoff_at != null) fields['Booking Cutoff At'] = new Date(row.booking_cutoff_at as string).toISOString();
  if (row.address != null) fields['Address'] = String(row.address);
  if (row.vibe_descriptor != null) fields['Vibe Descriptor'] = String(row.vibe_descriptor);
  if (row.host_guest_id != null) fields['Host Guest ID'] = Number(row.host_guest_id);
  if (row.status != null) fields['Status'] = row.status as DinnerStatus;

  const dinner: Dinner = {
    id: String(row.id),
    fields,
  };

  // Add host info if joined
  if (row.host_first_name != null) {
    const hostFields: HostFields = {
      'First Name': String(row.host_first_name),
      'Last Name': row.host_last_name ? String(row.host_last_name) : undefined,
      'Address': row.host_address ? String(row.host_address) : undefined,
      'City': row.host_city ? String(row.host_city) : undefined,
    };
    dinner.host = {
      id: String(row.host_id),
      fields: hostFields,
    };
  }

  // Add confirmed count if available
  if (row.confirmed_count != null) {
    dinner.confirmedCount = Number(row.confirmed_count);
  }

  return dinner;
}

function rowToHost(row: Record<string, unknown>): Host {
  const fields: HostFields = {};

  if (row.first_name != null) fields['First Name'] = String(row.first_name);
  if (row.last_name != null) fields['Last Name'] = String(row.last_name);
  if (row.address != null) fields['Address'] = String(row.address);
  if (row.city != null) fields['City'] = String(row.city);
  fields['Active'] = row.active !== false;

  return {
    id: String(row.id),
    fields,
  };
}

// Map DinnerFields Title Case keys to snake_case column names
const fieldToColumn: Record<string, string> = {
  'Dinner Name': 'dinner_name',
  'Dinner Date': 'dinner_date',
  'Start Time': 'start_time',
  'Host ID': 'host_id',
  'Host': 'host',
  'Location': 'location',
  'Guest Count': 'guest_count',
  'Menu': 'menu',
  'Notes': 'notes',
  'Payment Link': 'payment_link',
  // New booking fields
  'Total Seats': 'total_seats',
  'Min Per Gender': 'min_per_gender',
  'Bring Slots': 'bring_slots',
  'Price Cents': 'price_cents',
  'Parking Note': 'parking_note',
  'Dinner Type': 'dinner_type',
  'Booking Cutoff At': 'booking_cutoff_at',
  'Address': 'address',
  'Vibe Descriptor': 'vibe_descriptor',
  'Host Guest ID': 'host_guest_id',
  'Status': 'status',
};

const DINNER_QUERY = `
  SELECT d.*,
    h.first_name as host_first_name,
    h.last_name as host_last_name,
    h.address as host_address,
    h.city as host_city,
    (SELECT COUNT(*) FROM attendance a WHERE a.dinner_id = d.id) as confirmed_count
  FROM dinners d
  LEFT JOIN hosts h ON h.id = d.host_id
`;

export async function fetchAllDinners(): Promise<Dinner[]> {
  const result = await pool.query(`${DINNER_QUERY} ORDER BY d.dinner_date DESC`);
  return result.rows.map(rowToDinner);
}

export async function fetchUpcomingDinners(): Promise<Dinner[]> {
  const result = await pool.query(`
    ${DINNER_QUERY}
    WHERE d.dinner_date >= CURRENT_DATE
    ORDER BY d.dinner_date ASC
  `);
  return result.rows.map(rowToDinner);
}

export async function fetchPastDinners(): Promise<Dinner[]> {
  const result = await pool.query(`
    ${DINNER_QUERY}
    WHERE d.dinner_date < CURRENT_DATE
    ORDER BY d.dinner_date DESC
  `);
  return result.rows.map(rowToDinner);
}

export async function fetchDinner(id: string): Promise<Dinner> {
  const result = await pool.query(`${DINNER_QUERY} WHERE d.id = $1`, [id]);

  if (result.rows.length === 0) {
    throw new Error(`Dinner not found: ${id}`);
  }

  const dinner = rowToDinner(result.rows[0]);

  // Fetch invitations
  const invitationsResult = await pool.query(`
    SELECT i.*, g.first_name, g.last_name, g.phone, g.email, g.gender
    FROM invitations i
    JOIN guests g ON g.id = i.guest_id
    WHERE i.dinner_id = $1
    ORDER BY g.last_name, g.first_name
  `, [id]);

  dinner.invitations = invitationsResult.rows.map(row => ({
    id: row.id,
    guestId: row.guest_id,
    dinnerId: row.dinner_id,
    guestName: `${row.first_name || ''} ${row.last_name || ''}`.trim(),
    phone: row.phone,
    email: row.email || null,
    gender: row.gender || null,
    inviteSentDate: row.invite_sent_date ? new Date(row.invite_sent_date).toISOString().split('T')[0] : null,
    response: row.response,
    responseDate: row.response_date ? new Date(row.response_date).toISOString().split('T')[0] : null,
    notes: row.notes,
    // New booking fields
    status: row.status || null,
    token: row.token || null,
    magicToken: row.magic_token || null, // deprecated
    inviteEmailSentAt: row.invite_email_sent_at ? new Date(row.invite_email_sent_at).toISOString() : null,
    checkoutStartedAt: row.checkout_started_at ? new Date(row.checkout_started_at).toISOString() : null,
    confirmedAt: row.confirmed_at ? new Date(row.confirmed_at).toISOString() : null,
    cancelledAt: row.cancelled_at ? new Date(row.cancelled_at).toISOString() : null,
    declinedAt: row.declined_at ? new Date(row.declined_at).toISOString() : null,
    expiredAt: row.expired_at ? new Date(row.expired_at).toISOString() : null,
    paymentIntentId: row.payment_intent_id || null,
    pricePaidCents: row.price_paid_cents != null ? Number(row.price_paid_cents) : null,
    refundedAmountCents: row.refunded_amount_cents != null ? Number(row.refunded_amount_cents) : null,
    bringCategory: row.bring_category || null,
  }));

  // Fetch bring items with claims
  const bringItemsResult = await pool.query(`
    SELECT bi.*,
      json_agg(
        json_build_object(
          'id', bc.id,
          'bringItemId', bc.bring_item_id,
          'guestId', bc.guest_id,
          'claimedAt', bc.claimed_at,
          'guestName', g.first_name || ' ' || g.last_name
        )
      ) FILTER (WHERE bc.id IS NOT NULL) as claims
    FROM bring_items bi
    LEFT JOIN bring_item_claims bc ON bc.bring_item_id = bi.id
    LEFT JOIN guests g ON g.id = bc.guest_id
    WHERE bi.dinner_id = $1
    GROUP BY bi.id
    ORDER BY bi.category, bi.id
  `, [id]);

  dinner.bringItems = bringItemsResult.rows.map(row => ({
    id: row.id,
    dinnerId: row.dinner_id,
    category: row.category,
    description: row.description,
    slots: row.slots || 1,
    claims: row.claims || [],
  }));

  return dinner;
}

export async function createDinner(fields: Partial<DinnerFields>): Promise<Dinner> {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [fieldName, value] of Object.entries(fields)) {
    const column = fieldToColumn[fieldName];
    if (!column || value === undefined) continue;

    columns.push(column);
    placeholders.push(`$${paramIndex}`);
    // Serialize bring_slots as JSON
    if (fieldName === 'Bring Slots' && typeof value === 'object') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
    paramIndex++;
  }

  if (columns.length === 0) {
    throw new Error('No valid fields provided');
  }

  const result = await pool.query(
    `INSERT INTO dinners (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values
  );

  return fetchDinner(String(result.rows[0].id));
}

export async function updateDinner(id: string, fields: Partial<DinnerFields>): Promise<Dinner> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [fieldName, value] of Object.entries(fields)) {
    const column = fieldToColumn[fieldName];
    if (!column) continue;

    setClauses.push(`${column} = $${paramIndex}`);
    // Serialize bring_slots as JSON
    if (fieldName === 'Bring Slots' && typeof value === 'object') {
      values.push(JSON.stringify(value));
    } else {
      values.push(value);
    }
    paramIndex++;
  }

  if (setClauses.length === 0) {
    return fetchDinner(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE dinners SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return fetchDinner(id);
}

export async function fetchActiveHosts(): Promise<Host[]> {
  const result = await pool.query(`
    SELECT id, first_name, last_name, address, city, active
    FROM hosts
    WHERE active = true
    ORDER BY last_name, first_name
  `);
  return result.rows.map(rowToHost);
}

export async function deleteDinner(id: string): Promise<void> {
  // Delete related records first (foreign key constraints)
  // Delete bring item claims for this dinner's bring items
  await pool.query(`
    DELETE FROM bring_item_claims
    WHERE bring_item_id IN (SELECT id FROM bring_items WHERE dinner_id = $1)
  `, [id]);

  // Delete bring items
  await pool.query('DELETE FROM bring_items WHERE dinner_id = $1', [id]);

  // Delete invitations
  await pool.query('DELETE FROM invitations WHERE dinner_id = $1', [id]);

  // Delete attendance records
  await pool.query('DELETE FROM attendance WHERE dinner_id = $1', [id]);

  // Finally delete the dinner
  await pool.query('DELETE FROM dinners WHERE id = $1', [id]);
}

