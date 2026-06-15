# CRM ByBusiness — Architecture

This document describes the full architecture of the CRM ByBusiness application, including the
frontend, n8n workflows, authentication service, and infrastructure.

Last updated: 2026-06-15

---

## 1. Overview

CRM ByBusiness is a React-based customer relationship management system for a sales team.
It has two main views:
- **Torre de Control (Admin)**: 6 modules for managing campaigns, leads, operators, etc.
- **Modo Túnel (Operador)**: 4 modules for daily call workflow.

The frontend is a single-page app (SPA) that talks to a backend layer of n8n workflows
(orchestration) and a PHP/PostgreSQL auth service.

```
┌─────────────────────────────────────────────────────────────┐
│                    React 19 + Vite SPA                      │
│                  (CRM_ByBusiness/dist/)                      │
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐      ┌─────────────┐    ┌──────────────┐
   │  n8n    │      │  auth-      │    │  Go Scraper  │
   │ VPS     │      │  service    │    │  (port 8092) │
   │ :5678   │      │  (PHP+py    │    │  for GBP     │
   │ webhooks│      │  FastAPI    │    │  reputation  │
   └────┬────┘      │  :5001)     │    └──────────────┘
        │           └──────┬──────┘
        ▼                  ▼
   ┌─────────────────────────────┐
   │  PostgreSQL VPS             │
   │  - operaciones.leads        │
   │  - clientes.clientes        │
   │  - clientes.interacciones   │
   │  - operaciones.campanas     │
   │  - auth.usuarios            │
   │  - public.timeline_global   │
   └─────────────────────────────┘
```

---

## 2. Frontend (CRM_ByBusiness/)

### Stack
- **React 19** with React Compiler
- **Vite 7** for build
- **Tailwind CSS v4** for styling (Navy Industrial standard)
- **React Query** for data fetching (via `useN8n` hook)
- **Lucide React** for icons
- **Recharts** for analytics

### Project Structure

```
CRM_ByBusiness/
├── src/
│   ├── components/        # Reusable UI (cards, modals, layouts)
│   │   ├── dashboard/     # Dashboard-specific (Operator, Teleprompter, etc.)
│   │   └── ...
│   ├── modules/           # Feature modules
│   │   ├── auth/          # Login, 2FA, Credentials
│   │   ├── admin/         # Torre de Control (admin modules)
│   │   │   ├── agenda/
│   │   │   ├── campanas/
│   │   │   ├── candidatos/
│   │   │   ├── cartera/
│   │   │   ├── dashboard/
│   │   │   ├── facturacion/
│   │   │   ├── gbp/
│   │   │   ├── leads/
│   │   │   ├── usuarios/
│   │   │   └── ventas/
│   │   └── entrenamiento/ # Modo Túnel (operator training)
│   ├── hooks/             # Custom hooks (useOperatorData, useAuth, useTrainingScope)
│   ├── data/              # Static data (guionRosa.js — sales script)
│   ├── services/          # API services (reputationService.js)
│   ├── shared/            # Shared utilities
│   │   ├── hooks/         # useN8n, useTrainingScope
│   │   ├── ui/            # Atomic UI (Button, Card, Modal, Stat, EmptyState)
│   │   └── utils/         # formatCurrency, formatDate, etc.
│   └── utils/             # Global utils
├── docs/                  # Documentation
│   ├── ARCHITECTURE.md    # This file
│   ├── crm-operator-flow.md
│   └── n8n-custom-image.md
├── dist/                   # Production build (rsync'd to VPS)
├── package.json
└── vite.config.js
```

### Critical Frontend Patterns

#### 2.1 useN8n Hook (`src/shared/hooks/useN8n.js`)

All n8n webhook calls go through `useN8n`. This provides:
- 12s timeout
- 1 automatic retry on transient failures
- CORS handled via `mode: 'no-cors'` for health check
- Base URL + path structure for workflows on different n8n instances

