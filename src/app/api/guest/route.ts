import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface Guest {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  phone_clean: string | null;
  age_range: string | null;
  solo_or_couple: string | null;
  dietary_notes: string | null;
  available_days: string[] | null;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token parameter" }, { status: 400 });
  }

  const guests = await query<Guest>(
    `SELECT id, first_name, last_name, email, phone_clean, age_range, solo_or_couple, dietary_notes, available_days
     FROM guests
     WHERE resume_token = $1`,
    [token]
  );

  if (!guests || guests.length === 0) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 404 });
  }

  const guest = guests[0];

  return NextResponse.json({
    id: guest.id,
    first_name: guest.first_name,
    last_name: guest.last_name,
    email: guest.email,
    phone: guest.phone_clean,
    age_range: guest.age_range,
    solo_or_couple: guest.solo_or_couple,
    dietary_notes: guest.dietary_notes,
    available_days: guest.available_days,
  });
}
