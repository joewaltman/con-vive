import { Pool } from "pg";

const MAX_PER_RUN = 20;
const DELAY_MS = 1000;
const FROM_PHONE = "+17602748830";

interface Guest {
  id: number;
  first_name: string;
  phone_clean: string;
  sequence_step: number;
  curious_about: string | null;
}

interface SchedulableGuest {
  id: number;
  first_name: string;
}

interface SendableGuest extends Guest {
  next_sequence_scheduled_at: Date;
}

function buildStep2Message(firstName: string): string {
  return `Hey ${firstName}! Do you have an Instagram, LinkedIn, or anywhere I can take a quick look? Sometimes it means we can skip a call entirely. — Joe`;
}

function buildStep3Message(): string {
  return `One quick question while I'm putting your table together — what do you know a surprising amount about? Doesn't have to be glamorous. — Joe`;
}

function buildStep4Message(firstName: string): string {
  return `Hey ${firstName}! Still would love to get you to a dinner when the timing is right. Whenever you're ready, just reply here. — Joe`;
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
 * Ensure the next_sequence_scheduled_at column exists
 */
async function ensureMigration(pool: Pool): Promise<void> {
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

/**
 * Generate a random send time between 9:00-11:00 AM PT
 * If it's before 11am PT today, schedule for today; otherwise tomorrow
 */
function generateRandomSendTime(): Date {
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

  // Create 9:00 AM PT on target day
  // Use Intl to get the correct UTC offset for that date (handles DST)
  const targetDateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00`;

  // Create a date object and adjust for PT timezone
  // First, get the offset for PT on this date
  const tempDate = new Date(`${targetDateStr}Z`);
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

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const forceRun = process.argv.includes("--force"); // For testing/debugging

  if (dryRun) console.log("[DRY RUN] No texts will be sent.\n");
  if (forceRun) console.log("[FORCE] Running in force mode.\n");

  console.log(`Current time: ${new Date().toISOString()}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Ensure migration is applied
    await ensureMigration(pool);

    let totalScheduled = 0;
    let totalSent = 0;
    let totalFailed = 0;

    // STEP 2: Social link ask
    console.log("\n--- Step 2: Social link ask ---");

    // Phase A: Schedule eligible guests
    const { rows: step2ToSchedule } = await pool.query<SchedulableGuest>(
      `SELECT id, first_name
       FROM guests
       WHERE sequence_step = 1
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '30 minutes'
         AND next_sequence_scheduled_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step2ToSchedule.length} guest(s) to schedule for Step 2`);

    for (const guest of step2ToSchedule) {
      const scheduledTime = generateRandomSendTime();
      if (dryRun) {
        console.log(`[DRY RUN] Would schedule ${guest.first_name} for Step 2 at ${scheduledTime.toISOString()}`);
      } else {
        await pool.query(
          `UPDATE guests
           SET next_sequence_scheduled_at = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, scheduledTime]
        );
        console.log(`Scheduled ${guest.first_name} for Step 2 at ${scheduledTime.toISOString()}`);
      }
      totalScheduled++;
    }

    // Phase B: Send scheduled texts
    const { rows: step2ToSend } = await pool.query<SendableGuest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about, next_sequence_scheduled_at
       FROM guests
       WHERE sequence_step = 1
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND next_sequence_scheduled_at IS NOT NULL
         AND next_sequence_scheduled_at <= NOW()
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY next_sequence_scheduled_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step2ToSend.length} guest(s) ready to send Step 2`);

    for (const guest of step2ToSend) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;
      const message = buildStep2Message(guest.first_name);

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
        totalSent++;
        continue;
      }

      try {
        const { id: quoMessageId } = await sendSms(to, message);

        await pool.query(
          `UPDATE guests
           SET sequence_step = 2,
               last_message_sent_at = NOW(),
               next_sequence_scheduled_at = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id]
        );

        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type)
           VALUES ($1, 'outbound', $2, $3, 2, 'sequence')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent Step 2 to ${guest.first_name} (***${phoneLast4})`);
        totalSent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`FAILED Step 2 for ${guest.first_name} (***${phoneLast4}):`, err);
        totalFailed++;
      }
    }

    // STEP 3: Curiosity question
    console.log("\n--- Step 3: Curiosity question ---");

    // Phase A: Schedule eligible guests
    const { rows: step3ToSchedule } = await pool.query<SchedulableGuest>(
      `SELECT id, first_name
       FROM guests
       WHERE sequence_step = 2
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '2 days'
         AND next_sequence_scheduled_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step3ToSchedule.length} guest(s) to schedule for Step 3`);

    for (const guest of step3ToSchedule) {
      const scheduledTime = generateRandomSendTime();
      if (dryRun) {
        console.log(`[DRY RUN] Would schedule ${guest.first_name} for Step 3 at ${scheduledTime.toISOString()}`);
      } else {
        await pool.query(
          `UPDATE guests
           SET next_sequence_scheduled_at = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, scheduledTime]
        );
        console.log(`Scheduled ${guest.first_name} for Step 3 at ${scheduledTime.toISOString()}`);
      }
      totalScheduled++;
    }

    // Phase B: Send scheduled texts
    const { rows: step3ToSend } = await pool.query<SendableGuest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about, next_sequence_scheduled_at
       FROM guests
       WHERE sequence_step = 2
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND next_sequence_scheduled_at IS NOT NULL
         AND next_sequence_scheduled_at <= NOW()
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY next_sequence_scheduled_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step3ToSend.length} guest(s) ready to send Step 3`);

    for (const guest of step3ToSend) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;
      const message = buildStep3Message();

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
        totalSent++;
        continue;
      }

      try {
        const { id: quoMessageId } = await sendSms(to, message);

        await pool.query(
          `UPDATE guests
           SET sequence_step = 3,
               last_message_sent_at = NOW(),
               next_sequence_scheduled_at = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id]
        );

        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type)
           VALUES ($1, 'outbound', $2, $3, 3, 'sequence')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent Step 3 to ${guest.first_name} (***${phoneLast4})`);
        totalSent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`FAILED Step 3 for ${guest.first_name} (***${phoneLast4}):`, err);
        totalFailed++;
      }
    }

    // STEP 4: Soft nudge
    console.log("\n--- Step 4: Soft nudge ---");

    // Phase A: Schedule eligible guests
    const { rows: step4ToSchedule } = await pool.query<SchedulableGuest>(
      `SELECT id, first_name
       FROM guests
       WHERE sequence_step = 3
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '5 days'
         AND next_sequence_scheduled_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step4ToSchedule.length} guest(s) to schedule for Step 4`);

    for (const guest of step4ToSchedule) {
      const scheduledTime = generateRandomSendTime();
      if (dryRun) {
        console.log(`[DRY RUN] Would schedule ${guest.first_name} for Step 4 at ${scheduledTime.toISOString()}`);
      } else {
        await pool.query(
          `UPDATE guests
           SET next_sequence_scheduled_at = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, scheduledTime]
        );
        console.log(`Scheduled ${guest.first_name} for Step 4 at ${scheduledTime.toISOString()}`);
      }
      totalScheduled++;
    }

    // Phase B: Send scheduled texts
    const { rows: step4ToSend } = await pool.query<SendableGuest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about, next_sequence_scheduled_at
       FROM guests
       WHERE sequence_step = 3
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND next_sequence_scheduled_at IS NOT NULL
         AND next_sequence_scheduled_at <= NOW()
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY next_sequence_scheduled_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step4ToSend.length} guest(s) ready to send Step 4`);

    for (const guest of step4ToSend) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;
      const message = buildStep4Message(guest.first_name);

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
        totalSent++;
        continue;
      }

      try {
        const { id: quoMessageId } = await sendSms(to, message);

        await pool.query(
          `UPDATE guests
           SET sequence_step = 4,
               sequence_completed = TRUE,
               last_message_sent_at = NOW(),
               next_sequence_scheduled_at = NULL,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id]
        );

        // Insert message and mark as flagged for follow-up
        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type, flagged, flagged_reason)
           VALUES ($1, 'outbound', $2, $3, 4, 'sequence', TRUE, 'sequence_complete_no_response')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent Step 4 to ${guest.first_name} (***${phoneLast4}) - sequence complete`);
        totalSent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`FAILED Step 4 for ${guest.first_name} (***${phoneLast4}):`, err);
        totalFailed++;
      }
    }

    // 48-HOUR NO-REPLY CHECK
    // Check guests at step 2 who haven't replied in 48h but have >10 words in curious_about
    console.log("\n--- 48-hour no-reply check ---");
    const { rows: noReplyGuests } = await pool.query<Guest>(
      `SELECT id, first_name, phone_clean, curious_about
       FROM guests
       WHERE sequence_step = 2
         AND sequence_paused = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '48 hours'
         AND last_replied_at IS NULL
         AND curious_about IS NOT NULL
         AND array_length(regexp_split_to_array(curious_about, '\\s+'), 1) > 10
         AND phone_clean IS NOT NULL`,
      []
    );

    console.log(`Found ${noReplyGuests.length} guest(s) with detailed curious_about but no reply`);

    for (const guest of noReplyGuests) {
      if (dryRun) {
        console.log(`[DRY RUN] Would flag ${guest.first_name} for unrouted_reply`);
        continue;
      }

      // Get the last message for this guest and flag it
      await pool.query(
        `UPDATE messages
         SET flagged = TRUE,
             flagged_reason = 'unrouted_reply'
         WHERE id = (
           SELECT id FROM messages
           WHERE guest_id = $1 AND direction = 'outbound'
           ORDER BY sent_at DESC
           LIMIT 1
         )`,
        [guest.id]
      );

      console.log(`Flagged ${guest.first_name} for manual review (has detailed curious_about)`);
    }

    console.log(`\nDone. Scheduled: ${totalScheduled}, Sent: ${totalSent}, Failed: ${totalFailed}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
