import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import {
  checkGenderConstraint,
  getGenderCountsFromBookings,
} from "@/lib/booking-constraints";
import type { BringItem } from "@/lib/types/booking";

interface InvitationRow {
  id: number;
  guest_id: number;
  dinner_id: number;
  status: string;
  bring_item_slot: number | null;
  booked_at: string | null;
}

interface GuestRow {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  gender: string | null;
}

interface DinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: string;
  dinner_time: string | null;
  price_cents: number;
  capacity: number;
  address: string | null;
  google_maps_link: string | null;
  parking_instructions: string | null;
  what_to_bring: string | null;
  host_name: string | null;
  bring_items: BringItem[] | null;
  menu: string | null;
  host: string;
  venue_type: string | null;
}

interface BookedGuestRow {
  gender: string | null;
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
    `SELECT id, guest_id, dinner_id, status, bring_item_slot, booked_at
     FROM invitations
     WHERE token = $1`,
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
  const guests = await query<GuestRow>(
    `SELECT id, first_name, last_name, email, phone_clean, gender
     FROM guests
     WHERE id = $1`,
    [invitation.guest_id]
  );

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "Guest not found" }, { status: 404 });
  }

  const guest = guests[0];

  // Get dinner info
  const dinners = await query<DinnerRow>(
    `SELECT id, dinner_name, dinner_date, dinner_time,
            COALESCE(price_cents, 4000) as price_cents,
            COALESCE(capacity, 6) as capacity,
            address, google_maps_link, parking_instructions,
            what_to_bring, host_name, bring_items, menu, host,
            venue_type
     FROM dinners
     WHERE id = $1`,
    [invitation.dinner_id]
  );

  if (!dinners || dinners.length === 0) {
    return NextResponse.json({ error: "Dinner not found" }, { status: 404 });
  }

  const dinner = dinners[0];

  // Get gender counts from already booked guests
  const bookedGuests = await query<BookedGuestRow>(
    `SELECT g.gender
     FROM invitations i
     JOIN guests g ON i.guest_id = g.id
     WHERE i.dinner_id = $1
       AND i.status = 'booked'
       AND i.id != $2`,
    [invitation.dinner_id, invitation.id]
  );

  const genderCounts = getGenderCountsFromBookings(bookedGuests || []);

  // Check if this guest can book
  const constraint = checkGenderConstraint(genderCounts, guest.gender, dinner.capacity);

  // Parse bring_items from JSONB
  const bringItems: BringItem[] = Array.isArray(dinner.bring_items)
    ? dinner.bring_items
    : [];

  return NextResponse.json({
    invitation: {
      id: invitation.id,
      status: invitation.status,
      bring_item_slot: invitation.bring_item_slot,
      booked_at: invitation.booked_at,
    },
    dinner: {
      id: dinner.id,
      name: dinner.dinner_name,
      date: dinner.dinner_date,
      time: dinner.dinner_time || "7:00 PM",
      price_cents: dinner.price_cents,
      address: dinner.address,
      google_maps_link: dinner.google_maps_link,
      parking_instructions: dinner.parking_instructions,
      what_to_bring: dinner.what_to_bring,
      host_name: dinner.host_name || dinner.host,
      bring_items: bringItems,
      menu: dinner.menu,
      venue_type: dinner.venue_type || 'home',
    },
    guest: {
      id: guest.id,
      first_name: guest.first_name,
      last_name: guest.last_name,
      email: guest.email,
      gender: guest.gender,
    },
    genderCounts,
    canBook: constraint.allowed,
    blockReason: constraint.reason,
  });
}
