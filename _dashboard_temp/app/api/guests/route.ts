import { NextResponse } from 'next/server';
import { fetchAllGuests } from '@/lib/db';

export async function GET() {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_PUBLIC_URL not configured' },
        { status: 500 }
      );
    }

    const guests = await fetchAllGuests();
    return NextResponse.json({ guests });
  } catch (error) {
    console.error('Error fetching guests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch guests' },
      { status: 500 }
    );
  }
}
