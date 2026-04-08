import { Pool } from "pg";

const MAX_PER_RUN = 20;
const DELAY_MS = 1000;
const FROM_PHONE = "+17602748830";

interface Guest {
  id: number;
  first_name: string;
  phone_clean: string;
}

function buildMessage(firstName: string): string {
  return `Hey ${firstName}! This is Joe from Con-Vive. Thanks for signing up. We've had an incredible response from the neighborhood. I personally talk to everyone before their first dinner so I can put together the best table for you. I'll reach out soon to find a time to chat!`;
}

async function sendSms(to: string, content: string): Promise<void> {
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
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");

  if (dryRun) console.log("[DRY RUN] No texts will be sent.\n");

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
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
      console.log("No guests need a welcome text. Done.");
      return;
    }

    console.log(`Found ${guests.length} guest(s) needing welcome texts.`);

    if (guests.length > MAX_PER_RUN) {
      console.warn(`WARNING: ${guests.length} pending, capping at ${MAX_PER_RUN} this run.`);
    }

    const batch = guests.slice(0, MAX_PER_RUN);
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
        await sendSms(to, message);

        await pool.query(
          `UPDATE guests
           SET invite_text_sent_date = CURRENT_DATE,
               updated_at = NOW()
           WHERE id = $1`,
          [guest.id]
        );

        console.log(`Sent welcome text to ${guest.first_name} (***${phoneLast4})`);
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
