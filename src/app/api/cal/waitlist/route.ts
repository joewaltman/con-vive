import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getCalDinner, getNextWaitlistPosition } from "@/lib/cal-dinner";
import { sendEmail } from "@/lib/email";
import CalWaitlistConfirmationEmail from "@/emails/cal-waitlist-confirmation";

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

    // Verify Cal dinner exists
    const dinner = await getCalDinner();
    if (!dinner) {
      return NextResponse.json(
        { error: "Cal Alumni dinner not found" },
        { status: 404 }
      );
    }

    // Create or update guest
    const externalSignupData = JSON.stringify({
      graduation_year: year,
      major: major.trim(),
    });

    const guestResult = await query<{ id: number }>(
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
        funnel_stage = 'Waitlist',
        signup_source = 'cal-alumni',
        external_signup_data = EXCLUDED.external_signup_data,
        updated_at = NOW()
      RETURNING id`,
      [
        firstName.trim(),
        lastName.trim(),
        email.trim().toLowerCase(),
        "Waitlist",
        "cal-alumni",
        externalSignupData,
      ]
    );

    if (!guestResult || guestResult.length === 0) {
      console.error("Failed to create/update guest for waitlist");
      return NextResponse.json(
        { error: "Failed to save waitlist signup" },
        { status: 500 }
      );
    }

    const guestId = guestResult[0].id;

    // Get next position and create waitlist entry
    const position = await getNextWaitlistPosition(dinner.id);

    const waitlistResult = await query<{ id: number; position: number }>(
      `INSERT INTO dinner_waitlist (
        dinner_id,
        guest_id,
        position,
        created_at
      ) VALUES ($1, $2, $3, NOW())
      ON CONFLICT (dinner_id, guest_id) DO UPDATE SET
        position = dinner_waitlist.position
      RETURNING id, position`,
      [dinner.id, guestId, position]
    );

    if (!waitlistResult || waitlistResult.length === 0) {
      console.error("Failed to create waitlist entry");
      return NextResponse.json(
        { error: "Failed to join waitlist" },
        { status: 500 }
      );
    }

    const actualPosition = waitlistResult[0].position;

    console.log(
      `[Cal Waitlist] Added guest ${guestId} at position ${actualPosition}`
    );

    // Send waitlist confirmation email
    try {
      const dinnerDate = new Date(dinner.dinner_date).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        timeZone: "UTC",
      });

      await sendEmail({
        to: email.trim().toLowerCase(),
        subject: "You're on the waitlist for the Cal Alumni dinner",
        react: CalWaitlistConfirmationEmail({
          guestName: firstName.trim(),
          dinnerDate,
        }),
      });
    } catch (emailError) {
      console.error("Failed to send waitlist confirmation email:", emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      success: true,
      position: actualPosition,
    });
  } catch (error) {
    console.error("Cal waitlist error:", error);
    return NextResponse.json(
      { error: "Failed to join waitlist" },
      { status: 500 }
    );
  }
}
