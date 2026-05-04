import { Pool } from "pg";
import { Resend } from "resend";

const MAX_PER_RUN = 50;
const DELAY_MS = 500;
const DRY_RUN = process.argv.includes("--dry-run");

interface BookedInvitation {
  invitation_id: number;
  guest_id: number;
  first_name: string;
  email: string;
  dinner_id: number;
  dinner_date: string;
  host_name: string | null;
  host: string;
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
      const isTransient =
        error.code === "EAI_AGAIN" ||
        error.code === "ENOTFOUND" ||
        error.code === "ECONNREFUSED";

      if (isTransient && attempt < maxRetries) {
        const delayMs = attempt * 2000;
        console.log(
          `Connection attempt ${attempt} failed (${error.code}), retrying in ${delayMs}ms...`
        );
        await sleep(delayMs);
      } else {
        throw err;
      }
    }
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

function buildPostDinnerEmailHtml(
  firstName: string,
  hostName: string,
  dinnerDate: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f4f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h1 style="color: #2d2d2d; font-size: 28px; margin: 0 0 20px;">Thanks for Coming, ${firstName}!</h1>

    <p style="color: #6b6b6b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      We hope you had a wonderful time at ${hostName}'s dinner on ${dinnerDate}. Sharing meals with new people is what Con-Vive is all about.
    </p>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Stay Connected</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        Made some new friends? We hope so! Con-Vive dinners are all about building community one meal at a time.
      </p>
    </div>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Join Another Dinner</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        We'll let you know when new dinners are available in your area. Keep an eye on your inbox!
      </p>
    </div>

    <div style="background-color: #fff8f5; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">We'd Love Your Feedback</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        How was your experience? Just reply to this email and let us know what you thought. Your feedback helps us make Con-Vive even better.
      </p>
    </div>

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #6b6b6b; font-size: 14px; margin: 0 0 16px;">
      Until next time!<br>
      Joe & the Con-Vive Team
    </p>

    <p style="color: #999999; font-size: 12px; margin: 0;">
      Questions? Text Joe at <a href="sms:+17602748830" style="color: #c75d3a;">(760) 274-8830</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

async function main() {
  console.log(`=== Post-Dinner Email Cron ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
  console.log(`Started at: ${new Date().toISOString()}`);

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    await connectWithRetry(pool);
    console.log("Connected to database.");

    // Find booked invitations where:
    // - dinner was yesterday
    // - No attendance record exists yet
    const { rows: invitations } = await pool.query<BookedInvitation>(`
      SELECT
        i.id as invitation_id,
        i.guest_id,
        g.first_name,
        g.email,
        i.dinner_id,
        d.dinner_date,
        d.host_name,
        d.host
      FROM invitations i
      JOIN guests g ON i.guest_id = g.id
      JOIN dinners d ON i.dinner_id = d.id
      LEFT JOIN attendance a ON i.id = a.invitation_id
      WHERE i.status = 'booked'
        AND d.dinner_date = CURRENT_DATE - INTERVAL '1 day'
        AND a.id IS NULL
      ORDER BY i.id ASC
      LIMIT $1
    `, [MAX_PER_RUN]);

    console.log(`Found ${invitations.length} post-dinner emails to send.`);

    if (invitations.length === 0) {
      console.log("No post-dinner emails to send.");
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let sentCount = 0;
    let errorCount = 0;

    for (const invitation of invitations) {
      const hostName = invitation.host_name || invitation.host || 'your host';
      const dinnerDate = formatDate(invitation.dinner_date);

      console.log(
        `\nProcessing: ${invitation.first_name} (${invitation.email}) - ${hostName}'s dinner on ${dinnerDate}`
      );

      if (DRY_RUN) {
        console.log("  [DRY RUN] Would send post-dinner email and create attendance record");
        sentCount++;
        continue;
      }

      try {
        // Create attendance record first (to prevent duplicate sends)
        await pool.query(
          `INSERT INTO attendance (invitation_id, attended, created_at, updated_at)
           VALUES ($1, NULL, NOW(), NOW())
           ON CONFLICT (invitation_id) DO NOTHING`,
          [invitation.invitation_id]
        );

        const { error } = await resend.emails.send({
          from: "Joe from Con-Vive <joe@con-vive.com>",
          to: invitation.email,
          subject: `Thanks for joining ${hostName}'s dinner!`,
          html: buildPostDinnerEmailHtml(invitation.first_name, hostName, dinnerDate),
          replyTo: "joe@con-vive.com",
        });

        if (error) {
          console.error(`  Failed to send email: ${error.message}`);
          errorCount++;
          continue;
        }

        // Update feedback_email_sent_at
        await pool.query(
          `UPDATE attendance SET feedback_email_sent_at = NOW() WHERE invitation_id = $1`,
          [invitation.invitation_id]
        );

        console.log(`  Post-dinner email sent successfully.`);
        sentCount++;

        // Rate limiting delay
        if (invitations.indexOf(invitation) < invitations.length - 1) {
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.error(`  Error sending post-dinner email:`, err);
        errorCount++;
      }
    }

    console.log(`\n=== Summary ===`);
    console.log(`Sent: ${sentCount}`);
    console.log(`Errors: ${errorCount}`);
  } finally {
    await pool.end();
    console.log(`\nFinished at: ${new Date().toISOString()}`);
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
