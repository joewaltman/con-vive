# Con-Vive Backend Testing Guide

## Prerequisites

Before testing, ensure these environment variables are set:

```bash
DATABASE_URL=postgresql://...
QUO_API_KEY=your_openphone_api_key
QUO_WEBHOOK_SECRET=your_base64_webhook_secret
DASHBOARD_API_SECRET=your_dashboard_secret
```

---

## Phase 1: Database Migration

Run the migration SQL against your database:

```bash
psql $DATABASE_URL -f scripts/migration/002-messaging.sql
```

Verify columns were added:

```sql
\d guests
-- Should show: sequence_step, sequence_paused, sequence_completed,
-- last_message_sent_at, last_replied_at, routing_status,
-- recovery_text_sent, resume_token

\d messages
-- Should show: id, guest_id, direction, body, sent_at, delivered,
-- quo_message_id, conversation_id, sequence_step, message_type,
-- flagged, flagged_reason, created_at
```

---

## Phase 2: Confirmation Screen Update

1. Start the dev server: `npm run dev`
2. Open `http://localhost:3000`
3. Complete the signup form through all 3 pages
4. Verify the success screen shows:
   - "We read every response personally..."
   - "We'll be in touch soon. Joe personally connects with every guest..."

---

## Phase 3: Quo Webhook Receiver

### Test 1: Invalid Signature (should return 401)

```bash
curl -X POST http://localhost:3000/api/webhooks/quo \
  -H "Content-Type: application/json" \
  -H "openphone-signature: hmac;1;1234567890;invalidsignature==" \
  -d '{"type":"message.received","data":{"object":{}}}'
```

Expected: `401 Unauthorized`

### Test 2: Valid Payload (with correct signature)

Generate a valid signature:

```javascript
// Generate test signature
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000).toString();
const body = JSON.stringify({
  type: "message.received",
  data: {
    object: {
      id: "msg_123",
      conversationId: "conv_123",
      from: "+15551234567",
      to: "+17602748830",
      body: "Test message",
      direction: "incoming"
    }
  }
});
const secret = Buffer.from(process.env.QUO_WEBHOOK_SECRET, 'base64');
const signature = crypto.createHmac('sha256', secret)
  .update(`${timestamp}.${body}`)
  .digest('base64');
console.log(`Header: hmac;1;${timestamp};${signature}`);
console.log(`Body: ${body}`);
```

---

## Phase 4: Send SMS API

```bash
curl -X POST http://localhost:3000/api/messages/send \
  -H "Content-Type: application/json" \
  -H "x-dashboard-secret: YOUR_DASHBOARD_API_SECRET" \
  -d '{"guest_id": 1, "body": "Test message from dashboard"}'
```

Expected: JSON with message details including `id`, `guest_id`, `direction`, `body`

Verify in database:

```sql
SELECT * FROM messages WHERE guest_id = 1 ORDER BY created_at DESC LIMIT 1;
```

---

## Phase 5: Partial Form Recovery

### Test the full flow:

1. **Create a partial signup:**
   - Go to `http://localhost:3000`
   - Complete Page 1 (name, email)
   - Complete Page 2 (phone, etc.)
   - Close the browser before Page 3

2. **Check the guest record:**

```sql
SELECT id, first_name, funnel_stage, phone_clean, curious_about, recovery_text_sent
FROM guests
WHERE email = 'test@example.com';
```

Should show: `funnel_stage='Partial'`, `curious_about=NULL`

3. **Manually trigger or wait for recovery cron:**

```bash
cd recovery-cron
npm install
npm run dry-run  # Preview what would be sent
npm start        # Actually send (if guest created >1 hour ago)
```

Or manually update timestamp to test immediately:

```sql
UPDATE guests SET updated_at = NOW() - INTERVAL '2 hours' WHERE id = YOUR_GUEST_ID;
```

4. **Verify recovery text was sent:**

```sql
SELECT recovery_text_sent, resume_token FROM guests WHERE id = YOUR_GUEST_ID;
SELECT * FROM messages WHERE guest_id = YOUR_GUEST_ID AND message_type = 'recovery';
```

5. **Test the resume link:**

Open: `http://localhost:3000/join?resume=YOUR_RESUME_TOKEN`

Should show:
- Form on Page 3
- Previous data pre-populated (name, phone, etc.)

---

## Phase 6: Welcome Text Bot (Step 1)

1. **Create a new guest:**

Complete full signup (funnel_stage = 'New')

2. **Run the welcome text bot:**

```bash
cd welcome-text-bot
npm install
npm run dry-run  # Preview
npm start        # Send
```

3. **Verify:**

```sql
SELECT sequence_step, last_message_sent_at, invite_text_sent_date
FROM guests WHERE id = YOUR_GUEST_ID;
-- Should show: sequence_step=1

SELECT * FROM messages WHERE guest_id = YOUR_GUEST_ID AND message_type = 'sequence';
-- Should show Step 1 message
```

---

## Phase 7: Sequence Scheduler (Steps 2-4)

### Dry run testing:

```bash
cd sequence-cron
npm install
npm run dry-run -- --force  # Force runs outside 9am window
```

### Testing Step 2:

1. Ensure guest is at `sequence_step=1` with `last_message_sent_at` > 30 min ago
2. Run: `npm start -- --force`

### Testing Step 3:

1. Ensure guest is at `sequence_step=2` with `last_message_sent_at` > 2 days ago
2. Run: `npm start -- --force`

### Testing Step 4:

1. Ensure guest is at `sequence_step=3` with `last_message_sent_at` > 5 days ago
2. Run: `npm start -- --force`
3. Verify `sequence_completed=TRUE`

### Manually adjusting timestamps for testing:

```sql
-- Move guest to step 1 with old timestamp
UPDATE guests SET
  sequence_step = 1,
  sequence_paused = FALSE,
  last_message_sent_at = NOW() - INTERVAL '1 hour'
WHERE id = YOUR_GUEST_ID;

-- Move guest to step 2 with 3-day old timestamp
UPDATE guests SET
  sequence_step = 2,
  sequence_paused = FALSE,
  last_message_sent_at = NOW() - INTERVAL '3 days'
WHERE id = YOUR_GUEST_ID;
```

---

## Inbound Message Testing

When a guest replies:
1. Their `sequence_paused` should be set to `TRUE`
2. Their `last_replied_at` should be updated
3. A message record should be inserted with `direction='inbound'` and `flagged=TRUE`

To simulate (via webhook), send a valid `message.received` event to `/api/webhooks/quo`.

---

## Cron Schedules

| Service | Schedule | Purpose |
|---------|----------|---------|
| welcome-text-bot | Every 5 min | Send Step 1 welcome texts |
| recovery-cron | Every 30 min | Send recovery texts to partial signups |
| sequence-cron | Every 15 min | Send Steps 2-4 (only in 9am PST window) |

---

## Common Issues

### Messages not sending
- Check `QUO_API_KEY` is set correctly
- Verify phone number format: `+1` prefix + 10 digits

### Webhook signature failing
- Ensure `QUO_WEBHOOK_SECRET` is the base64-encoded signing key
- Check header format: `hmac;1;{timestamp};{signature}`

### Form not pre-populating on resume
- Verify resume token exists in database
- Check API response at `/api/guest?token=xxx`
