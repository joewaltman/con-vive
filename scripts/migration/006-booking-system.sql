-- Migration 006: Booking system support
-- Adds columns for dinner booking flow with Stripe payments

-- Add gender column to guests (if not exists)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS gender TEXT;

-- Add token column to invitations for booking links
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS token TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_token
  ON invitations(token) WHERE token IS NOT NULL;

-- Add columns to dinners table
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS dinner_time TEXT DEFAULT '7:00 PM';
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS price_cents INTEGER DEFAULT 7500;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS bring_items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS google_maps_link TEXT;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS parking_instructions TEXT;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS what_to_bring TEXT;
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS host_name TEXT;

-- Add columns to invitations table
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS booked_at TIMESTAMPTZ;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS confirmation_email_sent_at TIMESTAMPTZ;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS reminder_email_sent_at TIMESTAMPTZ;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS bring_item_slot INTEGER;

-- Create attendance table for tracking actual attendance
CREATE TABLE IF NOT EXISTS attendance (
  id SERIAL PRIMARY KEY,
  invitation_id INTEGER NOT NULL REFERENCES invitations(id),
  attended BOOLEAN,
  no_show BOOLEAN DEFAULT FALSE,
  feedback_email_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(invitation_id)
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);
CREATE INDEX IF NOT EXISTS idx_invitations_dinner_id ON invitations(dinner_id);
CREATE INDEX IF NOT EXISTS idx_invitations_stripe_session ON invitations(stripe_checkout_session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_invitation_id ON attendance(invitation_id);
