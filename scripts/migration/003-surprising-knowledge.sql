-- Migration 003: Add surprising_knowledge column if it doesn't exist
ALTER TABLE guests ADD COLUMN IF NOT EXISTS surprising_knowledge TEXT;
