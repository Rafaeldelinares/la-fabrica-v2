# Tasks: S07 — lead-freeze-list + lead-assignment-explainability

**Slice:** S07
**Area:** B (Operador)
**Title:** No-contesta freeze list + lead assignment attribution tooltip
**Capability:** `lead-freeze-list`
**Depends on:** S04 (Zone1Filters part of operator dashboard baseline)
**Delivery order:** 7 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~500 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: Freeze List Component

 - [x] 1.1 Create `src/components/dashboard/MisFreezeList.jsx` (~110 LOC). "Leads Congelados" section in `MisResultados`: lists frozen leads (name, frozen date, reason "No contesta", "Descongelar" button). Uses `useN8nQuery(['frozen-leads', userId], 'crm-leads-freezed-list', { action: 'list' })`. Empty state: section hidden or "Sin leads congelados". Files: `src/components/dashboard/MisFreezeList.jsx` (new). Kind: frontend. Est: ~110 lines. Acceptance: frozen leads render; empty state handled. Depends on: S04.
 - [x] 1.2 Implement unfreeze flow: confirmation dialog → `useN8nMutation('crm-leads-freezed-list', { action: 'unfreeze', lead_id })`. Lead disappears from list on success. Files: `src/components/dashboard/MisFreezeList.jsx` (same file). Kind: frontend. Est: ~30 lines. Acceptance: unfreeze removes lead from list; error notification on failure. Depends on: 1.1, 2.2.

---

## Phase 2: MisResultados Integration + Zone1 Tooltip

 - [x] 2.1 Mount "Leads Congelados" section inside `src/components/dashboard/MisResultados.jsx`. Use conditional render — show only if frozen leads exist. Files: `src/components/dashboard/MisResultados.jsx`. Kind: frontend. Est: ~25 lines. Acceptance: section visible when frozen leads exist. Depends on: 1.1.
 - [x] 2.2 Add assignment attribution tooltip to `src/components/dashboard/zones/Zone1Filters.jsx`. On hover over assignment badge: tooltip shows "Asignado por: {campaign}, prioridad: {priority}, fuente: {source}". Handle null attribution gracefully ("Sistema", "—"). Files: `src/components/dashboard/zones/Zone1Filters.jsx`. Kind: frontend. Est: ~40 lines. Acceptance: tooltip shows correct attribution; null fields handled. Depends on: 2.3.

---

## Phase 3: Workflows

 - [x] 3.1 Create `CRM_LEADS_FREEZED_LIST` n8n workflow (new). Actions: `list` (returns frozen leads for operator) and `unfreeze` (clears `freeze_until`). Returns `{ frozen_leads: [{ id, nombre, telefono, congelado_en, motivo }] }`. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~100 lines. Acceptance: list and unfreeze both work correctly. Depends on: none.
 - [x] 3.2 Extend `CRM_LEADS_DISPONIBLES` payload: add `asignado_por: { campaign: string, prioridad: string, fuente: string }` per lead. Files: existing workflow JSON (modify via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~20 lines. Acceptance: each lead in response has asignado_por fields. Depends on: none.

---

## Phase 4: E2E Smoke

 - [x] 4.1 Create `e2e/s07-lead-freeze-list.spec.js`. Test: view freeze list, verify tooltip on assignment badge. Files: `e2e/s07-lead-freeze-list.spec.js` (new). Kind: test. Est: ~60 lines. Acceptance: spec passes. Depends on: 1.1, 2.2, 3.1.

---

## Critical Risk

- No critical infra risks. Freeze logic is existing business logic; this slice only exposes the UI.

---

## Commit Plan

```
feat(operator): create MisFreezeList component for frozen leads
feat(operator): add Leads Congelados section to MisResultados
feat(operator): add assignment attribution tooltip to Zone1Filters
feat(workflow): create CRM_LEADS_FREEZED_LIST for freeze list and unfreeze
feat(workflow): extend CRM_LEADS_DISPONIBLES with asignado_por fields
```

**Commit 1** — `src/components/dashboard/MisFreezeList.jsx`, `src/components/dashboard/MisResultados.jsx` (2 files).
**Commit 2** — `src/components/dashboard/zones/Zone1Filters.jsx` (1 file).
**Commit 3** — workflows (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s07-lead-freeze-list.spec.js` passes.
- Manual: hover assignment badge; verify tooltip shows campaign/priority/source.
- Manual: unfreeze a lead; verify it disappears from frozen list.

---

## Rollback Plan

Revert commits. Hide freeze list section via flag. Remove tooltip. Disable `CRM_LEADS_FREEZED_LIST` workflow. Boundary: this slice only.
