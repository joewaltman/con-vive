import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

interface GuestSearchResult {
  id: number;
  firstName: string;
  lastName: string;
  email: string | null;
  gender: string | null;
  priority: number | null;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const dinnerId = searchParams.get('dinnerId');

  if (!query || query.length < 2) {
    return NextResponse.json({ guests: [] });
  }

  try {
    // Search by first name, last name, or email
    // Exclude guests already invited to this dinner (if dinnerId provided)
    const searchPattern = `%${query}%`;

    let sql = `
      SELECT
        g.id,
        g.first_name as "firstName",
        g.last_name as "lastName",
        g.email,
        g.gender,
        g.priority
      FROM guests g
      WHERE (
        g.first_name ILIKE $1
        OR g.last_name ILIKE $1
        OR CONCAT(g.first_name, ' ', g.last_name) ILIKE $1
        OR g.email ILIKE $1
      )
    `;

    const params: (string | number)[] = [searchPattern];

    // Exclude already invited guests for this dinner
    if (dinnerId) {
      sql += `
        AND g.id NOT IN (
          SELECT i.guest_id FROM invitations i
          WHERE i.dinner_id = $2
            AND i.status != 'declined'
        )
      `;
      params.push(parseInt(dinnerId, 10));
    }

    sql += `
      ORDER BY g.priority ASC NULLS LAST, g.first_name ASC
      LIMIT 20
    `;

    const result = await pool.query<GuestSearchResult>(sql, params);

    return NextResponse.json({ guests: result.rows });
  } catch (error) {
    console.error('Guest search error:', error);
    return NextResponse.json(
      { error: 'Failed to search guests' },
      { status: 500 }
    );
  }
}
