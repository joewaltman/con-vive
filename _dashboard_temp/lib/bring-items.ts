import { pool } from './pool';
import type { BringItem, BringItemClaim } from './types';

function rowToBringItem(row: Record<string, unknown>): BringItem {
  return {
    id: Number(row.id),
    dinnerId: Number(row.dinner_id),
    category: String(row.category),
    description: row.description ? String(row.description) : null,
    slots: Number(row.slots) || 1,
    claims: (row.claims as BringItemClaim[]) || [],
  };
}

export async function fetchBringItemsByDinner(dinnerId: string): Promise<BringItem[]> {
  const result = await pool.query(`
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
  `, [dinnerId]);

  return result.rows.map(rowToBringItem);
}

export async function createBringItem(
  dinnerId: string,
  category: string,
  description: string | null,
  slots: number = 1
): Promise<BringItem> {
  const result = await pool.query(`
    INSERT INTO bring_items (dinner_id, category, description, slots)
    VALUES ($1, $2, $3, $4)
    RETURNING id
  `, [dinnerId, category, description, slots]);

  const id = result.rows[0].id;

  return {
    id,
    dinnerId: Number(dinnerId),
    category,
    description,
    slots,
    claims: [],
  };
}

export async function updateBringItem(
  id: string,
  updates: { category?: string; description?: string | null; slots?: number }
): Promise<BringItem> {
  const setClauses: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  if (updates.category !== undefined) {
    setClauses.push(`category = $${paramIndex}`);
    values.push(updates.category);
    paramIndex++;
  }

  if (updates.description !== undefined) {
    setClauses.push(`description = $${paramIndex}`);
    values.push(updates.description);
    paramIndex++;
  }

  if (updates.slots !== undefined) {
    setClauses.push(`slots = $${paramIndex}`);
    values.push(updates.slots);
    paramIndex++;
  }

  if (setClauses.length === 0) {
    // No changes, fetch and return current state
    const result = await pool.query(`
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
      WHERE bi.id = $1
      GROUP BY bi.id
    `, [id]);

    return rowToBringItem(result.rows[0]);
  }

  setClauses.push(`updated_at = NOW()`);
  values.push(id);

  await pool.query(
    `UPDATE bring_items SET ${setClauses.join(', ')} WHERE id = $${paramIndex}`,
    values
  );

  // Fetch updated item with claims
  const result = await pool.query(`
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
    WHERE bi.id = $1
    GROUP BY bi.id
  `, [id]);

  return rowToBringItem(result.rows[0]);
}

export async function deleteBringItem(id: string): Promise<{ hadClaims: boolean }> {
  // Check if there are any claims
  const claimsResult = await pool.query(
    'SELECT COUNT(*) as count FROM bring_item_claims WHERE bring_item_id = $1',
    [id]
  );

  const hadClaims = Number(claimsResult.rows[0].count) > 0;

  // Delete claims first (if any)
  await pool.query('DELETE FROM bring_item_claims WHERE bring_item_id = $1', [id]);

  // Delete the item
  await pool.query('DELETE FROM bring_items WHERE id = $1', [id]);

  return { hadClaims };
}

export async function createBringItemClaim(
  bringItemId: string,
  guestId: string
): Promise<BringItemClaim> {
  const result = await pool.query(`
    INSERT INTO bring_item_claims (bring_item_id, guest_id)
    VALUES ($1, $2)
    RETURNING id, bring_item_id, guest_id, claimed_at
  `, [bringItemId, guestId]);

  const row = result.rows[0];

  // Get guest name
  const guestResult = await pool.query(
    'SELECT first_name, last_name FROM guests WHERE id = $1',
    [guestId]
  );

  const guest = guestResult.rows[0];

  return {
    id: row.id,
    bringItemId: row.bring_item_id,
    guestId: row.guest_id,
    claimedAt: new Date(row.claimed_at).toISOString(),
    guest: guest ? {
      id: String(guestId),
      fields: {
        'First Name': guest.first_name,
        'Last Name': guest.last_name,
      },
    } : undefined,
  };
}

export async function deleteBringItemClaim(id: string): Promise<void> {
  await pool.query('DELETE FROM bring_item_claims WHERE id = $1', [id]);
}
