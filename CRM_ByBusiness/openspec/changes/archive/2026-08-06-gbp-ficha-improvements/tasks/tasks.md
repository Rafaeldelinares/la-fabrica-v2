# Tasks: GBP Ficha Improvements — Sprint 1

**Change**: `gbp-ficha-improvements`
**Date**: 2026-08-05
**Delivery strategy**: `ask-always`
**Artifact store**: openspec

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~1,250 (S1:200 + S2:350 + S3:400 + S4:300) |
| 400-line budget risk | **High** (S3 = ~400, S2 = ~350, S4 = ~300) |
| Chained PRs recommended | **Yes** |
| Suggested split | 4 chained PRs: S1 → S2 → S3 → S4 |
| Chain strategy | stacked-to-main |
| Slices over 400 lines | S3 (~400, at limit) |

Decision needed before apply: **Yes** — S3 is at the 400-line budget ceiling and total change exceeds 1,200 lines. Confirm chain strategy before `sdd-apply gbp-ficha-improvements`.

Chained PRs recommended: **Yes**

```yaml
review_workload_forecast:
  total_changed_lines_estimate: 1250
  slices_over_400_lines: [S3]
  chained_prs_recommended: yes
  decision_needed_before_apply: yes
  rationale: "S3 hits the 400-line budget ceiling; total Sprint 1 is ~1,250 LOC. Chained PRs protect review focus. S3 and S4 can run in parallel after S2 lands."
```

---

## Open Questions (pre-apply, orchestrator resolves)

| ID | Question | Owner | Blocking |
|----|----------|-------|---------|
| OQ-1 | Spec REQ-3 says `audit_id (UUID)`. Design uses `BIGSERIAL` for consistency with existing `gbp_*` tables. BIGSERIAL is chosen but @rafael must confirm. | orchestrator | S3 apply |
| OQ-2 | Workflow name: `crm-cliente-google-place-id` (without `gbp-` prefix) per TabOptimizacionGbp.jsx:78 — confirm exact name on VPS. | orchestrator | S1 apply |
| OQ-3 | JWT validation in n8n — confirm CRM_GBP_FICHA_AUDIT and CRM_GBP_PLACE_ID_SAVE accept JWT Bearer tokens today (R5 from design). | orchestrator | S1 apply |

---

## Pre-Apply Checklist

- [ ] VPS postgres connection verified (`postgres-vps` tunnel up on :5433)
- [ ] n8n mutation workflows inventory complete: `CRM_GBP_FICHA_AUDIT` (kyWibKXBuBknk2QX), `CRM_GBP_PLACE_ID_SAVE`, plus 2 new in S3
- [ ] JWT validation status confirmed for existing mutation workflows (R5)
- [ ] OQ-1 (BIGSERIAL vs UUID) resolved — decision needed before S3 apply
- [ ] OQ-2 (workflow name confirmation) resolved — decision needed before S1 apply
- [ ] OQ-3 (JWT issuance infra) resolved — decision needed before S1 apply
- [ ] Local Qwen reachable (future NLP, not Sprint 1)

---

## Slice S1 — RBAC Mutation Gates + Legacy Tab Deprecation

**Scope**: Gate all GBP mutations with `gbp.write`; rename legacy tabs `.deprecated.jsx`; scaffold entry component.
**Spec**: REQ-2
**Design**: §10, S1
**Dependencies**: None (first slice)
**Estimated LOC**: ~200

