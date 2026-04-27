import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface CalGuest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  external_signup_data: Record<string, unknown> | null;
}

interface WaitlistRow {
  id: number;
  position: number;
  guest_id: number;
  guest_first_name: string;
  guest_last_name: string;
  guest_email: string;
  external_signup_data: Record<string, unknown> | null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const dinnerId = parseInt(id, 10);

  if (isNaN(dinnerId)) {
    return NextResponse.json({ error: "Invalid dinner ID" }, { status: 400 });
  }

  // Get confirmed Cal Alumni guests
  const guestsResult = await query<CalGuest>(
    `SELECT g.id, g.first_name, g.last_name, g.email, g.phone_clean, g.external_signup_data
     FROM guests g
     JOIN invitations i ON i.guest_id = g.id
     WHERE i.dinner_id = $1
       AND i.status = 'booked'
       AND g.signup_source = 'cal-alumni'
     ORDER BY i.booked_at ASC`,
    [dinnerId]
  );

  // Get waitlist entries
  const waitlistResult = await query<WaitlistRow>(
    `SELECT
       w.id, w.position, w.guest_id,
       g.first_name as guest_first_name,
       g.last_name as guest_last_name,
       g.email as guest_email,
       g.external_signup_data
     FROM dinner_waitlist w
     JOIN guests g ON g.id = w.guest_id
     WHERE w.dinner_id = $1
       AND w.released_at IS NULL
     ORDER BY w.position ASC`,
    [dinnerId]
  );

  const guests = guestsResult || [];
  const waitlist = (waitlistResult || []).map((row) => ({
    id: row.id,
    position: row.position,
    guest: {
      id: row.guest_id,
      first_name: row.guest_first_name,
      last_name: row.guest_last_name,
      email: row.guest_email,
      phone_clean: null,
      external_signup_data: row.external_signup_data,
    },
  }));

  return NextResponse.json({
    guests,
    waitlist,
  });
}
