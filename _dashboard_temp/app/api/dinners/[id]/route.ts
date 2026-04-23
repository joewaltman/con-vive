import { NextResponse } from 'next/server';
import { fetchDinner, updateDinner, deleteDinner } from '@/lib/dinners';

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

    const dinner = await fetchDinner(id);
    return NextResponse.json(dinner);
  } catch (error) {
    console.error('Error fetching dinner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch dinner' },
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

    const updatedDinner = await updateDinner(id, fields);
    return NextResponse.json(updatedDinner);
  } catch (error) {
    console.error('Error updating dinner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update dinner' },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    await deleteDinner(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting dinner:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete dinner' },
      { status: 500 }
    );
  }
}
