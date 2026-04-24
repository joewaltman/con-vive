import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Invitation {
  id: number;
  guest_id: number;
  dinner_id: number;
}

interface UnclaimRequest {
  item_id: number;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  let body: UnclaimRequest;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { item_id } = body;

  if (!item_id) {
    return NextResponse.json({ error: "item_id is required" }, { status: 400 });
  }

  // Find invitation by token (the booking token)
  const invitations = await query<Invitation>(
    `SELECT id, guest_id, dinner_id FROM invitations WHERE token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Delete the claim for this guest on this item
  const unclaimResult = await query<{ id: number }>(
    `DELETE FROM bring_item_claims
     WHERE bring_item_id = $1 AND guest_id = $2
     RETURNING id`,
    [item_id, invitation.guest_id]
  );

  if (!unclaimResult || unclaimResult.length === 0) {
    return NextResponse.json(
      { error: "You haven't claimed this item" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, item_id });
}
