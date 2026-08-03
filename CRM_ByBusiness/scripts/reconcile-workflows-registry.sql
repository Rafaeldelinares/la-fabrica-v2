-- ============================================================
-- reconcile-workflows-registry.sql
-- Syncs infraestructura.workflows_n8n registry with live n8n VPS state
-- Date: 2026-08-03
-- Before: 58 active, 184 total
-- After:  79 active, 203 total
-- ============================================================

BEGIN;

-- ============================================================
-- Category A: INSERT active workflows missing from registry
-- ============================================================

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('mOUmrvCIrB0ukNnY', 'CRM_CAMPANA_CREAR_DESDE_BUSQUEDA', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-campana-crear-desde-busqueda'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('RTvcwCDw4zkd3AfF', 'CRM_ADMIN_AUDIT_GET', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-admin-audit-get'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('AVSC8oqMyHJy7Bg2', 'CRM_OPERADOR_KPI_LIVE', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-operador-kpi-live'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('iRnkuGexnMjd1lrm', 'CRM_REPUTACION_LEAD', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('HL57uWGJRrbJfETZ', 'CRM_LEAD_FRESHNESS_METRICS', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('bFXZei2W4GmFhid1', 'CRM_SCRAPER_HEALTH', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('pacy6PZAQflAOKDe', 'CRM_SCRAPER_CONFIG_GET', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('nlVHVsLbQHCLoaa8', 'CRM_SCRAPER_CONFIG_UPDATE', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('epiM2Wd8mziT3Awz', 'CRM_CALLBACKS_GESTIONAR', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-callbacks-gestionar'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('eaJshSuUZlJq9Imx', 'CRM_PANEL_SUPERVISOR', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-panel-supervisor'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('gBSyRazaEjXvkUm1', 'CRM_PROFORMA_EDITAR', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-proforma-editar'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('e6bDDk5S7qawKDox', 'CRM_RENOVACIONES', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-renovaciones'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('Y6WtuPILJFC2j32z', 'CRM_LEAD_TIMELINE', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-lead-timeline'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('yn7NjlOlndmkjrio', 'CRM_LOGIN_ONE_CODE', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-login-one-code'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('MzzVjMAMzkiGOnqL', 'CRM_FRONTEND_ERROR_REPORT', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-frontend-error-report'],
   NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('i7UTe5EkotG5FBm3', 'CRM_BACKFILL_LEAD_QUALITY', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, parametros_entrada, created_at, updated_at)
VALUES
  ('iVjUEcKJQ4YkItak', 'CRM_DISTRIBUIDOR_TRAINING_CRON', true,
   NULL, NULL, NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET activo = true, updated_at = NOW();

-- ============================================================
-- Category B: Activate workflows marked inactive in registry
-- ============================================================

UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'CXFaWSzoukB1Eyim';

UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'I7xRrPyunelgI6tA';

UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'wpkcKuaw4ipZfAm9';

UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'd8r7vrXud9YnAL7o';

UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'v2PIYm6HndX5Gyii';

-- ============================================================
-- Category C: Fix CRM02RESULTv2vps webhook URL
-- Registry had crm-registrar-resultado (belongs to 6x0x8DCOBzZf62K6)
-- Actual path (verified via n8n API): crm-resultado-v2
-- ============================================================

UPDATE infraestructura.workflows_n8n
SET webhook_urls = ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-resultado-v2'],
    updated_at = NOW(),
    descripcion = COALESCE(descripcion, '') || E'\n2026-08-03: fixed webhook URL — was incorrectly pointing to crm-registrar-resultado; actual path is crm-resultado-v2 per CRM02RESULTv2vps workflow nodes (verified via n8n API)'
WHERE workflow_id = 'CRM02RESULTv2vps';

COMMIT;
