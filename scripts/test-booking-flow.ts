/**
 * Test script for the booking flow
 * Run with: npx tsx scripts/test-booking-flow.ts
 */

import { Pool } from "pg";

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

interface TestResult {
  name: string;
  passed: boolean;
  message: string;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`  ${message}`);
}

function pass(name: string, message: string) {
  results.push({ name, passed: true, message });
  console.log(`✓ ${name}: ${message}`);
}

function fail(name: string, message: string) {
  results.push({ name, passed: false, message });
  console.log(`✗ ${name}: ${message}`);
}

async function testDatabaseSchema() {
  console.log("\n=== Testing Database Schema ===\n");

  const client = await pool.connect();
  try {
    // Check dinners columns
    const { rows: dinnerCols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'dinners'
      AND column_name IN ('capacity', 'price_cents', 'address', 'token', 'dinner_time')
    `);
    const dinnerColNames = dinnerCols.map((r) => r.column_name);

    if (dinnerColNames.includes("capacity")) {
      pass("dinners.capacity", "Column exists");
    } else {
      fail("dinners.capacity", "Column missing");
    }

    if (dinnerColNames.includes("price_cents")) {
      pass("dinners.price_cents", "Column exists");
    } else {
      fail("dinners.price_cents", "Column missing");
    }

    // Check invitations columns
    const { rows: invCols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'invitations'
      AND column_name IN ('token', 'status', 'booked_at', 'stripe_checkout_session_id')
    `);
    const invColNames = invCols.map((r) => r.column_name);

    if (invColNames.includes("token")) {
      pass("invitations.token", "Column exists");
    } else {
      fail("invitations.token", "Column missing");
    }

    if (invColNames.includes("status")) {
      pass("invitations.status", "Column exists");
    } else {
      fail("invitations.status", "Column missing");
    }

    // Check guests.gender
    const { rows: guestCols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'guests' AND column_name = 'gender'
    `);
    if (guestCols.length > 0) {
      pass("guests.gender", "Column exists");
    } else {
      fail("guests.gender", "Column missing");
    }

    // Check attendance table
    const { rows: attTable } = await client.query(`
      SELECT table_name FROM information_schema.tables WHERE table_name = 'attendance'
    `);
    if (attTable.length > 0) {
      pass("attendance table", "Table exists");
    } else {
      fail("attendance table", "Table missing");
    }
  } finally {
    client.release();
  }
}

async function testCreateTestData() {
  console.log("\n=== Creating Test Data ===\n");

  const client = await pool.connect();
  try {
    // Check if test dinner exists
    const { rows: existingDinner } = await client.query(
      "SELECT id FROM dinners WHERE dinner_name = 'Test Booking Dinner'"
    );

    let dinnerId: number;

    if (existingDinner.length > 0) {
      dinnerId = existingDinner[0].id;
      log(`Using existing test dinner (ID: ${dinnerId})`);
    } else {
      // Create test dinner
      const { rows: newDinner } = await client.query(`
        INSERT INTO dinners (dinner_name, dinner_date, host, capacity, price_cents, address, dinner_time)
        VALUES ('Test Booking Dinner', CURRENT_DATE + INTERVAL '7 days', 'Test Host', 6, 7500, '123 Test St, San Diego, CA', '7:00 PM')
        RETURNING id
      `);
      dinnerId = newDinner[0].id;
      pass("Create test dinner", `Created dinner ID: ${dinnerId}`);
    }

    // Check if test guest exists
    const { rows: existingGuest } = await client.query(
      "SELECT id FROM guests WHERE email = 'test-booking@con-vive.com'"
    );

    let guestId: number;

    if (existingGuest.length > 0) {
      guestId = existingGuest[0].id;
      log(`Using existing test guest (ID: ${guestId})`);
    } else {
      // Create test guest
      const { rows: newGuest } = await client.query(`
        INSERT INTO guests (first_name, last_name, email, gender)
        VALUES ('Test', 'Booker', 'test-booking@con-vive.com', 'female')
        RETURNING id
      `);
      guestId = newGuest[0].id;
      pass("Create test guest", `Created guest ID: ${guestId}`);
    }

    // Create invitation with token
    const { rows: existingInv } = await client.query(
      "SELECT id, token FROM invitations WHERE guest_id = $1 AND dinner_id = $2",
      [guestId, dinnerId]
    );

    let token: string;

    if (existingInv.length > 0) {
      if (existingInv[0].token) {
        token = existingInv[0].token;
        log(`Using existing invitation with token: ${token}`);
      } else {
        // Update with new token (use hex encoding for URL safety)
        const { rows: updated } = await client.query(
          `UPDATE invitations SET token = encode(gen_random_bytes(16), 'hex'), status = 'pending'
           WHERE id = $1 RETURNING token`,
          [existingInv[0].id]
        );
        token = updated[0].token;
        pass("Generate token", `Token: ${token}`);
      }
    } else {
      // Create new invitation with token (use hex encoding for URL safety)
      const { rows: newInv } = await client.query(
        `INSERT INTO invitations (guest_id, dinner_id, token, status)
         VALUES ($1, $2, encode(gen_random_bytes(16), 'hex'), 'pending')
         RETURNING token`,
        [guestId, dinnerId]
      );
      token = newInv[0].token;
      pass("Create invitation", `Token: ${token}`);
    }

    console.log(`\n  Booking URL: https://con-vive.com/d/${token}`);
    console.log(`  Local URL: http://localhost:3000/d/${token}\n`);

    return { dinnerId, guestId, token };
  } finally {
    client.release();
  }
}

async function testGenderConstraints() {
  console.log("\n=== Testing Gender Constraints ===\n");

  // Test the constraint logic
  const testCases = [
    { male: 0, female: 0, capacity: 6, gender: "female", expected: true, desc: "First booker allowed" },
    { male: 0, female: 4, capacity: 6, gender: "female", expected: false, desc: "5th woman blocked (only 2 seats left for men)" },
    { male: 0, female: 4, capacity: 6, gender: "male", expected: true, desc: "Man can book when 2 seats reserved" },
    { male: 1, female: 4, capacity: 6, gender: "male", expected: true, desc: "2nd man can book last seat" },
    { male: 2, female: 4, capacity: 6, gender: "female", expected: false, desc: "Dinner full" },
    { male: 0, female: 5, capacity: 8, gender: "female", expected: true, desc: "6th woman ok in 8-seat dinner" },
    { male: 0, female: 6, capacity: 8, gender: "female", expected: false, desc: "7th woman blocked in 8-seat dinner" },
  ];

  for (const tc of testCases) {
    const seatsRemaining = tc.capacity - tc.male - tc.female;
    const maleNeeded = Math.max(0, 2 - tc.male);
    const femaleNeeded = Math.max(0, 2 - tc.female);

    let allowed = true;
    if (seatsRemaining <= 0) {
      allowed = false;
    } else if (tc.gender === "female" && maleNeeded > 0 && seatsRemaining <= maleNeeded) {
      allowed = false;
    } else if (tc.gender === "male" && femaleNeeded > 0 && seatsRemaining <= femaleNeeded) {
      allowed = false;
    }

    if (allowed === tc.expected) {
      pass(`Constraint: ${tc.desc}`, `${tc.male}M/${tc.female}F, cap=${tc.capacity}, ${tc.gender} → ${allowed ? "allowed" : "blocked"}`);
    } else {
      fail(`Constraint: ${tc.desc}`, `Expected ${tc.expected}, got ${allowed}`);
    }
  }
}

async function testApiEndpoints(token: string) {
  console.log("\n=== Testing API Endpoints ===\n");

  const baseUrl = process.env.BASE_URL || "http://localhost:3000";

  try {
    // Test GET /api/booking/[token]
    log(`Testing GET ${baseUrl}/api/booking/${token}`);
    const response = await fetch(`${baseUrl}/api/booking/${token}`);

    if (response.ok) {
      const data = await response.json();
      pass("GET /api/booking/[token]", `Found invitation for ${data.guest?.first_name}`);

      if (data.dinner?.price_cents) {
        pass("Dinner price", `$${data.dinner.price_cents / 100}`);
      }

      if (data.canBook !== undefined) {
        pass("canBook field", `${data.canBook}`);
      }
    } else if (response.status === 404) {
      fail("GET /api/booking/[token]", "Token not found - make sure the app is running");
    } else {
      fail("GET /api/booking/[token]", `Status ${response.status}`);
    }
  } catch (error) {
    fail("API test", `Could not connect to ${baseUrl} - is the app running?`);
  }
}

async function main() {
  console.log("╔════════════════════════════════════════╗");
  console.log("║     Booking System Test Suite          ║");
  console.log("╚════════════════════════════════════════╝");

  try {
    await testDatabaseSchema();
    const testData = await testCreateTestData();
    await testGenderConstraints();

    if (testData?.token) {
      await testApiEndpoints(testData.token);
    }

    // Summary
    console.log("\n═══════════════════════════════════════");
    console.log("                SUMMARY");
    console.log("═══════════════════════════════════════\n");

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    console.log(`  Passed: ${passed}`);
    console.log(`  Failed: ${failed}`);

    if (failed > 0) {
      console.log("\n  Failed tests:");
      results.filter((r) => !r.passed).forEach((r) => {
        console.log(`    - ${r.name}: ${r.message}`);
      });
    }

    console.log("\n");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);