```js
import { n8nGet, n8nPost } from '@/shared/hooks/useN8n';

// Simple call
const data = await n8nGet('crm-leads-disponibles', { operador_id: 1 });

// POST with custom base URL
const data = await n8nPost('crm-ausencia-gestiones',
  { operador_id: 1 },
  { baseUrl: import.meta.env.VITE_N8N_GESTIONES_URL }
);
```

**When NOT to use `useN8n`** (raw fetch is OK):
- Auth-service (port 5001, PHP backend) — use raw fetch with HTTP check
- Go scraper (port 8092, reputation) — use raw fetch
- Non-n8n external APIs

#### 2.2 AuthContext + useAuth

- `AuthContext.jsx` provides `useAuth()` to all components
- `useAuth.js` (extracted for react-refresh) has the auth state
- Login flow: `email + password` → n8n webhook `crm-login` → 2FA setup/verify if needed → `login(user)` → role-based routing
- 2FA uses TOTP (RFC 6238) via `auth.verify_totp()` DB function

#### 2.3 Navy Industrial Design System

Mandatory style for all CRM_ByBusiness components (NOT escaparate):
- Background: `bg-slate-950` or `bg-slate-900`
- Borders: `rounded-sm` (PROHIBITED `rounded-xl` or `rounded-full`)
- Accents: `#D00000` for critical actions
- Typography: Inter (UI) / JetBrains Mono (data)
- NO circular spinners (use Skeleton screens)
- Component max 150 lines (split if needed)
- PropTypes or TypeScript for reusable components

#### 2.4 Rosa Sales Script

The canonical 9-step sales script lives in `src/data/guionRosa.js`:
- `interpolarGuionRosa(lead, user)` interpolates lead name, scoring, etc.
- Renders in `<Teleprompter lead={lead} user={user} />` in `Zone2Content.jsx`
- 7-button result flow documented in `docs/crm-operator-flow.md`

---

## 3. n8n Workflows (Backend Orchestration)

### Deployment
- **URL**: https://n8n.ia-bybusiness.online/webhook/<path>
- **Image**: `fabrica/n8n:2.11.0-patched` (custom Docker image with 2 patches)
- **Total workflows**: 162 (as of 2026-06-15)
- **DB connection**: PostgreSQL VPS via credential `8NbamWrMdRexLNwa`

### Critical Workflows

| Workflow | Path | Method | Purpose |
|---|---|---|---|
| CRM_HEALTH_CHECK | crm-health | GET | Health check (returns `{ok:true,status:'healthy'}`) |
| CRM_USUARIOS_VERIFICAR_2FA | crm-verify-2fa | POST | TOTP code verification |
| CRM_USUARIOS_ACTIVAR_2FA | crm-activar-2fa | POST | Generate TOTP secret + QR |
| CRM_LOGIN | crm-login | POST | Email + password (via n8n, not auth-service) |
| CRM_KPI_DASHBOARD_V2 | crm-kpi-dashboard | GET | Admin KPIs |
| CRM_LEAD_DETAIL | crm-lead-detail | GET | Lead details |
| CRM_USUARIOS_AUSENCIA_GESTIONES | crm-ausencia-gestiones | POST | Operator absences + leads |
| CRM_CAMPANAS_VERIFICAR_CONFLICTOS | crm-verificar-conflictos | POST | Campaign lead conflicts |
| CRM_42_REGISTRAR_INTERACCION | crm-registrar-interaccion | POST | Log client interaction |
| CRM_GESTOR_CONFIG_UPDATE | crm-gestor-config-update | POST | Update gestoría config |
| CRM_CAMPANAS_ACTIVAS_V2 | crm-campanas-activas-v2 | GET | Active campaigns list |
| CRM_CAMPANAS_DASHBOARD | crm-campanas-dashboard | GET | Campaign stats (V3) |
| CRM_AGENDA_V2 | crm-agenda-unificada | GET | Agenda (citas last 30 days) |
| CRM_LANDING_DIGITAL_LEAD_NUEVO | landing-lead-nuevo | POST | Landing page lead creation |
| CRM_DISTRIBUIDOR_TRAINING_CRON | (schedule) | - | Training mode distribution |

### Security Pattern (applied to all user-input workflows)

Every workflow that accepts user input follows this pattern:

