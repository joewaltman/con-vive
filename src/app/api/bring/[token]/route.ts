import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Invitation {
  id: number;
  guest_id: number;
  dinner_id: number;
}

interface Guest {
  id: number;
  first_name: string;
}

interface Dinner {
  id: number;
  dinner_name: string;
  dinner_date: string;
  host: string;
  menu: string | null;
}

interface BringItemRow {
  id: number;
  category: string;
  description: string | null;
  slots: number;
}

interface ClaimRow {
  bring_item_id: number;
  guest_id: number;
  first_name: string;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
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

  // Get guest info
  const guests = await query<Guest>(
    `SELECT id, first_name FROM guests WHERE id = $1`,
    [invitation.guest_id]
  );

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const guest = guests[0];

  // Get dinner info
  const dinners = await query<Dinner>(
    `SELECT id, dinner_name, dinner_date, host, menu FROM dinners WHERE id = $1`,
    [invitation.dinner_id]
  );

  if (!dinners || dinners.length === 0) {
    return NextResponse.json({ error: "Dinner not found" }, { status: 404 });
  }

  const dinner = dinners[0];

  // Get all bring items for this dinner
  const itemRows = await query<BringItemRow>(
    `SELECT id, category, description, slots
     FROM bring_items
     WHERE dinner_id = $1
     ORDER BY category, id`,
    [invitation.dinner_id]
  );

  // Get all claims for these items with guest names
  const claimRows = await query<ClaimRow>(
    `SELECT bic.bring_item_id, bic.guest_id, g.first_name
     FROM bring_item_claims bic
     JOIN guests g ON bic.guest_id = g.id
     JOIN bring_items bi ON bic.bring_item_id = bi.id
     WHERE bi.dinner_id = $1
     ORDER BY bic.claimed_at`,
    [invitation.dinner_id]
  );

  // Build items with claims
  const items = (itemRows || []).map((item) => {
    const claims = (claimRows || [])
      .filter((c) => c.bring_item_id === item.id)
      .map((c) => ({
        guest_id: c.guest_id,
        first_name: c.first_name,
      }));

    return {
      id: item.id,
      category: item.category,
      description: item.description,
      slots: item.slots,
      claims,
      available: item.slots - claims.length,
    };
  });

  return NextResponse.json({
    guest: {
      id: guest.id,
      first_name: guest.first_name,
    },
    dinner: {
      id: dinner.id,
      name: dinner.dinner_name,
      date: dinner.dinner_date,
      host: dinner.host,
      menu: dinner.menu,
    },
    items,
  });
}
