-- backfill-categoria.sql
-- Populates clientes.clientes.categoria from gbp_audit_history.
-- Idempotent: only updates rows where categoria is NULL or different.
-- Run via: docker exec -i fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness < backfill-categoria.sql
--
-- Why: 1026/1027 active clientes had categoria=NULL (2026-08-12).
--       The audit wrapper already scrapes categoria_principal and stores it in
--       clientes.gbp_audit_history (755 of 774 audits have it).
--       This script propagates it back to clientes.clientes.
--
-- Excludes garbage values like "380 reseñas", "3 reseñas", etc.
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
      ' Selecciona tus fechas para ver los mejores precios',
      '380 reseñas', '3 reseñas', '4 reseñas', '5 reseñas',
      '2 reseñas', '1 reseñas'
    )
    AND LENGTH(ah.audit_data->>'categoria_principal') > 3
    AND LENGTH(ah.audit_data->>'categoria_principal') < 80
    -- Exclude strings that look like review counts, not categories
    AND (ah.audit_data->>'categoria_principal') !~ '^\d+\s*(reseñ|review)'
),
cat_moda AS (
  SELECT cliente_id, cat, COUNT(*) AS freq
  FROM categoria_audit
  GROUP BY cliente_id, cat
  ORDER BY cliente_id, freq DESC
),
cat_best AS (
  SELECT DISTINCT ON (cliente_id) cliente_id, cat
  FROM cat_moda
  ORDER BY cliente_id, freq DESC
)
UPDATE clientes.clientes c
SET categoria = cb.cat
FROM cat_best cb
WHERE c.id = cb.cliente_id
  AND c.categoria IS DISTINCT FROM cb.cat;
