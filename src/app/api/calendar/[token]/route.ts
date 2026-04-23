import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { generateICSContent } from "@/lib/calendar";

interface InvitationRow {
  id: number;
  dinner_id: number;
}

interface DinnerRow {
  dinner_name: string;
  dinner_date: string;
  dinner_time: string | null;
  address: string | null;
  host_name: string | null;
  host: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Find invitation by token
  const invitations = await query<InvitationRow>(
    `SELECT id, dinner_id FROM invitations WHERE token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Get dinner details
  const dinners = await query<DinnerRow>(
    `SELECT dinner_name, dinner_date, dinner_time, address, host_name, host
     FROM dinners
     WHERE id = $1`,
    [invitation.dinner_id]
  );

  if (!dinners || dinners.length === 0) {
    return NextResponse.json({ error: "Dinner not found" }, { status: 404 });
  }

  const dinner = dinners[0];
  const hostName = dinner.host_name || dinner.host;

  // Generate ICS content
  const icsContent = generateICSContent({
    name: dinner.dinner_name,
    date: dinner.dinner_date,
    time: dinner.dinner_time || "7:00 PM",
    hostName,
    address: dinner.address || "",
  });

  // Return ICS file with proper headers
  return new NextResponse(icsContent, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="con-vive-dinner.ics"`,
    },
  });
}