### Tasks

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 1.1 | Create `tabs/gbp/index.jsx` scaffold (RBAC early-return, empty section placeholders) | `src/modules/admin/cartera/tabs/gbp/index.jsx` | ~80 | `useRbac.can('gbp.read')` returns early for operador; five collapsible sections render (empty) |
| 1.2 | Rename `TabOptimizacionGbp.jsx` → `.deprecated.jsx` | `src/modules/admin/cartera/tabs/TabOptimizacionGbp.jsx` | 0 | File renamed, no import changes |
| 1.3 | Rename `TabGbp.jsx` → `.deprecated.jsx` | `src/modules/admin/cartera/tabs/TabGbp.jsx` | 0 | File renamed, no import changes |
| 1.4 | Update `ClienteDrawer.jsx` import lines to use `TabGbpUnified` from `tabs/gbp/index.jsx` | `src/modules/admin/cartera/ClienteDrawer.jsx` | ~10 | Only one GBP tab import; legacy tabs removed |
| 1.5 | Patch `CRM_GBP_FICHA_AUDIT` (kyWibKXBuBknk2QX) — add JWT `gbp.write` role check; return 403 on missing role | n8n workflow | ~20 | Spec REQ-2 Scenario "cache bypass without gbp.write token" |
| 1.6 | Patch `CRM_GBP_PLACE_ID_SAVE` — add same JWT role check | n8n workflow | ~20 | Server-side rejects without `gbp.write` |
| 1.7 | Audit all 4 mutation workflows — confirm which need JWT patch (R10) | n8n workflows | ~10 | Inventory list saved to engram |
| 1.8 | Write RBAC matrix test `GbpGestionPlaceId.rbac.test.jsx` (3 roles × 5 actions) | `src/modules/admin/cartera/tabs/gbp/GbpGestionPlaceId.rbac.test.jsx` | ~60 | Playwright: admin=pass, supervisor=blocked, operador=denied |

### Verification (S1)

```bash
# Smoke — tab renders without errors
npm run build 2>&1 | tail -20

# RBAC test
npm run test -- --reporter=line GbpGestionPlaceId.rbac 2>&1 | tail -15

# n8n probe
curl -s -X POST "https://n8n.ia-bybusiness.online/webhook/crm-gbp-ficha-audit" \
  -H "Authorization: Bearer $TOKEN_NO_GBP_WRITE" \
  | jq '.code'  # expect 403
```

**PR**: 1 work-unit. 3 files modified: `index.jsx` (new), `ClienteDrawer.jsx`, + 2 file renames.

---

## Slice S2 — Unified GBP Tab Scaffold (REQ-1)

**Scope**: Implement all five collapsible sub-components (≤150 LOC each) with real content from legacy tabs.
**Spec**: REQ-1
**Design**: §10, S2
**Dependencies**: S1 complete
**Estimated LOC**: ~350

### Tasks

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 2.1 | Implement `GbpHeader.jsx` — score + cache status pill (reuse `cacheAge` helper) | `src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` | ~80 | Spec Scenario "Unified GBP tab renders all five collapsible sections"; score displayed, cache pill shows age |
| 2.2 | Implement `GbpFichaActual.jsx` — current audit display (moves content from TabOptimizacionGbp.jsx:200-302) | `src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | ~120 | Displays audit data; top-5 gaps placeholder (filled S4) |
| 2.3 | Implement `GbpHistorico.jsx` — placeholder timeline (filled S3) | `src/modules/admin/cartera/tabs/gbp/GbpHistorico.jsx` | ~120 | Renders "Sin histórico" empty state; structure ready for S3 |
| 2.4 | Implement `GbpAudit.jsx` — run-audit mutation with `useRbac.can('gbp.write')` gate | `src/modules/admin/cartera/tabs/gbp/GbpAudit.jsx` | ~100 | Spec Scenario "Admin executes all GBP write actions"; button disabled for supervisor |
| 2.5 | Implement `GbpGestionPlaceId.jsx` — place_id input + save with write gate | `src/modules/admin/cartera/tabs/gbp/GbpGestionPlaceId.jsx` | ~100 | Spec Scenario "Admin sees full controls"; supervisor sees no edit controls |
| 2.6 | Implement `hooks/useGbpAudit.js` — mutation wrapper using `useN8nMutation` | `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAudit.js` | ~50 | Wraps `crm-gbp-ficha-audit` webhook; RBAC check inside handler |
| 2.7 | Wire collapse state in `index.jsx` (default: Header + FichaActual open) | `src/modules/admin/cartera/tabs/gbp/index.jsx` | ~20 | Each section collapsible; state per-drawer-instance |
| 2.8 | Run Playwright smoke: unified tab renders 5 sections | `e2e/gbp-ficha-unified.spec.js` | ~30 | All 5 sections visible; no console errors |

### Verification (S2)

```bash
# Build
npm run build 2>&1 | tail -10

