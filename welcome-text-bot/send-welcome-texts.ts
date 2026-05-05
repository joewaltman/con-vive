import { Pool } from "pg";
import { runMigration, syncContacts } from "./contacts";

const MAX_TEXTS_PER_RUN = 20;
const TEXT_DELAY_MS = 1000;
const FROM_PHONE = "+17602748830";

const DINNER_ANECDOTES = [
  "I hosted a dinner last week where a former White House budget official who lived in Paris for years and an actress who graduated pastry school spent half the dinner arguing about which Parisian bakery has the best croissant.",
  "At a recent dinner, a data scientist and a dog grooming salon owner who both moved to North County for a fresh start spent the whole evening comparing notes on reinventing yourself.",
  "At my last dinner, a Marine who served in Iraq and a retired political director from AARP ended up finding out they'd both worked on opposite sides of the same policy issue a decade apart.",
  "I hosted a dinner recently where an airline employee who used to grow cannabis in Baja and a retired engineering leader who took up paragliding ended up comparing notes on second acts.",
  "Last week a venture capitalist and a woman who built and sold a semiconductor company in the 80s spent half the dinner comparing notes on what Silicon Valley used to feel like versus what it is now.",
  "A retired Navy helicopter pilot and the guy running the last dairy in San Diego ended up deep in conversation about what it actually takes to keep something old and complicated running.",
  "A medical device engineer who used to ride BMX and a guy who started a nonprofit teaching kids algebra spent a long stretch comparing what it takes to commit to something hard.",
  "Two psychotherapists at the same table, very different schools of thought, ended up gently arguing about what therapy is actually for.",
];

interface Guest {
  id: number;
  first_name: string;
  phone_clean: string;
  curious_about: string | null;
  surprising_knowledge: string | null;
  one_thing: string | null;
  about: string | null;
  created_at: Date;
}

interface SchedulableGuest {
  id: number;
  first_name: string;
  curious_about: string | null;
  surprising_knowledge: string | null;
  one_thing: string | null;
  about: string | null;
  created_at: Date;
}

interface SendableGuest extends Guest {
  next_sequence_scheduled_at: Date;
}

async function generatePersonalizedLine(guest: {
  curious_about?: string | null;
  surprising_knowledge?: string | null;
  one_thing?: string | null;
  about?: string | null;
}): Promise<string> {
  const context = guest.curious_about || guest.surprising_knowledge || guest.one_thing || guest.about;
  if (!context) return "Really glad you signed up.";

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return "Really glad you signed up.";

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 100,
        system: "You are helping Joe write a short personalized line for a welcome text message. Write ONE sentence (under 20 words) that warmly references something specific from the guest's signup form. Be casual and genuine, not corporate. Do not use em dashes. Return ONLY the sentence, nothing else.",
        messages: [{ role: "user", content: `Guest info: ${context}` }],
      }),
    });

    if (!res.ok) throw new Error(`API ${res.status}`);
    const json = await res.json();
    return json.content[0]?.text || "Really glad you signed up.";
  } catch {
    return "Really glad you signed up.";
  }
}

function buildMessage(firstName: string, personalizedLine: string, anecdote: string): string {
  return `Hey ${firstName}! This is Joe from Con-Vive. ${personalizedLine} ${anecdote} That's the kind of thing that happens at these. If you're on LinkedIn or Instagram, drop me your link? Helps me start thinking about who you'd be great next to. Looking forward to getting you to a table. - Joe`;
}

