import { NextResponse } from 'next/server';
import { fetchAllHosts, createHost } from '@/lib/hosts';

export async function GET() {
  try {
    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const hosts = await fetchAllHosts();
    return NextResponse.json(hosts);
  } catch (error) {
    console.error('Error fetching hosts:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch hosts' },
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

    if (!fields['First Name'] || !fields['Last Name']) {
      return NextResponse.json(
        { error: 'First Name and Last Name are required' },
        { status: 400 }
      );
    }

    const host = await createHost(fields);
    return NextResponse.json(host, { status: 201 });
  } catch (error) {
    console.error('Error creating host:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create host' },
      { status: 500 }
    );
  }
}
