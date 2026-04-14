-- Migration 005: Multi-slot bring items with separate claims table
-- Allows multiple guests to claim slots on the same item

-- Create the claims join table
CREATE TABLE IF NOT EXISTS bring_item_claims (
  id SERIAL PRIMARY KEY,
  bring_item_id INTEGER NOT NULL REFERENCES bring_items(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  claimed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(bring_item_id, guest_id)  -- one claim per guest per item
);

CREATE INDEX IF NOT EXISTS idx_bring_item_claims_item_id ON bring_item_claims(bring_item_id);
CREATE INDEX IF NOT EXISTS idx_bring_item_claims_guest_id ON bring_item_claims(guest_id);

-- Migrate existing claims from bring_items to bring_item_claims
INSERT INTO bring_item_claims (bring_item_id, guest_id, claimed_at)
SELECT id, claimed_by, COALESCE(claimed_at, NOW())
FROM bring_items
WHERE claimed_by IS NOT NULL
ON CONFLICT (bring_item_id, guest_id) DO NOTHING;

-- Drop the old columns from bring_items (after migration)
ALTER TABLE bring_items DROP COLUMN IF EXISTS claimed_by;
ALTER TABLE bring_items DROP COLUMN IF EXISTS claimed_at;