```
Webhook (POST/GET)
  → Validate Input (Code node)
    → If Valid Input (IF node)
      ├─ TRUE → PG/Code node(s) → Respond OK
      └─ FALSE → Respond Error
```

The Validate Input node:
- Regex `/^\d+$/` for integers (strict)
- Trim + escape single quotes (`replace(/'/g, "''")`) for strings
- Max length checks (e.g. 200 chars for names, 500 for summaries)
- Email regex for email fields
- Boolean coercion for booleans
- Array validation for arrays (e.g. `lead_ids`)

The IF node checks `$('Validate Input').item.json.__ok` (boolean).

The Respond Error node returns HTTP 400:
```json
{
  "ok": false,
  "error": "validation_failed",
  "details": ["cliente_id must be integer", "email must be a valid email"]
}
```

### Workflow Response Mode

When adding validation, **the Webhook `responseMode` must be `responseNode`** if the chain has
explicit `respondToWebhook` nodes in both branches. If using `lastNode`, the last node must always
return at least 1 item (otherwise n8n returns 500 "No item to return was found").

---

## 4. Authentication Service (auth-service)

### Stack
- **Python 3** + FastAPI + uvicorn
- **PostgreSQL** direct connection (psycopg2)
- **bcrypt** for password hashing (12 rounds)
- **MD5 + plaintext legacy** for old hashes

### Service
- Systemd: `auth_service.service` on VPS
- Port: 5001
- Listens on: 0.0.0.0 (localhost only, called by n8n)
- Working directory: `/opt/fabrica/auth-service/`

### Endpoints
- `POST /login` → verify email + password, return user dict (with 2FA fields)
- `POST /reset-password` → send reset email via n8n
- `GET /health` → health check

### 2FA (TOTP)
- DB functions:
  - `auth.verify_totp(secret_b32 text, code text, win_size int DEFAULT 5)` — RFC 6238 with HMAC-SHA1, ±150s window
  - `auth.base32_decode(encoded text)` — RFC 4648 base32 → bytea
- `auth_service.py` conditionally exposes `totp_secret` only when `totp_habilitado && !totp_configurado` (setup window)
- Frontend flows: `crm-activar-2fa` (generate secret) → `crm-verify-2fa` (verify code with `is_setup` flag)

---

## 5. Database (PostgreSQL VPS)

### Schemas
- `auth` — users, 2FA
- `clientes` — clients, interactions
- `operaciones` — leads, campaigns
- `public` — timeline, n8n registry
- `marketing`, `rrhh`, `social`, `infraestructura` — auxiliary

### Critical Tables
- `auth.usuarios` — users (id, email, password_hash, totp_habilitado, totp_secret, rol)
- `operaciones.leads` — leads (id, nombre_comercial, telefono, email, estado, campana_id, operador_id)
- `clientes.citas` — agenda (id, fecha_hora, tipo, estado, operador_id, cliente_id)
- `operaciones.campanas` — campaigns (id, nombre, estado, fecha_inicio, fecha_fin, prioridad)

### Two DBs (IMPORTANT)
- **VPS DB** (production): `fabrica-postgres-1` container, `crm_bybusiness` database, `rafael_admin` user
- **MCP postgres-fabrica** (orchestrator visibility only): `localhost:5432`, different database
- ALWAYS verify production user data via `ssh root@VPS "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c ..."`
- The MCP `postgres-fabrica` is for infrastructure registry, NOT CRM business data

---

## 6. Custom n8n Image (Critical for Performance)

The custom `fabrica/n8n:2.11.0-patched` image has **2 patches baked at build time**:

### PATCH 1: GRANT_TOKEN_TTL (broker side)
- File: `dist/task-runners/task-broker/auth/task-broker-auth.service.js`
- Change: `15 * Time.seconds` → `86400 * Time.seconds` (24h)
- Bug fixed: 403 in Task Broker JS runner (grant expired before runner started)

### PATCH 2: OFFER_VALID_TIME_MS (runner side)
- File: `node_modules/.pnpm/@n8n+task-runner@.../dist/task-runner.js`
- Change: `5000` → `60000` (60s)
- Bug fixed: "Offer expired - not accepted within validity window" retries under load

