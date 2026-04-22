import { Pool } from "pg";
import { nanoid } from "nanoid";

const MAX_PER_RUN = 20;
const DELAY_MS = 1000;
const FROM_PHONE = "+17602748830";

interface Guest {
  id: number;
  first_name: string;
  phone_clean: string;
}

function buildRecoveryMessage(firstName: string, token: string): string {
  return `Hey ${firstName}! This is Joe from Con-Vive. Looks like you got interrupted — you're one step away from finishing your signup. Here's a link to jump right back in: con-vive.com/join?resume=${token} — Joe`;
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

async function connectWithRetry(pool: Pool, maxRetries = 3): Promise<void> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await pool.query("SELECT 1");
      return;
    } catch (err: unknown) {
      const error = err as { code?: string };
      const isTransient = error.code === "EAI_AGAIN" || error.code === "ENOTFOUND" || error.code === "ECONNREFUSED";
      if (isTransient && attempt < maxRetries) {
        const delayMs = attempt * 2000; // 2s, 4s, 6s
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

  if (dryRun) console.log("[DRY RUN] No texts will be sent.\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Retry connection in case of transient DNS failures
    await connectWithRetry(pool);

    // Find guests who dropped off at Page 2 (have phone but no curious_about)
    // and haven't received a recovery text yet
    const { rows: guests } = await pool.query<Guest>(
      `SELECT id, first_name, phone_clean
       FROM guests
       WHERE funnel_stage = 'Partial'
         AND phone_clean IS NOT NULL
         AND phone_clean != ''
         AND curious_about IS NULL
         AND recovery_text_sent = FALSE
         AND updated_at < NOW() - INTERVAL '1 hour'
       ORDER BY updated_at ASC`
    );

    if (guests.length === 0) {
      console.log("No guests need a recovery text. Done.");
      return;
    }

    console.log(`Found ${guests.length} guest(s) needing recovery texts.`);

    if (guests.length > MAX_PER_RUN) {
      console.warn(`WARNING: ${guests.length} pending, capping at ${MAX_PER_RUN} this run.`);
    }

    const batch = guests.slice(0, MAX_PER_RUN);
    let sent = 0;
    let failed = 0;

    for (const guest of batch) {
      const phoneLast4 = guest.phone_clean.slice(-4);
      const to = `+1${guest.phone_clean}`;

      // Generate 8-character resume token
      const token = nanoid(8);
      const message = buildRecoveryMessage(guest.first_name, token);

      if (dryRun) {
        console.log(`[DRY RUN] Would text ${guest.first_name} (***${phoneLast4}): "${message}"`);
        sent++;
        continue;
      }

      try {
        // Update guest with resume token first
        await pool.query(
          `UPDATE guests
           SET resume_token = $1,
               updated_at = NOW()
           WHERE id = $2`,
          [token, guest.id]
        );

        // Send SMS
        const { id: quoMessageId } = await sendSms(to, message);

        // Mark recovery text as sent
        await pool.query(
          `UPDATE guests
           SET recovery_text_sent = TRUE,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id]
        );

        // Insert message record
        await pool.query(
          `INSERT INTO messages (guest_id, direction, body, quo_message_id, message_type)
           VALUES ($1, 'outbound', $2, $3, 'recovery')`,
          [guest.id, message, quoMessageId]
        );

        console.log(`Sent recovery text to ${guest.first_name} (***${phoneLast4})`);
        sent++;

        // Rate limit delay (skip after last one)
        if (guest !== batch[batch.length - 1]) {
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.error(`FAILED to text ${guest.first_name} (***${phoneLast4}):`, err);
        failed++;
      }
    }

    console.log(`\nDone. Sent: ${sent}, Failed: ${failed}`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
