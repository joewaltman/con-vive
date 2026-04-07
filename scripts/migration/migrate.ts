/**
 * Con-Vive: Airtable to Postgres Migration Script
 *
 * Run with: npx tsx scripts/migration/migrate.ts
 *
 * Requires:
 * - DATABASE_URL environment variable set to Railway Postgres connection string
 * - AIRTABLE_PAT environment variable set to Airtable Personal Access Token
 */

import { Client } from "pg";
import * as fs from "fs";
import * as path from "path";

// Configuration
const AIRTABLE_BASE_ID = "appgZoPBry2SBKP6Y";
const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
const DATABASE_URL = process.env.DATABASE_URL;

// Airtable table names
const SIGNUPS_TABLE = "Signups";
const DINNERS_TABLE = "Dinners";
const INVITATIONS_TABLE = "Invitations";

interface AirtableRecord {
  id: string;
  fields: Record<string, unknown>;
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

// Helper to convert empty strings to null
function emptyToNull(value: unknown): unknown {
  if (value === "" || value === undefined) return null;
  return value;
}

// Helper to parse date strings
function parseDate(value: unknown): string | null {
  if (!value || value === "") return null;
  const dateStr = String(value);
  // Airtable dates are typically ISO format
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString().split("T")[0];
}

// Helper to parse timestamp
function parseTimestamp(value: unknown): string | null {
  if (!value || value === "") return null;
  const dateStr = String(value);
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return null;
  return date.toISOString();
}

// Helper to parse arrays from Airtable
function parseArray(value: unknown): string[] | null {
  if (!value) return null;
  if (Array.isArray(value)) return value.map(String);
  if (typeof value === "string") {
    // Try to parse as JSON array
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) return parsed.map(String);
    } catch {
      // If not JSON, split by comma
      return value.split(",").map((s) => s.trim());
    }
  }
  return null;
}

// Helper to parse boolean
function parseBoolean(value: unknown): boolean | null {
  if (value === true || value === "true" || value === 1) return true;
  if (value === false || value === "false" || value === 0) return false;
  return null;
}

// Helper to parse numeric
function parseNumeric(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  return isNaN(num) ? null : num;
}

