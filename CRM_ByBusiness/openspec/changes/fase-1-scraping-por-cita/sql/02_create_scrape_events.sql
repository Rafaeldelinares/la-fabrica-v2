-- 02_create_scrape_events.sql
-- FEAT: create scrape_events audit log (REQ-012)
-- Idempotent: safe to re-run

CREATE TABLE IF NOT EXISTS clientes.scrape_events (
  id               SERIAL PRIMARY KEY,
  cliente_id       INTEGER,
  triggered_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_type     VARCHAR(50),
  scrape_status    VARCHAR(20),
  duration_seconds INTEGER,
  error_message    TEXT,
  n_results        INTEGER
);

CREATE INDEX IF NOT EXISTS idx_scrape_events_cliente    ON clientes.scrape_events(cliente_id);
CREATE INDEX IF NOT EXISTS idx_scrape_events_triggered  ON clientes.scrape_events(triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_events_status    ON clientes.scrape_events(scrape_status);
