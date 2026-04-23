import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface InvitationRow {
  id: number;
  guest_id: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  let body: { gender: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { gender } = body;

  if (!gender || !["male", "female", "other"].includes(gender.toLowerCase())) {
    return NextResponse.json(
      { error: "Valid gender is required (male, female, or other)" },
      { status: 400 }
    );
  }

  // Find invitation by token
  const invitations = await query<InvitationRow>(
    `SELECT id, guest_id FROM invitations WHERE token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Update guest gender
  const result = await query(
    `UPDATE guests SET gender = $1, updated_at = NOW() WHERE id = $2`,
    [gender.toLowerCase(), invitation.guest_id]
  );

  if (!result) {
    return NextResponse.json(
      { error: "Failed to update gender" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
