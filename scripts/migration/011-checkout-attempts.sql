-- Migration: Add stripe_checkout_attempts column for audit trail
-- This prevents losing session IDs when a new checkout is attempted

ALTER TABLE invitations
  ADD COLUMN IF NOT EXISTS stripe_checkout_attempts JSONB DEFAULT '[]'::jsonb;

-- Index for querying by session ID within the JSONB array
CREATE INDEX IF NOT EXISTS idx_invitations_checkout_attempts
  ON invitations USING GIN (stripe_checkout_attempts);

-- Also add webhook_orphans table for tracking unmatched webhooks
CREATE TABLE IF NOT EXISTS webhook_orphans (
  id SERIAL PRIMARY KEY,
  stripe_session_id TEXT,
  stripe_payment_intent_id TEXT,
  customer_email TEXT,
  amount_cents INTEGER,
  metadata JSONB,
  raw_event JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_webhook_orphans_session_id ON webhook_orphans(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_webhook_orphans_payment_intent ON webhook_orphans(stripe_payment_intent_id);
