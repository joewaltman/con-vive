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

  // Find invitation by bring_token
  const invitations = await query<Invitation>(
    `SELECT id, guest_id, dinner_id FROM invitations WHERE bring_token = $1`,
    [token]
  );

  if (!invitations || invitations.length === 0) {
    return NextResponse.json(
      { error: "Invalid or expired link" },
      { status: 404 }
    );
  }

  const invitation = invitations[0];

  // Only unclaim if the item is claimed by this guest
  const unclaimResult = await query<{ id: number }>(
    `UPDATE bring_items
     SET claimed_by = NULL, claimed_at = NULL
     WHERE id = $1 AND claimed_by = $2
     RETURNING id`,
    [item_id, invitation.guest_id]
  );

  if (!unclaimResult || unclaimResult.length === 0) {
    return NextResponse.json(
      { error: "You can only unclaim items you have claimed" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, item_id });
}
