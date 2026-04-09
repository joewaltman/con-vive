import { NextResponse } from "next/server";
import { query } from "@/lib/db";

// Temporary endpoint for testing - delete after use
export async function POST(request: Request) {
  // Only allow with dashboard secret for security
  const dashboardSecret = process.env.DASHBOARD_API_SECRET;
  const providedSecret = request.headers.get("x-dashboard-secret");

  if (!dashboardSecret || providedSecret !== dashboardSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { first_name, last_name } = await request.json();

    if (!first_name || !last_name) {
      return NextResponse.json({ error: "first_name and last_name required" }, { status: 400 });
    }

    // Find guest
    const guestResult = await query<{
      id: number;
      first_name: string;
      last_name: string;
      phone_clean: string;
      call_complete: boolean;
      call_date: string;
      funnel_stage: string;
    }>(
      "SELECT id, first_name, last_name, phone_clean, call_complete, call_date, funnel_stage FROM guests WHERE first_name ILIKE $1 AND last_name ILIKE $2",
      [first_name, last_name]
    );

    if (!guestResult || guestResult.length === 0) {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }

    const guest = guestResult[0];

    // Check for existing transcript
    const transcriptResult = await query<{ id: number }>(
      "SELECT id FROM transcripts WHERE guest_id = $1",
      [guest.id]
    );

    let transcriptDeleted = false;
    if (transcriptResult && transcriptResult.length > 0) {
      await query("DELETE FROM transcripts WHERE guest_id = $1", [guest.id]);
      transcriptDeleted = true;
    }

    // Reset guest fields
    await query(
      `UPDATE guests SET
        call_complete = false,
        call_date = NULL,
        funnel_stage = 'New',
        updated_at = NOW()
      WHERE id = $1`,
      [guest.id]
    );

    // Verify
    const verifyResult = await query<{
      id: number;
      first_name: string;
      last_name: string;
      phone_clean: string;
      call_complete: boolean;
      call_date: string;
      funnel_stage: string;
    }>("SELECT id, first_name, last_name, phone_clean, call_complete, call_date, funnel_stage FROM guests WHERE id = $1", [guest.id]);

    return NextResponse.json({
      success: true,
      guest_before: guest,
      guest_after: verifyResult?.[0],
      transcript_deleted: transcriptDeleted,
      phone_clean: guest.phone_clean,
    });
  } catch (error) {
    console.error("[Reset Guest] Error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
