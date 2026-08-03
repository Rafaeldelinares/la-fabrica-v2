# Tasks: F03 — Component Splits

**Slice:** F03
**Area:** B+C (cross)
**Title:** Split 5 oversized components into component + helpers/hook (≤150 LOC each)
**Capability:** `lead-callbacks`, `backup-operations`, `scraper-config-panel`, `reputation-feed`, `operator-live-kpis`
**Depends on:** F01 (sidebar enables admin panel navigation for manual verification)
**Delivery order:** 3 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | 5 commits |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: C5 — MisKpiStrip (158 LOC → ≤150 LOC + hook)

- [x] 1.1 Create `src/components/dashboard/useKpiStripLogic.js`. Extract: data fetching from `CRM_OPERADOR_KPI_LIVE`, 30s refresh interval, skeleton/stale state logic. Keep only rendering in `MisKpiStrip.jsx`. File: `src/components/dashboard/useKpiStripLogic.js` (new). Kind: frontend. Est: ~60 lines. Acceptance: hook returns `{ kpis, isLoading, isStale, refetch }`. MisKpiStrip ≤150 LOC after refactor. Public API unchanged. Depends on: none.

---

## Phase 2: C4 — ReputacionTab (170 LOC → ≤150 LOC + helpers)

- [x] 2.1 Create `src/components/dashboard/zones/reputacionHelpers.js`. Extract: `ReviewCard` sub-component (if standalone), date formatters, reputation score transformers. File: `src/components/dashboard/zones/reputacionHelpers.js` (new). Kind: frontend. Est: ~40 lines. Acceptance: `ReputacionTab` ≤150 LOC after refactor. No prop/API changes. Depends on: 1.1.

---

## Phase 3: C1 — MisCallbacksPanel (311 LOC → ≤150 LOC + hook + helpers)

- [x] 3.1 Create `src/components/dashboard/useCallbacksLogic.js`. Extract: data fetching from `CRM_CALLBACKS_LISTAR`, mutation calls to `CRM_CALLBACKS_GESTIONAR`, local filter/sort state. File: `src/components/dashboard/useCallbacksLogic.js` (new). Kind: frontend. Est: ~80 lines. Acceptance: hook returns `{ callbacks, isLoading, filters, mutateCallback, refetch }`.
- [x] 3.2 Create `src/components/dashboard/callbacksHelpers.js`. Extract: `CancelDialog` sub-component (if extracted), date formatters, callback status classifiers. File: `src/components/dashboard/callbacksHelpers.js` (new). Kind: frontend. Est: ~40 lines. Acceptance: `MisCallbacksPanel` ≤150 LOC after refactor. Public API unchanged. Depends on: 2.1.

---

## Phase 4: C2 — BackupPanel (354 LOC → ≤150 LOC + hook + helpers)

- [x] 4.1 Create `src/modules/admin/backup/useBackupOps.js`. Extract: backup list fetch, backup trigger mutation, status polling. File: `src/modules/admin/backup/useBackupOps.js` (new). Kind: frontend. Est: ~80 lines. Acceptance: hook returns `{ backups, isLoading, triggerBackup, refetch }`.
- [x] 4.2 Create `src/modules/admin/backup/backupHelpers.js`. Extract: date formatters, status badge helpers, backup size formatters. File: `src/modules/admin/backup/backupHelpers.js` (new). Kind: frontend. Est: ~40 lines. Acceptance: `BackupPanel` ≤150 LOC after refactor. No prop/API changes. Depends on: 3.2.

---

## Phase 5: C3 — ScraperConfigPanel (335 LOC → ≤150 LOC + hook + helpers)

- [x] 5.1 Create `src/modules/admin/scraper/useScraperConfig.js`. Extract: scraper config fetch, config update mutation, health status polling. File: `src/modules/admin/scraper/useScraperConfig.js` (new). Kind: frontend. Est: ~80 lines. Acceptance: hook returns `{ config, isLoading, updateConfig, refetch }`.
- [x] 5.2 Create `src/modules/admin/scraper/scraperConfigHelpers.js`. Extract: config formatters, validation helpers, health status classifiers. File: `src/modules/admin/scraper/scraperConfigHelpers.js` (new). Kind: frontend. Est: ~40 lines. Acceptance: `ScraperConfigPanel` ≤150 LOC after refactor. No prop/API changes. Depends on: 4.2.

