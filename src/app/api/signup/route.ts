import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { firstName, lastName, email, phone, ageRange, whatDoYouDo } = body;
    if (!firstName || !lastName || !email || !phone || !ageRange || !whatDoYouDo) {
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
              Phone: body.phone,
              "Age Range": body.ageRange,
              "What Do You Do": body.whatDoYouDo,
              About: body.about || "",
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
