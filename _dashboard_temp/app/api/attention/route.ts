import { NextResponse } from 'next/server';
import { fetchAttentionQueue } from '@/lib/attention';

export async function GET() {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const queue = await fetchAttentionQueue();
    return NextResponse.json(queue);
  } catch (error) {
    console.error('Error fetching attention queue:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attention queue' },
      { status: 500 }
    );
  }
}
