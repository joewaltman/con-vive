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

interface BringItem {
  id: number;
  category: string;
  description: string | null;
  slots: number;
  claimed_by: number | null;
  claimer_first_name: string | null;
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

  // Get all bring items for this dinner with claimer info
  const items = await query<BringItem>(
    `SELECT
      bi.id,
      bi.category,
      bi.description,
      bi.slots,
      bi.claimed_by,
      g.first_name as claimer_first_name
     FROM bring_items bi
     LEFT JOIN guests g ON bi.claimed_by = g.id
     WHERE bi.dinner_id = $1
     ORDER BY bi.category, bi.id`,
    [invitation.dinner_id]
  );

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
    items: items || [],
  });
}
