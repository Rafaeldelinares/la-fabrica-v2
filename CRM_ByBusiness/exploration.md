# CRM_ByBusiness — Complete Mental Map

**Date**: 2026-08-24
**Scope**: Full system exploration — 6 blocks
**Language**: English (per Language Domain Contract)

---

## TABLE OF CONTENTS

1. [Block 1 — Project Structure](#block-1--project-structure)
2. [Block 2 — Database Schema](#block-2--database-schema-vps)
3. [Block 3 — n8n Workflows](#block-3--n8n-workflows-by-domain)
4. [Block 4 — E2E Business Flows](#block-4--e2e-business-flows)
5. [Block 5 — Frontend ↔ Backend](#block-5--frontend--backend)
6. [Block 6 — Architectural Decisions](#block-6--architectural-decisions)
7. [Gaps Identified](#gaps-identified)

---

## BLOCK 1 — Project Structure

### Directory Layout

```
/opt/fabrica/CRM_ByBusiness/
├── src/
│   ├── App.jsx                    # Root: QueryProvider + AuthProvider + ToastProvider + N8nStatusBanner
│   ├── main.jsx                   # Entry: createRoot, StrictMode, global error listeners
│   ├── Dashboard.jsx              # Conditional: Login vs WorkBody (isAuthenticated)
│   ├── components/                # Shared UI components
│   │   └── dashboard/             # OperatorDashboard, Zone1/2/3/4 components
│   ├── modules/
│   │   ├── auth/                 # Login, AuthContext (role-based routing)
│   │   ├── admin/                # Torre de Control (14+ sub-modules)
│   │   │   ├── agenda/          # AgendaGlobalPanel
│   │   │   ├── auditoria/        # AdminAuditPanel
│   │   │   ├── backup/           # BackupPanel
│   │   │   ├── campanas/         # CampanasPanel + CampanaDrawer
│   │   │   ├── candidatos/        # CandidatosPanel
│   │   │   ├── cartera/          # CarteraPanel + tabs/
│   │   │   ├── dashboard/        # DashboardPanel
│   │   │   ├── facturacion/     # FacturacionPanel
│   │   │   ├── gbp/             # GbpPanel, GbpDashboardPanel
│   │   │   ├── leads/            # LeadsPanel, LeadsLandingPanel
│   │   │   ├── scraper/          # ScraperStatusPanel, ScraperConfigPanel
│   │   │   ├── seo/              # SeoPanel
│   │   │   ├── usuarios/         # UsuariosList
│   │   │   └── ventas/           # VentasPanel
│   │   ├── crm/                  # (misc CRM views)
│   │   └── entrenamiento/        # EntrenamientoPanel, SupervisorPanel
│   ├── hooks/                    # useOperatorData, useAuth, useTrainingScope
│   ├── data/                     # Static: guionRosa.js (9-step sales script)
│   ├── services/                 # reputationService.js (Go scraper :8092)
│   ├── shared/
│   │   ├── hooks/               # useN8n.js (n8nGet/n8nPost, 12s timeout, 1 retry)
│   │   ├── ui/                  # Button, Card, Modal, Stat, EmptyState, Badge
│   │   ├── auth/                # useRbac (RBAC permission checks)
│   │   ├── context/             # ToastContext
│   │   ├── query/               # QueryProvider (React Query)
│   │   ├── layout/              # WorkBody.jsx (tab-based SPA router)
│   │   └── reporting/            # reportFrontendError
│   └── utils/                    # formatCurrency, formatDate, etc.
├── scripts/
│   └── gbp/                     # GBP Python scripts (OnePlus 10T runs these)
│       ├── estado_gbp/           # estado_gbp_v2.py + pdf/
│       ├── competitive/          # informe_competitivo_v2.py + pdf/
│       ├── batch_2weeks_v2.py   # Batch scripts per time window
│       ├── fill_missing_gbp*.py  # Gap-fill scripts
│       ├── report_to_pdf.py       # PDF generation wrapper
│       └── CATALOGO_INFORMES.md  # Full catalogue of 14+ reports
├── docs/
│   ├── ARCHITECTURE.md           # Full architecture (updated 2026-06-21)
│   ├── RUNBOOK.md                # Operations runbook
│   ├── PRD.md                    # Product requirements
│   ├── SDD.md                   # Spec-driven development
│   └── SESION_2026-08-24_RESUMEN.md  # Latest session decisions
├── e2e/                         # Playwright tests
├── infra/                        # Infrastructure configs
├── migrations/                   # DB migrations
├── n8n/                         # n8n workflow JSON exports
├── openspec/                    # OpenSpec artifacts
├── public/                      # Static assets
├── dist/                        # Production build (rsync'd to VPS)
├── package.json                  # React 19 + Vite 7 + Tailwind CSS v4
├── vite.config.js               # Code splitting (manualChunks, 602kB bundle)
└── playwright.config.js         # E2E config
```

### Routing
- **No React Router** — single-page tab-based navigation via `WorkBody.jsx`
- `activeTab` string state → conditional render of panels
- Admin tabs: `DASHBOARD_EXE`, `AGENDA_GLOB`, `MONITOR`, `GBP_MGMT`, `CARTERA`, `CAMPAÑAS`, `LEADS_GESTON`, `LEADS_MGMT`, `LEADS_LANDING`, `CANDIDATOS`, `USUARIOS`, `AUDITORIA`, `BACKUP`, `AUDIT_NEW`, `VENTAS`, `FACTURACION`, `GESTORIA`
- Operator Túnel: `NEXT_CALL` → `OperatorDashboard` (Zones 1-4)
- Training: `ENTRENAMIENTO` → `EntrenamientoPanel` (role=`en_practicas`) or `SupervisorPanel` (admin)

### Stack
| Layer | Technology |
|-------|------------|
| Frontend | React 19 + React Compiler, Vite 7 |
| Styling | Tailwind CSS v4 — Navy Industrial |
| Data fetching | React Query (via `useN8n` hook) |
| Backend | n8n workflows on VPS (https://n8n.ia-bybusiness.online) |
| Auth | Python/FastAPI auth-service (port 5001), NOT PHP |
| Scraper | OnePlus 10T (Android + Termux) running Python scripts |
| DB | PostgreSQL on VPS (via SSH tunnel localhost:5433) |

### Navy Industrial Design System
- Background: `bg-slate-950` or `bg-slate-900`
- Borders: `rounded-sm` (PROHIBITED: `rounded-xl`, `rounded-full`)
- Accents: `#D00000` for critical actions
- Typography: Inter (UI) / JetBrains Mono (data values)
- NO circular spinners → Skeleton screens
- Max 150 lines per component
- Component props: PropTypes (required) or TypeScript

### Frontend → Backend Communication
| Target | Method | URL/Path |
|--------|--------|----------|
| n8n workflows | `n8nGet()`/`n8nPost()` via `useN8n` | `https://n8n.ia-bybusiness.online/webhook/<path>` |
| Auth service | raw `fetch()` | `POST /login`, `POST /reset-password` (port 5001) |
| Go scraper (reputation) | raw `fetch()` | port 8092 |

---

## BLOCK 2 — Database Schema (VPS)

### CRITICAL GAP: `clientes.citas` is EMPTY (0 rows)

The **actual** agenda/cita table is `operaciones.llamadas_programadas` (564 rows, all `estado=pendiente`).

The `clientes.citas` table exists with the correct schema but is **completely unused**.

### Database Connections

| MCP | Local Port | Destination | Status |
|-----|------------|------------|--------|
| `postgres-vps` | 5433 | VPS PostgreSQL (SSH tunnel) | **PRODUCTION DATA** |
| `postgres-crm` | 5432 | Local PostgreSQL | **EMPTY/STALE** — all tables 0 rows |

**Source of truth**: `postgres-vps` (localhost:5433 tunnel to VPS).

---

### `auth.usuarios` — Users

| Column | Type | Key |
|--------|------|-----|
| id | integer | PK |
| nombre | varchar | |
| email | varchar | UNIQUE |
| password_hash | varchar | bcrypt |
| totp_secret | varchar | Base32 encoded |
| totp_habilitado | boolean | |
| totp_configurado | boolean | |
| totp_obligatorio | boolean | Admin can force 2FA |
| rol | varchar | admin / operador / en_practicas |
| estado | varchar | |
| estado_llamada | varchar | |
| ultimo_acceso | timestamp | |
| llamada_actual | uuid | |
| es_simulacion | boolean | |
| usa_filtros | boolean | |
| created_at | timestamp | |

### `operaciones.leads` — Leads Pool (299 rows)

| Column | Type | Key |
|--------|------|-----|
| id | integer | PK |
| nombre_comercial | varchar | |
| telefono | varchar | |
| email | varchar | |
| web | text | |
| direccion | text | |
| localidad | varchar | |
| provincia | varchar | |
| categoria | varchar | |
| scoring | numeric | |
| rating | numeric | |
| num_reseñas | integer | |
| google_maps_link | text | |
| google_cid | varchar | Hex colon format: `0xd6e2bbafd04c977:0x23fb2f3c11167d8a` |
| estado | varchar | nuevo /ocado / vendido / no_interes / etc. |
| prioridad | varchar | alta / media / baja |
| intentos | integer | |
| operador_id | integer | FK → auth.usuarios |
| origen | varchar | landing_digital / captacion_web / scraper / etc. |
| origen_id | integer | |
| campana_id | integer | **FK → operaciones.campanas — TABLE MISSING** |
| es_simulacion | boolean | |
| freeze_hasta | timestamp | Lead frozen until |
| freeze_razon | varchar | |
| intentos_no_contesta | integer | |
| contacto_nombre | varchar | |
| contacto_email | varchar | |
| reputacion_at | timestamptz | Last scraped; **STALE since ~2026-05-09** |
| created_at / updated_at | timestamp | |

**GAPS**:
- `operaciones.campanas` **table does not exist** in VPS DB — `campana_id` FK is dangling
- `reputacion_at` is stale (no scraper running since 2026-05-09)

### `clientes.clientes` — Clients (193 rows)

| Column | Type | Key |
|--------|------|-----|
| id | integer | PK |
| nombre_comercial | varchar | |
| nombre_fiscal | varchar | |
| cif | varchar | |
| telefono | varchar | |
| email | varchar | |
| web | varchar | |
| direccion | text | |
| localidad / provincia | varchar | |
| lead_id | integer | FK → operaciones.leads (migration 2026-08-23) |
| gestor_id | integer | FK → auth.usuarios |
| operador_captacion_id | integer | |
| estado | varchar | activo / baja |
| fecha_alta / created_at | timestamp | |
| google_cid | text | |
| gmaps_rating | numeric | |
| gmaps_reseñas | integer | |
| gmaps_url / gmaps_address | text | |
| gmaps_sentiment | jsonb | |
| gmaps_last_updated | timestamptz | |
| reputacion_at | timestamptz | **STALE** |
| bybusiness_url | text | |
| place_id / google_place_id | text | |
| categoria / rating / num_reseñas | various | |
| fecha_inicio_relacion | date | |
| fecha_renovacion | date | **auto-updated on renewal** |
| proxima_accion_fecha | date | **EMPTY — do NOT use** |
| proxima_accion_nota | text | |
| audit_frequency_days | integer | DEFAULT 30 |
| competitive_enabled | boolean | |
| competitive_frequency_days | integer | |
| competitive_recipients | jsonb | |
| qr_pdf_url | text | |
| ... | | **13 legacy columns to drop** |

### `operaciones.llamadas_programadas` — ACTUAL Agenda/Citas (564 rows, ALL `estado=pendiente`)

| Column | Type | Key |
|--------|------|-----|
| id | integer | PK |
| lead_id | integer | FK → operaciones.leads |
| operador_id | integer | FK → auth.usuarios |
| cliente_id | integer | FK → clientes.clientes (**populated by trigger**) |
| tipo | varchar | **"seguimiento" / "responsable"** |
| nombre_responsable | varchar | |
| fecha_programada | timestamp | **THE actual cita datetime** |
| estado | varchar | All rows = "pendiente" |
| notas | text | e.g. "Renovación producto - 30 días antes de fecha_fin" |
| es_simulacion | boolean | |

**Trigger**: `operaciones.sync_llamada_cliente_id()` — auto-populates `cliente_id` from `lead_id` by matching `leads.nombre_comercial = clientes.nombre_comercial`.

**This is the TRUE cita/agenda source. Do NOT use `clientes.citas`.**

### `clientes.citas` — EMPTY (0 rows, NOT USED)

Schema matches `operaciones.llamadas_programadas` but **never populated**.

### `clientes.gmaps_fichas` — GBP Ficha Cache

| Column | Type |
|--------|------|
| id | integer PK |
| cliente_id | integer FK → clientes.clientes |
| google_cid / place_id | text |
| gmaps_nombre / gmaps_url / gmaps_address | text |
| gmaps_rating / gmaps_reseñas | numeric/integer |
| gmaps_sentiment | jsonb |
| email_gmaps / categoria | text |
| completeness_score | integer |
| latitud / longitud | numeric |
| horarios_json | jsonb |
| thumbnail_url / maps_phone / maps_website | text |
| managed_by_bybusiness | boolean |
| monitor_activo | boolean |

### `clientes.gmaps_historico` — Scraping History (352 rows)

| Column | Type |
|--------|------|
| id | bigint PK |
| cliente_id | integer FK |
| scraped_at | timestamptz |
| query_busqueda / geo | text |
| competidores | jsonb |
| grid_cell / fuente | text |

### `clientes.entorno_competitivo` — Competitor Data (53 rows)

| Column | Type |
|--------|------|
| id | bigint PK |
| cliente_id | integer FK |
| scraped_at | timestamptz |
| query_busqueda / geo | text |
| competidores | jsonb |
| grid_cell / fuente | text |

### `clientes.scrape_schedule` — Scrape Tracking (193 rows)

| Column | Type |
|--------|------|
| cliente_id | integer PK FK → clientes.clientes |
| last_scrape_at | timestamptz |

### `public.timeline_global` — Event Timeline

| Column | Type |
|--------|------|
| id | integer PK |
| lead_id / cliente_id / operador_id | integer |
| tipo_evento | varchar (venta / llamada / cita / etc.) |
| subtipo_resultado | varchar |
| detalles | jsonb |
| fecha_evento / fecha_agendada / created_at | timestamp |

---

## BLOCK 3 — n8n Workflows by Domain

**Total**: 228 workflows (3 pages: 100+100+28), ~200 active

### Domain: AUTH & USERS

| Name | ID | Trigger | Purpose |
|------|----|---------|---------|
| CRM_LOGIN / CRM_LOGIN_V4 / CRM_LOGIN_PROD | various | webhook | Login via n8n |
| CRM_LOGIN_CODE_V2 / CRM_LOGIN_ONE_CODE | various | webhook | Code-based login |
| CRM_USUARIOS_LISTA | iM6bc2VznYnUQreP | webhook | List all users |
| CRM_USUARIOS_CREAR | HYALG4I2vMRfVFvV | webhook | Create user |
| CRM_USUARIOS_EDITAR | vq4MwHGnJ5dJ8adE | webhook | Edit user |
| CRM_USUARIOS_ELIMINAR | H6JkVEyOay7aN7zX | webhook | Delete user |
| CRM_USUARIOS_ACTIVAR_2FA | Yj3ezffN6y4x8vqE | webhook | Activate TOTP |
| CRM_USUARIOS_VERIFICAR_2FA | d6Mpx3Vm1QPEdkwq | webhook | Verify TOTP code |
| CRM_USUARIOS_DESACTIVAR_2FA | i42H9X5kniYvewyZ | webhook | Deactivate 2FA |
| CRM_USUARIOS_OBLIGAR_2FA | TVTaOj30rO2uP8Ga | webhook | Force 2FA |
| CRM_USUARIOS_DESOBLIGAR_2FA | 300t0LVfPMSDcGai | webhook | Unforce 2FA |
| CRM_RESET_PASSWORD / SEND_RESET_EMAIL | various | webhook | Password reset flow |

**URL**: `https://n8n.ia-bybusiness.online/webhook/crm-login` etc.

### Domain: LEADS — Captation & Distribution

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_LANDING_DIGITAL_LEAD_NUEVO | 0sODD3PzxD6Dt1Yc | webhook | operaciones.leads | Create lead from landing page |
| EMERGENCIA_Lead_Captura | uOQc7D0l1mUZXANi | webhook | operaciones.leads | Emergency lead capture |
| CRM_DISTRIBUIDOR_CAMPANAS | LjcIjmCBKuWUxOSZ | webhook | operaciones.leads | Assign lead to operator from pool/campaign |
| CRM_DISTRIBUIDOR_HUERFANOS | 7YwM4u6SJ6rWrwTq | webhook | operaciones.leads | Assign orphan leads |
| CRM_DISTRIBUIDOR_TRAINING_CRON | iVjUEcKJQ4YkItak | schedule | — | Training mode distribution |
| CRM_LEADS_DISPONIBLES | lyW4C8FdXJQcKqlH | webhook | operaciones.leads | Get available leads |
| CRM_LEADS_LANDING_FINAL | yAtQ6wt8YtFwQLvr | webhook | operaciones.leads, clientes.clientes | Pre-clients + ventas |
| CRM_LEADS_HUERFANOS | 12GFhbv1d3Y8do1X | webhook | operaciones.leads | Orphan leads |
| CRM_LEAD_DETAIL | 2QlZ84RxfFtmyH5w | webhook | operaciones.leads | Lead full details |
| CRM_UPDATE_LEAD | SJjOfdFO2f3ikLuj | webhook | operaciones.leads | Update lead |
| CRM_LEAD_TIMELINE | Y6WtuPILJFC2j32z | webhook | operaciones.leads | Lead event timeline |
| CRM_WATCHDOG_HUERFANAS_V2 | ZFTog9X4E07nSV3c | webhook | operaciones.leads | Watchdog for orphan leads |

### Domain: RESULT REGISTRATION (7-button flow)

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| **CRM_REGISTRAR_RESULTADO** | 6x0x8DCOBzZf62K6 | webhook | operaciones.leads, clientes.clientes | **7-button result → VENTA branch creates cliente** |

**Switch branches**: `venta` → creates cliente; `no_contesta` → no_contesta++; `callback` → schedules callback; `no_interes` → marks lead; `responsable` → assigns; `enviar_info` → sends email; `error` → logs error

### Domain: CALLS & CALLBACKS

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_CALLBACKS_OPERADOR | BSJYrid3xAIVQat3 | webhook | operaciones.llamadas_programadas | Get operator callbacks |
| CRM_CALLBACKS_HOY | W8AbGdU5o6tt7tYz | webhook | operaciones.llamadas_programadas | Today's callbacks |
| CRM_TOMAR_CALLBACK | 84yFSuDIDI9ZWh3a | webhook | operaciones.llamadas_programadas | Accept callback |
| CRM_WATCHDOG_CALLBACKS_V2 | oiCboRThnoOAeLxW | webhook | — | Watchdog for stuck callbacks |
| CRM_LLAMADA_ACTIVA_FIX | DU4BwjV9lf4Bk2DU | webhook | operaciones.llamadas_activas | Fix active call |
| CRM_CALLBACKS_GESTIONAR | epiM2Wd8mziT3Awz | webhook | operaciones.llamadas_programadas | Manage callbacks |

### Domain: AGENDA

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| **CRM_AGENDA_V2** | dqj7YNrXBLZvyt86 | webhook | operaciones.llamadas_programadas | **THE agenda — reads llamadas_programadas** |
| CRM_35_POST_CREAR_CITA | yUb6cDsiTdluJdde | webhook | operaciones.llamadas_programadas | Create cita |
| CRM_36_POST_ACTUALIZAR_CITA | Q7brFq1tVPIq6XJm | webhook | operaciones.llamadas_programadas | Update cita |

### Domain: CAMPAIGNS

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_CAMPANAS_CRUD | zQ50bbiT93UuQRfJ | webhook | — | CRUD campaigns |
| CRM_CAMPANA_CREAR | q02RHiexlcTN1DdW | webhook | — | Create campaign |
| CRM_CAMPANA_ASIGNAR_OPERADORES | qMJXTfnWAELjUKzH | webhook | — | Assign operators |
| CRM_CAMPANA_WA_MASIVA | j4v93nvatJ91w39J | webhook | — | WhatsApp mass campaign |
| CRM_CAMPANAS_ELIMINAR | GbIIzBAzgpG6ug8J | webhook | — | Delete campaign |
| CRM_CAMPANAS_ACTIVAS_V2 | c0hdGTdcrGeBBWEi | webhook | — | Active campaigns v2 |
| CRM_CAMPANAS_DASHBOARD | 353XKjOg0BvMrWfR | webhook | — | Campaign stats |
| CRM_CAMPANAS_VERIFICAR_CONFLICTOS | 05XfXo8epk9lHOWg | webhook | — | Verify lead conflicts |
| CRM_CREAR_CAMPANA_CON_LEADS | b6V2ClYqDUEPnhWJ | webhook | — | Create campaign with leads |

**NOTE**: `operaciones.campanas` table **does not exist** — these WFs may reference a missing table.

### Domain: CLIENTS & CARTERA

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| **CRM_CARTERA_GET_V4** | EWmFKMHx3slciElA | webhook | clientes.clientes | **Get all active clients** |
| CRM_49_CLIENTE_CREAR | lrvCPPXkpz4Tv8Dw | webhook | clientes.clientes | Create client manually |
| CRM_CLIENTE_GESTOR_ASIGNAR | sA0DQbE6YriXWKUv | webhook | clientes.clientes | Assign gestor |
| CRM_CLIENTE_PROXIMA_ACCION | gPZDCnMI0IJte9Nb | webhook | clientes.clientes | Set next action |
| CRM_CLIENTE_BAJA | GpbWkQ2rdBzIKkAZ | webhook | clientes.clientes | Set client inactive |
| CRM_CLIENTE_WEB | m17IiZiFbo5xcP0B | webhook | clientes.clientes | Update web field |
| **CRM_CLIENTE_BYBUSINESS_URL** | 4blNieRj34DStI1s | webhook | clientes.clientes | **STUB — no-op, returns {ok:true}** |
| CRM_CLIENTE_GOOGLE_PLACE_ID | m8fRfCiEmJyi7aPb | webhook | clientes.clientes | Update place_id |
| CRM_42_REGISTRAR_INTERACCION | 3s6k6KLJDCyHQxku | webhook | clientes.interacciones | Log client interaction |
| CRM_INTERACCION_EDITAR | JbhEZ1FkWZSTZls3 | webhook | clientes.interacciones | Edit interaction |

### Domain: SALES & CONTRACTS

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_VENTAS | OxjQs2dlfJE9j4Sw | webhook | crm_bybusiness.ventas | Get sales |
| CRM_91_CREAR_HOJA_VENTA | fAC635u4DeCZ65TU | webhook | — | Create sale sheet |
| CRM_CONTRATOS_DIGITALES | fU3pXNRTdB89MSvz | webhook | clientes.contratos | Digital contracts |
| CRM_CONTRATO_CREAR | IFPbIdpyOfVvNlM7 | webhook | clientes.contratos | Create contract |
| CRM_CONTRATO_ACTUALIZAR | jMW0XsXlril4wULo | webhook | clientes.contratos | Update contract |
| CRM_CONTRATO_PREFIRMAR | l9vkaU1Fdp93WiCG | webhook | clientes.contratos | Pre-sign |
| CRM_CONTRATO_FIRMAR | sfgLJ99mINSwaSJH | webhook | clientes.contratos | Sign contract |
| CRM_CONTRATO_ENVIAR_EMAIL | xzxn9KO4bksQ2wOx | webhook | clientes.contratos | Send contract email |

### Domain: INVOICING

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_FACTURA_GENERAR | CXFaWSzoukB1Eyim | webhook | clientes.facturas | Generate invoice |
| CRM_FACTURA_ENVIAR | NxPhydBWyGB1R46M | webhook | clientes.facturas | Send invoice email |
| CRM_FACTURAS_GET_V2 | I7xRrPyunelgI6tA | webhook | clientes.facturas | Get invoices |

### Domain: GBP / GOOGLE BUSINESS PROFILE

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| **CRM_GBP_FICHA_AUDIT** | kyWibKXBuBknk2QX | webhook | clientes.gmaps_fichas, clientes.clientes | **Run GBP audit on a client** |
| **CRM_GBP_COMPETITIVE_ANALYSIS** | J9VibWYkxLQ7mMhm | webhook | clientes.entorno_competitivo | **Competitive analysis for a client** |
| CRM_GBP_FICHAS_CLIENTE | HCxYTf8KJvxXzg3N | webhook | clientes.gmaps_fichas | Get client GBP fichas |
| CRM_GBP_HISTORICO_CLIENTE | GZQQan8bChUGZ1z5 | webhook | clientes.gmaps_historico | Scraping history |
| CRM_GBP_FICHA_AUDIT_DAILY_CRON | kl4pKYA3O99UHNLY | schedule | clientes.gmaps_fichas, clientes.clientes | Daily GBP audit cron |
| CRM_GBP_ALERTAS_GET | cGb8xm9agcOQe9bu | webhook | reputacion.alertas | Get GBP alerts |
| CRM_GBP_ALERTAS_EMAIL | Tl8u6VKjsJTOeNDH | webhook | — | Email GBP alerts |
| CRM_GBP_CAPTURE_PLACE_ID_BATCH | 951KxrHbXENkwz0t | webhook | — | Capture place_id batch |
| CRM_INFORME_COMPETENCIA_V4/V6/V7 | various | webhook | — | Competitive reports |
| CRM_INFORME_PDF_V8 | erX0JtuGzsJ84xoQ | webhook | — | PDF report generation |

### Domain: SCRAPER (OnePlus 10T)

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_SCRAPER_CONFIG_GET | pacy6PZAQflAOKDe | webhook | — | Get scraper config |
| CRM_SCRAPER_CONFIG_UPDATE | nlVHVsLbQHCLoaa8 | webhook | — | Update scraper config |
| CRM_SCRAPER_HEALTH | bFXZei2W4GmFhid1 | webhook | — | Check scraper health |
| CRM_XIAOMI_COOKIES_STATUS_GET | H9c3hoQXNkMih3XG | webhook | — | Get cookies status |
| CRM_XIAOMI_COOKIES_UPLOAD | KF7cnjHxyXNNGeoV | webhook | — | Upload cookies |

### Domain: REPUTATION & KPIs

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| **CRM_KPI_DASHBOARD_V2** | LH7nUGlnkhNBEtHo | webhook | — | **Admin KPIs (90d contactabilidad)** |
| CRM_REPUTACION_LEAD | iRnkuGexnMjd1lrm | webhook | operaciones.leads | Get lead reputation |
| CRM_BACKFILL_REPUTACION | oHx70G0lZdY5SexB | webhook | — | Backfill reputation data |
| CRM_OPERADOR_KPI_LIVE | AVSC8oqMyHJy7Bg2 | webhook | — | Live operator KPIs |

### Domain: EMAILS & OUTREACH

| Name | ID | Trigger | Purpose |
|------|----|---------|---------|
| CRM_80_ENVIAR_INFO_LEAD | HZUqJD2I5WMt0k67 | webhook | Send info email to lead |
| CRM_82_SEGUIMIENTO_EMAILS_V2 | jOe9XBRgphk8kEu0 | webhook | Follow-up emails |
| CRM_92_ENVIAR_HOJA_ADMIN | NjyTMpswXHC0leXb | webhook | Send admin sheet |
| CRM_PULSO_WA_MASIVA | nuUk5tcyZRs13Y7w | webhook | WhatsApp mass pulse |
| CRM_PULSO_COWORKING_V2 | ympqRBqAlOgZamUA | webhook | Coworking pulse |

### Domain: PROFOMA / QUOTES

| Name | ID | Trigger | Tables | Purpose |
|------|----|---------|--------|---------|
| CRM_PROFORMA_SOLICITAR | 7N1nRTiPpNx2iNMR | webhook | clientes.proformas | Request quote |
| CRM_PROFORMA_VERIFICAR | kKDCQ4i4xKgzEF7t | webhook | clientes.proformas | Verify quote |
| CRM_PROFORMA_ENVIAR | 8w45OxaVKIV4mCJV | webhook | clientes.proformas | Send quote |
| CRM_PROFORMA_CONSOLIDAR | Km181i5Mc8mPI90W | webhook | clientes.proformas | Consolidate quotes |
| CRM_PROFORMA_APROBAR | yMLRiNjqz2RdvzUz | webhook | clientes.proformas | Approve quote |

### Domain: GBP REPORTS (Only 2 ACTIVE — 2026-08-24 decision)

| Report | Script | Output |
|--------|--------|--------|
| **Estado del GBP** | `estado_gbp_v2.py` | PDF: GBP card/status report |
| **Informe Competitivo** | `informe_competitivo_v2.py` | PDF: Competitive analysis + leads |

Both run on **OnePlus 10T** via manual invocation. PDFs saved to `scripts/gbp/*/pdf/`.

12 other reports are implemented but NOT GENERATED.

### Domain: ADMIN & MAINTENANCE

| Name | ID | Trigger | Purpose |
|------|----|---------|---------|
| CRM_BACKUP_AUTOMATICO | 26b1y56KIt4q9Aq6 | schedule | Automatic backup |
| CRM_99_CLEANUP_V2 | P4AXTIV5pEm3927X | webhook | Cleanup old data |
| CRM_RENOVACIONES | e6bDDk5S7qawKDox | webhook | Renewal management |
| CRM_ADMIN_AUDIT_GET | RTvcwCDw4zkd3AfF | webhook | Admin audit |

---

## BLOCK 4 — E2E Business Flows

### Flow 1: Lead Capture
```
[Landing form] 
  → CRM_LANDING_DIGITAL_LEAD_NUEVO webhook
  → INSERT operaciones.leads (origen='landing_digital')

[Scraper OnePlus 10T]
  → gosom-gmaps-scraper finds business
  → INSERT operaciones.leads (origen='scraper', google_cid set)
```

### Flow 2: Lead → Operator (Distribution)
```
1. Operator opens Modo Túnel (NEXT_CALL)
   → OperatorDashboard loads campaigns via CRM_CAMPANAS_ACTIVAS_V2
   → Loads available leads via CRM_LEADS_DISPONIBLES

2. Operator clicks "Tomar Lead"
   → handleAsignarLead()
   → CRM_DISTRIBUIDOR_CAMPANAS webhook (LjcIjmCBKuWUxOSZ)
   → SELECT lead from pool WHERE estado='nuevo' AND operador_id IS NULL
   → Returns lead to Zone 2
   
3. operador_id updated on lead
```

### Flow 3: Lead → Cita (Scheduling)
```
1. Operator clicks "Programar Cita"
   → CRM_35_POST_CREAR_CITA (yUb6cDsiTdluJdde)
   → INSERT operaciones.llamadas_programadas (tipo, fecha_programada, lead_id)
   → Trigger sync_llamada_cliente_id() sets cliente_id
   
2. Callback appears in Zone 3

3. Operator clicks "Tomar Callback"
   → CRM_TOMAR_CALLBACK (84yFSuDIDI9ZWh3a)
   → Creates llamada_activa, lead shown in Zone 2
```

### Flow 4: Lead → Cliente (Sale)
```
1. Operator completes call → clicks "VENTA"
   → handleResultado('venta')
   → CRM_REGISTRAR_RESULTADO (6x0x8DCOBzZf62K6)
   
2. Switch node routes:
   - 'venta' branch:
     → UPDATE operaciones.leads SET estado='vendido' WHERE id=?
     → INSERT INTO clientes.clientes (ON CONFLICT lead_id DO UPDATE)
     → INSERT crm_bybusiness.ventas
     → INSERT public.timeline_global (tipo_evento='venta')
   
3. Lead.state = 'vendido', Cliente created with lead_id FK
```

### Flow 5: Cliente → Informe (GBP Reports)
```
1. Admin selects client(s) → triggers script manually on OnePlus 10T:
   - estado_gbp_v2.py → "Estado del GBP"
   - informe_competitivo_v2.py → "Informe Competitivo"
   
2. Script uses gosom-gmaps-scraper (on OnePlus) to scrape Google Maps data
   → Data in Python dict
   
3. Script calls report_to_pdf.py → PDF generated
   → Saved to scripts/gbp/*/pdf/
   
4. Email sent via n8n workflow with PDF attachment

NOTE: 12 other reports exist in scripts/gbp/ but are NOT actively generated.
Only 2 are used (2026-08-24 decision to simplify).
```

### Flow 6: Cita → Renovación (Renewal)
```
1. CRM_RENOVACIONES (e6bDDk5S7qawKDox) triggers
   → Queries clientes WHERE fecha_renovacion IS NOT NULL AND near
   
2. For each renewal client:
   → INSERT operaciones.llamadas_programadas (tipo='responsable')
   → notas = "Renovación producto - 30 días antes de fecha_fin"
   
3. Operator calls → resultado recorded
   → If 'renovacion' success: UPDATE cliente.fecha_renovacion
```

### Flow 7: Cliente → Baja
```
1. Admin clicks "Dar de baja" on CarteraPanel
   → CRM_CLIENTE_BAJA (GpbWkQ2rdBzIKkAZ)
   → UPDATE clientes.clientes SET estado='baja' WHERE id=?
```

---

## BLOCK 5 — Frontend ↔ Backend

### Torre de Control (Admin) — Views

| View | File | Workflows Consumed |
|------|------|-------------------|
| Dashboard | DashboardPanel.jsx | CRM_KPI_DASHBOARD_V2, CRM_CAMPANAS_DASHBOARD |
| Agenda Global | AgendaGlobalPanel.jsx | CRM_AGENDA_V2 |
| GBP | GbpPanel.jsx, GbpDashboardPanel.jsx | CRM_GBP_FICHAS_CLIENTE, custom KPIs |
| Cartera | CarteraPanel.jsx | CRM_CARTERA_GET_V4, CRM_CLIENTE_*, CRM_INTERACCION_* |
| Campañas | CampanasPanel.jsx | CRM_CAMPANAS_*, CRM_CAMPANA_CREAR, CRM_CAMPANA_ASIGNAR_OPERADORES |
| Leads Landing | LeadsLandingPanel.jsx | CRM_LEADS_LANDING_FINAL |
| Gestión Leads | LeadsPanel.jsx | CRM_GESTION_LEADS_GET, CRM_DISTRIBUIDOR_CAMPANAS |
| Usuarios | UsuariosList.jsx | CRM_USUARIOS_LISTA, CRM_USUARIOS_CREAR |
| Auditoria | AdminAuditPanel.jsx | CRM_ADMIN_AUDIT_GET |
| Facturación | FacturacionPanel.jsx | CRM_FACTURAS_GET_V2, CRM_FACTURA_GENERAR |
| Scraper Status | ScraperStatusPanel.jsx | CRM_SCRAPER_HEALTH |
| Backup | BackupPanel.jsx | CRM_BACKUP_AUTOMATICO |

### Modo Túnel (Operator) — OperatorDashboard Zones

| Zone | Component | Workflows |
|------|-----------|-----------|
| Zone 1 | Zone1Filters | CRM_CAMPANAS_ACTIVAS_V2, CRM_CALLBACKS_OPERADOR, CRM_LEADS_DISPONIBLES |
| Zone 2 | Zone2Content + Teleprompter + HojaVentaModal | CRM_REGISTRAR_RESULTADO (7-button flow) |
| Zone 3 | Zone3Sidebar | CRM_CALLBACKS_HOY, CRM_ESTADISTICAS_CAMPANAS |
| Zone 4 | Zone4KPIs | CRM_OPERADOR_KPI_LIVE |

### Authentication Flow
```
1. Login form → POST https://n8n.ia-bybusiness.online/webhook/crm-login
   → n8n validates email+password against auth.usuarios
   → If 2FA enabled: returns {totp_required: true}

2. If 2FA: User enters code → POST crm-verify-2fa
   → auth.verify_totp() PostgreSQL function validates RFC 6238 TOTP
   → ±150s window

3. Success → AuthContext.login(user) → role-based routing
   → role=admin → Torre de Control tabs
   → role=operador → NEXT_CALL (Modo Túnel)
   → role=en_practicas → ENTRENAMIENTO (Training)
```

### State Management
| Type | Solution |
|------|----------|
| Server state (n8n data) | React Query via `useN8n` hook |
| User session | AuthContext |
| Component-local state | `useState` |
| No global state library | AuthContext + React Query sufficient |

---

## BLOCK 6 — Architectural Decisions (Validated)

| # | Decision | Origin | Status |
|---|----------|--------|--------|
| 1 | **OnePlus 10T = sole scraper** (no Docker Nano/Heavy) | AGENTS.md + SESION_2026-08-24 | ACTIVE — accepted instability |
| 2 | **PDFs on-demand, not stored** | ARCHITECTURE.md | ACTIVE |
| 3 | **cliente_id FK from lead** (migration 2026-08-23) | ARCHITECTURE.md | ACTIVE |
| 4 | **VPS = production DB** (clients + ops) | ARCHITECTURE.md | ACTIVE |
| 5 | **Local postgres-crm EMPTY** | This exploration | GAP |
| 6 | **90-day contactabilidad** (was 30d pre-2026-06-12) | ARCHITECTURE.md | ACTIVE |
| 7 | **2 active reports only** (Estado GBP + Competitivo) | SESION_2026-08-24 | ACTIVE — 12 others dormant |
| 8 | **Navy Industrial style** | ARCHITECTURE.md | ACTIVE |
| 9 | **Python/FastAPI auth on port 5001** (NOT PHP) | ARCHITECTURE.md | ACTIVE |
| 10 | **`clientes.citas` EMPTY** — use `operaciones.llamadas_programadas` | This exploration | GAP + DECISION |
| 11 | **`operaciones.campanas` MISSING** — campana_id FK is dangling | This exploration | GAP |
| 12 | **Scrape schedule = 30 days max** | SESION_2026-08-24 | ACTIVE |
| 13 | **`google_cid` = hex colon format** | ARCHITECTURE.md | ACTIVE |
| 14 | **Custom n8n image `fabrica/n8n:2.11.0-patched`** | ARCHITECTURE.md | ACTIVE — GRANT_TOKEN_TTL=86400s |
| 15 | **`proxima_accion_fecha` EMPTY** — do not use | This exploration | GAP |
| 16 | **`CRM_CLIENTE_BYBUSINESS_URL` is a STUB** | Engram discovery 2026-08-05 | BUG — no-op workflow |
| 17 | **bcryptjs path in n8n**: `/usr/local/lib/node_modules/n8n/node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs` | ARCHITECTURE.md | ACTIVE |
| 18 | **React Compiler enabled** (React 19) | package.json | ACTIVE |
| 19 | **React Query for all n8n data** | ARCHITECTURE.md | ACTIVE |
| 20 | **12s timeout on n8n calls** | useN8n hook | ACTIVE |

---

## GAPS IDENTIFIED

These are findings not present in the user's prior context:

1. **`clientes.citas` EMPTY (0 rows)** — The actual cita table is `operaciones.llamadas_programadas` (564 rows). `proxima_accion_fecha` on `clientes.clientes` is also empty.

2. **`operaciones.campanas` TABLE MISSING** — The `campana_id` FK in `operaciones.leads` points to a table that does not exist in the VPS DB. All campaign WFs may be affected.

3. **Local `postgres-crm` is empty** — MCP at localhost:5432 shows 0 rows on all tables. The actual production data is on VPS (localhost:5433 tunnel).

4. **`proxima_accion_fecha` EMPTY** — Cannot be used for agenda; use `operaciones.llamadas_programadas.fecha_programada`.

5. **13 legacy columns to drop** on `clientes.clientes` — identified but not enumerated in the codebase.

6. **`CRM_CLIENTE_BYBUSINESS_URL` is a STUB** — Returns `{ok: true}` but writes nothing to the DB.

7. **No `operaciones.campanas` table** — WFs referencing campaigns may be broken or using a different table structure.

---

*Generated: 2026-08-24 | Exploration for CRM_ByBusiness mental map*
