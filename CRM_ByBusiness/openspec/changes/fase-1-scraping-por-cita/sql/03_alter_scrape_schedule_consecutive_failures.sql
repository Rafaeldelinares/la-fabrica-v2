-- 03_alter_scrape_schedule_consecutive_failures.sql
-- FEAT: add consecutive_failures counter for alerting (REQ-011)
-- Safe to re-run: uses ADD COLUMN IF NOT EXISTS

ALTER TABLE clientes.scrape_schedule
  ADD COLUMN IF NOT EXISTS consecutive_failures INTEGER DEFAULT 0 NOT NULL;
