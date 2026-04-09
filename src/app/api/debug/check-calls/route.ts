import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const dashboardSecret = process.env.DASHBOARD_API_SECRET;
  const providedSecret = request.headers.get("x-dashboard-secret");

  if (!dashboardSecret || providedSecret !== dashboardSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const name = url.searchParams.get("name");

  try {
    // Check for recent transcripts
    const recentTranscripts = await query<{
      id: number;
      guest_id: number;
      created_at: string;
      full_transcript_length: number;
    }>(
      `SELECT t.id, t.guest_id, t.created_at, LENGTH(t.full_transcript) as full_transcript_length,
              g.first_name, g.last_name, g.phone_clean
       FROM transcripts t
       JOIN guests g ON t.guest_id = g.id
       ORDER BY t.created_at DESC
       LIMIT 10`
    );

    // If name provided, search for that guest
    let guestSearch = null;
    if (name) {
      guestSearch = await query<{
        id: number;
        first_name: string;
        last_name: string;
        phone: string;
        phone_clean: string;
        call_complete: boolean;
        call_date: string;
      }>(
        `SELECT id, first_name, last_name, phone, phone_clean, call_complete, call_date
         FROM guests
         WHERE first_name ILIKE $1 OR last_name ILIKE $1`,
        [`%${name}%`]
      );
    }

    // Check guests without transcripts who have call_complete = true
    const missingTranscripts = await query<{
      id: number;
      first_name: string;
      last_name: string;
      phone_clean: string;
      call_complete: boolean;
    }>(
      `SELECT g.id, g.first_name, g.last_name, g.phone_clean, g.call_complete
       FROM guests g
       LEFT JOIN transcripts t ON g.id = t.guest_id
       WHERE t.id IS NULL AND g.phone_clean IS NOT NULL
       ORDER BY g.updated_at DESC
       LIMIT 20`
    );

    return NextResponse.json({
      recent_transcripts: recentTranscripts,
      guest_search: guestSearch,
      guests_without_transcripts: missingTranscripts,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
