# Tasks: S12 — reputation-feed

**Slice:** S12
**Area:** A (Captura/Reputación)
**Title:** Reputation tab live wiring in Zone2Content
**Capability:** `reputation-feed`
**Depends on:** S11 (Area A dependency root)
**Delivery order:** 12 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~450 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: ReputacionTab Component

 - [x] 1.1 Create `src/components/dashboard/zones/ReputacionTab.jsx` (~130 LOC). Displays: score (0–100), stars (1–5), review count, last 3 reviews (author, text, rating, date). Alert banner when score < 60 or stars < 3.5 (uses #D00000 accent). Loading skeleton. Empty state: "Sin datos de reputación disponibles". Uses `useN8nQuery(['reputacion-lead', placeId], 'crm-reputacion-lead')`. Files: `src/components/dashboard/zones/ReputacionTab.jsx` (new). Kind: frontend. Est: ~130 lines. Acceptance: score/stars/count render; alert shows when below threshold; empty state works. Depends on: S11.
 - [x] 1.2 Handle graceful degradation when Monitor Reputación engine at `:8092` is unreachable: show "Reputación temporalmente no disponible"; call `reportError()` (S02 integration). Files: `src/components/dashboard/zones/ReputacionTab.jsx` (same file). Kind: frontend. Est: ~20 lines. Acceptance: unreachable engine shows message; reportError called. Depends on: 1.1, S02.

---

## Phase 2: Zone2Content Wiring

 - [x] 2.1 Replace "Próximamente" stub in `src/components/dashboard/zones/Zone2Content.jsx` at lines 426–442 with live `ReputacionTab` component. Preserve tab structure (existing tab navigation unchanged). Files: `src/components/dashboard/zones/Zone2Content.jsx`. Kind: frontend. Est: ~30 lines (stub replacement only). Acceptance: "Próximamente" removed; ReputacionTab renders when tab selected. Depends on: 1.1.

---

## Phase 3: Workflow

 - [x] 3.1 Create `CRM_REPUTACION_LEAD` n8n workflow (new). Calls Go engine `:8092` at `POST /webhook/scraper/go`. Returns `{ score, stars, review_count, reviews: [{ author, text, rating, date }], alert_state, refreshed_at }`. Handles partial data (available fields returned, missing set to null). Handles engine unreachable gracefully. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~180 lines. Acceptance: returns correct schema; partial data handled; unreachable returns safe error shape. ⚠️ **R2** (MED): Go engine contract must be confirmed before production wiring. **Status**: Workflow created on VPS n8n (ID: iRnkuGexnMjd1lrm, webhook: GET /webhook/crm-reputacion-lead). Activation blocked by n8n 2.11.0+ JS Task Runner bug — same as S11. Manual activation in n8n UI required. Frontend handles inactive workflow gracefully.

---

## Phase 4: E2E Smoke

 - [x] 4.1 Create `e2e/s12-reputation-feed.spec.js`. Test: operator on a lead with GBP data clicks REPUTACIÓN tab; verifies reputation data renders. Files: `e2e/s12-reputation-feed.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes. Depends on: 1.1, 3.1.

---

## Critical Risk

- ⚠️ **R2** (MED): Monitor Reputación engine `:8092` contract unconfirmed. S12 must do dry-run with safe-shape before production wiring. If contract unknown, defer to future change.

---

## Commit Plan

```
feat(operator): create ReputacionTab with live reputation data display
refactor(operator): replace Próximamente stub with ReputacionTab in Zone2Content
feat(workflow): create CRM_REPUTACION_LEAD calling Monitor Reputación engine
```

**Commit 1** — `src/components/dashboard/zones/ReputacionTab.jsx` (1 file).
**Commit 2** — `src/components/dashboard/zones/Zone2Content.jsx` (1 file).
**Commit 3** — workflow (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s12-reputation-feed.spec.js` passes.
- Manual: click REPUTACIÓN tab; verify live data or empty state shown.
- Manual: verify alert banner (red #D00000) shows for score < 60.
- Manual: with engine down, verify graceful degradation message.

---

## Rollback Plan

Revert tab body of Zone2Content only; restore "Próximamente" stub. Disable `CRM_REPUTACION_LEAD` workflow. Boundary: this slice only.
