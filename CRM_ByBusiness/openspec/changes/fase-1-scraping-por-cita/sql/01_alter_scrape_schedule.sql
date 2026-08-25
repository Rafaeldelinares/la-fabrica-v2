-- 01_alter_scrape_schedule.sql
-- FEAT: add scrape_schedule columns for fase-1 (REQ-013)
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS

ALTER TABLE clientes.scrape_schedule
  ADD COLUMN IF NOT EXISTS next_scrape_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scrape_count     INTEGER DEFAULT 0 NOT NULL,
  ADD COLUMN IF NOT EXISTS scrape_status    VARCHAR(20) DEFAULT 'pending' NOT NULL,
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS last_trigger    VARCHAR(50);

-- Index for health monitoring queries
CREATE INDEX IF NOT EXISTS idx_scrape_schedule_status ON clientes.scrape_schedule(scrape_status);
