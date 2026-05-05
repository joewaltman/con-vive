import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTrojanDinner } from "@/lib/trojan-dinner";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email, graduationYear, major } = body;

    // Validate required fields
    if (!firstName || !lastName || !email || !graduationYear || !major) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate graduation year
    const year = parseInt(graduationYear, 10);
    if (isNaN(year) || year < 1940 || year > 2030) {
      return NextResponse.json(
        { error: "Invalid graduation year" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Verify Trojan dinner exists
    const dinner = await getTrojanDinner();
    if (!dinner) {
      return NextResponse.json(
        { error: "Trojan Alumni dinner not found" },
        { status: 404 }
      );
    }

    // Create or update guest
    const externalSignupData = JSON.stringify({
      graduation_year: year,
      major: major.trim(),
    });

    const result = await query<{ id: number }>(
      `INSERT INTO guests (
        first_name,
        last_name,
        email,
        funnel_stage,
        signup_source,
        external_signup_data,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (email) DO UPDATE SET
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        funnel_stage = 'Partial',
        signup_source = 'trojan-alumni',
        external_signup_data = EXCLUDED.external_signup_data,
        updated_at = NOW()
      RETURNING id`,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        "Partial",
        "trojan-alumni",
        externalSignupData,
      ]
    );

    if (!result || result.length === 0) {
      console.error("Failed to create/update guest");
      return NextResponse.json(
        { error: "Failed to save signup" },
        { status: 500 }
      );
    }

    const guestId = result[0].id;
    console.log(`[Trojan Signup] Created/updated guest with id: ${guestId}`);

    return NextResponse.json({
      success: true,
      guestId: guestId.toString(),
      dinnerId: dinner.id.toString(),
    });
  } catch (error) {
    console.error("Trojan signup start error:", error);
    return NextResponse.json(
      { error: "Failed to save signup" },
      { status: 500 }
    );
  }
}
