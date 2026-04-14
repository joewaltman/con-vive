-- Migration 004: Bring Items feature
-- Allows dinner guests to claim items they'll bring via tokenized links

-- Add bring_token to invitations
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS bring_token TEXT UNIQUE;
CREATE UNIQUE INDEX IF NOT EXISTS idx_invitations_bring_token
  ON invitations(bring_token) WHERE bring_token IS NOT NULL;

-- Create bring_items table
CREATE TABLE IF NOT EXISTS bring_items (
  id SERIAL PRIMARY KEY,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  description TEXT,
  slots INTEGER NOT NULL DEFAULT 1,
  claimed_by INTEGER REFERENCES guests(id) ON DELETE SET NULL,
  claimed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bring_items_dinner_id ON bring_items(dinner_id);
CREATE INDEX IF NOT EXISTS idx_bring_items_claimed_by ON bring_items(claimed_by);

-- Add updated_at trigger (only if not already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'bring_items_updated_at'
  ) THEN
    CREATE TRIGGER bring_items_updated_at BEFORE UPDATE ON bring_items
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
