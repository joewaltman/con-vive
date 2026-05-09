-- Add one_liner field for storing AI-generated guest introductions
ALTER TABLE guests ADD COLUMN IF NOT EXISTS one_liner TEXT;

-- Index for quick lookup of guests without one-liners (for batch generation)
CREATE INDEX IF NOT EXISTS idx_guests_no_one_liner ON guests(id) WHERE one_liner IS NULL;
