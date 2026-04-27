import { NextResponse } from 'next/server';
import { generateFeedbackTokens } from '@/lib/admin/feedback';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dinnerId = parseInt(id);

    if (isNaN(dinnerId)) {
      return NextResponse.json(
        { error: 'Invalid dinner ID' },
        { status: 400 }
      );
    }

    const tokens = await generateFeedbackTokens(dinnerId);

    return NextResponse.json({ tokens });
  } catch (error) {
    console.error('Error generating feedback tokens:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate feedback tokens' },
      { status: 500 }
    );
  }
}
