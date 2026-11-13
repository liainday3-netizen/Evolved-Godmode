-- GodMode V2: private, session-scoped coding memory.
-- Apply through the project's database migration process after backing up production.
CREATE TABLE IF NOT EXISTS coding_attempts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  task TEXT NOT NULL,
  language TEXT NOT NULL,
  generated_code TEXT NOT NULL,
  outcome TEXT NOT NULL DEFAULT 'unrated'
    CHECK (outcome IN ('unrated', 'success', 'failure')),
  feedback TEXT,
  error_summary TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS coding_attempts_owner_created_idx
  ON coding_attempts (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS coding_attempts_owner_outcome_idx
  ON coding_attempts (owner_id, outcome);
