-- Add couple booking columns to invitations table
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS is_couple_booking BOOLEAN DEFAULT FALSE;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS companion_first_name TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS companion_last_name TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS companion_email TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS companion_gender TEXT;
ALTER TABLE invitations ADD COLUMN IF NOT EXISTS companion_guest_id INTEGER REFERENCES guests(id);

-- Index for finding couple bookings
CREATE INDEX IF NOT EXISTS idx_invitations_couple ON invitations(is_couple_booking) WHERE is_couple_booking = TRUE;

-- Index for companion guest lookups
CREATE INDEX IF NOT EXISTS idx_invitations_companion_guest ON invitations(companion_guest_id) WHERE companion_guest_id IS NOT NULL;
