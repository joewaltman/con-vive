import { NextResponse } from 'next/server';
import { fetchAttentionCount } from '@/lib/attention';

export async function GET() {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const count = await fetchAttentionCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error('Error fetching attention count:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch attention count' },
      { status: 500 }
    );
  }
}
