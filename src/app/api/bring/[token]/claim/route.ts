import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Invitation {
  id: number;
  guest_id: number;
  dinner_id: number;
}

interface BringItem {
  id: number;
  dinner_id: number;
  slots: number;
}

interface ClaimRequest {
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

  let body: ClaimRequest;
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

  // Check if item exists and belongs to this dinner
  const items = await query<BringItem>(
    `SELECT id, dinner_id, slots FROM bring_items WHERE id = $1`,
    [item_id]
  );

  if (!items || items.length === 0) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
  }

  const item = items[0];

  if (item.dinner_id !== invitation.dinner_id) {
    return NextResponse.json(
      { error: "Item does not belong to this dinner" },
      { status: 400 }
    );
  }

  // Check if guest has already claimed this specific item
  const existingClaim = await query<{ id: number }>(
    `SELECT id FROM bring_item_claims WHERE bring_item_id = $1 AND guest_id = $2`,
    [item_id, invitation.guest_id]
  );

  if (existingClaim && existingClaim.length > 0) {
    return NextResponse.json(
      { error: "You have already claimed this item" },
      { status: 400 }
    );
  }

  // Attempt atomic claim with race condition protection
  // This INSERT will fail if:
  // 1. The unique constraint (bring_item_id, guest_id) is violated
  // 2. The subquery returns >= slots (all slots taken)
  const claimResult = await query<{ id: number }>(
    `INSERT INTO bring_item_claims (bring_item_id, guest_id)
     SELECT $1, $2
     WHERE (
       SELECT COUNT(*) FROM bring_item_claims WHERE bring_item_id = $1
     ) < (
       SELECT slots FROM bring_items WHERE id = $1
     )
     RETURNING id`,
    [item_id, invitation.guest_id]
  );

  if (!claimResult || claimResult.length === 0) {
    return NextResponse.json(
      { error: "All slots for this item have been claimed" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, item_id });
}
