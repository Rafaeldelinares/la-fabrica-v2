# Tasks: S04 — operator-live-kpis

**Slice:** S04
**Area:** B (Operador)
**Title:** Operator live KPI strip in Zone4 of OperatorDashboard
**Capability:** `operator-live-kpis`
**Depends on:** none (Area B foundational)
**Delivery order:** 4 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~350 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: KPI Strip Component

- [ ] 1.1 Create `src/components/dashboard/MisKpiStrip.jsx` (~120 LOC). 4 stat cards: Calls Today, Ventas Hoy, Tasa Conversión, Duración Media. Uses `useN8nQuery(['kpis-live', userId], 'crm-operador-kpi-live', { refetchInterval: 30_000 })`. Navy Industrial: `bg-slate-950`, `rounded-sm`, JetBrains Mono for numbers, skeleton loading state (no spinner). Files: `src/components/dashboard/MisKpiStrip.jsx` (new). Kind: frontend. Est: ~120 lines. Acceptance: 4 cards render; skeleton shown while loading; stale indicator after 60s. Depends on: none.
- [ ] 1.2 Verify `src/shared/hooks/useN8n.js` exports `useN8nQuery` — confirm API shape before integration. Files: `src/shared/hooks/useN8n.js`. Kind: frontend. Est: ~5 lines check. Acceptance: `useN8nQuery` accepts key, path, opts. Depends on: none.

---

## Phase 2: Dashboard Integration

- [ ] 2.1 Mount `MisKpiStrip` in `OperatorDashboard.jsx` Zone4 area. Zone4 already contains Zone4Sidebar; add strip above or beside existing content. Files: `src/components/dashboard/OperatorDashboard.jsx`. Kind: frontend. Est: ~20 lines. Acceptance: strip visible in Zone4 on mount. Depends on: 1.1.

---

## Phase 3: Workflow

- [ ] 3.1 Create `CRM_OPERADOR_KPI_LIVE` n8n workflow (new). Accepts `operator_id`, returns `{ calls_today, ventas_hoy, tasa_conversion, duracion_media, refreshed_at }`. Aggregates from `crm_resultados` and `crm_llamadas` tables. Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~120 lines. Acceptance: workflow returns correct schema; zero calls returns all zeros. Depends on: none.

---

## Phase 4: E2E Smoke

- [ ] 4.1 Create `e2e/s04-operator-live-kpis.spec.js`. Test: log in as operator, navigate to dashboard, verify 4 KPI cards render with numeric values. Files: `e2e/s04-operator-live-kpis.spec.js` (new). Kind: test. Est: ~50 lines. Acceptance: spec passes; cards show real or zero values. Depends on: 1.1, 3.1.

---

## Critical Risk

- ⚠️ **R5**: `CRM_OPERADOR_KPI_LIVE` workflow does not exist — S04 creates it from scratch (Low risk).
- Performance: ensure KPI refetch does not interfere with `useOperatorData` (S06 will refactor the hook; keep them independent).

---

## Commit Plan

```
feat(operator): create MisKpiStrip component with 4 live KPI cards
feat(operator): mount MisKpiStrip in OperatorDashboard Zone4
feat(workflow): create CRM_OPERADOR_KPI_LIVE for live operator KPIs
```

**Commit 1** — `src/components/dashboard/MisKpiStrip.jsx` (1 file).
**Commit 2** — `src/components/dashboard/OperatorDashboard.jsx` (1 file).
**Commit 3** — workflow (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s04-operator-live-kpis.spec.js` passes.
- Manual: verify KPIs refresh every 30s (check network tab for recurring requests).
- Verify: zero-calls operator shows 0 on all cards without error.

---

## Rollback Plan

Revert commits. Remove `MisKpiStrip` from Zone4. Disable `CRM_OPERADOR_KPI_LIVE` workflow in n8n. Zone4 falls back to static `MisResultados` link. Boundary: this slice only.
