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
  claimed_by: number | null;
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

  // Check if item exists and belongs to this dinner
  const items = await query<BringItem>(
    `SELECT id, dinner_id, claimed_by FROM bring_items WHERE id = $1`,
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

  // Check if guest has already claimed another item for this dinner
  const existingClaims = await query<{ id: number }>(
    `SELECT id FROM bring_items WHERE dinner_id = $1 AND claimed_by = $2`,
    [invitation.dinner_id, invitation.guest_id]
  );

  if (existingClaims && existingClaims.length > 0) {
    return NextResponse.json(
      { error: "You have already claimed an item for this dinner" },
      { status: 400 }
    );
  }

  // Attempt atomic claim with race condition protection
  const claimResult = await query<{ id: number }>(
    `UPDATE bring_items
     SET claimed_by = $1, claimed_at = NOW()
     WHERE id = $2 AND claimed_by IS NULL
     RETURNING id`,
    [invitation.guest_id, item_id]
  );

  if (!claimResult || claimResult.length === 0) {
    return NextResponse.json(
      { error: "Item has already been claimed" },
      { status: 409 }
    );
  }

  return NextResponse.json({ success: true, item_id });
}
