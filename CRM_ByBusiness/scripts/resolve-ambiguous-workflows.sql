-- Resolve ambiguous workflow duplicates
-- 2026-08-03
BEGIN;

-- ============================================================
-- CRM_LEADS_DISPONIBLES
-- Canonical: lyW4C8FdXJQcKqlH (updatedAt: 2026-06-13T00:10:13, most recent)
-- Legacy:   uBI7WkY6Vh3pLy02 (CRM_LEADS_DISPONIBLES_V2, different webhook path)
-- Legacy:   qEWuqH9IkzcSOc42 (already inactive in n8n, older)
-- ============================================================

-- Mark canonical as active (may already be; ensure it's correct)
UPDATE infraestructura.workflows_n8n
SET activo = true, updated_at = NOW()
WHERE workflow_id = 'lyW4C8FdXJQcKqlH';

-- Mark qEWuqH9IkzcSOc42 legacy (was the one active row)
UPDATE infraestructura.workflows_n8n
SET activo = false, updated_at = NOW(),
    descripcion = COALESCE(descripcion, '') || E'\n2026-08-03: marked legacy — duplicate of lyW4C8FdXJQcKqlH for CRM_LEADS_DISPONIBLES'
WHERE workflow_id = 'qEWuqH9IkzcSOc42';

-- uBI7WkY6Vh3pLy02 is NOT in registry — INSERT as inactive
INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, created_at, updated_at)
VALUES
  ('uBI7WkY6Vh3pLy02', 'CRM_LEADS_DISPONIBLES', false,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-leads-disponibles-v2'],
   NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET
  activo = false,
  descripcion = COALESCE(infraestructura.workflows_n8n.descripcion, '') || E'\n2026-08-03: marked legacy — duplicate of lyW4C8FdXJQcKqlH for CRM_LEADS_DISPONIBLES',
  updated_at = NOW();

-- ============================================================
-- CRM_RESET_ENTRENAMIENTO_V2
-- Canonical: ln3G41a97ESSmxsW (updatedAt: 2026-06-07T08:57:02, newer by 27s)
-- Legacy:   lv91ZP2F91vYrASu (already inactive in n8n, older)
-- Neither is in registry — INSERT both
-- ============================================================

-- Insert canonical as active
INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, created_at, updated_at)
VALUES
  ('ln3G41a97ESSmxsW', 'CRM_RESET_ENTRENAMIENTO_V2', true,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-reset-entrenamiento'],
   NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET
  activo = true,
  updated_at = NOW();

-- Insert legacy as inactive
INSERT INTO infraestructura.workflows_n8n
  (workflow_id, nombre, activo, webhook_urls, created_at, updated_at)
VALUES
  ('lv91ZP2F91vYrASu', 'CRM_RESET_ENTRENAMIENTO_V2', false,
   ARRAY['https://n8n.ia-bybusiness.online/webhook/crm-reset-entrenamiento'],
   NOW(), NOW())
ON CONFLICT (workflow_id) DO UPDATE SET
  activo = false,
  descripcion = COALESCE(infraestructura.workflows_n8n.descripcion, '') || E'\n2026-08-03: marked legacy — duplicate of ln3G41a97ESSmxsW for CRM_RESET_ENTRENAMIENTO_V2',
  updated_at = NOW();

COMMIT;
