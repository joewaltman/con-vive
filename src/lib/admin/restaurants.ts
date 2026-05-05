import { pool } from '@/lib/db';
import type { Restaurant, RestaurantFields } from '@/lib/types/admin';

function rowToRestaurant(row: Record<string, unknown>): Restaurant {
  const fields: RestaurantFields = {};

  if (row.name != null) fields['Name'] = String(row.name);
  if (row.address != null) fields['Address'] = String(row.address);
  if (row.city != null) fields['City'] = String(row.city);
  if (row.phone != null) fields['Phone'] = String(row.phone);
  if (row.website != null) fields['Website'] = String(row.website);
  if (row.notes != null) fields['Notes'] = String(row.notes);
  fields['Active'] = row.active !== false;
  if (row.created_at != null) fields['Created Time'] = new Date(row.created_at as string).toISOString();

  const restaurant: Restaurant = {
    id: String(row.id),
    fields,
  };

  if (row.dinner_count != null) {
    restaurant.dinnerCount = Number(row.dinner_count);
  }

  return restaurant;
}

// Map RestaurantFields Title Case keys to snake_case column names
const fieldToColumn: Record<string, string> = {
  'Name': 'name',
  'Address': 'address',
  'City': 'city',
  'Phone': 'phone',
  'Website': 'website',
  'Notes': 'notes',
  'Active': 'active',
};

export async function fetchAllRestaurants(): Promise<Restaurant[]> {
  const result = await pool.query(`
    SELECT r.*, COUNT(d.id) as dinner_count
    FROM restaurants r
    LEFT JOIN dinners d ON d.restaurant_id = r.id
    GROUP BY r.id
    ORDER BY r.name
  `);
  return result.rows.map(rowToRestaurant);
}

export async function fetchRestaurant(id: string): Promise<Restaurant> {
  const result = await pool.query(`
    SELECT r.*, COUNT(d.id) as dinner_count
    FROM restaurants r
    LEFT JOIN dinners d ON d.restaurant_id = r.id
    WHERE r.id = $1
    GROUP BY r.id
  `, [id]);

  if (result.rows.length === 0) {
    throw new Error(`Restaurant not found: ${id}`);
  }

  return rowToRestaurant(result.rows[0]);
}

export async function createRestaurant(fields: Partial<RestaurantFields>): Promise<Restaurant> {
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
    `INSERT INTO restaurants (${columns.join(', ')}) VALUES (${placeholders.join(', ')}) RETURNING id`,
    values
  );

  return fetchRestaurant(String(result.rows[0].id));
}

export async function updateRestaurant(id: string, fields: Partial<RestaurantFields>): Promise<Restaurant> {
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
    return fetchRestaurant(id);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE restaurants SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  return fetchRestaurant(id);
}

export async function fetchActiveRestaurants(): Promise<Restaurant[]> {
  const result = await pool.query(`
    SELECT r.*, COUNT(d.id) as dinner_count
    FROM restaurants r
    LEFT JOIN dinners d ON d.restaurant_id = r.id
    WHERE r.active = true
    GROUP BY r.id
    ORDER BY r.name
  `);
  return result.rows.map(rowToRestaurant);
}

export async function fetchRestaurantDinners(restaurantId: string): Promise<{ id: string; name: string; date: string }[]> {
  const result = await pool.query(`
    SELECT id, dinner_name, dinner_date
    FROM dinners
    WHERE restaurant_id = $1
    ORDER BY dinner_date DESC
  `, [restaurantId]);

  return result.rows.map(row => ({
    id: String(row.id),
    name: row.dinner_name || '',
    date: row.dinner_date ? new Date(row.dinner_date).toISOString().split('T')[0] : '',
  }));
}
