import { NextResponse } from 'next/server';
import { searchGuestsForHostLink } from '@/lib/hosts';

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json([]);
    }

    const guests = await searchGuestsForHostLink(query);
    return NextResponse.json(guests);
  } catch (error) {
    console.error('Error searching guests:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to search guests' },
      { status: 500 }
    );
  }
}
