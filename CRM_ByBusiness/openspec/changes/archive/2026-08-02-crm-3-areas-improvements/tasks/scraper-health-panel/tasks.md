# Tasks: S11 — scraper-health-panel

**Slice:** S11
**Area:** A (Captura/Reputación)
**Title:** Scraper health panel — dependency root for Area A
**Capability:** `scraper-health-panel`
**Depends on:** none (Area A root)
**Delivery order:** 11 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: ScraperStatusPanel Component

- [x] 1.1 Create `src/modules/admin/scraper/ScraperStatusPanel.jsx` (~130 LOC). 3 scraper cards: nano, heavy, maps. Each card: service name, last run timestamp, status badge ("Operativo" / "CAÍDO" with #D00000 accent / "Sin datos"), last error. Auto-refresh every 60s via `useN8nQuery(['scraper-health'], 'crm-scraper-health', { refetchInterval: 60_000 })`. Stale indicator after 2 minutes. Skeleton loading. Files: `src/modules/admin/scraper/ScraperStatusPanel.jsx` (new). Kind: frontend. Est: ~130 lines. Acceptance: all 3 scraper cards render; auto-refresh works; stale indicator shows. Depends on: none.
- [x] 1.2 Add RBAC guard: `admin.system.config` or `scraper.read`. Files: `src/modules/admin/scraper/ScraperStatusPanel.jsx` (same file). Kind: frontend. Est: ~10 lines. Acceptance: non-admin sees access-denied. Depends on: 1.1.
- [x] 1.3 Handle all-scrapers-unreachable gracefully: show "Servicio no disponible" for each card, not an error state. Files: `src/modules/admin/scraper/ScraperStatusPanel.jsx` (same file). Kind: frontend. Est: ~15 lines. Acceptance: unreachable scrapers show "Sin datos" not crash. Depends on: 1.1.

---

## Phase 2: Workflow

- [x] 2.1 Create `CRM_SCRAPER_HEALTH` n8n workflow (new). Aggregates nano/heavy/maps health. Returns `{ scrapers: [{ name, status: 'up'|'down'|'unknown', last_run, last_error, last_success }], refreshed_at }`. Handles partial failures gracefully (one scraper down doesn't fail entire workflow). Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~200 lines. Acceptance: all-up returns all "up"; one-down returns one "down" + others "up"; all-unreachable returns all "unknown" without error. Depends on: none. ⚠️ **R1** (HIGH): Scraper `/health` endpoint exists and returns valid JSON — network topology issue (VPS n8n cannot reach local Docker scrapers); workflow returns 'unknown' gracefully. Status: DEGRADED.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/s11-scraper-health-panel.spec.js`. Test: admin navigates to scraper panel; verifies 3 cards render (may show "CAÍDO" in real environment). Files: `e2e/s11-scraper-health-panel.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes. Depends on: 1.1, 2.1.

---

## Critical Risk

- ⚠️ **R1** (HIGH): Scraper `/health` endpoint must exist before merge. Document dependency in S11 acceptance. If blocked, defer entire slice.
  - **Status**: DEGRADED — `/health` endpoints exist and return valid JSON (`{"scrapers":{"nano":"up","heavy":"down","maps":"down"}}`) — confirmed at probe time
  - **Limitation**: VPS n8n cannot reach local Docker scrapers (private network). Workflow returns `status: 'unknown'` for all scrapers from VPS. Local n8n could reach them but MCP auth is broken (key rotated).
  - **Mitigation**: Frontend handles all-unknown gracefully; panel shows "Servicio no disponible" not crash. R1 is non-blocking per spec REQ-003.
- No other Area A slice (S12–S14) can be applied before S11.

---

## Commit Plan

```
feat(admin): create ScraperStatusPanel with 3 scraper health cards
feat(workflow): create CRM_SCRAPER_HEALTH aggregating nano/heavy/maps status
```

**Commit 1** — `src/modules/admin/scraper/ScraperStatusPanel.jsx` (1 file).
**Commit 2** — workflow (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s11-scraper-health-panel.spec.js` passes.
- Manual: in production, verify panel shows real scraper status (likely "CAÍDO" per current scraper state).
- Manual: verify auto-refresh fires every 60s (check network tab).
- Manual: verify stale indicator appears after 2 minutes.

---

## Rollback Plan

Revert commits. Disable `CRM_SCRAPER_HEALTH` workflow. Panel shows "Servicio no disponible". Boundary: this slice only.
