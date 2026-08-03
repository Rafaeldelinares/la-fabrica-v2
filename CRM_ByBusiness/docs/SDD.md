# CRM ByBusiness — SDD (System/Solution Design Document)

**Versión:** 1.0  
**Fecha:** 2026-08-01  
**Estado:** Borrador vivo — actualizar con cada decisión técnica mayor  
**Complementa:** [`PRD.md`](./PRD.md) para qué construimos · [`RDD.md`](./RDD.md) para qué datos manejamos · [`RUNBOOK.md`](./RUNBOOK.md) para operación

---

## 1. Resumen arquitectónico

CRM ByBusiness es una aplicación web con arquitectura **frontend SPA + BFF (Backend-For-Frontend) en n8n + PostgreSQL**. La filosofía: el frontend nunca toca la DB directamente — **toda lógica de negocio vive en workflows n8n** que el equipo de ops puede modificar sin deploys de código.

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR (operador / admin)                 │
│  React 19 + Vite + Tailwind v4                                     │
│  Torre de Control (admin) | Modo Túnel (operador)                  │
└──────────┬──────────────────────────────────────────────────────────┘
           │ HTTPS via Traefik (VPS) / localhost (dev)
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  nginx (VPS) :80/:443                                               │
│  Sirve dist/ del CRM como estáticos + proxy a n8n                   │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────────────┐
│  n8n 2.11.0-patched  (BFF + lógica de negocio)                       │
│  - 14 workflows CRM (distribuidor, registrar resultado, etc.)       │
│  - Webhooks públicos + internos                                     │
│  - Conecta a Postgres, WAHA, SMTP, scrapers                        │
└──────────┬──────────────────────────────────────────────────────────┘
           │
           ├─────────────────────────┐
           ▼                         ▼
┌─────────────────────┐   ┌────────────────────────┐
│  PostgreSQL 15      │   │  Servicios externos    │
│  - crm_bybusiness   │   │  - WAHA WhatsApp       │
│  - fabrica (audit)  │   │  - SMTP email          │
│                     │   │  - Scraper engines     │
└─────────────────────┘   │    (Go :8092 + JS)     │
                          │  - LMStudio (Qwen)     │
                          └────────────────────────┘
```

**Por qué esta forma y no otra:** el equipo de La Fábrica es chico (1 dev + 1 ops), el time-to-market importa más que la pureza arquitectónica. n8n nos da velocidad de iteración en lógica de negocio a costa de deuda técnica en tests. Aceptable para escala actual (~100k leads, ~50 usuarios), revisión cuando superemos 500k leads.

---

## 2. Stack tecnológico

| Capa | Tecnología | Versión | Notas |
|---|---|---|---|
| Frontend | React | 19.2 | Con Compiler (no useMemo/useCallback manual) |
| Build | Vite | 7.2 | Dev server + build |
| Estilos | Tailwind CSS | 4.0 | PostCSS + Vite plugin |
| Routing | React Router | implícito | Sin router library dedicada — `useState` para tabs |
| Forms | Native + zod | 4.3 | Validación manual con zod schemas |
| Calendar | react-big-calendar | 1.19 | Agenda |
| Auth | Custom | — | Sesión en localStorage, JWT-style token |
| 2FA | otpauth + qrcode.react | 9.5 / 4.2 | TOTP estándar |
| HTTP | fetch nativo | — | Sin axios — RN compat en el futuro |
| BFF | n8n | 2.11.0-patched | Custom Docker image (patch GRANT_TOKEN_TTL) |
| DB | PostgreSQL | 15 (VPS) / 16 (local) | Schemas por dominio |
| Scrapers | Go (motor) + Node.js (NANO/HEAVY) | Go 1.21 / Node 20 | Ver §3.1 |
| WhatsApp | WAHA | latest | docker container, sesión persistente |
| Logs | logrotate + systemd | — | `/var/log/fabrica/` |
| AI reviews | LMStudio + Qwen 2.5 Coder 7B | — | Local, sin API key externa |

**Decisiones:**
- **Sin Next.js / Remix**: Vite SPA basta. SSR no aporta para app interna.
- **Sin TypeScript**: Migración pendiente (Línea 3). Por ahora PropTypes + JSDoc.
- **Sin Redux/Zustand**: useState + Context (`AuthContext`) suficiente para escala actual.

---

## 3. Topología de deployment

### Local (dev) — `/opt/fabrica/`

```
/opt/fabrica/
├── CRM_ByBusiness/                  ← monorepo (frontend + docs)
│   ├── src/                         ← React
│   ├── docs/                        ← PRD, RDD, SDD, RUNBOOK
│   └── dist/                        ← build output (servido por nginx)
├── CRM_ByBusiness-vps-snapshot/     ← mirror sanitizado de VPS para backups de workflows
├── .gga                             ← config GGA (local, tracked)
├── .git/hooks/pre-commit            ← hook GGA (local, NO tracked)
├── docker-compose stacks
│   ├── fabrica-n8n (puerto 5678)
│   ├── config-postgres-1 (5432)
│   ├── scraper-nano-v2 (8090)
│   ├── scraper-heavy-v2 (8091)
│   ├── fabrica-traefik
│   └── postgres-monitor-v2 (5435)
└── /home/rafael/.lmstudio/         ← Qwen local para GGA
```

### VPS producción — `72.60.191.179`

```
fabrica-postgres-1                 ← PostgreSQL DB crm_bybusiness (prod)
fabrica-n8n-1 (custom patched)     ← n8n ejecutando workflows reales
web-crm-bybusiness (nginx)         ← Sirve dist/ en crm.ia-bybusiness.com
waha container                     ← WhatsApp gateway
dockhand                           ← Container management UI
scraper-nano/heavy-v2              ← Scrapers producción
```

**Sin ofuscación / encryption at rest** en DB ni backups (gap — ver §9).

---

## 4. Flujo por área técnica

### 4.1 Captación (scrapers → leads)

```
┌─────────────────┐
│ Google Maps     │
└────────┬────────┘
         │ HTTPS (rate-limited)
         ▼
