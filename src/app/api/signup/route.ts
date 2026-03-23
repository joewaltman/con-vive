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

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email, phone, ageRange, currentObsession } = body;
    if (!firstName || !lastName || !email || !phone || !ageRange || !currentObsession) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Sanitize and validate phone number
    const cleanPhone = sanitizePhone(phone);
    if (cleanPhone.length !== 10) {
      return NextResponse.json({ error: "Invalid phone number. Please enter a valid 10-digit US phone number." }, { status: 400 });
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
              Phone: cleanPhone,
              "Age Range": body.ageRange,
              "OneThing": body.currentObsession,
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json({ error: "Failed to save signup" }, { status: 500 });
  }
}
