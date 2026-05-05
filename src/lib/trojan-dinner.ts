import { query } from "@/lib/db";
import type { CalAlumniSignupData } from "@/lib/types/booking";

interface TrojanDinnerRow {
  id: number;
  dinner_name: string;
  dinner_date: string;
  dinner_time: string | null;
  address: string | null;
  google_maps_link: string | null;
  parking_instructions: string | null;
  menu: string | null;
  price_cents: number;
  total_seats: number;
  signup_source: string;
  enforce_gender_balance: boolean;
  bring_items: Array<{ slot: number; name: string; claimed_by_guest_id: number | null }> | null;
}

interface GuestForExport {
  first_name: string;
  last_name: string;
  external_signup_data: CalAlumniSignupData | null;
}

export async function getTrojanDinner(): Promise<TrojanDinnerRow | null> {
  const dinnerId = process.env.TROJAN_DINNER_ID;
  if (!dinnerId) {
    console.error("TROJAN_DINNER_ID environment variable is not set");
    return null;
  }

  const result = await query<TrojanDinnerRow>(
    `SELECT
      id, dinner_name, dinner_date, dinner_time, address, google_maps_link,
      parking_instructions, menu,
      COALESCE(price_cents, 4000) as price_cents,
      COALESCE(total_seats, 8) as total_seats,
      COALESCE(signup_source, 'con-vive') as signup_source,
      COALESCE(enforce_gender_balance, false) as enforce_gender_balance,
      bring_items
    FROM dinners
    WHERE id = $1`,
    [parseInt(dinnerId, 10)]
  );

  return result?.[0] || null;
}

export async function getTrojanConfirmedSeatCount(dinnerId: number): Promise<number> {
  const result = await query<{ count: string }>(
    `SELECT COUNT(*) as count
     FROM invitations
     WHERE dinner_id = $1
       AND status = 'booked'`,
    [dinnerId]
  );

  return parseInt(result?.[0]?.count || "0", 10);
}

export async function getTrojanRemainingSeats(dinnerId: number): Promise<number> {
  const result = await query<{ remaining: string }>(
    `SELECT
      GREATEST(0, COALESCE(d.total_seats, 8) - COUNT(i.id)) as remaining
     FROM dinners d
     LEFT JOIN invitations i ON i.dinner_id = d.id AND i.status = 'booked'
     WHERE d.id = $1
     GROUP BY d.id, d.total_seats`,
    [dinnerId]
  );

  return parseInt(result?.[0]?.remaining || "0", 10);
}

export async function isTrojanDinnerFull(dinnerId: number): Promise<boolean> {
  const result = await query<{ is_full: boolean }>(
    `SELECT
      (COUNT(i.id) >= COALESCE(d.total_seats, 8)) as is_full
     FROM dinners d
     LEFT JOIN invitations i ON i.dinner_id = d.id AND i.status = 'booked'
     WHERE d.id = $1
     GROUP BY d.id, d.total_seats
     FOR UPDATE OF d`,
    [dinnerId]
  );

  return result?.[0]?.is_full ?? true;
}

export async function getTrojanNextWaitlistPosition(dinnerId: number): Promise<number> {
  const result = await query<{ max_position: string | null }>(
    `SELECT MAX(position) as max_position
     FROM dinner_waitlist
     WHERE dinner_id = $1`,
    [dinnerId]
  );

  return (parseInt(result?.[0]?.max_position || "0", 10) + 1);
}

export async function getTrojanAlumniGuests(dinnerId: number): Promise<GuestForExport[]> {
  const result = await query<GuestForExport>(
    `SELECT g.first_name, g.last_name, g.external_signup_data
     FROM guests g
     JOIN invitations i ON i.guest_id = g.id
     WHERE i.dinner_id = $1
       AND i.status = 'booked'
       AND g.signup_source = 'trojan-alumni'
     ORDER BY i.booked_at ASC`,
    [dinnerId]
  );

  return result || [];
}

export async function getTrojanWaitlistGuests(dinnerId: number): Promise<Array<GuestForExport & { position: number }>> {
  const result = await query<GuestForExport & { position: number }>(
    `SELECT g.first_name, g.last_name, g.external_signup_data, w.position
     FROM dinner_waitlist w
     JOIN guests g ON g.id = w.guest_id
     WHERE w.dinner_id = $1
       AND w.released_at IS NULL
     ORDER BY w.position ASC`,
    [dinnerId]
  );

  return result || [];
}

export function formatTrojanAlumniForExport(guests: GuestForExport[]): string {
  return guests
    .map((g) => {
      const data = g.external_signup_data;
      const classOf = data?.graduation_year ? `, Class of ${data.graduation_year}` : "";
      const major = data?.major ? `, ${data.major}` : "";
      return `${g.first_name} ${g.last_name}${classOf}${major}`;
    })
    .join("\n");
}
