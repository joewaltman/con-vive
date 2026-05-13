import { NextResponse } from 'next/server';
import { pool } from '@/lib/db';
import { format } from 'date-fns';
import type { FeedbackPageData, FeedbackAttendee } from '@/lib/types/booking';

interface TokenRow {
  id: number;
  dinner_id: number;
  guest_id: number;
  expires_at: Date;
  completed_at: Date | null;
}

interface DinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: Date | string;
  host_first_name: string | null;
  host_name: string | null;
}

interface AttendeeRow {
  id: number;
  first_name: string;
}

interface InvitationRow {
  id: number;
  dinner_id: number;
  guest_id: number;
  status: string | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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

      // Verify the invitation was booked (guest actually attended)
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
        // Expires in 30 days
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
        { error: 'Feedback already submitted', reason: 'completed' },
        { status: 410 }
      );
    }

    // Check if expired
    if (new Date(feedbackToken.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'Token expired', reason: 'expired' },
        { status: 410 }
      );
    }

    // Fetch dinner info with host
    const dinnerResult = await pool.query<DinnerRow>(`
      SELECT d.id, d.dinner_name, d.dinner_date, d.host_name,
             h.first_name as host_first_name
      FROM dinners d
      LEFT JOIN hosts h ON h.id = d.host_id
      WHERE d.id = $1
    `, [feedbackToken.dinner_id]);

    if (dinnerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dinner not found' },
        { status: 404 }
      );
    }

    const dinner = dinnerResult.rows[0];

    // Fetch other attendees (excluding the rater)
    // Checks both status='booked' (new) and response='Accepted' (legacy)
    const attendeesResult = await pool.query<AttendeeRow>(`
      SELECT DISTINCT g.id, g.first_name
      FROM invitations i
      JOIN guests g ON g.id = i.guest_id
      LEFT JOIN attendance a ON a.invitation_id = i.id
      WHERE i.dinner_id = $1
        AND (i.status = 'booked' OR i.response = 'Accepted')
        AND (a.no_show IS NULL OR a.no_show = FALSE)
        AND g.id != $2
      ORDER BY g.first_name
    `, [feedbackToken.dinner_id, feedbackToken.guest_id]);

    const attendees: FeedbackAttendee[] = attendeesResult.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
    }));

    // Format the dinner date
    let dinnerDate: Date;
    if (dinner.dinner_date instanceof Date) {
      dinnerDate = new Date(
        dinner.dinner_date.getFullYear(),
        dinner.dinner_date.getMonth(),
        dinner.dinner_date.getDate(),
        12, 0, 0
      );
    } else if (typeof dinner.dinner_date === 'string') {
      const match = dinner.dinner_date.match(/(\d{4})-(\d{2})-(\d{2})/);
      if (match) {
        dinnerDate = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]), 12, 0, 0);
      } else {
        dinnerDate = new Date(dinner.dinner_date);
      }
    } else {
      dinnerDate = new Date(dinner.dinner_date);
    }

    const formattedDate = format(dinnerDate, 'EEEE, MMMM d');

    // Use host's first name if available, otherwise fall back to dinner_name
    const hostName = dinner.host_first_name || dinner.host_name || dinner.dinner_name;
    const displayName = `${hostName}'s dinner`;

    const response: FeedbackPageData = {
      dinnerName: displayName,
      dinnerDate: formattedDate,
      attendees,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error fetching feedback data:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch feedback data' },
      { status: 500 }
    );
  }
}
