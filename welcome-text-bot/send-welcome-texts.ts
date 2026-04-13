import { Pool } from "pg";
import { runMigration, syncContacts } from "./contacts";

const MAX_TEXTS_PER_RUN = 20;
const TEXT_DELAY_MS = 1000;
const FROM_PHONE = "+17602748830";

interface Guest {
  id: number;
  first_name: string;
  phone_clean: string;
}

function buildMessage(firstName: string): string {
  return `Hey ${firstName}! This is Joe from Con-Vive. So glad you signed up — we've had an incredible response and I personally put together every table. I'll be in touch soon. — Joe`;
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

async function sendWelcomeTexts(pool: Pool, dryRun: boolean): Promise<void> {
  // Find guests who need a welcome text
  const { rows: guests } = await pool.query<Guest>(
    `SELECT id, first_name, phone_clean
     FROM guests
     WHERE funnel_stage = 'New'
       AND invite_text_sent_date IS NULL
       AND phone_clean IS NOT NULL
       AND phone_clean != ''
     ORDER BY created_at ASC`
  );

  if (guests.length === 0) {
    console.log("No guests need a welcome text.");
    return;
  }

  console.log(`Found ${guests.length} guest(s) needing welcome texts.`);

  if (guests.length > MAX_TEXTS_PER_RUN) {
    console.warn(`WARNING: ${guests.length} pending, capping at ${MAX_TEXTS_PER_RUN} this run.`);
  }

  const batch = guests.slice(0, MAX_TEXTS_PER_RUN);
  let sent = 0;
  let failed = 0;

  for (const guest of batch) {
    const phoneLast4 = guest.phone_clean.slice(-4);
    const to = `+1${guest.phone_clean}`;
    const message = buildMessage(guest.first_name);

    if (dryRun) {
      console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
      sent++;
      continue;
    }

    try {
      const { id: quoMessageId } = await sendSms(to, message);

      // Update guest: set invite_text_sent_date, sequence_step, and last_message_sent_at
      await pool.query(
        `UPDATE guests
         SET invite_text_sent_date = CURRENT_DATE,
             sequence_step = 1,
             last_message_sent_at = NOW(),
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

      console.log(`Sent welcome text to ${guest.first_name} (***${phoneLast4})`);
      sent++;

      // Rate limit delay (skip after last one)
      if (guest !== batch[batch.length - 1]) {
        await sleep(TEXT_DELAY_MS);
      }
    } catch (err) {
      console.error(`FAILED to text ${guest.first_name} (***${phoneLast4}):`, err);
      failed++;
    }
  }

  console.log(`Texts — Sent: ${sent}, Failed: ${failed}`);
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
    // 1. Run migration (add quo_contact_id if missing)
    await runMigration(pool);

    // 2. Sync contacts to Quo
    console.log("\n--- Contact Sync ---");
    const contactResult = await syncContacts(pool, { dryRun, backfill });
    console.log(
      `\nContacts — Created: ${contactResult.created}, Already exists: ${contactResult.alreadyExists}, Failed: ${contactResult.failed}`
    );

    // 3. Send welcome texts (skip in backfill mode)
    if (!backfill) {
      console.log("\n--- Welcome Texts ---");
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
