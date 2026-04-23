import { NextResponse } from 'next/server';
import { fetchBringItemsByDinner, createBringItem } from '@/lib/bring-items';

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

    const bringItems = await fetchBringItemsByDinner(id);
    return NextResponse.json(bringItems);
  } catch (error) {
    console.error('Error fetching bring items:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch bring items' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: dinnerId } = await params;

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { category, description, slots } = body;

    if (!category) {
      return NextResponse.json(
        { error: 'category is required' },
        { status: 400 }
      );
    }

    const bringItem = await createBringItem(dinnerId, category, description || null, slots || 1);
    return NextResponse.json(bringItem, { status: 201 });
  } catch (error) {
    console.error('Error creating bring item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create bring item' },
      { status: 500 }
    );
  }
}
