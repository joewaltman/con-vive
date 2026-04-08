# Welcome Text Bot

Sends a welcome SMS to new Con-Vive signups via the Quo (OpenPhone) API. Replaces the Make.com "Welcome Text" scenario.

## Usage

```bash
# Install
npm install

# Dry run (logs what would be sent, no actual texts or DB updates)
npm run dry-run

# Send for real
npm start
```

## Environment Variables

- `DATABASE_URL` — Postgres connection string
- `QUO_API_KEY` — OpenPhone API key

## Railway Cron Setup

Deploy as a separate Railway service with a cron schedule:

1. Create a new service in the Railway project
2. Set the root directory to `welcome-text-bot`
3. Set the start command to `npx tsx send-welcome-texts.ts`
4. Add a cron schedule: `*/15 * * * *` (every 15 minutes)
5. Add the `DATABASE_URL` and `QUO_API_KEY` environment variables
