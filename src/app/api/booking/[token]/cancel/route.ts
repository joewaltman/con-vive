import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface InvitationRow {
  id: number;
  status: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Find invitation by token
  const invitations = await query<InvitationRow>(
    `SELECT id, status FROM invitations WHERE token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Check if already cancelled
  if (invitation.status === "cancelled") {
    return NextResponse.json(
      { error: "This booking has already been cancelled" },
      { status: 400 }
    );
  }

  // Check if not booked yet
  if (invitation.status !== "booked") {
    return NextResponse.json(
      { error: "No booking to cancel" },
      { status: 400 }
    );
  }

  // Update invitation status
  const result = await query(
    `UPDATE invitations
     SET status = 'cancelled',
         cancelled_at = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [invitation.id]
  );

  if (!result) {
    return NextResponse.json(
      { error: "Failed to cancel booking" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message:
      "Your booking has been cancelled. Please contact Joe at (760) 274-8830 for refund inquiries.",
  });
}
