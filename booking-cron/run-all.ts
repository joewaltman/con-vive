/**
 * Combined cron job that runs all booking-related scheduled tasks.
 * Designed to run once daily via Railway cron service.
 */

import { execSync } from 'child_process';

async function main() {
  console.log('=== Booking Cron Jobs ===');
  console.log(`Started at: ${new Date().toISOString()}\n`);

  // Run reminder emails (for dinners in next 2 days)
  console.log('--- Running: Send Reminders ---');
  try {
    execSync('npx tsx send-reminders.ts', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.error('Reminder job failed:', error);
  }

  console.log('\n--- Running: Send Post-Dinner Emails ---');
  // Run post-dinner emails (for dinners yesterday)
  try {
    execSync('npx tsx send-post-dinner.ts', {
      stdio: 'inherit',
      cwd: __dirname
    });
  } catch (error) {
    console.error('Post-dinner job failed:', error);
  }

  console.log(`\n=== All jobs completed at: ${new Date().toISOString()} ===`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
