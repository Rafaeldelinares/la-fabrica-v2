# Tasks: Xiaomi-12 Cookies Admin Panel

## Overview
Implementación completa de panel admin para gestionar cookies Google del Xiaomi-12 + tracking de expiración + alertas por email.

## Delivery Strategy
- **Mode**: chained PRs (3 slices: DB+backend, frontend, docs)
- **Review budget**: ~400 lines per PR

---

## Phase 1: DB + Backend (n8n workflows)

### T1.1 — DB Migration
- [x] Crear tabla `infraestructura.xiaomi_cookies_log` en VPS
- [x] Verificar que tabla existe

**SQL**:
```sql
CREATE TABLE IF NOT EXISTS infraestructura.xiaomi_cookies_log (
  id SERIAL PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  applied_by VARCHAR(255),
  cookie_count INTEGER,
  earliest_expiry_at TIMESTAMPTZ,
  latest_expiry_at TIMESTAMPTZ,
  result VARCHAR(50),
  error_message TEXT,
  source_ip VARCHAR(50)
);
CREATE INDEX idx_xiaomi_cookies_log_applied_at ON infraestructura.xiaomi_cookies_log(applied_at DESC);
```

**Nota**: no incluye columna `error_message` en la implementación real — simplificar si se necesita.

### T1.2 — Workflow CRM_XIAOMI_COOKIES_UPLOAD
- [x] Webhook POST `/webhook/crm-xiaomi-cookies-apply`
- [x] Valida JSON (≥1 cookie con name+value+domain)
- [x] Calcula earliest/latest expiry
- [x] INSERT en `xiaomi_cookies_log`
- [x] Retorna `{ success, applied_at, cookie_count, earliest_expiry_at, latest_expiry_at, days_until_earliest_expiry }`
- [x] **Limitación CGNAT**: Xiaomi no puede recibir SSH entrante. El flujo de subida SSH directo NO está implementado. El usuario sube el archivo JSON de cookies desde el panel admin.

**Workflow ID**: `KF7cnjHxyXNNGeoV` · Activo ✅

### T1.3 — Workflow CRM_XIAOMI_COOKIES_STATUS_GET
- [x] Webhook GET `/webhook/crm-xiaomi-cookies-status-get`
- [x] SELECT última fila de `xiaomi_cookies_log`
- [x] Calcula días restantes
- [x] Retorna status con color: `fresh` (>30d), `warning` (7-30d), `critical` (<7d), `expired`

**Workflow ID**: `H9c3hoQXNkMih3XG` · Activo ✅

### T1.4 — Workflow CRM_XIAOMI_COOKIES_EXPIRY_CHECK
- [x] GET webhook `/webhook/crm-xiaomi-expiry-check` (no schedule trigger disponible en este n8n)
- [x] Crontab VPS替代: `0 9 * * * curl -s https://n8n.ia-bybusiness.online/webhook/crm-xiaomi-expiry-check`
- [x] Lee última entrada de `xiaomi_cookies_log`
- [x] Calcula días hasta earliest_expiry
- [x] Envía email según umbral:
  - `<3 días`: subject "🚨 CRÍTICO: Cookies xiaomi-12 expiran en X días"
  - `>=3 && <7 días`: subject "⚠️ Cookies xiaomi-12 expiran pronto"
  - `<0 días`: subject "❌ Cookies EXPIRADAS — el wrapper dejó de funcionar"
  - `>=7 días`: NO enviar (cada 30 días recordatorio "OK")
- [x] Email from: `informacion@ia-bybusiness.com` (SMTP cred `8NbamWrMdRexLNwa`)
- [x] Email to: `rafaeldelinares@gmail.com`
- [ ] Template HTML profesional con tabla de cookies + CTA ← pendiente

**Workflow ID**: `MmSWL0ydWhyjxxUS` · Activo ✅

---

## Phase 2: Frontend

### T2.1 — Hook useXiaomiCookies
- [x] Crear `src/modules/admin/scraper/useXiaomiCookies.js`
- [x] Expone: `status`, `isStatusLoading`, `isStatusError`, `uploadCookies(cookiesArray)`, `isUploading`, `uploadResult`, `notification`, `refetchStatus()`
- [x] Usa `useN8nQuery` para status (webhook `crm-xiaomi-cookies-status-get`)
- [x] Usa `useN8nMutation` para upload (webhook `crm-xiaomi-cookies-apply`)

### T2.2 — Componente XiaomiCookiesPanel
- [x] Crear `src/modules/admin/scraper/XiaomiCookiesPanel.jsx`
- [x] Header: "Cookies Xiaomi-12" + refresh
- [x] Sección "Estado actual": badge de urgency, cookie count, earliest/latest expiry, días
- [x] File picker para subir JSON (Chrome/Playwright, curl, string formats)
- [x] Preview de validación + resultado success/error
- [x] Info card: cómo funciona el polling (Xiaomi polléa cada 5 min)
- [x] AccessDenied si no tiene `admin.system.config`

### T2.3 — Tests
- [x] `XiaomiCookiesPanel.rbac.test.jsx` — RBAC: solo admin.system.config accede

### T2.4 — Integración
- [x] Agregar XiaomiCookiesPanel al routing en `WorkBody.jsx` (tab MONITOR)

---

## Phase 3: Documentation

### T3.1 — Openspec
- [x] Crear `openspec/changes/2026-08-12-xiaomi-cookies-admin/proposal.md`
- [x] Este tasks.md

### T3.2 — Update CHANGELOG.md
- [ ] Sección "Xiaomi-12 — Cookies via CRM (2026-08-12)"

---

## Verification Commands

```bash
# Backend workflows
ssh root@72.60.191.179 "docker exec fabrica-n8n-1 n8n list:workflow --active" 2>/dev/null
# o vía API:
curl -s -H "X-N8N-API-KEY: ..." "https://n8n.ia-bybusiness.online/api/v1/workflows?active=true" | \
  jq '.data[] | select(.name | contains("XIAOMI")) | {id, name, active}'

# Test upload (desde orchestrator con SSH al Xiaomi)
COOKIES=$(ssh root@100.75.94.18 -p 8022 "cat ~/xiaomi-gb-scape/lib/google_session.json")
curl -X POST 'https://n8n.ia-bybusiness.online/webhook/crm-xiaomi-cookies-apply' \
  -H 'Content-Type: application/json' \
  -d "{\"cookies\":$COOKIES}"

# Test status
curl 'https://n8n.ia-bybusiness.online/webhook/crm-xiaomi-cookies-status-get'

# Test expiry
curl 'https://n8n.ia-bybusiness.online/webhook/crm-xiaomi-expiry-check'

# DB
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"SELECT id, applied_by, cookie_count, earliest_expiry_at, latest_expiry_at, result, applied_at FROM infraestructura.xiaomi_cookies_log ORDER BY id DESC LIMIT 5;\""

# Frontend
cd /opt/fabrica/CRM_ByBusiness
npm run build
npx vitest run src/modules/admin/scraper/
```
