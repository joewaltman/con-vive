import { NextResponse } from 'next/server';
import { pool } from '@/lib/pool';

export async function GET() {
  try {
    // Fetch from hosts table (manually created hosts)
    const result = await pool.query(`
      SELECT
        h.id,
        h.first_name,
        h.last_name,
        h.address,
        h.city,
        h.active,
        (SELECT COUNT(*) FROM dinners d WHERE d.host_id = h.id) as dinner_count
      FROM hosts h
      WHERE h.active = true
      ORDER BY h.last_name, h.first_name
    `);

    const candidates = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      address: row.address || null,
      city: row.city || null,
      dinnerCount: parseInt(row.dinner_count) || 0,
    }));

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching host candidates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch host candidates' },
      { status: 500 }
    );
  }
}
