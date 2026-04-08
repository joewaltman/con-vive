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
 * Check if current time is in the 9:00-9:14 AM PST window
 */
function isIn9amPstWindow(): boolean {
  const now = new Date();
  // Convert to PST (UTC-8, or UTC-7 during DST)
  const pstOffset = now.toLocaleString("en-US", { timeZone: "America/Los_Angeles" });
  const pstDate = new Date(pstOffset);
  const hours = pstDate.getHours();
  const minutes = pstDate.getMinutes();

  return hours === 9 && minutes >= 0 && minutes <= 14;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const forceRun = process.argv.includes("--force"); // Skip time window check

  if (dryRun) console.log("[DRY RUN] No texts will be sent.\n");

  // Check if we're in the 9am window (unless forcing)
  const in9amWindow = isIn9amPstWindow();
  console.log(`Current time: ${new Date().toISOString()}`);
  console.log(`In 9am PST window: ${in9amWindow}`);

  if (!in9amWindow && !forceRun) {
    console.log("Not in 9:00-9:14 AM PST window. Exiting.");
    return;
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    let totalSent = 0;
    let totalFailed = 0;

    // STEP 2: Social link ask
    // Guests at step 1, not paused, 30+ min since last message
    console.log("\n--- Step 2: Social link ask ---");
    const { rows: step2Guests } = await pool.query<Guest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about
       FROM guests
       WHERE sequence_step = 1
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '30 minutes'
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step2Guests.length} guest(s) ready for Step 2`);

    for (const guest of step2Guests) {
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
    // Guests at step 2, not paused, 2+ days since last message
    console.log("\n--- Step 3: Curiosity question ---");
    const { rows: step3Guests } = await pool.query<Guest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about
       FROM guests
       WHERE sequence_step = 2
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '2 days'
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step3Guests.length} guest(s) ready for Step 3`);

    for (const guest of step3Guests) {
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
    // Guests at step 3, not paused, 5+ days since last message
    console.log("\n--- Step 4: Soft nudge ---");
    const { rows: step4Guests } = await pool.query<Guest>(
      `SELECT id, first_name, phone_clean, sequence_step, curious_about
       FROM guests
       WHERE sequence_step = 3
         AND sequence_paused = FALSE
         AND sequence_completed = FALSE
         AND last_message_sent_at < NOW() - INTERVAL '5 days'
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
       ORDER BY last_message_sent_at ASC
       LIMIT $1`,
      [MAX_PER_RUN]
    );

    console.log(`Found ${step4Guests.length} guest(s) ready for Step 4`);

    for (const guest of step4Guests) {
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

    console.log(`\nDone. Sent: ${totalSent}, Failed: ${totalFailed}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
