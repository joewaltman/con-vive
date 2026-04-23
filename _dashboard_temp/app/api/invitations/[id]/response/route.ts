import { NextResponse } from 'next/server';
import { updateInvitationResponse } from '@/lib/invitations';
import type { InvitationResponse } from '@/lib/types';

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
    const { response } = body;

    // Validate response value
    const validResponses: (InvitationResponse)[] = ['Accepted', 'Declined', 'Invited', null];
    if (!validResponses.includes(response)) {
      return NextResponse.json(
        { error: 'Invalid response value. Must be Accepted, Declined, Invited, or null' },
        { status: 400 }
      );
    }

    const invitation = await updateInvitationResponse(id, response);
    return NextResponse.json(invitation);
  } catch (error) {
    console.error('Error updating invitation response:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update invitation response' },
      { status: 500 }
    );
  }
}
