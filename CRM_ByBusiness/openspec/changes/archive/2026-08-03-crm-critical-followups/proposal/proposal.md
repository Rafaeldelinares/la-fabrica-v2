# Proposal: CRM Critical Followups (CR-01 / CR-02 / CR-03)

**Change:** `crm-critical-followups` · **Phase:** sdd-propose · **Date:** 2026-08-03 · **Delivery:** `chained` (3 slices, ≤800 LOC each, stacked-to-main)

## Intent

Close the 3 CRITICAL findings blocking archival of `crm-3-areas-improvements` (archived 2026-08-02, verify-report verdict PASSED WITH WARNINGS). No new RBAC, no DB schema changes, no new n8n workflows.

## Scope

### In Scope (3 chained slices)

| # | Slice | CR | Files | LOC | Commits |
|---|-------|----|-------|-----|---------|
| F01 | Sidebar routing for admin panels | CR-02 | 2–3 | ~80 | 1 |
| F02 | S05 R4 watchdog verify + E2E | CR-03 | 1–2 | ~100 | 1–2 |
| F03 | 5 component splits (≤150 LOC each) | CR-01 | 10–15 | ~700 | 5 |

### Out of Scope (deferred to future changes)
**WARNINGS (7)**: W-01 tasks.md hygiene · W-02 RBAC deviation · W-03 S08 activation blocker (n8n UI manual) · W-04 VPS→local Docker NAT · W-05 S04 workflow (RESOLVED: `CRM_OPERADOR_KPI_LIVE` ID `AVSC8oqMyHJy7Bg2` is active) · W-06 S12 activation · W-07 localhost fallbacks in shared infra.
**SUGGESTIONS (5)**: S-01–S-05 (tasks.md checkboxes, near-ceiling components, RBAC formalization).

## Capabilities (delta contract with sdd-spec)

All capabilities exist in `openspec/specs/` from previous change. No new capabilities.

| Capability | Slice(s) | Delta |
|---|---|---|
| `lead-callbacks` | F02 + F03 | R4 verification + component split |
| `backup-operations` | F01 + F03 | Sidebar REQ + component split |
| `admin-audit-trail` | F01 | Sidebar REQ (replaces legacy `AuditoriaPanel` route) |
| `scraper-health-panel` | F01 | Sidebar REQ |
| `scraper-config-panel` | F01 + F03 | Sidebar REQ + component split |
| `operator-live-kpis` | F03 | Component split |
| `reputation-feed` | F03 | Component split |

## Approach

**F01 Sidebar** — Add Sistema entries to `Sidebar.jsx`: Monitor Scrapers→MONITOR (S11), Respaldos→BACKUP (S09), Auditoría→AUDIT_NEW (S08), Configuración Scrapers→SCRAPER_CONFIG (S14). RBAC: `admin.system.config`/`reportes.read`. `WorkBody.jsx` routes new tab IDs. Keep legacy AUDITORIA.

**F02 Watchdog** — Verify `CRM_WATCHDOG_CALLBACKS_V2` (VPS ID `oiCboRThnoOAeLxW`). IF + UPDATE nodes are **disabled**; only DB function `crm_watchdog_callbacks()` runs. Inspect via `postgres-vps` MCP for `estado != 'cancelado'` filter. Add `e2e/f02-watchdog-callbacks-skip.spec.js` using `CRM_CALLBACKS_GESTIONAR` (ID `epiM2Wd8mziT3Awz`) to assert skip.

**F03 Splits** — Extract helpers/hooks per component (public API unchanged):
| Component | Now | Target | Extract |
|---|---|---|---|
| MisCallbacksPanel | 311 | ≤150 | helpers + `useCallbacksLogic` |
| BackupPanel | 354 | ≤150 | helpers + `useBackupOps` |
| ScraperConfigPanel | 335 | ≤150 | helpers + `useScraperConfig` |
| ReputacionTab | 170 | ≤150 | helpers |
| MisKpiStrip | 158 | ≤150 | `useKpiStripLogic` |

Order: C5→C4→{C1,C2,C3}. 14 existing E2E specs must pass unmodified.

## Affected Areas

| Area | Slice | Impact |
|---|---|---|
| `src/shared/layout/Sidebar.jsx` | F01 | 4 Sistema entries + RBAC gates |
| `src/shared/layout/WorkBody.jsx` | F01 | Route BACKUP/AUDIT_NEW/SCRAPER_CONFIG |
| 5 oversized components | F03 | Split into component + helpers/hook |
| `specs/lead-callbacks/spec.md` | F02 | R4 delta |
| `e2e/f02-watchdog-callbacks-skip.spec.js` | F02 | New E2E spec |
| `playwright.config.js` | F02 | Register new spec |

## Risks

| Risk | Slice | Mitigation |
|---|---|---|
| Legacy `AuditoriaPanel` orphaned | F01 | Keep both routes; deprecate later |
| VPS tunnel down blocks F02 verify | F02 | Document blocked state in spec |
| F03 visual regression after hook extraction | F03 | 14 E2E specs unchanged = safety net |
| F03 helper pattern repetitive | F03 | Establish convention in C5 first |
| n8n JS Task Runner blocker (W-03/W-06) | All | Out of SDD scope; manual UI activation |

## Order Rationale

F01 → F02 → F03: F01 unlocks admin navigation needed to manually test F03 admin components. F02 is verification-only, independent. F03 last because mechanical + largest blast radius.

## Rollback

Per-slice `git revert` is independent. No DB → no data rollback. No new workflows → no deactivation needed. Reverse order F03→F02→F01 restores exact `crm-3-areas-improvements` end state.

## Dependencies

VPS tunnels (`tunnel-n8n-vps`, `tunnel-postgres-vps`) running for F02. All 5 components committed on `main`. Existing 14 E2E specs continue to pass (F03 invariant).

## Success Criteria

- [ ] F01: 4 admin panels reachable via Sidebar with RBAC gates; legacy menus unaffected
- [ ] F02: DB function skip behavior verified + documented; new E2E spec passes
- [ ] F03: Each split component ≤150 LOC; 14 existing E2E specs pass without modification
- [ ] No new RBAC, no DB changes, frontend never hits Postgres directly
- [ ] 3 slices merged stacked-to-main; ≤800 LOC each; ≤3 files per commit
- [ ] `crm-3-areas-improvements` archive unblocked

## Result Contract

- **status:** ok · **artifact:** `openspec/changes/crm-critical-followups/proposal/proposal.md`
- **memory_topic:** `sdd/crm-critical-followups/proposal`
- **next_recommended:** `sdd-spec` — write 10 capability delta specs (see Capabilities table)
- **risks:** see table; F02 VPS tunnel dep + F03 visual regression are top concerns