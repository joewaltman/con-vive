import { Pool } from "pg";
import { Resend } from "resend";

const MAX_PER_RUN = 20;
const DELAY_MS = 500;
const DRY_RUN = process.argv.includes("--dry-run");

interface BookedInvitation {
  invitation_id: number;
  guest_id: number;
  first_name: string;
  email: string;
  dinner_id: number;
  dinner_name: string;
  dinner_date: string;
  dinner_time: string | null;
  address: string | null;
  google_maps_link: string | null;
  parking_instructions: string | null;
  what_to_bring: string | null;
  host_name: string | null;
  host: string;
  bring_item_slot: number | null;
  bring_items: Array<{ slot: number; name: string; claimed_by_guest_id: number | null }> | null;
  token: string;
  venue_type: string | null;
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

function buildReminderEmailHtml(invitation: BookedInvitation): string {
  const hostName = invitation.host_name || invitation.host;
  const dinnerDate = formatDate(invitation.dinner_date);
  const dinnerTime = invitation.dinner_time || "7:00 PM";
  const isRestaurant = invitation.venue_type === 'restaurant';
  const baseUrl = process.env.BASE_URL || 'https://con-vive.com';
  const bringItemsUrl = `${baseUrl}/bring/${invitation.token}`;

  let bringItemName: string | null = null;
  if (invitation.bring_item_slot && Array.isArray(invitation.bring_items)) {
    const item = invitation.bring_items.find(
      (i) => i.slot === invitation.bring_item_slot
    );
    bringItemName = item?.name || null;
  }

  // Check if there are available (unclaimed) bring items
  const hasAvailableBringItems = !isRestaurant &&
    Array.isArray(invitation.bring_items) &&
    invitation.bring_items.some(item => !item.claimed_by_guest_id);

  // Show sign-up link if guest hasn't claimed an item and there are available items
  const showBringItemsLink = !bringItemName && hasAvailableBringItems;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f6f4f0; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto;">
    <h1 style="color: #2d2d2d; font-size: 28px; margin: 0 0 20px;">See You Soon, ${invitation.first_name}!</h1>

    <p style="color: #6b6b6b; font-size: 16px; line-height: 1.6; margin: 0 0 20px;">
      Just a friendly reminder that ${hostName}'s Con-Vive dinner is coming up. Here's everything you need to know:
    </p>

    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Dinner Details</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        <strong>Date:</strong> ${dinnerDate}<br>
        <strong>Time:</strong> ${dinnerTime}<br>
        <strong>Host:</strong> ${hostName}
      </p>
    </div>

    ${
      invitation.address
        ? `
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Location</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        ${invitation.address}
        ${invitation.google_maps_link ? `<br><a href="${invitation.google_maps_link}" style="color: #c75d3a;">View on Google Maps</a>` : ""}
      </p>
      ${invitation.parking_instructions ? `<p style="color: #2d2d2d; font-size: 16px; margin: 8px 0 0;"><strong>Parking:</strong> ${invitation.parking_instructions}</p>` : ""}
    </div>
    `
        : ""
    }

    ${
      bringItemName || invitation.what_to_bring || showBringItemsLink
        ? `
    <div style="background-color: #fff8f5; border: 2px solid #c75d3a; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">${bringItemName ? "Don't Forget!" : "Want to Bring Something?"}</p>
      ${bringItemName ? `<p style="color: #c75d3a; font-size: 16px; font-weight: 600; margin: 0 0 8px;">You signed up to bring: ${bringItemName}</p>` : ""}
      ${invitation.what_to_bring ? `<p style="color: #2d2d2d; font-size: 16px; margin: 0 0 8px;">${invitation.what_to_bring}</p>` : ""}
      ${showBringItemsLink ? `<p style="color: #2d2d2d; font-size: 16px; margin: 0;"><a href="${bringItemsUrl}" style="color: #c75d3a; font-weight: 600;">Sign up to bring something</a></p>` : ""}
    </div>
    `
        : ""
    }

    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">

    <p style="color: #6b6b6b; font-size: 14px; margin: 0 0 16px;">
      Running late or have questions? Text Joe at (760) 274-8830.
    </p>

    <p style="color: #6b6b6b; font-size: 14px; margin: 0;">
      See you there!<br>
      Joe & the Con-Vive Team
    </p>
  </div>
</body>
</html>
  `.trim();
}

async function main() {
  console.log(`=== Booking Reminder Cron ${DRY_RUN ? "(DRY RUN)" : ""} ===`);
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
    // - dinner is 48 hours away (between 47-49 hours to account for cron timing)
    // - reminder_email_sent_at is NULL
    const { rows: invitations } = await pool.query<BookedInvitation>(`
      SELECT
        i.id as invitation_id,
        i.guest_id,
        g.first_name,
        g.email,
        i.dinner_id,
        d.dinner_name,
        d.dinner_date,
        d.dinner_time,
        d.address,
        d.google_maps_link,
        d.parking_instructions,
        d.what_to_bring,
        d.host_name,
        d.host,
        i.bring_item_slot,
        d.bring_items,
        i.token,
        d.venue_type
      FROM invitations i
      JOIN guests g ON i.guest_id = g.id
      JOIN dinners d ON i.dinner_id = d.id
      WHERE i.status = 'booked'
        AND i.reminder_email_sent_at IS NULL
        AND d.dinner_date >= CURRENT_DATE
        AND d.dinner_date <= CURRENT_DATE + INTERVAL '2 days'
      ORDER BY d.dinner_date ASC
      LIMIT $1
    `, [MAX_PER_RUN]);

    console.log(`Found ${invitations.length} invitations needing reminders.`);

    if (invitations.length === 0) {
      console.log("No reminders to send.");
      return;
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let sentCount = 0;
    let errorCount = 0;

    for (const invitation of invitations) {
      const hostName = invitation.host_name || invitation.host;
      const dinnerDate = formatDate(invitation.dinner_date);

      console.log(
        `\nProcessing: ${invitation.first_name} (${invitation.email}) - ${hostName}'s dinner on ${dinnerDate}`
      );

      if (DRY_RUN) {
        console.log("  [DRY RUN] Would send reminder email");
        sentCount++;
        continue;
      }

      try {
        const { error } = await resend.emails.send({
          from: "Joe from Con-Vive <joe@con-vive.com>",
          to: invitation.email,
          subject: `Reminder: ${hostName}'s dinner is tomorrow!`,
          html: buildReminderEmailHtml(invitation),
          replyTo: "joe@con-vive.com",
        });

        if (error) {
          console.error(`  Failed to send email: ${error.message}`);
          errorCount++;
          continue;
        }

        // Update reminder_email_sent_at
        await pool.query(
          `UPDATE invitations SET reminder_email_sent_at = NOW() WHERE id = $1`,
          [invitation.invitation_id]
        );

        console.log(`  Reminder sent successfully.`);
        sentCount++;

        // Rate limiting delay
        if (invitations.indexOf(invitation) < invitations.length - 1) {
          await sleep(DELAY_MS);
        }
      } catch (err) {
        console.error(`  Error sending reminder:`, err);
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
