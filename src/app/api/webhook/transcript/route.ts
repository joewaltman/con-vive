import { NextResponse } from "next/server";
import { query } from "@/lib/db";

interface TranscriptPayload {
  phone_clean: string;
  // Transcript fields (Scenario A)
  full_transcript?: string;
  summarized_transcript?: string;
  call_date?: string;
  // Structured data fields (Scenario B)
  available_days?: string[];
  dietary_restrictions?: string[];
  dietary_notes?: string;
  solo_or_couple?: string;
  hosting_interest?: string;
  call_complete?: boolean;
  funnel_stage?: string;
  what_do_you_do?: string;
  about?: string;
  curious_about?: string;
  surprising_knowledge?: string;
  curiosity_score?: number;
  spark_score?: number;
}

export async function POST(request: Request) {
  try {
    // 1. Verify webhook secret
    const webhookSecret = process.env.WEBHOOK_SECRET;
    const providedSecret = request.headers.get("x-webhook-secret");

    if (!webhookSecret || providedSecret !== webhookSecret) {
      console.log("[Webhook] Unauthorized request - invalid or missing secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TranscriptPayload = await request.json();

    // Log incoming request
    const fieldsProvided = Object.keys(body).filter((k) => k !== "phone_clean");
    console.log(`[Webhook] Received request for phone_clean: ${body.phone_clean}, fields: ${fieldsProvided.join(", ")}`);

    if (!body.phone_clean) {
      return NextResponse.json({ error: "Missing phone_clean" }, { status: 400 });
    }

    // 2. Look up guest by phone_clean
    const guestResult = await query<{ id: number }>(
      "SELECT id FROM guests WHERE phone_clean = $1",
      [body.phone_clean]
    );

    // Debug: check what's in the database
    const debugResult = await query<{ count: string; sample_phones: string }>(
      "SELECT COUNT(*) as count, string_agg(phone_clean, ', ' ORDER BY id DESC) as sample_phones FROM (SELECT phone_clean FROM guests WHERE phone_clean IS NOT NULL LIMIT 5) t"
    );
    console.log(`[Webhook] Debug - Total guests with phone_clean: ${debugResult?.[0]?.count}, samples: ${debugResult?.[0]?.sample_phones}`);

    if (!guestResult || guestResult.length === 0) {
      console.log(`[Webhook] Guest not found for phone_clean: ${body.phone_clean}`);
      return NextResponse.json(
        { error: "Guest not found", phone_clean: body.phone_clean, debug: debugResult?.[0] },
        { status: 404 }
      );
    }

    const guestId = guestResult[0].id;

    // 3a. Build dynamic UPDATE for guests table
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Map request fields to database columns
    if (body.call_date !== undefined) {
      updates.push(`call_date = $${paramIndex}`);
      values.push(body.call_date);
      paramIndex++;
    }
    if (body.available_days !== undefined) {
      updates.push(`available_days = $${paramIndex}`);
      values.push(body.available_days);
      paramIndex++;
    }
    if (body.dietary_restrictions !== undefined) {
      updates.push(`dietary_restrictions = $${paramIndex}`);
      values.push(body.dietary_restrictions);
      paramIndex++;
    }
    if (body.dietary_notes !== undefined) {
      updates.push(`dietary_notes = $${paramIndex}`);
      values.push(body.dietary_notes);
      paramIndex++;
    }
    if (body.solo_or_couple !== undefined) {
      updates.push(`solo_or_couple = $${paramIndex}`);
      values.push(body.solo_or_couple);
      paramIndex++;
    }
    if (body.hosting_interest !== undefined) {
      updates.push(`hosting_interest = $${paramIndex}`);
      values.push(body.hosting_interest);
      paramIndex++;
    }
    if (body.call_complete !== undefined) {
      updates.push(`call_complete = $${paramIndex}`);
      values.push(body.call_complete);
      paramIndex++;
    }
    if (body.funnel_stage !== undefined) {
      updates.push(`funnel_stage = $${paramIndex}`);
      values.push(body.funnel_stage);
      paramIndex++;
    }
    if (body.what_do_you_do !== undefined) {
      updates.push(`what_do_you_do = $${paramIndex}`);
      values.push(body.what_do_you_do);
      paramIndex++;
    }
    if (body.about !== undefined) {
      updates.push(`about = $${paramIndex}`);
      values.push(body.about);
      paramIndex++;
    }
    if (body.curious_about !== undefined) {
      updates.push(`curious_about = $${paramIndex}`);
      values.push(body.curious_about);
      paramIndex++;
    }
    if (body.surprising_knowledge !== undefined) {
      updates.push(`surprising_knowledge = $${paramIndex}`);
      values.push(body.surprising_knowledge);
      paramIndex++;
    }
    if (body.curiosity_score !== undefined) {
      updates.push(`curiosity_score = $${paramIndex}`);
      values.push(body.curiosity_score);
      paramIndex++;
    }
    if (body.spark_score !== undefined) {
      updates.push(`spark_score = $${paramIndex}`);
      values.push(body.spark_score);
      paramIndex++;
    }

    // Update guests table if there are fields to update
    if (updates.length > 0) {
      values.push(guestId);
      await query(
        `UPDATE guests SET ${updates.join(", ")}, updated_at = NOW() WHERE id = $${paramIndex}`,
        values
      );
      console.log(`[Webhook] Updated guest ${guestId} with ${updates.length} fields`);
    }

    // 3b. Handle transcript data
    if (body.full_transcript !== undefined || body.summarized_transcript !== undefined) {
      // Check if transcript exists for this guest
      const existingTranscript = await query<{ id: number }>(
        "SELECT id FROM transcripts WHERE guest_id = $1",
        [guestId]
      );

      if (existingTranscript && existingTranscript.length > 0) {
        // Update existing transcript
        const transcriptUpdates: string[] = [];
        const transcriptValues: unknown[] = [];
        let tParamIndex = 1;

        if (body.full_transcript !== undefined) {
          transcriptUpdates.push(`full_transcript = $${tParamIndex}`);
          transcriptValues.push(body.full_transcript);
          tParamIndex++;
        }
        if (body.summarized_transcript !== undefined) {
          transcriptUpdates.push(`summarized_transcript = $${tParamIndex}`);
          transcriptValues.push(body.summarized_transcript);
          tParamIndex++;
        }

        transcriptValues.push(guestId);
        await query(
          `UPDATE transcripts SET ${transcriptUpdates.join(", ")}, updated_at = NOW() WHERE guest_id = $${tParamIndex}`,
          transcriptValues
        );
        console.log(`[Webhook] Updated transcript for guest ${guestId}`);
      } else {
        // Insert new transcript
        await query(
          `INSERT INTO transcripts (guest_id, full_transcript, summarized_transcript) VALUES ($1, $2, $3)`,
          [guestId, body.full_transcript || null, body.summarized_transcript || null]
        );
        console.log(`[Webhook] Inserted new transcript for guest ${guestId}`);
      }
    }

    return NextResponse.json({
      success: true,
      guest_id: guestId,
      action: "updated",
    });
  } catch (error) {
    console.error("[Webhook] Error processing request:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}
