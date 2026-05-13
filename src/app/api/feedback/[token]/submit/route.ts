import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import type { FeedbackSubmission } from '@/lib/types/booking';

interface TokenRow {
  id: number;
  dinner_id: number;
  guest_id: number;
  expires_at: Date;
  completed_at: Date | null;
}

interface InvitationRow {
  id: number;
  dinner_id: number;
  guest_id: number;
  status: string | null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body: FeedbackSubmission = await request.json();

    // Validate request body
    if (!body.ratings || !Array.isArray(body.ratings) || body.ratings.length === 0) {
      return NextResponse.json(
        { error: 'Ratings are required' },
        { status: 400 }
      );
    }

    // Validate each rating
    const validRatings = ['yes', 'no', 'not_sure'];
    for (const rating of body.ratings) {
      if (!rating.rateeGuestId || !validRatings.includes(rating.rating)) {
        return NextResponse.json(
          { error: 'Invalid rating data' },
          { status: 400 }
        );
      }
    }

    // First, try to find in feedback_tokens table
    let tokenResult = await pool.query<TokenRow>(`
      SELECT id, dinner_id, guest_id, expires_at, completed_at
      FROM feedback_tokens
      WHERE token = $1
    `, [token]);

    let feedbackToken: TokenRow;

    if (tokenResult.rows.length === 0) {
      // Not found in feedback_tokens, try invitation token
      const invitationResult = await pool.query<InvitationRow>(`
        SELECT id, dinner_id, guest_id, status
        FROM invitations
        WHERE token = $1
      `, [token]);

      if (invitationResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'Token not found' },
          { status: 404 }
        );
      }

      const invitation = invitationResult.rows[0];

      // Verify the invitation was booked
      if (invitation.status !== 'booked' && invitation.status !== 'confirmed') {
        return NextResponse.json(
          { error: 'Invitation not confirmed' },
          { status: 404 }
        );
      }

      // Check if a feedback token already exists for this guest/dinner
      const existingFeedbackResult = await pool.query<TokenRow>(`
        SELECT id, dinner_id, guest_id, expires_at, completed_at
        FROM feedback_tokens
        WHERE dinner_id = $1 AND guest_id = $2
      `, [invitation.dinner_id, invitation.guest_id]);

      if (existingFeedbackResult.rows.length > 0) {
        feedbackToken = existingFeedbackResult.rows[0];
      } else {
        // Create a new feedback token for this invitation
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        const newTokenResult = await pool.query<TokenRow>(`
          INSERT INTO feedback_tokens (dinner_id, guest_id, token, expires_at)
          VALUES ($1, $2, encode(gen_random_bytes(16), 'hex'), $3)
          RETURNING id, dinner_id, guest_id, expires_at, completed_at
        `, [invitation.dinner_id, invitation.guest_id, expiresAt]);

        feedbackToken = newTokenResult.rows[0];
      }
    } else {
      feedbackToken = tokenResult.rows[0];
    }

    // Check if already completed
    if (feedbackToken.completed_at) {
      return NextResponse.json(
        { error: 'Feedback already submitted' },
        { status: 410 }
      );
    }

    // Check if expired
    if (new Date(feedbackToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired' },
        { status: 410 }
      );
    }

    const dinnerId = feedbackToken.dinner_id;
    const raterGuestId = feedbackToken.guest_id;

    // Insert all ratings
    for (const rating of body.ratings) {
      await pool.query(`
        INSERT INTO feedback_responses (dinner_id, rater_guest_id, ratee_guest_id, rating)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (dinner_id, rater_guest_id, ratee_guest_id) DO UPDATE
        SET rating = $4
      `, [dinnerId, raterGuestId, rating.rateeGuestId, rating.rating]);
    }

    // Insert comment if provided
    if (body.comment && body.comment.trim()) {
      await pool.query(`
        INSERT INTO feedback_comments (dinner_id, rater_guest_id, comment)
        VALUES ($1, $2, $3)
      `, [dinnerId, raterGuestId, body.comment.trim()]);
    }

    // Mark token as completed
    await pool.query(`
      UPDATE feedback_tokens
      SET completed_at = NOW()
      WHERE id = $1
    `, [feedbackToken.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
