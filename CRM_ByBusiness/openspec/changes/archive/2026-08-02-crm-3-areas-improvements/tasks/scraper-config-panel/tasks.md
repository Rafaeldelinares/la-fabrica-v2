# Tasks: S14 — scraper-config-panel

**Slice:** S14
**Area:** A (Captura/Reputación)
**Title:** Scraper configuration panel
**Capability:** `scraper-config-panel`
**Depends on:** S11 (Area A fan-out)
**Delivery order:** 14 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~750 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

---

## Phase 1: ScraperConfigPanel Component

- [x] 1.1 Create `src/modules/admin/scraper/ScraperConfigPanel.jsx` (~130 LOC). Displays: depth (number), frequency (schedule), localities (list), excluded categories (list). Each field editable. "Guardar cambios" button. Uses `useN8nQuery` for GET + `useN8nMutation` for UPDATE. RBAC: `admin.system.config`. Confirmation dialog before save. Files: `src/modules/admin/scraper/ScraperConfigPanel.jsx` (new). Kind: frontend. Est: ~130 lines. Acceptance: all fields render; save persists; admin-only. Depends on: S11.
- [x] 1.2 R7 fallback: if `CRM_SCRAPER_CONFIG_GET` returns `{ available: false }`, show "Configuración via variables de entorno" message and disable all fields. Files: `src/modules/admin/scraper/ScraperConfigPanel.jsx` (same file). Kind: frontend. Est: ~20 lines. Acceptance: fallback message shown when API not exposed. Depends on: 1.1, 2.1.
- [x] 1.3 Handle config load failure gracefully: show "No se pudo cargar la configuración" notice. Files: `src/modules/admin/scraper/ScraperConfigPanel.jsx` (same file). Kind: frontend. Est: ~15 lines. Acceptance: load error shows notice, not crash. Depends on: 1.1.

---

## Phase 2: Workflows

- [x] 2.1 Create `CRM_SCRAPER_CONFIG_GET` n8n workflow (new). Returns `{ depth, frequency, localities: [], excluded_categories: [], updated_at }` or `{ available: false, reason: '...' }` if API not exposed. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~100 lines. Acceptance: returns correct schema or unavailable shape. Depends on: none.
- [x] 2.2 Create `CRM_SCRAPER_CONFIG_UPDATE` n8n workflow (new). Accepts `{ depth?, frequency?, localities?: string[], excluded_categories?: string[] }`. Validates inputs (depth must be positive). Returns `{ success, config, error? }`. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~120 lines. Acceptance: valid update persists; invalid params return error. Depends on: none. ⚠️ **R7** (HIGH): Backend must expose config update API. If blocked, show fallback message and defer save functionality.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/s14-scraper-config-panel.spec.js`. Test: admin navigates to scraper config; verifies panel renders (either editable or "Configuración via variables de entorno" fallback). Files: `e2e/s14-scraper-config-panel.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes. Depends on: 1.1, 2.1.

---

## Critical Risk

- ⚠️ **R7** (HIGH): Scraper config API not exposed (env-var only). S14 shows "Configuración via variables de entorno" and disables save if API unavailable. This is acceptable fallback per design.
- **This is the last slice (S14 of 14)**. No downstream slices depend on it.

---

## Commit Plan

```
feat(admin): create ScraperConfigPanel for scraper parameters
feat(workflow): create CRM_SCRAPER_CONFIG_GET and CRM_SCRAPER_CONFIG_UPDATE
```

**Commit 1** — `src/modules/admin/scraper/ScraperConfigPanel.jsx` (1 file).
**Commit 2** — workflows (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s14-scraper-config-panel.spec.js` passes.
- Manual: verify fallback "Configuración via variables de entorno" shown when API not exposed.
- Manual: if API available, verify config saves and persists.

---

## Rollback Plan

Revert commits. Disable `CRM_SCRAPER_CONFIG_GET` and `CRM_SCRAPER_CONFIG_UPDATE` workflows. Panel falls back to "Configuración via variables de entorno". Boundary: this slice only.
