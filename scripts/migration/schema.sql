-- Con-Vive: Airtable to Postgres Migration Schema
-- Run this to create all tables, triggers, and indexes

-- Drop existing tables if re-running migration
DROP TABLE IF EXISTS invitations CASCADE;
DROP TABLE IF EXISTS transcripts CASCADE;
DROP TABLE IF EXISTS dinners CASCADE;
DROP TABLE IF EXISTS guests CASCADE;

-- ============================================
-- TABLES
-- ============================================

-- guests - main table from Airtable Signups
CREATE TABLE guests (
  id SERIAL PRIMARY KEY,
  airtable_record_id TEXT,
  first_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  phone_clean TEXT,
  priority INTEGER,
  one_thing TEXT,
  about TEXT,
  age_range TEXT,
  available_days TEXT[],
  dietary_restrictions TEXT[],
  dietary_notes TEXT,
  solo_or_couple TEXT,
  hosting_interest TEXT,
  call_complete BOOLEAN,
  call_date DATE,
  curious_about TEXT,
  surprising_knowledge TEXT,
  funnel_stage TEXT,
  curiosity_score NUMERIC,
  spark_score NUMERIC,
  coming_solo TEXT,
  what_do_you_do TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  invite_text_sent_date DATE,
  follow_up_text_sent DATE,
  timestamp TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- transcripts - separated for lightweight queries
CREATE TABLE transcripts (
  id SERIAL PRIMARY KEY,
  guest_id INTEGER REFERENCES guests(id),
  full_transcript TEXT,
  summarized_transcript TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- dinners - from Airtable Dinners table
CREATE TABLE dinners (
  id SERIAL PRIMARY KEY,
  airtable_record_id TEXT,
  dinner_name TEXT,
  dinner_date DATE,
  host TEXT,
  location TEXT,
  guest_count INTEGER,
  menu TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- invitations - from Airtable Invitations table
CREATE TABLE invitations (
  id SERIAL PRIMARY KEY,
  airtable_record_id TEXT,
  guest_id INTEGER REFERENCES guests(id),
  dinner_id INTEGER REFERENCES dinners(id),
  guest_name TEXT,
  phone TEXT,
  invite_sent_date DATE,
  dinner_date_proposed DATE,
  response TEXT,
  response_date DATE,
  invite_message TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRIGGER FUNCTION FOR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables
CREATE TRIGGER guests_updated_at BEFORE UPDATE ON guests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER transcripts_updated_at BEFORE UPDATE ON transcripts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER dinners_updated_at BEFORE UPDATE ON dinners
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER invitations_updated_at BEFORE UPDATE ON invitations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX idx_guests_email ON guests(email);
CREATE INDEX idx_guests_phone_clean ON guests(phone_clean);
CREATE INDEX idx_guests_funnel_stage ON guests(funnel_stage);
CREATE INDEX idx_guests_priority ON guests(priority);
CREATE INDEX idx_invitations_guest_id ON invitations(guest_id);
CREATE INDEX idx_invitations_dinner_id ON invitations(dinner_id);
CREATE INDEX idx_transcripts_guest_id ON transcripts(guest_id);
