import { NextResponse } from 'next/server';
import { fetchAllDinners, fetchUpcomingDinners, fetchPastDinners, createDinner, fetchActiveHosts } from '@/lib/dinners';

export async function GET(request: Request) {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter');
    const includeHosts = searchParams.get('includeHosts') === 'true';

    let dinners;
    switch (filter) {
      case 'upcoming':
        dinners = await fetchUpcomingDinners();
        break;
      case 'past':
        dinners = await fetchPastDinners();
        break;
      default:
        dinners = await fetchAllDinners();
    }

    const response: { dinners: typeof dinners; hosts?: Awaited<ReturnType<typeof fetchActiveHosts>> } = { dinners };

    if (includeHosts) {
      response.hosts = await fetchActiveHosts();
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching dinners:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dinners' },
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

    if (!fields['Dinner Date']) {
      return NextResponse.json(
        { error: 'Dinner Date is required' },
        { status: 400 }
      );
    }

    const dinner = await createDinner(fields);
    return NextResponse.json(dinner, { status: 201 });
  } catch (error) {
    console.error('Error creating dinner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create dinner' },
      { status: 500 }
    );
  }
}