┌─────────────────────────────────────────┐
│ Scraper NANO :8090 / HEAVY :8091       │
│ (Node.js + Playwright + stealth)       │
└────────┬────────────────────────────────┘
         │ POST /webhook/scraper/go
         ▼
┌─────────────────────────────────────────┐
│ Motor Go :8092  (monitor-engine)       │
│ - Normaliza datos                      │
│ - Enriquece con localidad/nicho        │
│ - Deduplica por google_cid             │
└────────┬────────────────────────────────┘
         │ INSERT
         ▼
┌─────────────────────────────────────────┐
│ raw.almacen_masivo / raw.barrido_empresas│
│ (staging — sin validación)              │
└────────┬────────────────────────────────┘
         │ Workflow validación (cron 6h)
         ▼
┌─────────────────────────────────────────┐
│ operaciones.leads                      │
│ estado='pendiente', prioridad='normal'  │
└────────┬────────────────────────────────┘
         │ Workflow distribuidor (cada 30s)
         ▼
┌─────────────────────────────────────────┐
│ operaciones.llamadas_activas           │
│ operador_id asignado, freeze_hasta set │
└─────────────────────────────────────────┘
```

**Decisiones:**
- **Doble capa raw → operaciones**: staging primero permite revisar antes de contaminar leads reales. Coste: latencia ~6h. Beneficio: rollback fácil si scraper mete basura.
- **Deduplicación por `google_cid`**: estable por ficha GBP, sobrevive a cambios de nombre/dirección.
- **Categorías blacklist en `raw.lista_negra_categorias`**: filtros previos evitan scrape de categorías no objetivo.

### 4.2 Distribución y llamadas

```
CRM_DISTRIBUIDOR (cron cada 30s)
  → SELECT * FROM operaciones.leads
    WHERE estado='pendiente' 
      AND (freeze_hasta IS NULL OR freeze_hasta < NOW())
      AND prioridad IN (...)
    ORDER BY prioridad DESC, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 1
  
  → Asigna operador disponible:
    - no ausente (operador_ausencias)
    - sin llamada activa (llamada_actual IS NULL)
    - matchea preferencias (nicho, localidad)
  
  → UPDATE lead SET estado='asignado', operador_id=X, freeze_hasta=NOW()+30min
  → INSERT INTO llamadas_activas
