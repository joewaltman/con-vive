import { Pool } from "pg";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

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
  restaurant_name: string | null;
}

interface DinnerGuest {
  guest_id: number;
  first_name: string;
  one_liner: string | null;
  one_thing: string | null;
  about: string | null;
  what_do_you_do: string | null;
  curious_about: string | null;
  surprising_knowledge: string | null;
  social_summary: string | null;
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

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    timeZone: "UTC",
  });
}

/**
 * Generate a one-liner using Claude AI from guest's profile data.
 * Returns a compelling, positive summary of the person.
 */
async function generateOneLinerWithAI(
  anthropic: Anthropic,
  guest: DinnerGuest
): Promise<string> {
  // Collect all available info about the guest
  const infoSources: string[] = [];

  if (guest.what_do_you_do) {
    infoSources.push(`What they do: ${guest.what_do_you_do}`);
  }
  if (guest.about) {
    infoSources.push(`About them: ${guest.about}`);
  }
  if (guest.one_thing) {
    infoSources.push(`One thing about them: ${guest.one_thing}`);
  }
  if (guest.curious_about) {
    infoSources.push(`Curious about: ${guest.curious_about}`);
  }
  if (guest.surprising_knowledge) {
    infoSources.push(`Surprising knowledge: ${guest.surprising_knowledge}`);
  }
  if (guest.social_summary) {
    infoSources.push(`Social profile summary: ${guest.social_summary}`);
  }

  // If no info available, return default
  if (infoSources.length === 0) {
    return "Excited to meet everyone!";
  }

  const prompt = `You are writing a one-liner introduction for a dinner party guest. Based on the information below, create a single compelling sentence (max 120 characters) that makes this person sound interesting and approachable.

Guidelines:
- Keep it positive and warm
- Focus on what makes them interesting
- Don't mention negative things (widow, divorced, illness, etc.)
- Don't exaggerate - stay truthful to the info provided
- Write in third person without using their name
- Make it conversation-starter worthy

Guest information:
${infoSources.join("\n")}

Write ONLY the one-liner, nothing else:`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 100,
      messages: [{ role: "user", content: prompt }],
    });

    const content = response.content[0];
    if (content.type === "text") {
      let oneLiner = content.text.trim();
      // Remove quotes if wrapped
      oneLiner = oneLiner.replace(/^["']|["']$/g, "");
      // Ensure max length
      if (oneLiner.length > 150) {
        oneLiner = oneLiner.substring(0, 147) + "...";
      }
      return oneLiner;
    }
  } catch (err) {
    console.error(`  Error generating one-liner for ${guest.first_name}:`, err);
  }

  // Fallback to simple extraction
  return generateFallbackOneLiner(guest);
}

/**
 * Fallback one-liner generation without AI.
 */
function generateFallbackOneLiner(guest: DinnerGuest): string {
  const sources = [
    guest.what_do_you_do,
    guest.about,
    guest.one_thing,
    guest.curious_about,
    guest.surprising_knowledge,
  ];

  for (const source of sources) {
    if (source && source.trim().length > 0) {
      let text = source.trim();
      const firstSentence = text.match(/^[^.!?]+[.!?]?/);
      if (firstSentence && firstSentence[0].length > 20) {
        text = firstSentence[0].trim();
      }
      if (text.length > 120) {
        text = text.substring(0, 117).trim() + "...";
      }
      text = text.replace(/^\([0-9]+\)\s*/, "").trim();
      return text;
    }
  }

  return "Excited to meet everyone!";
}

/**
 * Get or generate one-liner for a guest, storing it if newly generated.
 */
async function getOrGenerateOneLiner(
  pool: Pool,
  anthropic: Anthropic | null,
  guest: DinnerGuest,
  dryRun: boolean
): Promise<string> {
  // If already has a stored one-liner, use it
  if (guest.one_liner) {
    return guest.one_liner;
  }

  // Generate new one-liner
  let oneLiner: string;
  if (anthropic) {
    console.log(`    Generating one-liner for ${guest.first_name}...`);
    oneLiner = await generateOneLinerWithAI(anthropic, guest);
  } else {
    oneLiner = generateFallbackOneLiner(guest);
  }

  // Store it for future use (unless dry run)
  if (!dryRun && oneLiner !== "Excited to meet everyone!") {
    try {
      await pool.query(
        `UPDATE guests SET one_liner = $1 WHERE id = $2`,
        [oneLiner, guest.guest_id]
      );
      console.log(`    Stored one-liner for ${guest.first_name}`);
    } catch (err) {
      console.error(`    Failed to store one-liner for ${guest.first_name}:`, err);
    }
  }

  return oneLiner;
}

