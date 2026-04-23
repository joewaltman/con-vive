import { NextResponse } from 'next/server';
import { archiveGuest } from '@/lib/attention';

export async function POST(
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

    await archiveGuest(guestId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error archiving guest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to archive guest' },
      { status: 500 }
    );
  }
}