// Fetch all records from an Airtable table with pagination
async function fetchAirtableTable(tableName: string): Promise<AirtableRecord[]> {
  const allRecords: AirtableRecord[] = [];
  let offset: string | undefined;

  console.log(`Fetching ${tableName} from Airtable...`);

  do {
    const url = new URL(
      `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}`
    );
    if (offset) {
      url.searchParams.set("offset", offset);
    }

    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${AIRTABLE_PAT}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Airtable API error: ${response.status} - ${errorText}`);
    }

    const data: AirtableResponse = await response.json();
    allRecords.push(...data.records);
    offset = data.offset;

    console.log(`  Fetched ${allRecords.length} records so far...`);
  } while (offset);

  console.log(`  Total: ${allRecords.length} records from ${tableName}`);
  return allRecords;
}

// Main migration function
async function migrate() {
  // Validate environment
  if (!AIRTABLE_PAT) {
    throw new Error("AIRTABLE_PAT environment variable is required");
  }
  if (!DATABASE_URL) {
    throw new Error("DATABASE_URL environment variable is required");
  }

  console.log("Starting migration...\n");

  // Connect to Postgres
  const client = new Client({ connectionString: DATABASE_URL });
  await client.connect();
  console.log("Connected to Postgres\n");

  try {
    // Run schema.sql
    console.log("Creating schema...");
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf-8");
    await client.query(schemaSql);
    console.log("Schema created successfully\n");

    // Fetch all Airtable data
    const signups = await fetchAirtableTable(SIGNUPS_TABLE);
    const dinners = await fetchAirtableTable(DINNERS_TABLE);
    const invitations = await fetchAirtableTable(INVITATIONS_TABLE);
    console.log("");

    // Maps for foreign key lookups
    const guestIdMap = new Map<string, number>(); // airtable_record_id -> postgres id
    const guestPhoneMap = new Map<string, number>(); // phone_clean -> postgres id
    const dinnerIdMap = new Map<string, number>(); // airtable_record_id -> postgres id

    // Migrate guests
    console.log("Migrating guests...");
    for (const record of signups) {
      const f = record.fields;

      const guestResult = await client.query(
        `INSERT INTO guests (
          airtable_record_id, first_name, last_name, email, phone, phone_clean,
          priority, one_thing, about, age_range, available_days, dietary_restrictions,
          dietary_notes, solo_or_couple, hosting_interest, call_complete, call_date,
          curious_about, surprising_knowledge, funnel_stage, curiosity_score, spark_score,
          coming_solo, what_do_you_do, utm_source, utm_medium, utm_campaign,
          invite_text_sent_date, follow_up_text_sent, timestamp
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
          $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30
        )
        ON CONFLICT (email) DO UPDATE SET
          airtable_record_id = EXCLUDED.airtable_record_id,
          first_name = EXCLUDED.first_name,
          last_name = EXCLUDED.last_name,
          phone = EXCLUDED.phone,
          phone_clean = EXCLUDED.phone_clean,
          priority = EXCLUDED.priority,
          one_thing = EXCLUDED.one_thing,
          about = EXCLUDED.about,
          age_range = EXCLUDED.age_range,
          available_days = EXCLUDED.available_days,
          dietary_restrictions = EXCLUDED.dietary_restrictions,
          dietary_notes = EXCLUDED.dietary_notes,
          solo_or_couple = EXCLUDED.solo_or_couple,
          hosting_interest = EXCLUDED.hosting_interest,
          call_complete = EXCLUDED.call_complete,
          call_date = EXCLUDED.call_date,
          curious_about = EXCLUDED.curious_about,
          surprising_knowledge = EXCLUDED.surprising_knowledge,
          funnel_stage = EXCLUDED.funnel_stage,
          curiosity_score = EXCLUDED.curiosity_score,
          spark_score = EXCLUDED.spark_score,
          coming_solo = EXCLUDED.coming_solo,
          what_do_you_do = EXCLUDED.what_do_you_do,
          utm_source = EXCLUDED.utm_source,
          utm_medium = EXCLUDED.utm_medium,
          utm_campaign = EXCLUDED.utm_campaign,
          invite_text_sent_date = EXCLUDED.invite_text_sent_date,
          follow_up_text_sent = EXCLUDED.follow_up_text_sent,
          timestamp = EXCLUDED.timestamp
        RETURNING id`,
        [
          record.id,
          emptyToNull(f["First Name"]),
          emptyToNull(f["Last Name"]),
          emptyToNull(f["Email"]),
          emptyToNull(f["Phone"]),
          emptyToNull(f["Phone Clean"]),
          parseNumeric(f["Priority"]),
          emptyToNull(f["OneThing"]),
          emptyToNull(f["About"]),
          emptyToNull(f["Age Range"]),
          parseArray(f["Available Days"]),
          parseArray(f["Dietary Restrictions"]),
          emptyToNull(f["Dietary Notes"]),
          emptyToNull(f["Solo or Couple"]),
          emptyToNull(f["Hosting Interest"]),
          parseBoolean(f["Call Complete"]),
          parseDate(f["Call Date"]),
          emptyToNull(f["Curious About"]),
          emptyToNull(f["Surprising Knowledge"]),
          emptyToNull(f["Funnel Stage"]),
          parseNumeric(f["Curiosity Score"]),
          parseNumeric(f["Spark Score"]),
          emptyToNull(f["Coming Solo"]),
          emptyToNull(f["What Do You Do"]),
          emptyToNull(f["UTM Source"]),
          emptyToNull(f["UTM Medium"]),
          emptyToNull(f["UTM Campaign"]),
          parseDate(f["Invite Text Sent Date"]),
          parseDate(f["Follow up Text Sent"]),
          parseTimestamp(f["Timestamp"]),
        ]
      );

      const guestId = guestResult.rows[0].id;
      guestIdMap.set(record.id, guestId);

      // Also map by phone_clean for invitation matching
      const phoneClean = f["Phone Clean"];
      if (phoneClean && typeof phoneClean === "string") {
        guestPhoneMap.set(phoneClean, guestId);
      }

      // Insert transcript if exists
      const fullTranscript = f["Full Transcript"];
      const summarizedTranscript = f["Summarized Transcript"];
      if (fullTranscript || summarizedTranscript) {
        await client.query(
          `INSERT INTO transcripts (guest_id, full_transcript, summarized_transcript)
           VALUES ($1, $2, $3)`,
          [guestId, emptyToNull(fullTranscript), emptyToNull(summarizedTranscript)]
        );
      }
    }
    console.log(`  Migrated ${signups.length} guests\n`);

    // Migrate dinners
    console.log("Migrating dinners...");
    for (const record of dinners) {
      const f = record.fields;

      const dinnerResult = await client.query(
        `INSERT INTO dinners (
          airtable_record_id, dinner_name, dinner_date, host, location,
          guest_count, menu, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id`,
        [
          record.id,
          emptyToNull(f["Dinner Name"] || f["Name"]),
          parseDate(f["Dinner Date"] || f["Date"]),
          emptyToNull(f["Host"]),
          emptyToNull(f["Location"]),
          parseNumeric(f["Guest Count"]),
          emptyToNull(f["Menu"]),
          emptyToNull(f["Notes"]),
        ]
      );

      dinnerIdMap.set(record.id, dinnerResult.rows[0].id);
    }
    console.log(`  Migrated ${dinners.length} dinners\n`);

    // Migrate invitations
    console.log("Migrating invitations...");
    const unmatchedInvitations: Array<{
      recordId: string;
      guestName: string | null;
      phone: string | null;
    }> = [];

    for (const record of invitations) {
      const f = record.fields;

      // Try to match guest by linked record first, then by phone
      let guestId: number | null = null;

      // Check if there's a linked Guest field (Airtable linked records)
      const linkedGuests = f["Guest"] || f["Guests"];
      if (Array.isArray(linkedGuests) && linkedGuests.length > 0) {
        guestId = guestIdMap.get(linkedGuests[0]) || null;
      }

      // If no linked record, try matching by phone
      if (!guestId) {
        const phone = f["Phone"] || f["Phone Clean"];
        if (phone && typeof phone === "string") {
          // Normalize phone for matching
          const phoneClean = phone.replace(/\D/g, "");
          guestId = guestPhoneMap.get(phoneClean) || null;

          // Also try with the raw phone value
          if (!guestId) {
            guestId = guestPhoneMap.get(phone) || null;
          }
        }
      }

      // Try to match dinner by linked record
      let dinnerId: number | null = null;
      const linkedDinners = f["Dinner"] || f["Dinners"];
      if (Array.isArray(linkedDinners) && linkedDinners.length > 0) {
        dinnerId = dinnerIdMap.get(linkedDinners[0]) || null;
      }

      const guestName = emptyToNull(f["Guest Name"] || f["Name"]) as string | null;
      const phone = emptyToNull(f["Phone"]) as string | null;

      await client.query(
        `INSERT INTO invitations (
          airtable_record_id, guest_id, dinner_id, guest_name, phone,
          invite_sent_date, dinner_date_proposed, response, response_date,
          invite_message, notes
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [
          record.id,
          guestId,
          dinnerId,
          guestName,
          phone,
          parseDate(f["Invite Sent Date"] || f["Sent Date"]),
          parseDate(f["Dinner Date Proposed"] || f["Proposed Date"]),
          emptyToNull(f["Response"]),
          parseDate(f["Response Date"]),
          emptyToNull(f["Invite Message"] || f["Message"]),
          emptyToNull(f["Notes"]),
        ]
      );

      if (!guestId) {
        unmatchedInvitations.push({
          recordId: record.id,
          guestName,
          phone,
        });
      }
    }
    console.log(`  Migrated ${invitations.length} invitations\n`);

    // Report unmatched invitations
    if (unmatchedInvitations.length > 0) {
      console.log("=== UNMATCHED INVITATIONS (guest_id = NULL) ===");
      console.log("These invitations could not be matched to a guest:\n");
      for (const inv of unmatchedInvitations) {
        console.log(`  Record: ${inv.recordId}`);
        console.log(`  Name: ${inv.guestName || "(none)"}`);
        console.log(`  Phone: ${inv.phone || "(none)"}`);
        console.log("");
      }
      console.log(`Total unmatched: ${unmatchedInvitations.length}\n`);
    }

    // Run verification queries
    console.log("=== VERIFICATION ===\n");

    const guestCount = await client.query("SELECT count(*) FROM guests");
    console.log(`Guests: ${guestCount.rows[0].count}`);

    const transcriptCount = await client.query("SELECT count(*) FROM transcripts");
    console.log(`Transcripts: ${transcriptCount.rows[0].count}`);

    const dinnerCount = await client.query("SELECT count(*) FROM dinners");
    console.log(`Dinners: ${dinnerCount.rows[0].count}`);

    const invitationCount = await client.query("SELECT count(*) FROM invitations");
    console.log(`Invitations: ${invitationCount.rows[0].count}`);

    const unmatchedCount = await client.query(
      "SELECT count(*) FROM invitations WHERE guest_id IS NULL"
    );
    console.log(`Unmatched invitations: ${unmatchedCount.rows[0].count}`);

    console.log("\n=== MIGRATION COMPLETE ===");
  } finally {
    await client.end();
  }
}

// Run migration
migrate().catch((error) => {
  console.error("Migration failed:", error);
  process.exit(1);
});