async function buildGuestListHtml(
  pool: Pool,
  anthropic: Anthropic | null,
  guests: DinnerGuest[],
  currentGuestId: number,
  dryRun: boolean
): Promise<string> {
  const otherGuests = guests.filter(g => g.guest_id !== currentGuestId);

  if (otherGuests.length === 0) {
    return "";
  }

  const guestItems: string[] = [];
  for (const guest of otherGuests) {
    const oneLiner = await getOrGenerateOneLiner(pool, anthropic, guest, dryRun);
    guestItems.push(`
      <div style="margin-bottom: 12px;">
        <p style="color: #2d2d2d; font-size: 16px; font-weight: 600; margin: 0;">${guest.first_name.trim()}</p>
        <p style="color: #6b6b6b; font-size: 14px; margin: 4px 0 0; line-height: 1.4;">${oneLiner}</p>
      </div>
    `);
  }

  return `
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px;">Your Dining Companions</p>
      ${guestItems.join("")}
    </div>
  `;
}

async function buildReminderEmailHtml(
  pool: Pool,
  anthropic: Anthropic | null,
  invitation: BookedInvitation,
  dinnerGuests: DinnerGuest[],
  dryRun: boolean
): Promise<string> {
  const isRestaurant = invitation.venue_type === 'restaurant';
  const hostName = invitation.host_name || invitation.host;
  const restaurantName = invitation.restaurant_name || invitation.dinner_name;
  const dinnerDate = formatDate(invitation.dinner_date);
  const dayOfWeek = getDayOfWeek(invitation.dinner_date);
  const dinnerTime = invitation.dinner_time || "7:00 PM";
  const baseUrl = process.env.BASE_URL || 'https://con-vive.com';
  const bringItemsUrl = `${baseUrl}/bring/${invitation.token}`;
  const guideUrl = isRestaurant ? `${baseUrl}/guide-restaurant` : `${baseUrl}/guide`;

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

  // Build guest list HTML (async because it may generate one-liners)
  const guestListHtml = await buildGuestListHtml(pool, anthropic, dinnerGuests, invitation.guest_id, dryRun);

  // Different intro for restaurant vs home dinners
  const introText = isRestaurant
    ? `Just a friendly reminder that your Con-Vive dinner at <strong>${restaurantName}</strong> is this ${dayOfWeek}. Here's everything you need to know:`
    : `Just a friendly reminder that ${hostName}'s Con-Vive dinner is this ${dayOfWeek}. Here's everything you need to know:`;

  // Different details section for restaurant vs home
  const detailsSection = isRestaurant
    ? `
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Dinner Details</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        <strong>Date:</strong> ${dinnerDate}<br>
        <strong>Time:</strong> ${dinnerTime}<br>
        <strong>Restaurant:</strong> ${restaurantName}
      </p>
    </div>
    `
    : `
    <div style="background-color: #ffffff; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">Dinner Details</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0;">
        <strong>Date:</strong> ${dinnerDate}<br>
        <strong>Time:</strong> ${dinnerTime}<br>
        <strong>Host:</strong> ${hostName}
      </p>
    </div>
    `;

  // Guide section for both restaurant and home dinners
  const guideSection = `
    <div style="background-color: #fff8f5; border: 2px solid #c75d3a; border-radius: 8px; padding: 20px; margin-bottom: 16px;">
      <p style="color: #2d2d2d; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 12px;">${isRestaurant ? "First Restaurant Dinner?" : "First Con-Vive Dinner?"}</p>
      <p style="color: #2d2d2d; font-size: 16px; line-height: 1.6; margin: 0 0 12px;">
        Check out our quick guide for what to expect and how to make the most of your evening.
      </p>
      <a href="${guideUrl}" style="display: inline-block; background-color: #c75d3a; color: #ffffff; text-decoration: none; padding: 10px 20px; border-radius: 6px; font-weight: 600; font-size: 14px;">Read the Guide</a>
    </div>
    `;

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
      ${introText}
    </p>

    ${detailsSection}

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

    ${guestListHtml}

    ${guideSection}

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

  // Initialize Anthropic client if API key is available
  let anthropic: Anthropic | null = null;
  if (process.env.ANTHROPIC_API_KEY) {
    anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    console.log("Anthropic client initialized for AI one-liner generation.");
  } else {
    console.log("No ANTHROPIC_API_KEY found, using fallback one-liner generation.");
  }

  try {
    await connectWithRetry(pool);
    console.log("Connected to database.");

    // Find booked invitations where:
    // - dinner is within 2 days
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
        d.venue_type,
        r.name as restaurant_name
      FROM invitations i
      JOIN guests g ON i.guest_id = g.id
      JOIN dinners d ON i.dinner_id = d.id
      LEFT JOIN restaurants r ON r.id = d.restaurant_id
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

    // Get unique dinner IDs to fetch all guests for each dinner
    const dinnerIds = [...new Set(invitations.map(i => i.dinner_id))];

    // Fetch all confirmed guests for these dinners with their profile info
    const { rows: allDinnerGuests } = await pool.query<DinnerGuest & { dinner_id: number }>(`
      SELECT
        i.dinner_id,
        i.guest_id,
        g.first_name,
        g.one_liner,
        g.one_thing,
        g.about,
        g.what_do_you_do,
        g.curious_about,
        g.surprising_knowledge,
        g.social_summary
      FROM invitations i
      JOIN guests g ON i.guest_id = g.id
      WHERE i.dinner_id = ANY($1)
        AND i.status = 'booked'
      ORDER BY g.first_name ASC
    `, [dinnerIds]);

    // Group guests by dinner_id
    const guestsByDinner = new Map<number, DinnerGuest[]>();
    for (const guest of allDinnerGuests) {
      const dinnerId = guest.dinner_id;
      if (!guestsByDinner.has(dinnerId)) {
        guestsByDinner.set(dinnerId, []);
      }
      guestsByDinner.get(dinnerId)!.push(guest);
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    let sentCount = 0;
    let errorCount = 0;

    for (const invitation of invitations) {
      const isRestaurant = invitation.venue_type === 'restaurant';
      const dinnerLabel = isRestaurant
        ? invitation.restaurant_name || invitation.dinner_name
        : invitation.host_name || invitation.host;
      const dinnerDate = formatDate(invitation.dinner_date);
      const dayOfWeek = getDayOfWeek(invitation.dinner_date);

      console.log(
        `\nProcessing: ${invitation.first_name} (${invitation.email}) - ${dinnerLabel} on ${dinnerDate}`
      );

      const dinnerGuests = guestsByDinner.get(invitation.dinner_id) || [];

      if (DRY_RUN) {
        console.log("  [DRY RUN] Would send reminder email");
        console.log(`  Guests at this dinner: ${dinnerGuests.map(g => g.first_name).join(", ")}`);
        // Still generate one-liners in dry run to test the logic
        for (const guest of dinnerGuests) {
          if (!guest.one_liner) {
            const oneLiner = await getOrGenerateOneLiner(pool, anthropic, guest, true);
            console.log(`    ${guest.first_name}: ${oneLiner}`);
          } else {
            console.log(`    ${guest.first_name}: ${guest.one_liner} (stored)`);
          }
        }
        sentCount++;
        continue;
      }

      try {
        // Build subject line based on dinner type
        const subject = isRestaurant
          ? `Reminder: Your dinner at ${dinnerLabel} is this ${dayOfWeek}!`
          : `Reminder: ${dinnerLabel}'s dinner is this ${dayOfWeek}!`;

        const html = await buildReminderEmailHtml(pool, anthropic, invitation, dinnerGuests, DRY_RUN);

        const { error } = await resend.emails.send({
          from: "Joe from Con-Vive <joe@invite.con-vive.com>",
          to: invitation.email,
          subject,
          html,
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
