-- Cal Alumni signup support
-- Adds signup source tracking, gender balance toggle, and waitlist

-- Track signup source and gender balance toggle per dinner
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS signup_source TEXT NOT NULL DEFAULT 'con-vive';
ALTER TABLE dinners ADD COLUMN IF NOT EXISTS enforce_gender_balance BOOLEAN NOT NULL DEFAULT true;

-- Cal-specific data on guests (JSONB for flexibility)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS external_signup_data JSONB;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS signup_source TEXT NOT NULL DEFAULT 'con-vive';

-- Waitlist table
CREATE TABLE IF NOT EXISTS dinner_waitlist (
  id SERIAL PRIMARY KEY,
  dinner_id INT NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  guest_id INT NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  position INT NOT NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  released_at TIMESTAMPTZ,
  UNIQUE(dinner_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_dinner_waitlist_dinner ON dinner_waitlist(dinner_id);
CREATE INDEX IF NOT EXISTS idx_dinner_waitlist_position ON dinner_waitlist(dinner_id, position);