async function sendSms(to: string, content: string): Promise<{ id: string }> {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) throw new Error("QUO_API_KEY not set");

  const res = await fetch("https://api.openphone.com/v1/messages", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      content,
      from: FROM_PHONE,
      to: [to],
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Quo API ${res.status}: ${body}`);
  }

  const json = await res.json();
  return { id: json.data.id };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Check if a timestamp is within the 8am-8pm PT window
 */
function isWithinSendWindow(date: Date): boolean {
  const ptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  });
  const hourPT = parseInt(ptFormatter.format(date), 10);
  return hourPT >= 8 && hourPT < 20;
}

/**
 * Check if created_at is within the last 14 hours
 */
function isWithin14Hours(createdAt: Date): boolean {
  const now = new Date();
  const hoursDiff = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
  return hoursDiff <= 14;
}

/**
 * Generate a random delay between 15-30 minutes from now
 */
function generateImmediateSendTime(): Date {
  const delayMinutes = 15 + Math.floor(Math.random() * 16); // 15-30 minutes
  return new Date(Date.now() + delayMinutes * 60 * 1000);
}

/**
 * Generate a random send time between 9:00-11:00 AM PT tomorrow (or today if before 11am PT)
 */
function generateMorningSendTime(): Date {
  const now = new Date();

  // Get current hour in PT
  const ptFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    hour12: false,
  });
  const currentHourPT = parseInt(ptFormatter.format(now), 10);

  // Get current date parts in PT
  const ptDateFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const ptDateParts = ptDateFormatter.formatToParts(now);
  let year = parseInt(ptDateParts.find((p) => p.type === "year")!.value, 10);
  let month = parseInt(ptDateParts.find((p) => p.type === "month")!.value, 10);
  let day = parseInt(ptDateParts.find((p) => p.type === "day")!.value, 10);

  // If it's 11am PT or later, schedule for tomorrow
  if (currentHourPT >= 11) {
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const tomorrowParts = ptDateFormatter.formatToParts(tomorrow);
    year = parseInt(tomorrowParts.find((p) => p.type === "year")!.value, 10);
    month = parseInt(tomorrowParts.find((p) => p.type === "month")!.value, 10);
    day = parseInt(tomorrowParts.find((p) => p.type === "day")!.value, 10);
  }

  // Get the correct UTC offset for PT on this date
  const tempDate = new Date(`${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00Z`);
  const ptOffsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    timeZoneName: "shortOffset",
  });
  const offsetMatch = ptOffsetFormatter.format(tempDate).match(/GMT([+-]\d+)/);
  const ptOffsetHours = offsetMatch ? parseInt(offsetMatch[1], 10) : -8;

  // Create 9:00 AM PT in UTC
  const base9amUTC = new Date(Date.UTC(year, month - 1, day, 9 - ptOffsetHours, 0, 0));

  // Add 0-119 random minutes (spreads across 9:00-10:59 AM PT)
  const randomMinutes = Math.floor(Math.random() * 120);
  return new Date(base9amUTC.getTime() + randomMinutes * 60 * 1000);
}

async function sendWelcomeTexts(pool: Pool, dryRun: boolean): Promise<void> {
  let scheduled = 0;
  let sent = 0;
  let failed = 0;

  // Phase A: Schedule guests who need M1
  // Exclude cal-alumni signups (they use email-only communication)
  console.log("Phase A: Scheduling...");
  const { rows: toSchedule } = await pool.query<SchedulableGuest>(
    `SELECT id, first_name, curious_about, surprising_knowledge, one_thing, about, created_at
     FROM guests
     WHERE funnel_stage = 'New'
       AND invite_text_sent_date IS NULL
       AND next_sequence_scheduled_at IS NULL
       AND phone_clean IS NOT NULL
       AND phone_clean != ''
       AND (signup_source IS NULL OR signup_source NOT IN ('cal-alumni', 'trojan-alumni'))
     ORDER BY created_at ASC
     LIMIT $1`,
    [MAX_TEXTS_PER_RUN]
  );

  console.log(`Found ${toSchedule.length} guest(s) to schedule for M1`);

  for (const guest of toSchedule) {
    const now = new Date();
    let scheduledTime: Date;

    // If created within 14 hours AND within 8am-8pm PT window, schedule soon
    if (isWithin14Hours(guest.created_at) && isWithinSendWindow(now)) {
      scheduledTime = generateImmediateSendTime();
    } else {
      scheduledTime = generateMorningSendTime();
    }

    if (dryRun) {
      console.log(`[DRY RUN] Would schedule ${guest.first_name} for M1 at ${scheduledTime.toISOString()}`);
    } else {
      await pool.query(
        `UPDATE guests
         SET next_sequence_scheduled_at = $2,
             updated_at = NOW()
         WHERE id = $1`,
        [guest.id, scheduledTime]
      );
      console.log(`Scheduled ${guest.first_name} for M1 at ${scheduledTime.toISOString()}`);
    }
    scheduled++;
  }

  // Phase B: Send scheduled texts
  // Exclude cal-alumni signups (they use email-only communication)
  console.log("\nPhase B: Sending...");
  const { rows: toSend } = await pool.query<SendableGuest>(
    `SELECT id, first_name, phone_clean, curious_about, surprising_knowledge, one_thing, about, created_at, next_sequence_scheduled_at
     FROM guests
     WHERE funnel_stage = 'New'
       AND invite_text_sent_date IS NULL
       AND next_sequence_scheduled_at IS NOT NULL
       AND next_sequence_scheduled_at <= NOW()
       AND phone_clean IS NOT NULL
       AND phone_clean != ''
       AND (signup_source IS NULL OR signup_source NOT IN ('cal-alumni', 'trojan-alumni'))
     ORDER BY next_sequence_scheduled_at ASC
     LIMIT $1`,
    [MAX_TEXTS_PER_RUN]
  );

  console.log(`Found ${toSend.length} guest(s) ready to send M1`);

  for (const guest of toSend) {
    const phoneLast4 = guest.phone_clean.slice(-4);
    const to = `+1${guest.phone_clean}`;

    // Generate personalized line and pick random anecdote
    const personalizedLine = await generatePersonalizedLine(guest);
    const anecdote = DINNER_ANECDOTES[Math.floor(Math.random() * DINNER_ANECDOTES.length)];
    const message = buildMessage(guest.first_name, personalizedLine, anecdote);

    if (dryRun) {
      console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
      sent++;
      continue;
    }

    try {
      const { id: quoMessageId } = await sendSms(to, message);

      // Update guest: set invite_text_sent_date, sequence_step, last_message_sent_at, clear scheduled
      await pool.query(
        `UPDATE guests
         SET invite_text_sent_date = CURRENT_DATE,
             sequence_step = 1,
             last_message_sent_at = NOW(),
             next_sequence_scheduled_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [guest.id]
      );

      // Insert message record
      await pool.query(
        `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type)
         VALUES ($1, 'outbound', $2, $3, 1, 'sequence')`,
        [guest.id, message, quoMessageId]
      );

      console.log(`Sent M1 to ${guest.first_name} (***${phoneLast4})`);
      sent++;

      // Rate limit delay (skip after last one)
      if (guest !== toSend[toSend.length - 1]) {
        await sleep(TEXT_DELAY_MS);
      }
    } catch (err) {
      console.error(`FAILED to text ${guest.first_name} (***${phoneLast4}):`, err);
      failed++;
    }
  }

  console.log(`\nM1 Summary — Scheduled: ${scheduled}, Sent: ${sent}, Failed: ${failed}`);
}

