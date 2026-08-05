-- Keywords tracked per client
CREATE TABLE IF NOT EXISTS seo.keywords (
  id SERIAL PRIMARY KEY,
  location_id INT NOT NULL REFERENCES seo.locations(id) ON DELETE CASCADE,
  client_id INT NOT NULL,  -- denormalized for fast queries
  keyword VARCHAR(200) NOT NULL,
  target_domain TEXT,  -- URL of the client's website (clientes.bybusiness_url)
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(location_id, keyword)
);
CREATE INDEX IF NOT EXISTS idx_keywords_active ON seo.keywords(is_active, location_id) WHERE is_active = TRUE;

-- SERP positions over time
CREATE TABLE IF NOT EXISTS seo.serp_positions (
  id BIGSERIAL PRIMARY KEY,
  keyword_id INT NOT NULL REFERENCES seo.keywords(id) ON DELETE CASCADE,
  client_id INT NOT NULL,  -- denormalized
  position INT,  -- 1-100, NULL = not found in top 100
  page INT DEFAULT 1 CHECK (page IN (1, 2)),  -- 1=top 10, 2=11-20
  url_found TEXT,
  title TEXT,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_serp_keyword_time ON seo.serp_positions(keyword_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_serp_client_time ON seo.serp_positions(client_id, scraped_at DESC);

-- Extend job_queue CHECK constraint to include SERP_KEYWORD
ALTER TABLE seo.job_queue DROP CONSTRAINT IF EXISTS job_queue_job_type_check;
ALTER TABLE seo.job_queue ADD CONSTRAINT job_queue_job_type_check 
  CHECK (job_type IN ('AUDIT_PROFILE', 'PULL_REVIEWS', 'RANKING_GRID', 'UPDATE_NAP_BASELINE', 'SERP_KEYWORD'));

-- Auto-create first keyword from locations.target_keywords[0] when location is inserted
CREATE OR REPLACE FUNCTION seo.fn_auto_seed_keyword_from_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only seed if target_keywords[0] exists AND no active keyword yet
  IF NEW.target_keywords IS NOT NULL 
     AND array_length(NEW.target_keywords, 1) > 0
     AND NOT EXISTS (
       SELECT 1 FROM seo.keywords 
       WHERE location_id = NEW.id AND is_active = TRUE
     ) THEN
    INSERT INTO seo.keywords (location_id, client_id, keyword, target_domain, is_active)
    SELECT NEW.id, NEW.client_id, NEW.target_keywords[1], 
           (SELECT bybusiness_url FROM clientes.clientes WHERE id = NEW.client_id LIMIT 1),
           TRUE
    ON CONFLICT (location_id, keyword) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_seed_keyword ON seo.locations;
CREATE TRIGGER trg_auto_seed_keyword
AFTER INSERT OR UPDATE OF target_keywords ON seo.locations
FOR EACH ROW
EXECUTE FUNCTION seo.fn_auto_seed_keyword_from_location();

-- Auto-enqueue SERP_KEYWORD job when a keyword is created/activated
CREATE OR REPLACE FUNCTION seo.fn_auto_enqueue_serp_job()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_active = TRUE AND (OLD IS NULL OR OLD.is_active = FALSE) THEN
    INSERT INTO seo.job_queue (location_id, google_cid, job_type, priority, scheduled_for)
    SELECT NEW.location_id, l.google_cid, 'SERP_KEYWORD', 5, NOW() + (random() * INTERVAL '15 minutes')
    FROM seo.locations l WHERE l.id = NEW.location_id
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_auto_enqueue_serp_job ON seo.keywords;
CREATE TRIGGER trg_auto_enqueue_serp_job
AFTER INSERT OR UPDATE OF is_active ON seo.keywords
FOR EACH ROW
EXECUTE FUNCTION seo.fn_auto_enqueue_serp_job();
