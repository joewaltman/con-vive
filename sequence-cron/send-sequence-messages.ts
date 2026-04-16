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

function buildStep2Message(firstName: string): { message: string; variant: string } {
  const variant = Math.random() < 0.5 ? 'C' : 'E';
  if (variant === 'C') {
    return {
      message: `Hey ${firstName}, Joe from Con-Vive. Something I've been asking guests lately: if you could sit next to anyone at a dinner, not someone famous, just a person with a specific skill or experience you find fascinating, who would you want next to you? - Joe`,
      variant,
    };
  } else {
    return {
      message: `Hey ${firstName}, Joe from Con-Vive. Here's something I like to ask: if you had to teach the table something in under two minutes, no prep, what would you go with? - Joe`,
      variant,
    };
  }
}

function buildStep3Message(firstName: string): { message: string; variant: string } {
  const variant = Math.random() < 0.5 ? 'D' : 'E';
  if (variant === 'D') {
    return {
      message: `Hey ${firstName}, one more from me. This always starts the best dinner conversations: what's an opinion you hold that most people in your circle would disagree with? - Joe`,
      variant,
    };
  } else {
    return {
      message: `Hey ${firstName}, one more from me. This is probably my favorite question: what's something you used to believe strongly but completely changed your mind about? - Joe`,
      variant,
    };
  }
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
 * Ensure m2_variant and m3_variant columns exist
 */
async function ensureVariantColumns(pool: Pool): Promise<void> {
  const { rows } = await pool.query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'm2_variant'
  `);
  if (rows.length === 0) {
    console.log("Adding m2_variant and m3_variant columns...");
    await pool.query(`ALTER TABLE guests ADD COLUMN m2_variant CHAR(1)`);
    await pool.query(`ALTER TABLE guests ADD COLUMN m3_variant CHAR(1)`);
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
    // Ensure migrations are applied
    await ensureMigration(pool);
    await ensureVariantColumns(pool);

    let totalScheduled = 0;
    let totalSent = 0;
    let totalFailed = 0;

    // STEP 2 (M2): Prompt question
    console.log("\n--- Step 2 (M2): Prompt question ---");

    // Phase A: Schedule eligible guests
    const { rows: step2ToSchedule } = await pool.query<SchedulableGuest>(
      `SELECT id, first_name
       FROM guests
       WHERE sequence_step = 1
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND priority IS NULL
         AND last_message_sent_at < NOW() - INTERVAL '48 hours'
         AND last_replied_at IS NULL
         AND next_sequence_scheduled_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step2ToSchedule.length} guest(s) to schedule for M2`);

    for (const guest of step2ToSchedule) {
      const scheduledTime = generateRandomSendTime();
      if (dryRun) {
        console.log(`[DRY RUN] Would schedule ${guest.first_name} for M2 at ${scheduledTime.toISOString()}`);
      } else {
        await pool.query(
          `UPDATE guests
           SET next_sequence_scheduled_at = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, scheduledTime]
        );
        console.log(`Scheduled ${guest.first_name} for M2 at ${scheduledTime.toISOString()}`);
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
         AND priority IS NULL
         AND next_sequence_scheduled_at IS NOT NULL
         AND next_sequence_scheduled_at <= NOW()
         AND last_replied_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY next_sequence_scheduled_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step2ToSend.length} guest(s) ready to send M2`);

    for (const guest of step2ToSend) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;
      const { message, variant } = buildStep2Message(guest.first_name);

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}) [variant ${variant}]: "${message}"`);
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
               m2_variant = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, variant]
        );

        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type)
           VALUES ($1, 'outbound', $2, $3, 2, 'sequence')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent M2 to ${guest.first_name} (***${phoneLast4}) [variant ${variant}]`);
        totalSent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`FAILED M2 for ${guest.first_name} (***${phoneLast4}):`, err);
        totalFailed++;
      }
    }

    // STEP 3 (M3): Follow-up prompt
    console.log("\n--- Step 3 (M3): Follow-up prompt ---");

    // Phase A: Schedule eligible guests
    const { rows: step3ToSchedule } = await pool.query<SchedulableGuest>(
      `SELECT id, first_name
       FROM guests
       WHERE sequence_step = 2
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND priority IS NULL
         AND last_message_sent_at < NOW() - INTERVAL '2 days'
         AND last_replied_at IS NULL
         AND next_sequence_scheduled_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step3ToSchedule.length} guest(s) to schedule for M3`);

    for (const guest of step3ToSchedule) {
      const scheduledTime = generateRandomSendTime();
      if (dryRun) {
        console.log(`[DRY RUN] Would schedule ${guest.first_name} for M3 at ${scheduledTime.toISOString()}`);
      } else {
        await pool.query(
          `UPDATE guests
           SET next_sequence_scheduled_at = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, scheduledTime]
        );
        console.log(`Scheduled ${guest.first_name} for M3 at ${scheduledTime.toISOString()}`);
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
         AND priority IS NULL
         AND next_sequence_scheduled_at IS NOT NULL
         AND next_sequence_scheduled_at <= NOW()
         AND last_replied_at IS NULL
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY next_sequence_scheduled_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step3ToSend.length} guest(s) ready to send M3`);

    for (const guest of step3ToSend) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;
      const { message, variant } = buildStep3Message(guest.first_name);

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}) [variant ${variant}]: "${message}"`);
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
               m3_variant = $2,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id, variant]
        );

        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, sequence_step, message_type)
           VALUES ($1, 'outbound', $2, $3, 3, 'sequence')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent M3 to ${guest.first_name} (***${phoneLast4}) [variant ${variant}]`);
        totalSent++;
        await sleep(DELAY_MS);
      } catch (err) {
        console.error(`FAILED M3 for ${guest.first_name} (***${phoneLast4}):`, err);
        totalFailed++;
      }
    }

    // Silent close-out for guests who didn't respond to M3
    console.log("\n--- Sequence close-out ---");
    const closeOutQuery = `
      UPDATE guests
      SET sequence_completed = TRUE,
          updated_at = NOW()
      WHERE sequence_step = 3
        AND sequence_paused = FALSE
        AND sequence_completed = FALSE
        AND priority IS NULL
        AND last_message_sent_at < NOW() - INTERVAL '48 hours'
        AND last_replied_at IS NULL
        AND phone_clean IS NOT NULL
    `;

    if (dryRun) {
      const { rows: toCloseOut } = await pool.query(
        `SELECT id, first_name FROM guests
         WHERE sequence_step = 3
           AND sequence_paused = FALSE
           AND sequence_completed = FALSE
           AND priority IS NULL
           AND last_message_sent_at < NOW() - INTERVAL '48 hours'
           AND last_replied_at IS NULL
           AND phone_clean IS NOT NULL`
      );
      console.log(`[DRY RUN] Would close out ${toCloseOut.length} guest(s) with no M3 response`);
      for (const guest of toCloseOut) {
        console.log(`[DRY RUN] Would close out ${guest.first_name}`);
      }
    } else {
      const { rowCount } = await pool.query(closeOutQuery);
      console.log(`Closed out ${rowCount} guest(s) with no M3 response`);
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
