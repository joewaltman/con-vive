import { NextResponse } from 'next/server';
import { deleteBringItem, updateBringItem } from '@/lib/bring-items';

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
    const { category, description, slots } = body;

    const bringItem = await updateBringItem(id, { category, description, slots });
    return NextResponse.json(bringItem);
  } catch (error) {
    console.error('Error updating bring item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update bring item' },
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

    const result = await deleteBringItem(id);
    return NextResponse.json({ success: true, hadClaims: result.hadClaims });
  } catch (error) {
    console.error('Error deleting bring item:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete bring item' },
      { status: 500 }
    );
  }
}
