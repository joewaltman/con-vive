-- Migration: Add host-guest integrity constraints
-- Run this AFTER backfilling data (Phase 4)

-- First verify all hosts have guest_id
-- SELECT id, first_name, last_name FROM hosts WHERE guest_id IS NULL;
-- (Should return 0 rows before proceeding)

-- First verify all dinners have host and host_guest_id
-- SELECT id, dinner_name FROM dinners WHERE host IS NULL OR host_guest_id IS NULL;
-- (Should return 0 rows before proceeding)

-- =====================================================
-- HOSTS TABLE CONSTRAINTS
-- =====================================================

-- Make guest_id required
ALTER TABLE hosts ALTER COLUMN guest_id SET NOT NULL;

-- Ensure each guest can only be a host once
ALTER TABLE hosts ADD CONSTRAINT hosts_guest_id_unique UNIQUE (guest_id);

-- Add foreign key constraint to guests table (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'hosts_guest_id_fkey'
        AND table_name = 'hosts'
    ) THEN
        ALTER TABLE hosts ADD CONSTRAINT hosts_guest_id_fkey
            FOREIGN KEY (guest_id) REFERENCES guests(id);
    END IF;
END $$;

-- =====================================================
-- DINNERS TABLE CONSTRAINTS
-- =====================================================

-- Make host (text name) required
ALTER TABLE dinners ALTER COLUMN host SET NOT NULL;

-- Make host_guest_id required
ALTER TABLE dinners ALTER COLUMN host_guest_id SET NOT NULL;

-- Add foreign key constraint for host_guest_id (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'dinners_host_guest_id_fkey'
        AND table_name = 'dinners'
    ) THEN
        ALTER TABLE dinners ADD CONSTRAINT dinners_host_guest_id_fkey
            FOREIGN KEY (host_guest_id) REFERENCES guests(id);
    END IF;
END $$;

-- =====================================================
-- VERIFICATION QUERIES (run after migration)
-- =====================================================

-- Check hosts constraints
-- \d hosts

-- Check dinners constraints
-- \d dinners

-- Verify no NULL values remain
-- SELECT COUNT(*) as null_guest_id_hosts FROM hosts WHERE guest_id IS NULL;
-- SELECT COUNT(*) as null_host_dinners FROM dinners WHERE host IS NULL;
-- SELECT COUNT(*) as null_host_guest_id_dinners FROM dinners WHERE host_guest_id IS NULL;
