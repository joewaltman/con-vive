import { Pool } from "pg";
import { randomBytes } from "crypto";

function generateBringToken(): string {
  return randomBytes(8).toString("base64url").slice(0, 12);
}

async function backfillBringTokens() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
  });

  try {
    // Find all invitations without a bring_token
    const { rows: invitations } = await pool.query<{ id: number }>(
      `SELECT id FROM invitations WHERE bring_token IS NULL`
    );

    console.log(
      `Found ${invitations.length} invitations without bring_token`
    );

    let updated = 0;
    let errors = 0;

    for (const invitation of invitations) {
      // Generate unique token with retry logic
      let attempts = 0;
      const maxAttempts = 5;

      while (attempts < maxAttempts) {
        const token = generateBringToken();

        try {
          await pool.query(
            `UPDATE invitations SET bring_token = $1 WHERE id = $2`,
            [token, invitation.id]
          );
          updated++;
          break;
        } catch (error: unknown) {
          // If unique constraint violation, retry with new token
          if (
            error instanceof Error &&
            error.message.includes("unique")
          ) {
            attempts++;
            if (attempts === maxAttempts) {
              console.error(
                `Failed to generate unique token for invitation ${invitation.id} after ${maxAttempts} attempts`
              );
              errors++;
            }
          } else {
            console.error(
              `Error updating invitation ${invitation.id}:`,
              error
            );
            errors++;
            break;
          }
        }
      }
    }

    console.log(`\nBackfill complete:`);
    console.log(`  Updated: ${updated}`);
    console.log(`  Errors: ${errors}`);

    // Verify
    const { rows: verification } = await pool.query<{ count: string }>(
      `SELECT COUNT(*) as count FROM invitations WHERE bring_token IS NOT NULL`
    );
    console.log(
      `\nTotal invitations with bring_token: ${verification[0].count}`
    );
  } catch (error) {
    console.error("Backfill failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

backfillBringTokens();
