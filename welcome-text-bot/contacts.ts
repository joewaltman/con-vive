import { Pool } from "pg";

const CONTACT_SYNC_DELAY_MS = 500;
const MAX_CONTACTS_PER_RUN = 50;

interface GuestForSync {
  id: number;
  first_name: string;
  last_name: string | null;
  phone_clean: string;
  email: string | null;
}

interface ContactCreateResult {
  created: number;
  alreadyExists: number;
  failed: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function createQuoContact(guest: GuestForSync): Promise<{ id: string | null; alreadyExists: boolean }> {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) throw new Error("QUO_API_KEY not set");

  const phoneNumbers = [
    {
      name: "primary",
      value: `+1${guest.phone_clean}`,
    },
  ];

  const defaultFields: Record<string, unknown> = {
    firstName: guest.first_name,
    phoneNumbers,
  };

  if (guest.last_name) {
    defaultFields.lastName = guest.last_name;
  }

  if (guest.email) {
    defaultFields.emails = [
      {
        name: "primary",
        value: guest.email,
      },
    ];
  }

  const res = await fetch("https://api.openphone.com/v1/contacts", {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      defaultFields,
      externalId: `pg_${guest.id}`,
      source: "public-api",
    }),
  });

  if (res.status === 201) {
    const json = await res.json();
    return { id: json.data.id, alreadyExists: false };
  }

  if (res.status === 409) {
    // Contact already exists - try to find it by externalId
    const existingId = await findContactByExternalId(guest.id);
    return { id: existingId, alreadyExists: true };
  }

  const body = await res.text();
  throw new Error(`Quo Contacts API ${res.status}: ${body}`);
}

async function findContactByExternalId(guestId: number): Promise<string | null> {
  const apiKey = process.env.QUO_API_KEY;
  if (!apiKey) throw new Error("QUO_API_KEY not set");

  const res = await fetch(
    `https://api.openphone.com/v1/contacts?externalIds=pg_${guestId}`,
    {
      headers: {
        Authorization: apiKey,
      },
    }
  );

  if (!res.ok) {
    return null;
  }

  const json = await res.json();
  if (json.data && json.data.length > 0) {
    return json.data[0].id;
  }

  return null;
}

export async function runMigration(pool: Pool): Promise<void> {
  // Check if quo_contact_id column exists
  const { rows } = await pool.query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'guests' AND column_name = 'quo_contact_id'
  `);

  if (rows.length === 0) {
    console.log("Adding quo_contact_id column to guests table...");
    await pool.query(`ALTER TABLE guests ADD COLUMN quo_contact_id TEXT`);
    console.log("Migration complete.");
  }
}

export async function syncContacts(
  pool: Pool,
  options: { dryRun: boolean; backfill: boolean }
): Promise<ContactCreateResult> {
  const { dryRun, backfill } = options;

  // Find guests needing sync
  const { rows: guests } = await pool.query<GuestForSync>(
    `SELECT id, first_name, last_name, phone_clean, email
     FROM guests
     WHERE quo_contact_id IS NULL
       AND phone_clean IS NOT NULL
       AND phone_clean != ''
     ORDER BY created_at ASC`
  );

  if (guests.length === 0) {
    console.log("No guests need Quo contact sync.");
    return { created: 0, alreadyExists: 0, failed: 0 };
  }

  console.log(`Found ${guests.length} guest(s) needing Quo contact sync.`);

  // Apply batch cap unless backfill mode
  const batch = backfill ? guests : guests.slice(0, MAX_CONTACTS_PER_RUN);

  if (!backfill && guests.length > MAX_CONTACTS_PER_RUN) {
    console.warn(`WARNING: ${guests.length} pending contacts, capping at ${MAX_CONTACTS_PER_RUN} this run.`);
  }

  let created = 0;
  let alreadyExists = 0;
  let failed = 0;

  for (let i = 0; i < batch.length; i++) {
    const guest = batch[i];
    const phoneLast4 = guest.phone_clean.slice(-4);
    const fullName = guest.last_name
      ? `${guest.first_name} ${guest.last_name}`
      : guest.first_name;

    if (dryRun) {
      console.log(`[DRY RUN] Would sync contact: ${fullName} (***${phoneLast4})`);
      created++;
      continue;
    }

    try {
      const result = await createQuoContact(guest);

      // Update guest with Quo contact ID (or mark as synced if already exists)
      const contactId = result.id || (result.alreadyExists ? "exists_in_quo" : null);
      if (contactId) {
        await pool.query(
          `UPDATE guests SET quo_contact_id = $1, updated_at = NOW() WHERE id = $2`,
          [contactId, guest.id]
        );
      }

      if (result.alreadyExists) {
        alreadyExists++;
        if (backfill) {
          // Show progress in backfill mode
          console.log(`[${i + 1}/${batch.length}] ${fullName} (***${phoneLast4}) — already exists`);
        } else {
          console.log(`Contact already exists: ${fullName} (***${phoneLast4})`);
        }
      } else {
        created++;
        if (backfill) {
          console.log(`[${i + 1}/${batch.length}] ${fullName} (***${phoneLast4}) — created`);
        } else {
          console.log(`Created Quo contact: ${fullName} (***${phoneLast4})`);
        }
      }

      // Rate limit delay (skip after last one)
      if (i < batch.length - 1) {
        await sleep(CONTACT_SYNC_DELAY_MS);
      }
    } catch (err) {
      failed++;
      console.error(`FAILED to sync contact ${fullName} (***${phoneLast4}):`, err);
    }
  }

  return { created, alreadyExists, failed };
}
