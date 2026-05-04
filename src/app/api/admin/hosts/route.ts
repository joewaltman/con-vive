import { NextResponse } from 'next/server';
import { fetchAllHosts, createHost } from '@/lib/admin/hosts';
import { pool } from '@/lib/db';

export async function GET() {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const hosts = await fetchAllHosts();
    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hosts' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { fields } = body;

    if (!fields || typeof fields !== 'object') {
      return NextResponse.json(
        { error: 'Fields object is required' },
        { status: 400 }
      );
    }

    if (!fields['First Name'] || !fields['Last Name']) {
      return NextResponse.json(
        { error: 'First Name and Last Name are required' },
        { status: 400 }
      );
    }

    // Require guest_id for new hosts
    if (!fields['Guest ID']) {
      return NextResponse.json(
        { error: 'Guest ID is required. Hosts must be linked to an existing guest.' },
        { status: 400 }
      );
    }

    // Verify guest exists
    const guestResult = await pool.query(
      'SELECT id FROM guests WHERE id = $1',
      [fields['Guest ID']]
    );
    if (guestResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Verify no duplicate host for this guest
    const existingHost = await pool.query(
      'SELECT id FROM hosts WHERE guest_id = $1',
      [fields['Guest ID']]
    );
    if (existingHost.rows.length > 0) {
      return NextResponse.json(
        { error: 'This guest is already a host' },
        { status: 409 }
      );
    }

    const host = await createHost(fields);
    return NextResponse.json(host, { status: 201 });
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create host' },
      { status: 500 }
    );
  }
}