# Unit (placeholder — real tests in S3/S4)
npm run test -- --reporter=line 2>&1 | tail -10

# E2E smoke
npx playwright test e2e/gbp-ficha-unified.spec.js --reporter=line 2>&1 | tail -20
```

**PRs**: 2 work-units. WU-a: sub-components + index wiring (3 files). WU-b: collapse state + e2e smoke (2 files).

---

## Slice S3 — Append-Only Audit History + Drift Detection (REQ-3)

**Scope**: Create `clientes.gbp_audit_history` table; update wrapper to write history; build history query workflow; implement drift computation.
**Spec**: REQ-3
**Design**: §10, S3; §4 (data model)
**Dependencies**: S2 complete (S3 and S4 can parallelize after S2 per design)
**Estimated LOC**: ~400 (at budget ceiling)

### Preflight Probe

```bash
# Verify VPS postgres tunnel before S3 apply
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c 'SELECT 1'" \
  && echo "TUNNEL_OK" || echo "TUNNEL_DOWN"
```

### Tasks

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 3.1 | Create `clientes.gbp_audit_history` table (BIGSERIAL PK, indexes per design §4.1) | SQL migration | ~30 | Table created; index on `(place_id, audited_at DESC)` exists |
| 3.2 | Replace `save_cache()` in wrapper with `save_history()` — append-only INSERT | `scripts/gbp_http_wrapper.py` | ~20 | Spec REQ-3: new audits append rows without overwrite |
| 3.3 | Replace `get_cache()` with `get_recent_history()` — 24h read-through from history | `scripts/gbp_http_wrapper.py` | ~20 | Same 24h TTL; returns latest row if fresh |
| 3.4 | Add startup probe `probe_db_connection()` — pings `clientes.gbp_audit_cache` AND `clientes.gbp_audit_history`; logs failure to stderr | `scripts/gbp_http_wrapper.py` | ~15 | `journalctl -u gbp-ficha.service` shows probe result; detects silent cache-write failures (amended 2026-08-05 — original probe was for missing table, now probes connection) |
| 3.5 | Create n8n `CRM_GBP_AUDIT_HISTORY_GET` workflow (GET, params `{place_id, limit=10}`) | n8n workflow | ~50 | Returns history rows ordered by `audited_at DESC` |
| 3.6 | Create n8n `CRM_GBP_AUDIT_DRIFT_GET` workflow (GET, params `{place_id}`) | n8n workflow | ~60 | Computes deltas from last 2 rows; returns drift object |
| 3.7 | Extend `CRM_GBP_FICHA_AUDIT` — add `source` query param; history INSERT after wrapper call | n8n workflow | ~30 | `audit_source` = 'manual' or 'cache-refresh' |
| 3.8 | Implement `hooks/useGbpAuditHistory.js` — history query hook using `useN8nQuery` | `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAuditHistory.js` | ~60 | Queries `crm-gbp-audit-history-get`; staleTime 60s |
| 3.9 | Replace `GbpHistorico.jsx` placeholder with real timeline + drift display | `src/modules/admin/cartera/tabs/gbp/GbpHistorico.jsx` | ~120 | Spec REQ-3 Scenarios "first audit null drift" and "second audit computes drift" |
| 3.10 | Test: first audit produces null drift | `gaps.test.js` (interim) | ~15 | Unit test covers `null` prev audit case |

### Verification (S3)

```bash
# Probe VPS postgres
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness \
  -c \"SELECT COUNT(*) FROM clientes.gbp_audit_history WHERE place_id = 'ChIJTEST'\""

# Wrapper probe
journalctl -u gbp-ficha.service --since="5 minutes ago" | grep history

# n8n workflow test
n8n-mcp-vps_n8n_test_workflow workflowId="<CRM_GBP_AUDIT_HISTORY_GET_ID>" triggerType="webhook"

