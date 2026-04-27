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
}

interface AttendeeRow {
  id: number;
  first_name: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

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

    // Fetch dinner info
    const dinnerResult = await pool.query<DinnerRow>(`
      SELECT id, dinner_name, dinner_date
      FROM dinners
      WHERE id = $1
    `, [feedbackToken.dinner_id]);

    if (dinnerResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Dinner not found' },
        { status: 404 }
      );
    }

    const dinner = dinnerResult.rows[0];

    // Fetch other attendees (excluding the rater)
    const attendeesResult = await pool.query<AttendeeRow>(`
      SELECT DISTINCT g.id, g.first_name
      FROM attendance a
      JOIN invitations i ON i.id = a.invitation_id
      JOIN guests g ON g.id = i.guest_id
      WHERE i.dinner_id = $1
        AND i.status = 'booked'
        AND (a.attended = TRUE OR a.attended IS NULL)
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

    const response: FeedbackPageData = {
      dinnerName: dinner.dinner_name,
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
