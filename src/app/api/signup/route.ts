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

// Write to PostgreSQL (non-blocking, errors logged but don't fail the request)
async function writeToPostgres(
  action: "insert" | "update",
  data: {
    airtableRecordId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    ageRange?: string;
    soloOrCouple?: string;
    dietaryRestrictions?: string;
    availableDays?: string[];
    curiousAbout?: string;
    surprisingKnowledge?: string;
    funnelStage?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
  }
): Promise<void> {
  try {
    if (action === "insert") {
      // Insert new guest record
      const result = await query(
        `INSERT INTO guests (
          airtable_record_id,
          first_name,
          last_name,
          email,
          funnel_stage,
          utm_source,
          utm_medium,
          utm_campaign,
          timestamp
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        ON CONFLICT (email) DO UPDATE SET
          airtable_record_id = COALESCE(EXCLUDED.airtable_record_id, guests.airtable_record_id),
          first_name = COALESCE(EXCLUDED.first_name, guests.first_name),
          last_name = COALESCE(EXCLUDED.last_name, guests.last_name),
          funnel_stage = COALESCE(EXCLUDED.funnel_stage, guests.funnel_stage),
          utm_source = COALESCE(EXCLUDED.utm_source, guests.utm_source),
          utm_medium = COALESCE(EXCLUDED.utm_medium, guests.utm_medium),
          utm_campaign = COALESCE(EXCLUDED.utm_campaign, guests.utm_campaign),
          updated_at = NOW()
        RETURNING id`,
        [
          data.airtableRecordId || null,
          data.firstName || null,
          data.lastName || null,
          data.email || null,
          data.funnelStage || "Partial",
          data.utmSource || null,
          data.utmMedium || null,
          data.utmCampaign || null,
        ]
      );
      if (result && result.length > 0) {
        const row = result[0] as { id: number };
        console.log(`[PostgreSQL] Inserted/updated guest with id: ${row.id}`);
      }
    } else if (action === "update") {
      // Build dynamic update query based on provided fields
      const updates: string[] = [];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (data.phone !== undefined) {
        updates.push(`phone = $${paramIndex}, phone_clean = $${paramIndex}`);
        values.push(data.phone);
        paramIndex++;
      }
      if (data.ageRange !== undefined) {
        updates.push(`age_range = $${paramIndex}`);
        values.push(data.ageRange);
        paramIndex++;
      }
      if (data.soloOrCouple !== undefined) {
        updates.push(`solo_or_couple = $${paramIndex}`);
        values.push(data.soloOrCouple);
        paramIndex++;
      }
      if (data.dietaryRestrictions !== undefined) {
        updates.push(`dietary_notes = $${paramIndex}`);
        values.push(data.dietaryRestrictions);
        paramIndex++;
      }
      if (data.availableDays !== undefined) {
        updates.push(`available_days = $${paramIndex}`);
        values.push(data.availableDays);
        paramIndex++;
      }
      if (data.curiousAbout !== undefined) {
        updates.push(`curious_about = $${paramIndex}, one_thing = $${paramIndex}`);
        values.push(data.curiousAbout);
        paramIndex++;
      }
      if (data.surprisingKnowledge !== undefined) {
        updates.push(`surprising_knowledge = $${paramIndex}`);
        values.push(data.surprisingKnowledge);
        paramIndex++;
      }
      if (data.funnelStage !== undefined) {
        updates.push(`funnel_stage = $${paramIndex}`);
        values.push(data.funnelStage);
        paramIndex++;
      }

      if (updates.length > 0 && data.airtableRecordId) {
        updates.push("updated_at = NOW()");
        values.push(data.airtableRecordId);

        const result = await query(
          `UPDATE guests SET ${updates.join(", ")} WHERE airtable_record_id = $${paramIndex}`,
          values
        );
        console.log(`[PostgreSQL] Updated guest with airtable_record_id: ${data.airtableRecordId}`);
      }
    }
  } catch (error) {
    console.error("[PostgreSQL] Error writing to database:", error);
    // Don't throw - PostgreSQL errors shouldn't break the signup flow
  }
}

