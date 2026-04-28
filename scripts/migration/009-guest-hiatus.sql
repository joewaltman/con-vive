-- Add hiatus fields to guests table
-- When on_hiatus = true and hiatus_until > current_date, guest should not be surfaced for invites

ALTER TABLE guests ADD COLUMN IF NOT EXISTS on_hiatus BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS hiatus_until DATE;

-- Index for efficient filtering of hiatus guests
CREATE INDEX IF NOT EXISTS idx_guests_hiatus ON guests(on_hiatus, hiatus_until) WHERE on_hiatus = true;
