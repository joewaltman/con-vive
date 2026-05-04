/**
 * Reconciliation script to find Stripe charges that don't have matching
 * invitation records in the database.
 *
 * Usage:
 *   npx ts-node scripts/find-orphan-charges.ts
 *   npx ts-node scripts/find-orphan-charges.ts --days=30
 */

import Stripe from "stripe";
import { Pool } from "pg";

async function main() {
  const daysArg = process.argv.find((a) => a.startsWith("--days="));
  const days = daysArg ? parseInt(daysArg.split("=")[1], 10) : 30;

  console.log(`Checking for orphan charges in the last ${days} days...\n`);

  if (!process.env.STRIPE_SECRET_KEY) {
    console.error("STRIPE_SECRET_KEY not set");
    process.exit(1);
  }

  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Calculate date range
    const startDate = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;

    // Get all successful payment intents from Stripe
    console.log("Fetching successful charges from Stripe...");
    const paymentIntents: Stripe.PaymentIntent[] = [];
    let hasMore = true;
    let startingAfter: string | undefined;

    while (hasMore) {
      const response = await stripe.paymentIntents.list({
        created: { gte: startDate },
        limit: 100,
        starting_after: startingAfter,
      });

      const successful = response.data.filter(
        (pi) => pi.status === "succeeded" && pi.amount > 0
      );
      paymentIntents.push(...successful);

      hasMore = response.has_more;
      if (response.data.length > 0) {
        startingAfter = response.data[response.data.length - 1].id;
      }
    }

    console.log(`Found ${paymentIntents.length} successful payment intents\n`);

    // Get all payment intents from database
    const { rows: dbPayments } = await pool.query<{
      stripe_payment_intent_id: string;
    }>(
      `SELECT DISTINCT stripe_payment_intent_id
       FROM invitations
       WHERE stripe_payment_intent_id IS NOT NULL`
    );

    const dbPaymentIds = new Set(dbPayments.map((r) => r.stripe_payment_intent_id));

    // Find orphans
    const orphans: Array<{
      payment_intent_id: string;
      amount_cents: number;
      customer_email: string | null;
      created: Date;
      description: string | null;
      metadata: Stripe.Metadata;
    }> = [];

    for (const pi of paymentIntents) {
      if (!dbPaymentIds.has(pi.id)) {
        // Check if this looks like a dinner booking (has invitation metadata)
        const hasDinnerMetadata =
          pi.metadata?.invitation_id || pi.metadata?.dinner_id;

        if (hasDinnerMetadata) {
          orphans.push({
            payment_intent_id: pi.id,
            amount_cents: pi.amount,
            customer_email: pi.receipt_email || null,
            created: new Date(pi.created * 1000),
            description: pi.description,
            metadata: pi.metadata,
          });
        }
      }
    }

    if (orphans.length === 0) {
      console.log("No orphan charges found.");
      return;
    }

    console.log(`Found ${orphans.length} orphan charge(s):\n`);
    console.log("payment_intent_id,amount,email,created,invitation_id,dinner_id");

    for (const orphan of orphans) {
      console.log(
        [
          orphan.payment_intent_id,
          `$${(orphan.amount_cents / 100).toFixed(2)}`,
          orphan.customer_email || "unknown",
          orphan.created.toISOString(),
          orphan.metadata.invitation_id || "",
          orphan.metadata.dinner_id || "",
        ].join(",")
      );
    }

    console.log("\n--- Summary ---");
    console.log(`Total orphan amount: $${(orphans.reduce((s, o) => s + o.amount_cents, 0) / 100).toFixed(2)}`);
    console.log("\nTo refund an orphan charge:");
    console.log("  stripe refunds create --payment-intent <pi_xxx>");
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
