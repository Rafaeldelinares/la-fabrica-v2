# Changelog

All notable changes to CRM_ByBusiness are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — 2026-06-15

### Roadmap Completion (June 13-15, 2026)

This release completes a 3-day roadmap covering security hardening, code quality,
UX improvements, and production deploy.

### Added

- **Rosa sales script** (`src/data/guionRosa.js`) — canonical 9-step script with `interpolarGuionRosa(lead, user)`
- **Teleprompter component** (`src/components/dashboard/Teleprompter.jsx`) — renders the script
- **Operator result flow doc** (`docs/crm-operator-flow.md`) — 7-button result workflow
- **n8n custom image doc** (`docs/n8n-custom-image.md`) — build/deploy instructions for the patched n8n image
- **Architecture doc** (`docs/ARCHITECTURE.md`) — full system architecture, deployment, conventions
- **README.md** — project entry point with quick start
- **2FA validation** — PL/pgSQL `auth.verify_totp()` and `auth.base32_decode()` functions
- **is_setup flag** in 2FA flow — distinguishes setup-time vs verify-time code submission
- **Validate Input pattern** in 5 n8n workflows — strict regex validation + IF + Error Respond
- **Custom n8n Docker image** (`fabrica/n8n:2.11.0-patched`) — 2 patches baked in (GRANT_TOKEN_TTL + OFFER_VALID_TIME_MS)

### Changed

- **fetch → n8nGet/n8nPost migration** — 60+ files, ~80 raw fetch calls eliminated
- **HTTP check hardening** — 33+ files now have `if (!res.ok) throw new Error('HTTP ${status} — ${body}')` before `.json()`
- **Login flow** — doLogin/doLoginApi/handleSubmitResetPassword all have HTTP checks
- **CRM_USUARIOS_AUSENCIA_GESTIONES** — changed from GET to POST (was causing silent 404)
- **CRM_AGENDA_V2** — relaxed date filter from `CURRENT_DATE` to `NOW() - INTERVAL '30 days'`
- **AuthContext** — try/catch on localStorage parse, removed `window.location.reload()` on logout
- **eslint.config.js** — added `argsIgnorePattern: '^[A-Z_]'` for destructured constants
- **useN8n hook** — extended with `baseUrl` option for workflows on different n8n instances

### Security

- **5 n8n workflows hardened** against SQL injection:
  - CRM_42_REGISTRAR_INTERACCION
  - CRM_GESTOR_CONFIG_UPDATE
  - CRM_CAMPANAS_VERIFICAR_CONFLICTOS
  - CRM_LEADS_HUERFANOS
  - CRM_LANDING_DIGITAL_LEAD_NUEVO (rolled back to original with its own escape)
- **4 high-traffic workflows audited** in n8n (CRM_HISTORIAL_OPERADOR, CRM_USUARIOS_ELIMINAR, CRM_DISTRIBUIDOR_HUERFANOS, CRM_CAMPANA_FINALIZAR)
- **V1/V2/V3** workflows hardened:
  - CRM_LEAD_DETAIL — Validate Input + IF + Error Respond
  - CRM_CAMPANAS_ACTIVAS_V2 — Validate Input + IF + Error Respond + quoting fix
  - CRM_CAMPANAS_DASHBOARD — Validate Input + IF + Error Respond + x-api-key

### Fixed

- **CRM_USUARIOS_ACTIVAR_2FA** — replaced broken `Math.random().toString(36)` with proper RFC 4648 base32
- **CRM_USUARIOS_VERIFICAR_2FA** — replaced broken JS Code sha1 with DB function `auth.verify_totp`
- **CRM_42_REGISTRAR_INTERACCION** — had SQL injection in INSERT query, now validated
- **CRM_CAMPANAS_ACTIVAS_V2** — `both` quoted in WHERE clause (was being interpreted as column)
- **useOperatorData.refreshData** — was returning `undefined` instead of Promise, now async
- **Login.handleSubmitResetPassword** — missing HTTP check, added
- **SupervisorPanel.evaluar** — empty catch swallowing errors, added `errorEvaluar` state
- **TabGbp** — dead `n8nUrl` prop removed
- **n8n CPU 1600%** — patched OFFER_VALID_TIME_MS from 5s to 60s, CPU dropped to ~200%
- **Health check 5-15s** — same patch fixed to 0.8-1.3s

### Refactored

- **35 files migrated to n8nGet/n8nPost** — eliminates 218 LOC of boilerplate, adds 12s timeout + 1 retry
- **27 useOperatorData, etc. sub-agents** — extracted helpers, code cleanup
- **Lint cleanup 100 → 0 errors** — react-hooks/set-state-in-effect, exhaustive-deps, no-unused-vars all fixed

### Deprecated

- None

### Removed

- `window.location.reload()` in AuthContext logout (was losing n8nHealthCheck state)
- N8N_WEBHOOK constant in Login.jsx (replaced with n8nPost)

### Performance

- **n8n health check**: 5-15s → 0.8-1.3s (10x improvement)
- **n8n CPU**: 1600% → 200% (8x improvement)
- **Bundle size**: 602 kB (unchanged, Vite warning for > 500 kB but acceptable for now)

### Documentation

- 3 new doc files (ARCHITECTURE.md, README.md, CHANGELOG.md)
- Updated n8n-custom-image.md
- Updated crm-operator-flow.md

---

## Commit History (since origin/main base)

```
e67db7c refactor(crm): migrate 35 more files to n8nGet/n8nPost + fix 36 lint issues
7fbfa59 docs(n8n): document custom image with GRANT_TOKEN_TTL + OFFER_VALID_TIME_MS patches
d8aedf7 fix(crm): crm-ausencia-gestiones uses POST — workflow expects POST, was called via GET causing 404
834bd64 fix(crm): gga Round 2 — inline ProgresoBar acepta actual/objetivo
b6cb07d chore(crm): lint cleanup — 100 → 36 problemas (-64%)
285ba75 fix(crm): gga Round 1 fixes — refreshData Promise, auth HTTP check, multi-base n8n
0403858 refactor(crm): migrate 9 files to n8nGet/n8nPost helpers
6bd44fb fix(crm): harden 27 frontend files against silent JSON parse failures
f96cfc3 fix(admin): HTTP check + parse defensive on remaining fetch calls
5c2e39c fix(auth): harden 2FA + login flow
b03e0bf feat(crm): wire Rosa sales script + document operator result flow
```

(Plus commits to come for this Unreleased section's docs and code-split.)
