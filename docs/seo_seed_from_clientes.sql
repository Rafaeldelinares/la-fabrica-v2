-- One-shot migration: populate seo.locations from existing clientes with google_cid
-- Run once: 2026-08-05
INSERT INTO seo.locations (client_id, google_cid, business_name, is_monitored)
SELECT
  c.id,
  c.google_cid,
  c.nombre_comercial,
  TRUE  -- is_monitored = TRUE by default for migrated clients
FROM clientes.clientes c
WHERE c.google_cid IS NOT NULL
  AND c.google_cid <> ''
  AND c.estado = 'activo'
ON CONFLICT (google_cid) DO NOTHING
RETURNING id, client_id, google_cid, business_name;
