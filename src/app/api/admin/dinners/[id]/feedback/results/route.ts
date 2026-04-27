import { NextResponse } from 'next/server';
import { getFeedbackResults } from '@/lib/admin/feedback';

export async function GET(
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

    const results = await getFeedbackResults(dinnerId);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Error fetching feedback results:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch feedback results' },
      { status: 500 }
    );
  }
}
