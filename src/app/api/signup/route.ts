import { NextResponse } from "next/server";
import { query } from "@/lib/db";

function sanitizePhone(value: string): string {
  // Strip all non-digits
  let digits = value.replace(/\D/g, "");
  // If starts with 1 and is 11 digits, strip the leading 1
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
}

// Page 1 - Create new record
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email } = body;
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await query<{ id: number }>(
      `INSERT INTO guests (
        first_name,
        last_name,
        email,
        funnel_stage,
        utm_source,
        utm_medium,
        utm_campaign,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        funnel_stage = 'Partial',
        utm_source = COALESCE(EXCLUDED.utm_source, guests.utm_source),
        utm_medium = COALESCE(EXCLUDED.utm_medium, guests.utm_medium),
        utm_campaign = COALESCE(EXCLUDED.utm_campaign, guests.utm_campaign),
        updated_at = NOW()
      RETURNING id`,
      [
        firstName,
        lastName,
        email,
        "Partial",
        body.utmSource || null,
        body.utmMedium || null,
        body.utmCampaign || null,
      ]
    );

    if (!result || result.length === 0) {
      console.error("PostgreSQL insert failed - no result returned");
      return NextResponse.json({ error: "Failed to save signup" }, { status: 500 });
    }

    const guestId = result[0].id;
    console.log(`[Signup] Created/updated guest with id: ${guestId}`);

    return NextResponse.json({ success: true, recordId: guestId.toString() });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to save signup" }, { status: 500 });
  }
}

// Pages 2 & 3 - Update existing record
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const { recordId } = body;
    if (!recordId) {
      return NextResponse.json({ error: "Missing recordId" }, { status: 400 });
    }

    const guestId = parseInt(recordId, 10);
    if (isNaN(guestId)) {
      return NextResponse.json({ error: "Invalid recordId" }, { status: 400 });
    }

    // Build dynamic update query based on provided fields
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Page 2 fields
    if (body.phone !== undefined) {
      const cleanPhone = sanitizePhone(body.phone);
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: "Invalid phone number. Please enter a valid 10-digit US phone number." }, { status: 400 });
      }
      updates.push(`phone = $${paramIndex}, phone_clean = $${paramIndex}`);
      values.push(cleanPhone);
      paramIndex++;
    }
    if (body.zipCode !== undefined) {
      updates.push(`zip_code = $${paramIndex}`);
      values.push(body.zipCode || null);
      paramIndex++;
    }
    if (body.ageRange !== undefined) {
      updates.push(`age_range = $${paramIndex}`);
      values.push(body.ageRange);
      paramIndex++;
    }
    if (body.gender !== undefined) {
      console.log(`[Signup] Setting gender to: "${body.gender}" for guest ${guestId}`);
      updates.push(`gender = $${paramIndex}`);
      values.push(body.gender || null);
      paramIndex++;
    }
    if (body.soloOrCouple !== undefined) {
      updates.push(`solo_or_couple = $${paramIndex}`);
      values.push(body.soloOrCouple);
      paramIndex++;
    }
    if (body.dietaryRestrictions !== undefined && body.dietaryRestrictions.trim()) {
      updates.push(`dietary_notes = $${paramIndex}`);
      values.push(body.dietaryRestrictions.trim());
      paramIndex++;
    }
    // Available Days - store as array
    if (body.availableDays !== undefined && body.availableDays) {
      const daysArray = body.availableDays.split(", ").filter((d: string) => d.trim());
      if (daysArray.length > 0) {
        updates.push(`available_days = $${paramIndex}`);
        values.push(daysArray);
        paramIndex++;
      }
    }

    // Page 3 fields
    if (body.curiousAbout !== undefined) {
      updates.push(`curious_about = $${paramIndex}, one_thing = $${paramIndex}`);
      values.push(body.curiousAbout);
      paramIndex++;
    }
    if (body.surprisingKnowledge !== undefined) {
      updates.push(`surprising_knowledge = $${paramIndex}`);
      values.push(body.surprisingKnowledge);
      paramIndex++;
    }
    if (body.funnelStage !== undefined) {
      updates.push(`funnel_stage = $${paramIndex}`);
      values.push(body.funnelStage);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: true });
    }

    updates.push("updated_at = NOW()");
    values.push(guestId);

    const result = await query(
      `UPDATE guests SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING id`,
      values
    );

    if (!result || result.length === 0) {
      console.error(`PostgreSQL update failed - guest ${guestId} not found`);
      return NextResponse.json({ error: "Failed to update signup" }, { status: 500 });
    }

    console.log(`[Signup] Updated guest with id: ${guestId}, fields: ${updates.join(', ')}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup update error:", error);
    return NextResponse.json({ error: "Failed to update signup" }, { status: 500 });
  }
}
