import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { getTrojanDinner, getTrojanRemainingSeats } from "@/lib/trojan-dinner";
import { randomBytes } from "crypto";

function sanitizePhone(value: string): string {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  return digits;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      guestId,
      phone,
      gender,
      zipCode,
      dietaryRestrictions,
      dietaryNotes,
      availableDays,
      bringItemSlot,
    } = body;

    if (!guestId) {
      return NextResponse.json(
        { error: "Missing guestId" },
        { status: 400 }
      );
    }

    // Validate phone
    const cleanPhone = sanitizePhone(phone || "");
    if (cleanPhone.length !== 10) {
      return NextResponse.json(
        { error: "Please enter a valid 10-digit US phone number" },
        { status: 400 }
      );
    }

    // Validate gender
    const validGenders = ["Male", "Female", "Non-binary", "Prefer not to say"];
    if (!gender || !validGenders.includes(gender)) {
      return NextResponse.json(
        { error: "Please select a valid gender" },
        { status: 400 }
      );
    }

    // Get Trojan dinner
    const dinner = await getTrojanDinner();
    if (!dinner) {
      return NextResponse.json(
        { error: "Trojan Alumni dinner not found" },
        { status: 404 }
      );
    }

    // Check seats available
    const remainingSeats = await getTrojanRemainingSeats(dinner.id);
    if (remainingSeats <= 0) {
      return NextResponse.json(
        { error: "This dinner is now full. Please join the waitlist." },
        { status: 400 }
      );
    }

    // Format dietary restrictions
    const dietaryArray = Array.isArray(dietaryRestrictions)
      ? dietaryRestrictions
      : [];
    let dietaryNotesStr = dietaryArray.filter((d: string) => d !== "None").join(", ");
    if (dietaryNotes && dietaryNotes.trim()) {
      dietaryNotesStr = dietaryNotesStr
        ? `${dietaryNotesStr}. ${dietaryNotes.trim()}`
        : dietaryNotes.trim();
    }

    // Format available days
    const daysArray = Array.isArray(availableDays) ? availableDays : [];

    // Update guest record
    const guestUpdate = await query(
      `UPDATE guests SET
        phone = $1,
        phone_clean = $1,
        gender = $2,
        zip_code = $3,
        dietary_notes = $4,
        available_days = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING id`,
      [
        cleanPhone,
        gender,
        zipCode || null,
        dietaryNotesStr || null,
        daysArray.length > 0 ? daysArray : null,
        parseInt(guestId, 10),
      ]
    );

    if (!guestUpdate || guestUpdate.length === 0) {
      return NextResponse.json(
        { error: "Guest not found" },
        { status: 404 }
      );
    }

    // Create invitation with pending status
    const token = randomBytes(16).toString("hex");
    const guestIdInt = parseInt(guestId, 10);

    // Check if invitation already exists for this dinner/guest
    const existingInvitation = await query<{ id: number; token: string }>(
      `SELECT id, token FROM invitations WHERE dinner_id = $1 AND guest_id = $2`,
      [dinner.id, guestIdInt]
    );

    let invitation: { id: number; token: string }[] | null;

    if (existingInvitation && existingInvitation.length > 0) {
      // Update existing invitation
      invitation = await query<{ id: number; token: string }>(
        `UPDATE invitations SET
          token = $1,
          status = 'pending',
          bring_item_slot = $2,
          updated_at = NOW()
        WHERE dinner_id = $3 AND guest_id = $4
        RETURNING id, token`,
        [token, bringItemSlot || null, dinner.id, guestIdInt]
      );
    } else {
      // Create new invitation
      invitation = await query<{ id: number; token: string }>(
        `INSERT INTO invitations (
          dinner_id,
          guest_id,
          token,
          status,
          bring_item_slot,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())
        RETURNING id, token`,
        [dinner.id, guestIdInt, token, "pending", bringItemSlot || null]
      );
    }

    if (!invitation || invitation.length === 0) {
      return NextResponse.json(
        { error: "Failed to create invitation" },
        { status: 500 }
      );
    }

    console.log(
      `[Trojan Signup] Created invitation ${invitation[0].id} for guest ${guestId}`
    );

    return NextResponse.json({
      success: true,
      invitationId: invitation[0].id.toString(),
      token: invitation[0].token,
    });
  } catch (error) {
    console.error("Trojan signup complete error:", error);
    return NextResponse.json(
      { error: "Failed to complete signup" },
      { status: 500 }
    );
  }
}
