import { NextResponse } from "next/server";
import { query } from "@/lib/db";

const JOE_PHONE = "+17602748830";
const AIRTABLE_BASE_ID = "appgZoPBry2SBKP6Y";
const AIRTABLE_TABLE_ID = "tbl9xJScvbQMrGUTh";

interface QuoWebhookPayload {
  object?: string;
  callId?: string;
  transcript?: string;
  from?: string;
  to?: string;
  direction?: string;
  duration?: number;
  createdAt?: string;
}

function extractPhoneClean(phone: string): string {
  // Strip all non-digits, then take last 10 digits
  const digits = phone.replace(/\D/g, "");
  return digits.slice(-10);
}

async function summarizeWithClaude(transcript: string, guestName: string): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY not configured");
  }

  const startTime = Date.now();

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `Summarize this Con-Vive welcome call transcript. Extract: who the guest is, what they do, their personality/energy (are they curious? engaging? would they be good at a dinner table?), any notable stories or interests that would help with dinner table matching, and any red flags. Keep it concise — 3-4 paragraphs max. Focus on what would help decide if this person should be invited to a dinner and who they'd pair well with.

Transcript:
${transcript}`,
        },
      ],
    }),
  });

  const elapsed = Date.now() - startTime;
  console.log(`[Quo Webhook] Claude API response time: ${elapsed}ms`);

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function writeToAirtable(
  phoneClean: string,
  fullTranscript: string,
  summarizedTranscript: string,
  callDate: string
): Promise<void> {
  const token = process.env.AIRTABLE_API_TOKEN;
  if (!token) {
    console.log("[Quo Webhook] Skipping Airtable write - no token configured");
    return;
  }

  try {
    // Search for the record by Phone Clean
    const searchUrl = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}?filterByFormula={Phone Clean}='${phoneClean}'`;
    const searchResponse = await fetch(searchUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!searchResponse.ok) {
      const error = await searchResponse.text();
      console.error("[Quo Webhook] Airtable search error:", error);
      return;
    }

    const searchData = await searchResponse.json();
    if (!searchData.records || searchData.records.length === 0) {
      console.log(`[Quo Webhook] Airtable: No record found for phone ${phoneClean}`);
      return;
    }

    const recordId = searchData.records[0].id;

    // Update the record
    const updateResponse = await fetch(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_ID}/${recordId}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fields: {
            "Full Transcript": fullTranscript,
            "Summarized Transcript": summarizedTranscript,
            "Call Date": callDate,
          },
        }),
      }
    );

    if (!updateResponse.ok) {
      const error = await updateResponse.text();
      console.error("[Quo Webhook] Airtable update error:", error);
      return;
    }

    console.log(`[Quo Webhook] Airtable: Updated record ${recordId}`);
  } catch (error) {
    console.error("[Quo Webhook] Airtable write failed:", error);
    // Don't throw - Postgres is the source of truth
  }
}

export async function POST(request: Request) {
  try {
    const body: QuoWebhookPayload = await request.json();

    // 1. Validate the request
    if (!body.transcript) {
      console.log("[Quo Webhook] No transcript in payload, ignoring");
      return NextResponse.json({ success: true, skipped: true, reason: "no_transcript" });
    }

    if (!body.duration || body.duration < 60) {
      console.log(`[Quo Webhook] Duration ${body.duration}s < 60s, ignoring (voicemail/dropped call)`);
      return NextResponse.json({ success: true, skipped: true, reason: "short_duration" });
    }

    // 2. Extract guest phone number
    const fromPhone = body.from || "";
    const toPhone = body.to || "";

    let guestPhone: string;
    if (fromPhone === JOE_PHONE || fromPhone.endsWith("7602748830")) {
      guestPhone = toPhone;
    } else if (toPhone === JOE_PHONE || toPhone.endsWith("7602748830")) {
      guestPhone = fromPhone;
    } else {
      // Neither is Joe's number - assume it's the "from" for inbound or "to" for outbound
      guestPhone = body.direction === "outbound" ? toPhone : fromPhone;
    }

    const phoneClean = extractPhoneClean(guestPhone);
    console.log(`[Quo Webhook] Processing call - guest phone: ${phoneClean}, duration: ${body.duration}s`);

    // 3. Look up guest in Postgres
    const guestResult = await query<{ id: number; first_name: string; last_name: string }>(
      "SELECT id, first_name, last_name FROM guests WHERE phone_clean = $1",
      [phoneClean]
    );

    if (!guestResult || guestResult.length === 0) {
      console.log(`[Quo Webhook] Guest not found for phone ${phoneClean} - storing transcript anyway`);
      // Return success but note guest wasn't found
      return NextResponse.json({
        success: true,
        guest_found: false,
        phone_clean: phoneClean,
        message: "Guest not found in database",
      });
    }

    const guest = guestResult[0];
    const guestName = `${guest.first_name} ${guest.last_name}`;
    console.log(`[Quo Webhook] Found guest: ${guestName} (id: ${guest.id})`);

    // 4. Send to Claude for summarization
    let summarizedTranscript: string;
    try {
      summarizedTranscript = await summarizeWithClaude(body.transcript, guestName);
      console.log(`[Quo Webhook] Claude summary generated: ${summarizedTranscript.length} chars`);
    } catch (error) {
      console.error("[Quo Webhook] Claude API failed:", error);
      // Continue with empty summary - don't fail the whole request
      summarizedTranscript = "[Claude API error - manual review needed]";
    }

    // 5. Write to Postgres
    const callDate = body.createdAt ? body.createdAt.split("T")[0] : new Date().toISOString().split("T")[0];

    // 5a. Upsert transcript
    const existingTranscript = await query<{ id: number }>(
      "SELECT id FROM transcripts WHERE guest_id = $1",
      [guest.id]
    );

    if (existingTranscript && existingTranscript.length > 0) {
      await query(
        "UPDATE transcripts SET full_transcript = $1, summarized_transcript = $2, updated_at = NOW() WHERE guest_id = $3",
        [body.transcript, summarizedTranscript, guest.id]
      );
      console.log(`[Quo Webhook] Postgres: Updated transcript for guest ${guest.id}`);
    } else {
      await query(
        "INSERT INTO transcripts (guest_id, full_transcript, summarized_transcript) VALUES ($1, $2, $3)",
        [guest.id, body.transcript, summarizedTranscript]
      );
      console.log(`[Quo Webhook] Postgres: Inserted transcript for guest ${guest.id}`);
    }

    // 5b. Update guest record
    await query(
      `UPDATE guests SET
        call_complete = true,
        call_date = $1,
        funnel_stage = CASE WHEN funnel_stage = 'New' THEN 'Call Done' ELSE funnel_stage END,
        updated_at = NOW()
      WHERE id = $2`,
      [callDate, guest.id]
    );
    console.log(`[Quo Webhook] Postgres: Updated guest ${guest.id} - call_complete=true, call_date=${callDate}`);

    // 6. Write to Airtable (dual-write, non-blocking)
    writeToAirtable(phoneClean, body.transcript, summarizedTranscript, callDate).catch((err) =>
      console.error("[Quo Webhook] Airtable background write failed:", err)
    );

    // 7. Return success
    return NextResponse.json({
      success: true,
      guest_id: guest.id,
      guest_name: guestName,
      summary_length: summarizedTranscript.length,
    });
  } catch (error) {
    console.error("[Quo Webhook] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
