import { NextResponse } from "next/server";
import { queryOrThrow } from "@/lib/db";

export async function GET(request: Request) {
  // Only allow with webhook secret for security
  const webhookSecret = process.env.WEBHOOK_SECRET;
  const providedSecret = request.headers.get("x-webhook-secret");

  if (!webhookSecret || providedSecret !== webhookSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const phone = url.searchParams.get("phone");

  try {
    if (phone) {
      // Search by phone
      const result = await queryOrThrow<{ id: number; first_name: string; last_name: string; phone: string; phone_clean: string }>(
        "SELECT id, first_name, last_name, phone, phone_clean FROM guests WHERE phone_clean = $1 OR phone LIKE $2 LIMIT 5",
        [phone, `%${phone}%`]
      );
      return NextResponse.json({ query: "by_phone", phone, results: result });
    } else {
      // Get sample of guests with phone_clean
      const result = await queryOrThrow<{ id: number; first_name: string; last_name: string; phone: string; phone_clean: string }>(
        "SELECT id, first_name, last_name, phone, phone_clean FROM guests WHERE phone_clean IS NOT NULL LIMIT 10"
      );
      const count = await queryOrThrow<{ count: string }>("SELECT COUNT(*) as count FROM guests");
      const withPhone = await queryOrThrow<{ count: string }>("SELECT COUNT(*) as count FROM guests WHERE phone_clean IS NOT NULL AND phone_clean != ''");

      return NextResponse.json({
        total_guests: count?.[0]?.count,
        guests_with_phone_clean: withPhone?.[0]?.count,
        sample: result,
      });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error), stack: (error as Error).stack }, { status: 500 });
  }
}