# Build still clean
npm run build 2>&1 | tail -10
```

**PRs**: 2 work-units. WU-a: wrapper + DB table + n8n DDL (3 files). WU-b: frontend hook + GbpHistorico (2 files).

> **Note**: OQ-1 (BIGSERIAL vs UUID) must be resolved before applying S3. Design uses BIGSERIAL; @rafael to confirm.

---

## Slice S4 — Gap Analysis + Integration (REQ-4)

**Scope**: Build deterministic gap-analysis rule engine; render top 5 gaps in Audit section.
**Spec**: REQ-4
**Design**: §10, S4
**Dependencies**: S2 complete (S3 and S4 can parallelize after S2 per design)
**Estimated LOC**: ~300

### Tasks

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 4.1 | Implement `pure/gaps.js` — `computeGaps(auditData) → Gap[]` rule engine (8 rules: high/med/low per spec REQ-4 table) | `src/modules/admin/cartera/tabs/gbp/pure/gaps.js` | ~100 | Spec REQ-4: deterministic; all 8 gap codes detected; severity sort |
| 4.2 | Implement `pure/gaps.test.js` — vitest unit tests (8 rules × 3 cases = 24 test cases) | `src/modules/admin/cartera/tabs/gbp/pure/gaps.test.js` | ~150 | All 24 cases pass; no randomness across runs |
| 4.3 | Integrate gaps in `GbpFichaActual.jsx` — render top 5 gaps under "Recomendaciones" with severity badge | `src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | ~20 | Spec REQ-4 Scenario "top 5 sorted by severity"; "Sin gaps detectados" empty state |
| 4.4 | Run full vitest suite | `npm run test -- --reporter=line` | — | All tests pass including gaps.test.js |

### Gap Rules (from spec REQ-4)

| Gap Code | Severity | Condition |
|----------|----------|-----------|
| `missing_horario_dia` | high | No horario for any day |
| `descripcion_corta` | high | Description < 200 chars |
| `fotos_insuficientes` | high | `fotos_count` < 10 |
| `categoria_secundaria` | med | No secondary category |
| `sin_posts_gbp` | med | `posts_count = 0` |
| `qa_sin_responder` | med | Any unanswered Q&A |
| `website_no_enlazado` | med | No website URL |
| `telefono_oculto` | low | Phone present but hidden |

### Verification (S4)

```bash
# Gaps unit tests
npm run test -- --reporter=line pure/gaps.test.js 2>&1 | tail -20

# Build
npm run build 2>&1 | tail -10

# E2E smoke (gaps visible)
npx playwright test e2e/gbp-ficha-unified.spec.js --reporter=line 2>&1 | grep -i "gap\|sin gap" | head -5
```

**PR**: 1 work-unit (3 files: engine + tests + integration).

---

## Dependency Graph

```
S1 ──────────────────────────────────────────────────────────────► S2 ──┬──► S3 (parallel with S4)
   └─ (S3 and S4 can start after S2; S3 and S4 are independent)  ─────┘
```

**Parallelization note**: Per design §10, S3 and S4 both depend only on S2 being complete. After S2 merges, S3 and S4 can be applied in parallel (separate PRs, separate reviewers). This cuts the critical path from 4 sequential slices to 3 sequential + 1 parallel batch.

---

## Rollback Quick Reference

| Slice | Revert command |
|-------|----------------|
| S1 | `git revert HEAD` (3 files + 2 renamed files back to `.jsx`) |
| S2 | `git revert HEAD` (6 new sub-component files removed; legacy `.deprecated.jsx` can be re-imported) |
| S3 | `git revert HEAD` + manual: `DROP TABLE IF EXISTS clientes.gbp_audit_history` |
| S4 | `git revert HEAD` (pure function, no DB state) |

---

## Chained PR Chain Strategy

**Recommended**: `stacked-to-main` — each slice merges to main in order. Fast iteration, fix on the go.

Alternative: `feature-branch-chain` — each PR targets the tracker branch; later PRs target the immediate previous PR branch. Only the tracker merges to main. Best for rollback control.

User decision required before `sdd-apply gbp-ficha-improvements`.

---

*Tasks generated by sdd-tasks phase agent. Review workload forecast embedded per orchestrator contract.*
