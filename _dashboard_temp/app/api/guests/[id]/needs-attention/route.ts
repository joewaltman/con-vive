import { NextResponse } from 'next/server';
import { checkGuestNeedsAttention } from '@/lib/attention';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestId = parseInt(id, 10);

    if (isNaN(guestId)) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const needsAttention = await checkGuestNeedsAttention(guestId);

    return NextResponse.json({ needsAttention });
  } catch (error) {
    console.error('Error checking attention status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check attention status' },
      { status: 500 }
    );
  }
}
