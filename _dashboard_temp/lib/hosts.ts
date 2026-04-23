import { pool } from './pool';
import type { Host, HostFields, Guest, GuestFields } from './types';

function rowToHost(row: Record<string, unknown>): Host {
  const fields: HostFields = {};

  if (row.first_name != null) fields['First Name'] = String(row.first_name);
  if (row.last_name != null) fields['Last Name'] = String(row.last_name);
  if (row.phone != null) fields['Phone'] = String(row.phone);
  if (row.email != null) fields['Email'] = String(row.email);
  if (row.address != null) fields['Address'] = String(row.address);
  if (row.city != null) fields['City'] = String(row.city);
  if (row.notes != null) fields['Notes'] = String(row.notes);
  if (row.max_guests != null) fields['Max Guests'] = Number(row.max_guests);
  if (row.guest_id != null) fields['Guest ID'] = Number(row.guest_id);
  fields['Active'] = row.active !== false;
  if (row.created_at != null) fields['Created Time'] = new Date(row.created_at as string).toISOString();

  const host: Host = {
    id: String(row.id),
    fields,
  };

  if (row.dinner_count != null) {
    host.dinnerCount = Number(row.dinner_count);
  }

  return host;
}

function rowToGuest(row: Record<string, unknown>): Guest {
  const fields: GuestFields = {};

  if (row.first_name != null) fields['First Name'] = String(row.first_name);
  if (row.last_name != null) fields['Last Name'] = String(row.last_name);
  if (row.email != null) fields['Email'] = String(row.email);
  if (row.phone != null) fields['Phone'] = String(row.phone);

  return {
    id: String(row.id),
    fields,
  };
}

// Map HostFields Title Case keys to snake_case column names
const fieldToColumn: Record<string, string> = {
  'First Name': 'first_name',
  'Last Name': 'last_name',
  'Phone': 'phone',
  'Email': 'email',
  'Address': 'address',
  'City': 'city',
  'Notes': 'notes',
  'Max Guests': 'max_guests',
  'Guest ID': 'guest_id',
  'Active': 'active',
};

export async function fetchAllHosts(): Promise<Host[]> {
  const result = await pool.query(`
    SELECT h.*, COUNT(d.id) as dinner_count
    FROM hosts h
    LEFT JOIN dinners d ON d.host_id = h.id
    GROUP BY h.id
    ORDER BY h.last_name, h.first_name
  `);
  return result.rows.map(rowToHost);
}

export async function fetchHost(id: string): Promise<Host> {
  const result = await pool.query(`
    SELECT h.*, COUNT(d.id) as dinner_count
    FROM hosts h
    LEFT JOIN dinners d ON d.host_id = h.id
    WHERE h.id = $1
    GROUP BY h.id
  `, [id]);

  if (result.rows.length === 0) {
    throw new Error(`Host not found: ${id}`);
  }

  const host = rowToHost(result.rows[0]);

  // Fetch linked guest if exists
  if (host.fields['Guest ID']) {
    const guestResult = await pool.query(
      'SELECT id, first_name, last_name, email, phone FROM guests WHERE id = $1',
      [host.fields['Guest ID']]
    );
    if (guestResult.rows.length > 0) {
      host.linkedGuest = rowToGuest(guestResult.rows[0]);
    }
  }

  return host;
}

export async function createHost(fields: Partial<HostFields>): Promise<Host> {
  const columns: string[] = [];
  const placeholders: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  for (const [fieldName, value] of Object.entries(fields)) {
    const column = fieldToColumn[fieldName];
    if (!column || value === undefined) continue;

    columns.push(column);
    placeholders.push(`$${paramIndex}`);
    values.push(value);
    paramIndex++;
  }

  if (columns.length === 0) {
    throw new Error('No valid fields provided');
  }

  const result = await pool.query(
    `INSERT INTO hosts (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values
  );

  return fetchHost(String(result.rows[0].id));
}

export async function updateHost(id: string, fields: Partial<HostFields>): Promise<Host> {
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
    return fetchHost(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE hosts SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return fetchHost(id);
}

export async function searchGuestsForHostLink(query: string): Promise<Guest[]> {
  const searchTerm = `%${query}%`;
  const result = await pool.query(`
    SELECT id, first_name, last_name, email, phone
    FROM guests
    WHERE first_name ILIKE $1 OR last_name ILIKE $1 OR email ILIKE $1
    ORDER BY last_name, first_name
    LIMIT 10
  `, [searchTerm]);

  return result.rows.map(rowToGuest);
}

export async function fetchHostDinners(hostId: string): Promise<{ id: string; name: string; date: string }[]> {
  const result = await pool.query(`
    SELECT id, dinner_name, dinner_date
    FROM dinners
    WHERE host_id = $1
    ORDER BY dinner_date DESC
  `, [hostId]);

  return result.rows.map(row => ({
    id: String(row.id),
    name: row.dinner_name || '',
    date: row.dinner_date ? new Date(row.dinner_date).toISOString().split('T')[0] : '',
  }));
}
