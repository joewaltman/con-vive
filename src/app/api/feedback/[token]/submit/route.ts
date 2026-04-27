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

    // Find the token
    const tokenResult = await pool.query<TokenRow>(`
      SELECT id, dinner_id, guest_id, expires_at, completed_at
      FROM feedback_tokens
      WHERE token = $1
    `, [token]);

    if (tokenResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Token not found' },
        { status: 404 }
      );
    }

    const feedbackToken = tokenResult.rows[0];

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
