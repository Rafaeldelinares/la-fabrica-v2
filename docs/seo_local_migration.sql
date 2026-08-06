-- seo_local_migration.sql — Phase 1 foundation for Local SEO module
-- Schema: seo (crm_bybusiness on VPS)

CREATE SCHEMA IF NOT EXISTS seo;

-- Locations (one per client we're monitoring)
CREATE TABLE IF NOT EXISTS seo.locations (
  id SERIAL PRIMARY KEY,
  client_id INT,  -- FK to existing clientes table (loose ref, no constraint for flexibility)
  google_cid VARCHAR(64) UNIQUE NOT NULL,
  business_name VARCHAR(255),
  target_keywords TEXT[] DEFAULT '{}',
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  is_monitored BOOLEAN DEFAULT TRUE,
  audit_frequency_hours INT DEFAULT 24,
  last_audit_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_locations_monitored ON seo.locations(is_monitored, last_audit_at);

-- Job queue
CREATE TABLE IF NOT EXISTS seo.job_queue (
  id SERIAL PRIMARY KEY,
  location_id INT NOT NULL REFERENCES seo.locations(id) ON DELETE CASCADE,
  google_cid VARCHAR(64) NOT NULL,
  job_type VARCHAR(50) NOT NULL CHECK (job_type IN ('AUDIT_PROFILE', 'PULL_REVIEWS', 'RANKING_GRID', 'UPDATE_NAP_BASELINE')),
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'done', 'failed', 'skipped')),
  priority INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  scheduled_for TIMESTAMPTZ DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  error TEXT,
  result_summary JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, job_type, scheduled_for)
);
CREATE INDEX IF NOT EXISTS idx_queue_pending ON seo.job_queue(status, scheduled_for, priority) WHERE status = 'pending';

-- Audit runs (trazabilidad)
CREATE TABLE IF NOT EXISTS seo.audit_runs (
  id SERIAL PRIMARY KEY,
  location_id INT REFERENCES seo.locations(id) ON DELETE SET NULL,
  google_cid VARCHAR(64),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ DEFAULT NOW(),
  fields_scraped TEXT[],
  pages_visited INT DEFAULT 0,
  duration_seconds INT,
  consent_clicked BOOLEAN DEFAULT FALSE,
  exit_reason VARCHAR(50) CHECK (exit_reason IN ('success', 'consent_block', 'not_found', 'timeout', 'error')),
  error TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_runs_location ON seo.audit_runs(location_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_runs_recent ON seo.audit_runs(google_cid, finished_at DESC);

-- NAP baseline (for detecting changes)
CREATE TABLE IF NOT EXISTS seo.nap_baseline (
  id SERIAL PRIMARY KEY,
  location_id INT NOT NULL REFERENCES seo.locations(id) ON DELETE CASCADE,
  name TEXT,
  address TEXT,
  phone VARCHAR(50),
  website TEXT,
  captured_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_nap_baseline_location ON seo.nap_baseline(location_id, captured_at DESC);

-- Admin alerts
CREATE TABLE IF NOT EXISTS seo.admin_alerts (
  id SERIAL PRIMARY KEY,
  location_id INT REFERENCES seo.locations(id) ON DELETE SET NULL,
  google_cid VARCHAR(64),
  alert_type VARCHAR(50) CHECK (alert_type IN ('BAD_REVIEW', 'NAP_CHANGE', 'RANK_DROP', 'NEW_REVIEW', 'PROFILE_INCOMPLETE', 'AUDIT_FAILED')),
  message TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  resolved_by INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_alerts_unresolved ON seo.admin_alerts(is_resolved, created_at DESC) WHERE is_resolved = FALSE;
