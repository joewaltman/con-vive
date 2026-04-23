import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { approveGuest, fetchGuestProfileForMessage } from '@/lib/attention';
import { createMessage, markMessageDelivered } from '@/lib/messages';

// POST: Generate AI message draft
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

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'ANTHROPIC_API_KEY not configured' },
        { status: 500 }
      );
    }

    // Fetch guest profile
    const profile = await fetchGuestProfileForMessage(guestId);
    if (!profile) {
      return NextResponse.json(
        { error: 'Guest not found' },
        { status: 404 }
      );
    }

    // Generate AI message
    const client = new Anthropic({ apiKey });

    const systemPrompt = `You are Joe, writing a warm, casual text message to a potential dinner guest.
Write one short personalized message following this exact template:
"Hey [First Name]! [personalized callback under 20 words]. I'll be in touch soon with details on an upcoming dinner. — Joe"

Rules:
- Reference ONE specific, concrete detail from their profile
- Never be generic (no "love your enthusiasm")
- Keep the personalized line under 20 words
- Be warm and casual, not corporate
- Never use em dashes except in "— Joe"
- Return ONLY the message text, no explanation`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 256,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: `Profile data:\n${JSON.stringify(profile, null, 2)}`,
        },
      ],
    });

    const textBlock = response.content.find(block => block.type === 'text');
    const draftMessage = textBlock?.type === 'text' ? textBlock.text : '';

    return NextResponse.json({ draft: draftMessage });
  } catch (error) {
    console.error('Error generating approval message:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate message' },
      { status: 500 }
    );
  }
}

// PATCH: Confirm approval and send message
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log('[approve] PATCH request started');
  try {
    const { id } = await params;
    const guestId = parseInt(id, 10);
    console.log('[approve] Guest ID:', guestId);

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

    // Set priority = 1
    console.log('[approve] Calling approveGuest...');
    await approveGuest(guestId);
    console.log('[approve] approveGuest complete');

    // If no message provided, just approve without sending
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      console.log('[approve] No message, returning early');
      return NextResponse.json({ success: true, message: null });
    }

    // Create the message in database
    console.log('[approve] Creating message in DB...');
    const newMessage = await createMessage(guestId, message.trim());
    console.log('[approve] Message created:', newMessage.id);

    // Send via external API with timeout
    const apiUrl = process.env.CONVIVE_API_URL;
    const apiSecret = process.env.DASHBOARD_API_SECRET;

    console.log('[approve] External API config:', { hasUrl: !!apiUrl, hasSecret: !!apiSecret });

    if (apiUrl && apiSecret) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[approve] Timeout reached, aborting...');
        controller.abort();
      }, 10000); // 10 second timeout

      console.log('[approve] Calling external API...');
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
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          await markMessageDelivered(newMessage.id);
          newMessage.delivered = true;
        } else {
          console.error('External API returned error:', response.status, await response.text());
        }
      } catch (apiError) {
        clearTimeout(timeoutId);
        if (apiError instanceof Error && apiError.name === 'AbortError') {
          console.error('External API request timed out after 10 seconds');
        } else {
          console.error('Error sending to external API:', apiError);
        }
      }
    } else {
      console.log('[approve] External API not configured - CONVIVE_API_URL or DASHBOARD_API_SECRET missing');
    }

    console.log('[approve] Returning success response');
    return NextResponse.json({ success: true, message: newMessage });
  } catch (error) {
    console.error('Error approving guest:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to approve guest' },
      { status: 500 }
    );
  }
}