/**
 * Ensure the next_sequence_scheduled_at column exists
 */
async function ensureSchedulingMigration(pool: Pool): Promise<void> {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'next_sequence_scheduled_at'
  `);

  if (rows.length === 0) {
    console.log("Adding next_sequence_scheduled_at column to guests table...");
    await pool.query(`ALTER TABLE guests ADD COLUMN next_sequence_scheduled_at TIMESTAMPTZ`);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_guests_next_scheduled
      ON guests(next_sequence_scheduled_at)
      WHERE next_sequence_scheduled_at IS NOT NULL
    `);
    console.log("Migration complete.");
  }
}

async function connectWithRetry(pool: Pool, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err: unknown) {
      const error = err as { code?: string };
      const isTransient = error.code === "EAI_AGAIN" || error.code === "ENOTFOUND" || error.code === "ECONNREFUSED";
      if (isTransient && attempt < maxRetries) {
        const delayMs = attempt * 2000;
        console.log(`Database connection attempt ${attempt} failed (${error.code}), retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const backfill = process.argv.includes("--backfill");

  if (dryRun) console.log("[DRY RUN] No changes will be made.\n");
  if (backfill) console.log("[BACKFILL] Syncing ALL guests to Quo contacts (no texts).\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Retry connection in case of transient DNS failures
    await connectWithRetry(pool);

    // 1. Run migration (add quo_contact_id if missing)
    await runMigration(pool);

    // 2. Ensure scheduling column exists
    await ensureSchedulingMigration(pool);

    // 3. Sync contacts to Quo
    console.log("\n--- Contact Sync ---");
    const contactResult = await syncContacts(pool, { dryRun, backfill });
    console.log(
      `\nContacts — Created: ${contactResult.created}, Already exists: ${contactResult.alreadyExists}, Failed: ${contactResult.failed}`
    );

    // 4. Send welcome texts (skip in backfill mode)
    if (!backfill) {
      console.log("\n--- Welcome Texts (M1) ---");
      await sendWelcomeTexts(pool, dryRun);
    }

    console.log("\nDone.");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
