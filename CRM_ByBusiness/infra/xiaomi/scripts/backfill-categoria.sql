-- backfill-categoria.sql
-- Populates clientes.clientes.categoria from gbp_audit_history.
-- Idempotent: only updates rows where categoria is NULL or different.
-- Run via:
--   ssh root@72.60.191.179 "docker exec -i fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \"$(cat backfill-categoria.sql)\""
--
-- Why: The wrapper (crm-gb-scap.js) correctly scrapes categoria_principal via
--       /run endpoint, but the n8n workflow that creates clientes does NOT save it.
--       Source: gbp_audit_history.audit_data->>'categoria_principal'
--       ~580 clientes tienen audits con categoria_principal.
--
-- Excludes garbage values like "380 reseñas", "3 reseñas", etc. that are
-- scraped from Google Maps UI labels (not actual business categories).
-- Uses MODE (most frequent category per cliente) to handle inconsistencies.

WITH categoria_audit AS (
  SELECT
    ah.cliente_id,
    (ah.audit_data->>'categoria_principal') AS cat
  FROM clientes.gbp_audit_history ah
  WHERE ah.cliente_id IS NOT NULL
    AND (ah.audit_data->>'categoria_principal') IS NOT NULL
    -- Exclude known garbage values scraped from Google Maps UI labels
    AND (ah.audit_data->>'categoria_principal') NOT IN (
      '',
      '380 reseñas', '3 reseñas', '4 reseñas', '5 reseñas',
      '2 reseñas', '1 reseñas',
      'Selecciona tus fechas para ver los mejores precios'
    )
    AND LENGTH(ah.audit_data->>'categoria_principal') > 3
    AND LENGTH(ah.audit_data->>'categoria_principal') < 80
    -- Exclude strings that look like review counts, not categories
    AND (ah.audit_data->>'categoria_principal') !~ '^\d+\s*(reseñ|review)'
    -- Exclude composite values that include review counts (e.g. "4.5 (380 reseñas)")
    AND (ah.audit_data->>'categoria_principal') !~ '^[0-9.,]+\s*\('
),
cat_moda AS (
  SELECT cliente_id, cat, COUNT(*) AS freq
  FROM categoria_audit
  GROUP BY cliente_id, cat
  ORDER BY cliente_id, freq DESC
),
cat_best AS (
  -- Pick the most frequent category per cliente (mode)
  SELECT DISTINCT ON (cliente_id) cliente_id, cat
  FROM cat_moda
  ORDER BY cliente_id, freq DESC
)
UPDATE clientes.clientes c
SET categoria = cb.cat
FROM cat_best cb
WHERE c.id = cb.cliente_id
  AND c.categoria IS DISTINCT FROM cb.cat;
