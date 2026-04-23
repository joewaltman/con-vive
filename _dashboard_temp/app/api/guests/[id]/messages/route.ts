import { NextResponse } from 'next/server';
import { fetchMessagesByGuestId, createMessage, markMessageDelivered } from '@/lib/messages';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestId = parseInt(id, 10);

    if (isNaN(guestId)) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const messages = await fetchMessagesByGuestId(guestId);
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const guestId = parseInt(id, 10);

    if (isNaN(guestId)) {
      return NextResponse.json(
        { error: 'Invalid guest ID' },
        { status: 400 }
      );
    }

    if (!process.env.DATABASE_PUBLIC_URL && !process.env.DATABASE_URL) {
      return NextResponse.json(
        { error: 'DATABASE_URL not configured' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { message } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { error: 'Message body is required' },
        { status: 400 }
      );
    }

    // Create the message in database (initially undelivered)
    const newMessage = await createMessage(guestId, message.trim());

    // Send via external API (Con-vive main service -> QUO)
    const apiUrl = process.env.CONVIVE_API_URL;
    const apiSecret = process.env.DASHBOARD_API_SECRET;

    if (apiUrl && apiSecret) {
      try {
        const response = await fetch(`${apiUrl}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-dashboard-secret': apiSecret,
          },
          body: JSON.stringify({
            guest_id: guestId,
            body: message.trim(),
          }),
        });

        if (response.ok) {
          // Mark as delivered if external API succeeds
          await markMessageDelivered(newMessage.id);
          newMessage.delivered = true;
        }
      } catch (apiError) {
        console.error('Error sending to external API:', apiError);
        // Message is created but not delivered - will show as pending
      }
    }

    return NextResponse.json(newMessage);
  } catch (error) {
    console.error('Error creating message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
