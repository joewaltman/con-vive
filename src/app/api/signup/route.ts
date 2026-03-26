import { NextResponse } from "next/server";

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

    const token = process.env.AIRTABLE_API_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;

    if (!token || !baseId) {
      console.error("Missing Airtable environment variables");
      return NextResponse.json({ error: "Server configuration error" }, { status: 500 });
    }

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

    // Page 2 fields
    if (body.phone !== undefined) {
      const cleanPhone = sanitizePhone(body.phone);
      if (cleanPhone.length !== 10) {
        return NextResponse.json({ error: "Invalid phone number. Please enter a valid 10-digit US phone number." }, { status: 400 });
      }
      airtableFields["Phone"] = cleanPhone;
    }
    if (body.ageRange !== undefined) {
      airtableFields["Age Range"] = body.ageRange;
    }
    if (body.soloOrCouple !== undefined) {
      airtableFields["Solo or Couple"] = body.soloOrCouple;
    }
    // Dietary Restrictions - skip for now (multi-select requires predefined options)
    // TODO: Either add predefined options in Airtable, or change to a text field
    // if (body.dietaryRestrictions && body.dietaryRestrictions.trim()) {
    //   airtableFields["Dietary Restrictions"] = body.dietaryRestrictions.trim();
    // }
    // Available Days - send as array for multi-select field
    if (body.availableDays !== undefined && body.availableDays) {
      const daysArray = body.availableDays.split(", ").filter((d: string) => d.trim());
      if (daysArray.length > 0) {
        airtableFields["Available Days"] = daysArray;
      }
    }

    // Page 3 fields
    if (body.curiousAbout !== undefined) {
      airtableFields["Curious About"] = body.curiousAbout;
      airtableFields["OneThing"] = body.curiousAbout; // Backward compat
    }
    if (body.surprisingKnowledge !== undefined) {
      airtableFields["Surprising Knowledge"] = body.surprisingKnowledge;
    }
    if (body.funnelStage !== undefined) {
      airtableFields["Funnel Stage"] = body.funnelStage;
    }

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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup update error:", error);
    return NextResponse.json({ error: "Failed to update signup" }, { status: 500 });
  }
}