```

**Decisiones:**
- **`FOR UPDATE SKIP LOCKED`** evita race condition cuando 2+ nodos n8n corren el distribuidor en paralelo.
- **Soft limit 30min** evita re-asignación inmediata si operador no actúa.
- **Preferencias de operador** (nicho, localidad) mejoran contactabilidad (operador conoce el sector).

### 4.3 Conversión (lead → cliente → venta)

`CRM_REGISTRAR_RESULTADO` recibe:
```
{ lead_id, operador_id, resultado, notas, cliente_id? }
```

Si `resultado='vendido'`:
1. Crea `crm_bybusiness.clientes` (hereda google_location_id del lead)
2. Crea `crm_bybusiness.ventas` (total + contrato_voz_link)
3. UPDATE `operaciones.leads` SET estado='vendido'
4. Evento `sistema.eventos_sistema` con tipo='VENTA_CERRADA'

Si `resultado='descartado'`:
1. Mueve a `crm_bybusiness.leads_descartados`
2. UPDATE `operaciones.leads` SET estado='descartado'

Si `resultado='no_contactado'` / `'rechazado'`:
- Solo UPDATE estado, lead vuelve a cola con `intentos++`

### 4.4 Admin (RBAC + auditoría)

**Frontend soft RBAC** (17 permisos):
```js
// src/shared/auth/rbac.js
const ROLE_PERMISSIONS = {
  admin: [...17 permisos...],
  supervisor: [...10 permisos...],
  operador: [...6 permisos...],
  viewer: [...3 permisos read-only...],
};
export const can = (perm, user) => ...;
```

**Aplicación:**
- `<Sidebar>` items declaran `requires:` → filtrados con `can()`
- `ClienteDrawer` oculta botones según permisos
- `useRbac()` hook para componentes

**GAP backend:** solo 2/5 workflows validan admin en backend (`CRM_USUARIOS_CREAR`, `CRM_REGISTRAR_RESULTADO`). 2FA workflows sin validar por limitación n8n queryReplacement.

**Auditoría:** cada acción admin genera evento en `crm_bybusiness.sistema.eventos_sistema`. Append-only, sin UPDATE permitido a nivel DB.

### 4.5 Comunicaciones

**Email** (SMTP):
```
operaciones.campanas_envios
  → HTTP POST n8n → SMTP relay (postfix on VPS)
  → Email con header List-Unsubscribe
  → Bounce handling via webhook de SMTP provider
```

**WhatsApp (WAHA)**:
```
operaciones.campanas_envios (canal='whatsapp')
  → HTTP POST n8n → WAHA API (waha.ia-bybusiness.online)
  → Sesión WhatsApp persistente (1 cuenta)
  → Templates pre-aprobados por Meta (BSP)
