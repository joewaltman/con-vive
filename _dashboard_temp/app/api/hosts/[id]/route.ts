import { NextResponse } from 'next/server';
import { fetchHost, updateHost } from '@/lib/hosts';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const host = await fetchHost(id);
    return NextResponse.json(host);
  } catch (error) {
    console.error('Error fetching host:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch host' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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

    const updatedHost = await updateHost(id, fields);
    return NextResponse.json(updatedHost);
  } catch (error) {
    console.error('Error updating host:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update host' },
      { status: 500 }
    );
  }
}