// Page 1 - Create new record
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email } = body;
    if (!firstName || !lastName || !email) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const token = process.env.AIRTABLE_API_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      console.error("Missing Airtable environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Write to Airtable (primary)
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/Signups`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        records: [
          {
            fields: {
              Timestamp: new Date().toISOString(),
              "First Name": body.firstName,
              "Last Name": body.lastName,
              Email: body.email,
              "Funnel Stage": "Partial",
              "UTM Source": body.utmSource || "",
              "UTM Medium": body.utmMedium || "",
              "UTM Campaign": body.utmCampaign || "",
            },
          },
        ],
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Airtable error:", error);
      return NextResponse.json({ error: "Failed to save signup" }, { status: 500 });
    }

    const data = await res.json();
    const recordId = data.records[0].id;

    // Write to PostgreSQL (secondary, non-blocking)
    writeToPostgres("insert", {
      airtableRecordId: recordId,
      firstName: body.firstName,
      lastName: body.lastName,
      email: body.email,
      funnelStage: "Partial",
      utmSource: body.utmSource || null,
      utmMedium: body.utmMedium || null,
      utmCampaign: body.utmCampaign || null,
    }).catch((err) => console.error("[PostgreSQL] Background write error:", err));

    return NextResponse.json({ success: true, recordId });
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

    const token = process.env.AIRTABLE_API_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      console.error("Missing Airtable environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

    // Build airtableFields dynamically based on what's sent
    const airtableFields: Record<string, string | string[]> = {};

    // Also build postgres data
    const postgresData: Parameters<typeof writeToPostgres>[1] = {
      airtableRecordId: recordId,
    };

    // Page 2 fields
    if (body.phone !== undefined) {
      const cleanPhone = sanitizePhone(body.phone);
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: "Invalid phone number. Please enter a valid 10-digit US phone number." }, { status: 400 });
      }
      airtableFields["Phone"] = cleanPhone;
      postgresData.phone = cleanPhone;
    }
    if (body.ageRange !== undefined) {
      airtableFields["Age Range"] = body.ageRange;
      postgresData.ageRange = body.ageRange;
    }
    if (body.soloOrCouple !== undefined) {
      airtableFields["Solo or Couple"] = body.soloOrCouple;
      postgresData.soloOrCouple = body.soloOrCouple;
    }
    if (body.dietaryRestrictions !== undefined && body.dietaryRestrictions.trim()) {
      postgresData.dietaryRestrictions = body.dietaryRestrictions.trim();
    }
    // Available Days - send as array for multi-select field
    if (body.availableDays !== undefined && body.availableDays) {
      const daysArray = body.availableDays.split(", ").filter((d: string) => d.trim());
      if (daysArray.length > 0) {
        airtableFields["Available Days"] = daysArray;
        postgresData.availableDays = daysArray;
      }
    }

    // Page 3 fields
    if (body.curiousAbout !== undefined) {
      airtableFields["Curious About"] = body.curiousAbout;
      airtableFields["OneThing"] = body.curiousAbout; // Backward compat
      postgresData.curiousAbout = body.curiousAbout;
    }
    if (body.surprisingKnowledge !== undefined) {
      airtableFields["Surprising Knowledge"] = body.surprisingKnowledge;
      postgresData.surprisingKnowledge = body.surprisingKnowledge;
    }
    if (body.funnelStage !== undefined) {
      airtableFields["Funnel Stage"] = body.funnelStage;
      postgresData.funnelStage = body.funnelStage;
    }

    // Write to Airtable (primary)
    const res = await fetch(`https://api.airtable.com/v0/${baseId}/Signups/${recordId}`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fields: airtableFields,
      }),
    });

    if (!res.ok) {
      const error = await res.text();
      console.error("Airtable PATCH error:", error);
      console.error("Fields sent:", JSON.stringify(airtableFields, null, 2));
      return NextResponse.json({ error: "Failed to update signup", details: error }, { status: 500 });
    }

    // Write to PostgreSQL (secondary, non-blocking)
    writeToPostgres("update", postgresData).catch((err) =>
      console.error("[PostgreSQL] Background update error:", err)
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup update error:", error);
    return NextResponse.json({ error: "Failed to update signup" }, { status: 500 });
  }
}