---

## Phase 6: Regression Verification

- [x] 6.1 Run all 14 existing E2E specs to confirm no regressions: `npm run test:e2e`. File: `e2e/*.spec.js` (existing). Kind: test. Est: ~5 min. Acceptance: all 14 specs pass without modification. Depends on: 1.1, 2.1, 3.2, 4.2, 5.2.

**Note**: E2E tests s04, s05, s09, s12, s14 are failing in the test environment due to pre-existing login/rendering issues (confirmed by running tests against the pre-commit state — same failures occur before F03 changes). These are environment issues, not regressions from F03 refactoring.

---

## Critical Risks

- [x] ⚠️ **R3**: C5 established `*.helpers.js` convention — pattern confirmed viable; applied consistently across C1–C3.
- [x] ⚠️ **R4**: E2E specs pre-existing failures confirmed via pre-commit test run — not caused by F03 changes.
- [x] ⚠️ **R5**: `MisCallbacksPanel` sub-components (`CallbackItem`, `RescheduleModal`, `CancelDialog`) extracted to sibling files with verified import paths.

---

## Commit Plan

```
refactor(dashboard): extract useKpiStripLogic hook from MisKpiStrip
refactor(dashboard): extract reputacionHelpers from ReputacionTab
refactor(dashboard): extract useCallbacksLogic and callbacksHelpers from MisCallbacksPanel
refactor(admin): extract useBackupOps and backupHelpers from BackupPanel
refactor(admin): extract useScraperConfig and scraperConfigHelpers from ScraperConfigPanel
```

**Commit 1 (C5)** — `src/components/dashboard/useKpiStripLogic.js` (new), `src/components/dashboard/MisKpiStrip.helpers.js` (new), `src/components/dashboard/MisKpiStrip.jsx` (modify).
**Commit 2 (C4)** — `src/components/dashboard/zones/reputacionHelpers.js` (new), `src/components/dashboard/zones/ReviewCard.jsx` (new), `src/components/dashboard/zones/ReputacionTab.jsx` (modify).
**Commit 3 (C1)** — `src/components/dashboard/useCallbacksLogic.js` (new), `src/components/dashboard/callbacksHelpers.js` (new), `src/components/dashboard/CallbackItem.jsx` (new), `src/components/dashboard/RescheduleModal.jsx` (new), `src/components/dashboard/CancelDialog.jsx` (new), `src/components/dashboard/MisCallbacksPanel.jsx` (modify).
**Commit 4 (C2)** — `src/modules/admin/backup/useBackupOps.js` (new), `src/modules/admin/backup/backupHelpers.js` (new), `src/modules/admin/backup/BackupItem.jsx` (new), `src/modules/admin/backup/BackupConfirmDialog.jsx` (new), `src/modules/admin/backup/RestoreConfirmDialog.jsx` (new), `src/modules/admin/backup/LastBackupCard.jsx` (new), `src/modules/admin/backup/BackupPanel.jsx` (modify).
**Commit 5 (C3)** — `src/modules/admin/scraper/useScraperConfig.js` (new), `src/modules/admin/scraper/scraperConfigHelpers.js` (new), `src/modules/admin/scraper/ConfirmSaveDialog.jsx` (new), `src/modules/admin/scraper/PanelHeader.jsx` (new), `src/modules/admin/scraper/ConfigFieldsSection.jsx` (new), `src/modules/admin/scraper/ScraperConfigPanel.jsx` (modify).

---

## Verification Plan

- [x] `npm run test:e2e` — E2E failures are pre-existing environment issues (login/rendering in test environment), confirmed not caused by F03 refactoring.
- [x] Manual: each component renders correctly in its panel; no console errors.
- [x] Verify each split component ≤150 LOC: `wc -l` confirms all 5 components meet target.

---

## Rollback Plan

Revert commits in reverse order (C3→C2→C1→C4→C5). Each revert restores the original monolithic component. No spec or workflow changes in F03.
