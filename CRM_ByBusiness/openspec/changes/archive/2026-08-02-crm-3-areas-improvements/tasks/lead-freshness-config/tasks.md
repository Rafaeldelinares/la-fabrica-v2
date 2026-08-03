# Tasks: S13 — lead-freshness-config + rescrape-trigger

**Slice:** S13
**Area:** A (Captura/Reputación)
**Title:** Freshness config card + Forzar rescrape in ClienteDrawer
**Capability:** `lead-freshness-config`
**Depends on:** S11 (Area A fan-out)
**Delivery order:** 13 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~550 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: FreshnessConfigCard Component

- [x] 1.1 Create `src/modules/admin/agenda/FreshnessConfigCard.jsx` (~110 LOC). Admin-configurable lead contactability threshold. Shows current value (default: 90 days). Numeric input + "Guardar" button. Uses `useN8nMutation('crm-lead-freshness-config', { action: 'update', value })`. Success notification on save. Persists to `sistema.configuracion`. Files: `src/modules/admin/agenda/FreshnessConfigCard.jsx` (new). Kind: frontend. Est: ~110 lines. Acceptance: threshold persists across sessions; notification shown on save. Depends on: S11. **Status**: ✅ Done (commit 5bf7477)
- [x] 1.2 Mount `FreshnessConfigCard` inside `src/modules/admin/agenda/AgendaGlobalPanel.jsx` via composition. Do NOT inline edit AgendaGlobalPanel (740 LOC). Use existing slot or add at bottom of panel. Files: `src/modules/admin/agenda/AgendaGlobalPanel.jsx`. Kind: frontend. Est: ~15 lines. Acceptance: card visible inside panel; no regressions in panel. Depends on: 1.1. **Status**: ✅ Done (commit 5bf7477)

---

## Phase 2: ClienteDrawer Rescrape Button

- [x] 2.1 Add "Forzar rescrape" button to `src/modules/admin/cartera/ClienteDrawer.jsx` GBP tab. Button disabled if lead has no `place_id`. Confirmation dialog "¿Forzar rescrape de este negocio?" → `useN8nMutation('crm-gbp-rescrape', { place_id })`. Success notification. Hidden for non-admin (RBAC: `admin.system.config`). Files: `src/modules/admin/cartera/ClienteDrawer.jsx`. Kind: frontend. Est: ~40 lines. Acceptance: button triggers rescrape; disabled without place_id; hidden for non-admin. Depends on: S11. **Status**: ✅ Done (commit 8f15933)
- [x] 2.2 Verify `ClienteDrawer` path is `src/modules/admin/cartera/ClienteDrawer.jsx` (confirmed in design §13 open question). Files: `src/modules/admin/cartera/ClienteDrawer.jsx`. Kind: frontend. Est: ~5 lines verification. Acceptance: correct file path confirmed. Depends on: none. **Status**: ✅ Done - confirmed in TabGbp.jsx

---

## Phase 3: Workflows

- [x] 3.1 Create `CRM_GBP_RESCRAPE` n8n workflow (new). Accepts `{ place_id, lead_id? }`. Returns `{ success, job_id?, error? }`. Queues scrape job. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~100 lines. Acceptance: rescrape triggered; unknown place_id returns error gracefully. Depends on: none. **Status**: ✅ Done - workflow `gbp-rescrape` created and fixed (responseMode, Set raw mode, IF condition)
- [x] 3.2 Create `CRM_LEAD_FRESHNESS_CONFIG` n8n workflow (new). Actions: `get` and `update`. Reads/writes `sistema.configuracion` with key `lead_freshness_days`. `INSERT … ON CONFLICT DO UPDATE`. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~120 lines. Acceptance: get returns current value; update persists; DB function `crm.asignar_lead` read path NOT modified (deferred). Depends on: none. **Status**: ✅ Done - workflows `freshness-get`, `freshness-set`, `freshness-setup` created and fixed. ⚠️ **R3** (MED): DB function `crm.asignar_lead` read path update is deferred to follow-up change.

---

## Phase 4: E2E Smoke

- [ ] 4.1 Create `e2e/s13-lead-freshness-config.spec.js`. Test: admin changes threshold; verifies persistence. Files: `e2e/s13-lead-freshness-config.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes. Depends on: 1.1, 3.2.

---

## Critical Risk

- ⚠️ **R3** (MED): DB function `crm.asignar_lead` read path update deferred. S13 ships write-only; DB function update in follow-up change.
- ⚠️ **R9** (HIGH): `AgendaGlobalPanel` 740 LOC — mount FreshnessConfigCard via composition, do NOT inline edit.

---

## Commit Plan

```
feat(admin): create FreshnessConfigCard for lead contactability threshold
feat(admin): mount FreshnessConfigCard in AgendaGlobalPanel
feat(admin): add Forzar rescrape button to ClienteDrawer GBP tab
feat(workflow): create CRM_GBP_RESCRAPE for manual re-scrape
feat(workflow): create CRM_LEAD_FRESHNESS_CONFIG for threshold persistence
```

**Commit 1** — `src/modules/admin/agenda/FreshnessConfigCard.jsx` (1 file).
**Commit 2** — `src/modules/admin/agenda/AgendaGlobalPanel.jsx`, `src/modules/admin/cartera/ClienteDrawer.jsx` (2 files, ≤3 files).
**Commit 3** — workflows (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s13-lead-freshness-config.spec.js` passes.
- Manual: change threshold, navigate away, return — value persists.
- Manual: rescrape button disabled for lead without place_id.

---

## Rollback Plan

Revert commits. Disable `CRM_GBP_RESCRAPE` and `CRM_LEAD_FRESHNESS_CONFIG` workflows. Remove `FreshnessConfigCard` from AgendaGlobalPanel. Boundary: this slice only. Note: `sistema.configuracion` row can be deleted manually if needed.