Without these patches, n8n VPS would run at 1600% CPU with health check taking 5-15s.

See `docs/n8n-custom-image.md` for full build/deploy instructions.

---

## 7. Deployment

### Build
```bash
cd /opt/fabrica/CRM_ByBusiness
npm run build
```

### Deploy to VPS
```bash
rsync -az --delete dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/
```

### Build Verification
- 0 lint errors (`npx eslint src/`)
- Bundle size: ~602 kB (warning: > 500 kB)
- Total modules transformed: 1793

### Production URLs
- CRM: https://crm.ia-bybusiness.com/
- n8n: https://n8n.ia-bybusiness.online/
- Auth-service: http://127.0.0.1:5001 (internal only)

---

## 8. Known Issues & Pending Work

### Code-Split Bundle
The 602 kB bundle triggers Vite's > 500 kB warning. Solution: dynamic import for routes
(admin modules loaded on-demand). See `vite.config.js` for current `manualChunks` config.

### n8n Workflow Audit
- Audited: 5 high-traffic workflows
- Total: 162
- Most remaining workflows use prepared statements, but not all have the Validate Input pattern.
- Recommendation: run a script-based audit of all 162 workflows to flag SQL injection risks.

### Raw Fetch Remaining
- ~20-30 raw fetch calls remain in non-critical components
- Pattern: see `src/services/reputationService.js` (Go scraper, port 8092) and `src/modules/auth/Login.jsx` (auth-service, port 5001)
- These are legitimate (not n8n), but could be wrapped for consistency.

---

## 9. Conventions & Standards

### Git
- Commits: `type(scope): description` (conventional commits)
- Co-authored by Claude Sonnet 4.6 is allowed in this project (see project overrides)
- `--no-verify` may be used to bypass gga hook when CLI auth fails

### Code
- Functions must have JSDoc comments for public APIs
- No console.log, fmt.Println, var_dump in production
- No hardcoded secrets (use env vars)
- No empty catch blocks (track error state)
- `rounded-sm` always (Navy Industrial)
- Component max 150 lines

### GGA (Gentle Guardian Angel)
- Pre-commit hook runs `gga run` (Claude-based code review)
- May be bypassed with `--no-verify` if CLI auth fails
- The hook validates: no console.log, no secrets, naming, comments, no commented code

---

## 10. Quick Reference

### Critical Endpoints
- Health check: `https://n8n.ia-bybusiness.online/webhook/crm-health`
- Login: `POST http://127.0.0.1:5001/login` (auth-service)
- 2FA verify: `POST https://n8n.ia-bybusiness.online/webhook/crm-verify-2fa`
- Reset password: `POST http://127.0.0.1:5001/reset-password`

### Critical Environment Variables
- `VITE_N8N_URL=https://n8n.ia-bybusiness.online/webhook`
- `VITE_N8N_AUSENCIAS_URL=https://n8n.ia-bybusiness.online/webhook/crm-ausencias`
- `VITE_N8N_GESTIONES_URL=https://n8n.ia-bybusiness.online/webhook/crm-ausencia-gestiones`
- `VITE_API_URL=/api` (auth-service, /api path proxied to port 5001)
- `VITE_REPUTATION_API_URL=https://n8n.ia-bybusiness.online/webhook/crm-reputacion-proxy`

### Critical VPS Paths
- /opt/fabrica/auth-service/ — auth-service
- /opt/fabrica/data/n8n-sqlite/ — n8n SQLite DB
- /opt/fabrica/n8n-custom/ — custom n8n Dockerfile + patch sources
- /var/www/crm.ia-bybusiness.com/ — deployed CRM bundle

### Critical Database Functions
- `auth.verify_totp(secret_b32, code, win_size DEFAULT 5)` — RFC 6238 TOTP
- `auth.base32_decode(encoded)` — RFC 4648 base32

### Critical User Credentials (for testing)
- Admin: rafaeldelinares@gmail.com / RafAdmin2026!CRM (id 1, totp_habilitado=false)
