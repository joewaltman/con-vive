-- Migration 002: Messaging and Sequence Support
-- Run this migration to add columns for automated guest sequences and message tracking

-- Add columns to guests table
ALTER TABLE guests
  ADD COLUMN IF NOT EXISTS sequence_step INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sequence_paused BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS sequence_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_message_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS last_replied_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS routing_status TEXT,
  ADD COLUMN IF NOT EXISTS recovery_text_sent BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS resume_token TEXT;

CREATE INDEX IF NOT EXISTS idx_guests_resume_token ON guests(resume_token) WHERE resume_token IS NOT NULL;

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  direction TEXT NOT NULL,
  body TEXT NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  delivered BOOLEAN DEFAULT FALSE,
  quo_message_id TEXT UNIQUE,
  conversation_id TEXT,
  sequence_step INTEGER,
  message_type TEXT,
  flagged BOOLEAN DEFAULT FALSE,
  flagged_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_guest_id ON messages(guest_id);
CREATE INDEX IF NOT EXISTS idx_messages_quo_id ON messages(quo_message_id) WHERE quo_message_id IS NOT NULL;