```

**GAP:** `comunicaciones.opt_outs` no existe. Debe agregarse (Línea 3 — compliance).

---

## 5. Workflows n8n críticos (14)

| Workflow | ID | Trigger | Función |
|---|---|---|---|
| CRM_DISTRIBUIDOR | LH7nUGlnkhNBEtHo | Cron 30s | Asigna leads a operadores |
| CRM_REGISTRAR_RESULTADO | LH7nUGlnkhNBEtHo* | Webhook | Cierra llamada, convierte a cliente |
| CRM_USUARIOS_CREAR | HYALG4I2vMRfVFvV | Webhook admin | Crea usuario con RBAC validation |
| CRM_AGENDA_V2 | dqj7YNrXBLZvyt86 | Webhook | Lee 6 UNION ALL legs para agenda |
| CRM_KPI_DASHBOARD_V2 | (TBD) | Cron | Métricas tiempo real |
| CRM_LEAD_FRESHNESS_METRICS | HL57uWGJRrbJfETZ | Cron 6h | Métricas de freshness |
| CRM_BACKUP_AUTOMATICO | 26b1y56KIt4q9Aq6 | Cron 02:30 | pg_dump + webhook |
| CRM_BACKFILL_LEAD_QUALITY | i7UTe5EkotG5FBm3 | Cron 03:00 | Marca leads stale como sin_dato |
| CRM_USUARIOS_ACTIVAR_2FA | Yj3ezffN6y4x8vqE | Webhook | Activa 2FA (idempotente) |
| CRM_2FA_VERIFY | (TBD) | Webhook | Valida código TOTP |
| CRM_LEAD_DISTRIBUIDOR_V2 | (TBD) | Cron | Versión mejorada con scoring |
| CRM_BACKFILL_REPUTACION | oHx70G0lZdY5SexB | Webhook | Backfill reputacion_at |
| GBP_AUTOREPAIR | (en alimentador.py) | Auto | Repara gbp_fichas rotas |
| ENVIO_PROFORMA_WA | (TBD) | Trigger desde venta | Envía proforma WhatsApp |

*Nota: revisar IDs en verificación docs de cada sesión.

**Decisión:** workflows versionados en `/opt/fabrica/CRM_ByBusiness-vps-snapshot/backups/` (JSON export por sesión).

---

## 6. Decisiones técnicas (ADRs)

### ADR-001: n8n como BFF
- **Contexto**: necesitamos iterar rápido en lógica de negocio con equipo pequeño.
- **Decisión**: workflows n8n como capa de negocio, no backend custom.
- **Consecuencias**: ✅ velocidad de iteración, ✅ ops puede modificar sin dev. ❌ tests limitados, ❌ n8n queryReplacement limita patrones (bloquea RBAC backend en 2FA).
- **Reversa posible**: alta — si supera 500k leads, refactor a NestJS/Express.

### ADR-002: PostgreSQL schemas por dominio
- **Contexto**: 60+ tablas, múltiples áreas funcionales.
- **Decisión**: 7 schemas (`auth`, `crm_bybusiness`, `marketing`, `operaciones`, `raw`, `rrhh`, `social`).
- **Consecuencias**: ✅ separación clara, ✅ multi-tenant ready. ❌ cross-schema joins sin FK enforcement.
- **Reversa**: baja — bien establecidos.

### ADR-003: Soft delete via estado + fecha_baja
- **Contexto**: GDPR requiere derecho al olvido, pero no podemos perder histórico.
- **Decisión**: `estado='baja'` + `fecha_baja`, anonymize para PII.
- **Consecuencias**: ✅ audit trail, ✅ rollback. ❌ queries deben filtrar `WHERE estado != 'baja'`.
- **Reversa**: baja — pattern establecido.

### ADR-004: Contactabilidad threshold 90d
- **Contexto**: scrapers DOWN desde mayo 2026, `reputacion_at` stale.
- **Decisión**: 90d en lugar de 30d como threshold de "fresco".
- **Consecuencias**: ✅ evita falsos "sin_dato". ❌ KPIs relajados.
- **Plan de reversa**: cuando scrapers vuelvan y BACKFILL complete → 30d.
- **Reversa**: media — afecta workflows y dashboards.

### ADR-005: Soft RBAC frontend (sin DB migration)
- **Contexto**: RBAC granular es prioridad, pero DB schema no permite enforce backend limpio.
- **Decisión**: validar en frontend con `useRbac()`, dejar backend permisivo por ahora.
- **Consecuencias**: ✅ shipping rápido. ❌ admin sin RBAC backend puede bypasear (2FA workflows).
- **Reversa**: alta — refactor JWT en backend (Línea 3).

### ADR-006: LMStudio local para GGA (no cloud API)
- **Contexto**: opencode provider corrompe index, OAuth de Claude/opencode-go vencidos.
- **Decisión**: Qwen 2.5 Coder 7B local via LMStudio.
- **Consecuencias**: ✅ sin dependencia externa, ✅ reviews funcionan. ❌ calidad menor que MiniMax-M3, ❌ requiere LMStudio corriendo.
- **Reversa**: alta — cuando opencode arregle bug, volver.

### ADR-007: Custom image `fabrica/n8n:2.11.0-patched`
- **Contexto**: n8n 2.11.0 tiene bug GRANT_TOKEN_TTL que rompe Task Runner.
- **Decisión**: patch horneado en Dockerfile (TTL 15s → 86400s).
- **Consecuencias**: ✅ Task Runner funciona, ❌ diverge de upstream.
- **Reversa**: media — cuando n8n arregle upstream.

### ADR-008: TanStack Query v5 para gestión de estado server
- **Contexto**: El patrón manual `useEffect + useState + fetch` producía manejo inconsistente de estados loading/error, duplicación de lógica de cache, y riesgo de race conditions en mutaciones.
- **Decisión**: TanStack Query v5 (`@tanstack/react-query`) como capa de datos del servidor. Instancia centralizada en `src/shared/query/queryClient.js` con provider en `App.jsx`. Hooks `useN8nQuery`/`useN8nMutation` de `useN8n.js` abstraen el acceso a webhooks n8n.
- **Consecuencias**:
  - ✅ UX consistente: estados loading/error/empty manejados por React Query
  - ✅ Cache automático con `staleTime` configurable por query
  - ✅ Mutaciones con rollback optimista y cache invalidation
  - ✅ deduplicación de requests simultáneos
  - ❌ Bundle +12KB (aceptable: TanStack Query v5 tree-shakes bien)
  - ❌ Learning curve para devs unfamiliar con React Query
- **Reversa**: media — la abstracción está bien encapsulada (`useN8nQuery`/`useN8nMutation`). Si se necesitara cambiar a SWR o RTK Query, el impacto es local a `useN8n.js` y los componentes que lo usan.

---

## 7. Performance y escala

**Métricas actuales (estimadas):**
- ~100k leads totales en DB
- ~50 usuarios (operadores + admins)
- ~500 leads/día distribuidos
- ~200 llamadas/día en hora pico
- 9/12 toggles agenda con datos

**Capacidad estimada del stack:**
- DB: PostgreSQL aguanta 10M leads sin particionar
- n8n: ~100 webhooks/minuto por instancia (single VPS)
- Frontend: Vite SPA, bundle ~2MB gzipped

**Optimizaciones aplicadas:**
- Índice `(estado, prioridad, created_at)` en `operaciones.leads`
- Índice `(lead_id, updated_at)` en `leads_rating_history`
- `FOR UPDATE SKIP LOCKED` evita lock contention

**Optimizaciones pendientes (Línea 3):**
- Particionar `crm_bybusiness.sistema.eventos_sistema` por año
- Cache de lecturas con TTL (no implementado)
- CDN para assets estáticos (no implementado — VPS sirve directo)

---

## 8. Seguridad

**Implementado:**
- Passwords hasheados (`auth.usuarios.password_hash`)
- 2FA TOTP con secret por usuario
- HTTPS via Traefik
- Sesión en localStorage con expiración 24h
- RBAC frontend (17 permisos, 4 roles)
- SMTP/WhatsApp credentials en n8n (no en código)

**Pendiente (gaps):**
- ❌ **Backend RBAC enforcement** en 2FA workflows (limitación n8n)
- ❌ **Encryption at rest** en DB y backups
- ❌ **Off-site backup** cifrado (gap conocido Línea 3)
- ❌ **Audit log integrity** (no hay hash chain de eventos)
- ❌ **Rate limiting** en webhooks n8n públicos
- ❌ **CSP headers** en nginx (no configurados)

---

## 9. Disaster recovery

**RPO (Recovery Point Objective):** 24h
- Último backup: 02:30 UTC diario
- Si DB cae entre 02:30 y siguiente backup: **pérdida hasta 24h de operaciones**

**RTO (Recovery Point Objective):** ~2h manual
- Restaurar DB desde pg_dump: 30 min
- Redesplegar workflows n8n desde JSON backups: 30 min
- Verificar integridad: 30 min
- Notificar a operadores: 30 min

**Backups actuales:**
- `CRM_BACKUP_AUTOMATICO` corre diario 02:30
- Output: `/opt/fabrica/backups/crm_bybusiness_YYYY-MM-DD.sql`
- Retención: 30 días local, sin off-site

**Test de recovery:** último test manual en sesión 2026-07-30 (verificación).

---

## 10. Observabilidad

**Logs:**
- `/var/log/fabrica/alimentador.log` — cron alimentador con logrotate
- n8n logs: `/var/log/fabrica/n8n/` (configurar)
- nginx access log: `/var/log/nginx/crm.access.log`

**Métricas:**
- `CRM_LEAD_FRESHNESS_METRICS` corre diario 06:00 → guarda en `fabrica_core.metricas_*`
- Tablero KPI: `CRM_KPI_DASHBOARD_V2` (consultable vía webhook)

**Auditoría:**
- `crm_bybusiness.sistema.eventos_sistema` — eventos append-only
- Tipos: BACKUP, REPAIR_GBP, CRON_RUN, SNAPSHOT_GBP, RENOVACION, INCIDENCIA, BACKUP_SISTEMA, CRON_SISTEMA, VENTA_CERRADA

**Alertas:**
- ❌ No hay alertas automáticas (gap — Línea 3: implementar con healthchecks)
- Healthcheck manual: `scripts/fabrica-healthcheck.sh`

---

## 11. Path de evolución (roadmap)

**Línea 1 — Sólido (completada):** log persistente, BACKFILL workflow, shim fix, RUNBOOK.

**Línea 2 — Cobertura (completada):** scrapers diagnosticados, BACKUP workflow, GBP_AUTOREPAIR automático, 6° UNION ALL leg.

**Línea 3 — Producto (en curso, 1/5):**
- 3.1 Tests Playwright ← siguiente prioritario
- 3.2 CI/CD GitHub Actions
- 3.3 React Query refactor
- 3.4 Multi-tenant
- 3.5 RBAC granular ← completado en sesión anterior

**Línea 4 — Scale (futuro):**
- ML scoring de leads
- Multi-canal outreach (Instagram DM, LinkedIn)
- Marketplace de scripts de venta
- Mobile app

---

## Cambios desde SDD v0 (este commit)

- Primera versión.
- Decisiones técnicas documentadas como ADRs (7).
- Topología de deployment documentada (local + VPS).
- Workflows n8n catalogados con IDs.
- Gaps de seguridad y observabilidad explícitos.
