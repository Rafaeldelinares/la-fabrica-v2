# E2E Tests — CRM ByBusiness

Playwright-based end-to-end tests for the CRM ByBusiness application.

## Setup

The Playwright test infrastructure is already configured:

- `@playwright/test` is installed in `devDependencies`
- Configuration: `playwright.config.js`
- Test specs: `e2e/*.spec.js`

## Running Tests

```bash
# Run all E2E tests (requires dev server on localhost:3000)
npm run test:e2e

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run in headed mode (browser visible)
npm run test:e2e:headed

# List tests without running
npx playwright test --list
```

## Test Users

Credentials are sourced from the database (`auth.usuarios` table in `crm_bybusiness`).

### Admin Users
| Email | Nombre | Notes |
|-------|--------|-------|
| `rafaeldelinares@gmail.com` | Rafael de Linares | Primary admin, totp_habilitado=false |
| `admin@test.com` | Admin Test | Test admin account |
| `rafael@ia-bybusiness.com` | Rafael Admin | Admin account |

### Operador Users
| Email | Nombre |
|-------|--------|
| `op1@test.com` | Operador Test 1 |
| `op2@test.com` | Operador Test 2 |
| `op3@test.com` | Operador Test 3 |

**Note:** Passwords are not stored in plain text. For development, check:
1. `/opt/fabrica/AGENTS.md` for documented test credentials
2. The n8n workflow `CRM_LOGIN` for the authentication API

## Test Specs

| File | Description |
|------|-------------|
| `auth.spec.js` | Login flow, invalid credentials, logout, 2FA prompt |
| `rbac.spec.js` | Sidebar visibility based on role (admin vs operador) |
| `agenda.spec.js` | Agenda panel loading, filter toggles, navigation |

## Key RBAC Rules Tested

- **Admin** (rol=admin): Has `reportes.read` → sees **Auditoría** in sidebar
- **Operador** (rol=operador): Missing `reportes.read` → no **Auditoría** in sidebar
- **Supervisor** (rol=supervisor): Has `reportes.read` → sees Auditoría

See `src/shared/auth/rbac.js` for full permission matrix.

## Debugging

```bash
# Show Playwright trace on failure
npx playwright test --trace on

# Run specific test
npx playwright test auth.spec.js

# Run with headed browser
npx playwright test --headed

# Update snapshots
npx playwright test --update-snapshots
```

## CI Mode

In CI environments (`CI=true`), tests run with:
- `retries: 2`
- `workers: 1` (sequential)
- `reporter: 'github'`
