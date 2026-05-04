import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    // Fetch vetted guests who are not already hosts
    const result = await pool.query(`
      WITH host_guest_ids AS (
        SELECT guest_id FROM hosts WHERE guest_id IS NOT NULL
      )
      SELECT
        g.id,
        g.first_name,
        g.last_name,
        g.email,
        g.phone_clean,
        g.zip_code,
        g.priority,
        g.hosting_interest,
        (SELECT COUNT(*) FROM attendance a WHERE a.guest_id = g.id) as attendance_count
      FROM guests g
      WHERE g.priority IS NOT NULL
        AND g.id NOT IN (SELECT guest_id FROM host_guest_ids)
      ORDER BY
        CASE WHEN (SELECT COUNT(*) FROM attendance a WHERE a.guest_id = g.id) > 0 THEN 0 ELSE 1 END,
        CASE g.hosting_interest WHEN 'Yes' THEN 1 WHEN 'Maybe' THEN 2 ELSE 3 END,
        g.first_name
    `);

    const candidates = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name || '',
      lastName: row.last_name || '',
      email: row.email || null,
      phone: row.phone_clean || null,
      zipCode: row.zip_code || null,
      priority: row.priority || null,
      hostingInterest: row.hosting_interest || null,
      attendanceCount: parseInt(row.attendance_count) || 0,
    }));

    return NextResponse.json(candidates);
  } catch (error) {
    console.error('Error fetching guest candidates for host:', error);
    return NextResponse.json(
      { error: 'Failed to fetch guest candidates' },
      { status: 500 }
    );
  }
}
