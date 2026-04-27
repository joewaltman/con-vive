-- Migration 007: Post-dinner feedback system
-- Creates tables for peer feedback after dinners

-- Feedback tokens table (one per guest per dinner)
CREATE TABLE IF NOT EXISTS feedback_tokens (
  id SERIAL PRIMARY KEY,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  UNIQUE(dinner_id, guest_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_tokens_token ON feedback_tokens(token);
CREATE INDEX IF NOT EXISTS idx_feedback_tokens_dinner_id ON feedback_tokens(dinner_id);

-- Feedback responses table (individual ratings)
CREATE TABLE IF NOT EXISTS feedback_responses (
  id SERIAL PRIMARY KEY,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  rater_guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  ratee_guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  rating TEXT NOT NULL CHECK (rating IN ('yes', 'no', 'not_sure')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(dinner_id, rater_guest_id, ratee_guest_id)
);

CREATE INDEX IF NOT EXISTS idx_feedback_responses_dinner_id ON feedback_responses(dinner_id);
CREATE INDEX IF NOT EXISTS idx_feedback_responses_ratee ON feedback_responses(ratee_guest_id);

-- Feedback comments table (optional free-text comments)
CREATE TABLE IF NOT EXISTS feedback_comments (
  id SERIAL PRIMARY KEY,
  dinner_id INTEGER NOT NULL REFERENCES dinners(id) ON DELETE CASCADE,
  rater_guest_id INTEGER NOT NULL REFERENCES guests(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_comments_dinner_id ON feedback_comments(dinner_id);
