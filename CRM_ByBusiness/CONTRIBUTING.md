# Contributing to CRM ByBusiness

## Local Development Setup

### Prerequisites

- Node.js 20+
- npm 10+
- Docker & Docker Compose
- Access to La Fábrica IA internal services

### Environment Variables

Copy `.env.example` to `.env.local` and fill in required values:

```env
VITE_N8N_URL=https://n8n.ia-bybusiness.online
```

### Starting the Dev Server

```bash
npm install
npm run dev
```

The CRM frontend runs at `http://localhost:5174`.

### Database Access

#### Local PostgreSQL (`crm_bybusiness` on :5432)

The local database contains a subset of tables. It is used directly by some legacy components.

#### VPS PostgreSQL (`crm_bybusiness` on :5433 via tunnel)

For full development parity, a SSH tunnel to the VPS database is required:

```bash
# Verify tunnel is active
systemctl status tunnel-postgres-vps.service

# If not running, start it
sudo systemctl start tunnel-postgres-vps.service
```

The tunnel exposes the VPS PostgreSQL on `localhost:5433`.

### ⚠️ Dev Database Gap — `sistema.eventos_sistema`

**The `sistema.eventos_sistema` table lives on the VPS database only.**

During local development:

- The table does NOT exist in the local `crm_bybusiness` database (:5432).
- Error reporting via `reportError()` always attempts to POST to `CRM_60_POST_EVENTO_SISTEMA`.
- If the POST fails due to the missing table, the error is swallowed silently in production builds.
- In development mode (`import.meta.env.DEV === true`), `reportError()` also logs to `console.error` for visibility.

**To see FRONTEND_ERROR events during local development:**

1. Ensure the VPS tunnel is active (`tunnel-postgres-vps.service`).
2. Run the frontend in dev mode (`npm run dev`).
3. Trigger an error (e.g., via an ErrorBoundary).
4. Query the VPS database:

```sql
SELECT * FROM sistema.eventos_sistema
WHERE event_type = 'FRONTEND_ERROR'
ORDER BY created_at DESC
LIMIT 20;
```

### Code Standards

- Components: max 150 lines
- No inline styles (use Tailwind utility classes)
- No `console.log` in production code
- Conventional commits: `feat/fix/docs/refactor/test/chore`
- Run E2E tests before opening a PR: `npm run test:e2e`

### Running Tests

```bash
# E2E tests (requires dev server running)
npm run test:e2e

# E2E tests against CI environment
CI=true npm run test:e2e
```

## Project Structure

```
src/
├── modules/          # Feature modules (admin/, captura/, operador/)
├── shared/           # Shared utilities, auth, errors, UI components
│   ├── auth/         # RBAC and authentication
│   ├── errors/       # ErrorBoundary and reportError
│   └── ui/           # Reusable UI components (Card, Badge, Skeleton, Stat)
├── hooks/            # Custom React hooks
└── lib/              # Third-party library configuration
```

## Workflows (n8n)

All CRM data access goes through n8n workflows on the VPS. The frontend never hits PostgreSQL directly.

Key workflows:
- `CRM_60_POST_EVENTO_SISTEMA` — error event logging
- `CRM_OPERADOR_KPI_LIVE` — live operator KPIs
- `CRM_CALLBACKS_GESTIONAR` — callback management
- `CRM_LEADS_FREEZED_LIST` — frozen leads list
- `CRM_ADMIN_AUDIT_GET` — audit trail (requires VPS tunnel)
