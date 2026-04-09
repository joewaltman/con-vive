import { NextResponse } from "next/server";
import { query } from "@/lib/db";

export async function GET(request: Request) {
  const dashboardSecret = process.env.DASHBOARD_API_SECRET;
  const providedSecret = request.headers.get("x-dashboard-secret");

  if (!dashboardSecret || providedSecret !== dashboardSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const guestId = url.searchParams.get("guest_id");

  if (!guestId) {
    return NextResponse.json({ error: "guest_id required" }, { status: 400 });
  }

  try {
    const result = await query<{
      id: number;
      guest_id: number;
      full_transcript: string;
      summarized_transcript: string;
      created_at: string;
      updated_at: string;
    }>(
      "SELECT id, guest_id, full_transcript, summarized_transcript, created_at, updated_at FROM transcripts WHERE guest_id = $1",
      [guestId]
    );

    if (!result || result.length === 0) {
      return NextResponse.json({ error: "Transcript not found", guest_id: guestId });
    }

    const transcript = result[0];
    return NextResponse.json({
      id: transcript.id,
      guest_id: transcript.guest_id,
      full_transcript_length: transcript.full_transcript?.length || 0,
      full_transcript_preview: transcript.full_transcript?.substring(0, 500) || "",
      summarized_transcript_length: transcript.summarized_transcript?.length || 0,
      summarized_transcript: transcript.summarized_transcript,
      created_at: transcript.created_at,
      updated_at: transcript.updated_at,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
