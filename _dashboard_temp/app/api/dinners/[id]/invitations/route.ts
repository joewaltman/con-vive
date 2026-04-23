import { NextResponse } from 'next/server';
import { fetchInvitationsByDinner, createInvitation } from '@/lib/invitations';

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

    const invitations = await fetchInvitationsByDinner(id);
    return NextResponse.json(invitations);
  } catch (error) {
    console.error('Error fetching invitations:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch invitations' },
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
    const { guestId, inviteSentDate } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: 'guestId is required' },
        { status: 400 }
      );
    }

    const invitation = await createInvitation(dinnerId, guestId, inviteSentDate);
    return NextResponse.json(invitation, { status: 201 });
  } catch (error) {
    console.error('Error creating invitation:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create invitation' },
      { status: 500 }
    );
  }
}
