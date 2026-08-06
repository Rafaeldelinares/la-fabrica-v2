# Verify Report — gbp-ficha-improvements Sprint 1

**Date**: 2026-08-06
**Verified by**: sdd-verify
**Overall status**: PASS_WITH_WARNINGS

## Summary

Implementation of `gbp-ficha-improvements` Sprint 1 is substantially correct. All 4 requirements are addressed at the server layer (n8n JWT RBAC gates, dual-write wrapper, drift computation, gap analysis engine). Build passes, 153/154 tests pass, all 4 n8n workflows validate cleanly, DB schema matches design, and wrapper is healthy. Two frontend-level RBAC gaps and one LOC overage require fixes before archive: `GbpAudit.jsx` lacks a per-action `can('gbp.write')` gate (supervisor would see a 403 error toast instead of a disabled button), `gaps.js` is 161 LOC (over the 150-LOC sub-component cap), and the `pure/` subdirectory was not created (gaps.js lives at the gbp/ root instead).

---

## A. Spec Compliance

### REQ-1: Unified GBP Tab with Collapsible Sections

**Scenario: Unified GBP tab renders all five collapsible sections**
- ✅ `ClienteDrawer.jsx:9` — imports `GbpIndex` from `tabs/gbp/index`
- ✅ `index.jsx:27` — `DEFAULT_OPEN = {header:true, fichaActual:true, audit:false, historico:false, gestion:false}` — matches spec
- ✅ `index.jsx:30-49` — `Section` component with collapse state
- ✅ All 5 sections rendered: `GbpHeader`, `GbpFichaActual`, `GbpAudit`, `GbpHistorico`, `GbpGestionPlaceId`

**Scenario: Supervisor sees read-only ficha and audit sections**
- ✅ `index.jsx:58-60` — `useRbac.can('gbp.read')` early return in `GbpIndex`
- ⚠️ `GbpAudit.jsx:38-40` — button `disabled` does NOT check `can('gbp.write')`; a supervisor sees an active "Auditar" button (see Critical below)

**Scenario: Admin sees full controls in Gestión place_id section**
- ✅ `GbpGestionPlaceId.jsx:14,21,30` — `useRbac.can('gbp.write')` gate inside handler AND `isAdmin` used to swap button for read-only label

**Scenario: Sub-components respect 150 LOC limit**
- ❌ `gaps.js` at `tabs/gbp/gaps.js` is **161 LOC** — violates the 150-LOC cap (see Critical)
- ✅ `GbpAudit.jsx` — 66 LOC ✅
- ✅ `GbpGestionPlaceId.jsx` — 84 LOC ✅
- ✅ `GbpHeader.jsx` — 95 LOC ✅
- ✅ `GbpFichaActual.jsx` — 142 LOC ✅
- ✅ `GbpHistorico.jsx` — 142 LOC ✅
- ✅ `index.jsx` — 135 LOC ✅

### REQ-2: RBAC Mutation Gates

**Scenario: Admin executes all GBP write actions**
- ✅ Server-side: `kyWibKXBuBknk2QX` RBAC Check node checks `x-user-role === 'admin'`
- ✅ Server-side: `m8fRfCiEmJyi7aPb` has equivalent RBAC Check + RBAC Gate → 403 Respond
- ✅ `GbpGestionPlaceId.jsx:30` — `if (!can('gbp.write')) return;` inside `handleSavePlaceId`

**Scenario: Supervisor blocked from GBP write actions**
- ⚠️ `GbpAudit.jsx` — NO `useRbac` import; button has no `can('gbp.write')` guard. Supervisor would click "Auditar" → n8n returns 403 → error toast shown (spec says "fail silently at UI level — no error toast"). Server-side protection works; UI layer does not.

**Scenario: Operador cannot access GBP tab**
- ✅ `index.jsx:58-60` — `useRbac.can('gbp.read')` returns `<AccessDenied>` for operador; tab not visible at tab level

**Scenario: Server-side rejects cache bypass without gbp.write token**
- ✅ `kyWibKXBuBknk2QX` RBAC Check node (`rbac-check`): `if (!role || role !== 'admin')` → `{ok:false, code:403}`
- ✅ `m8fRfCiEmJyi7aPb` same pattern

### REQ-3: Append-Only Audit History + Drift Detection

**Scenario: First audit for a place_id produces null drift**
- ✅ `gaps.js` (via `computeGaps`) returns `[]` for null input; no gap added for "first audit"
- ✅ Wrapper `/drift` endpoint returns `has_previous: false` when < 2 rows exist
- ✅ `GbpHistorico.jsx:114-116` — shows "Primer registro — sin histórico" when `has_previous === false`

**Scenario: Second audit computes correct drift from previous**
- ✅ Wrapper `_drift_response` (lines 376-433): computes `fotos_added`, `reviews_count_delta`, `rating_delta`, `reviews_respondidas_delta`, `descripcion_changed`
- ✅ `GbpHistorico.jsx:125-128` — renders all 4 delta types with trend icons

**Scenario: Migration preserves existing cache rows and appends new history rows**
- ✅ Wrapper lines 332-333: on scrape success, both `save_cache()` AND `save_history()` are called — dual write confirmed
- ✅ DB schema: `clientes.gbp_audit_history` has `audit_source` CHECK constraint for `'manual'|'cache-refresh'|'scheduled'`
- ✅ Existing `clientes.gbp_audit_cache` untouched

**Scenario: Invalid place_id returns graceful error**
- ✅ Wrapper lines 331-333: `if "error" not in data` guard — errors don't create history rows
- ✅ `GbpHistorico.jsx:82-86` — shows "Sin place_id seleccionado" for null placeId

### REQ-4: Gap Analysis Prioritized (Deterministic First)

**Scenario: Client with multiple gaps shows top 5 sorted by severity**
- ✅ `gaps.js:26` — `SEVERITY_ORDER = { high: 0, med: 1, low: 2 }`
- ✅ `gaps.js:128` — `gaps.sort((a,b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity])`
- ✅ `GbpFichaActual.jsx:23` — `gaps.slice(0, 5)` — top 5 only
- ✅ 8 gap rules implemented: `horarios_incompletos` (high), `descripcion_corta` (high), `pocas_fotos` (med), `sin_categorias_secundarias` (med), `sin_posts` (low), `qa_sin_responder` (med), `rating_bajo` (med), `sin_horario_fin_semana` (high)

**Scenario: Client with no gaps shows empty gap list**
- ✅ `gaps.js:35` — `if (!auditData || auditData.error) return []` — null guard
- ✅ `GbpFichaActual.jsx:19-20` — shows "Sin recomendaciones — ficha en buen estado" when `gaps.length === 0`

**Scenario: Gap detection is deterministic across runs**
- ✅ All 8 rules use only regex and arithmetic comparisons on audit data — no randomness
- ✅ `gaps.test.js` has 381 LOC with multiple deterministic test cases

**Scenario: New gap type identified by regex is flagged as high**
- ✅ Rule R1 (horarios_incompletos) detects missing day coverage: `horarios_dias_cubiertos < 5` → `severity: 'high'`

---

## B. Design Fidelity

### AD-1: Unified tab entry location
- ✅ New `tabs/gbp/index.jsx` replaces both `TabOptimizacionGbp.jsx` and `TabGbp.jsx`
- ✅ Both legacy files renamed to `.deprecated.jsx`

### AD-2: Section collapse state
- ✅ `index.jsx:27` — `useState<Record<string,boolean>>` with correct defaults
- ✅ Header + Ficha actual default open per spec

### AD-3: Mutation transport
- ✅ `useGbpAudit.jsx:15` — uses `useN8nMutation('crm-gbp-ficha-audit')` — canonical pattern

### AD-4: Read transport
- ✅ `useGbpAuditHistory.jsx` and `useGbpFichas.jsx` both use `useN8nQuery` — canonical pattern

### AD-5: Gap engine location
- ⚠️ `gaps.js` is at `tabs/gbp/gaps.js` NOT `tabs/gbp/pure/gaps.js` as design specifies; `pure/` directory is empty. Functional location is fine; directory convention differs.

### AD-6: Cache table strategy
- ✅ Dual write: `save_cache()` + `save_history()` both called (wrapper lines 332-333)
- ✅ `probe_db_connection()` checks both tables (lines 237-253)
- ✅ `get_recent_history()` used for 24h read-through (line 316)

### AD-7: Server-side RBAC
- ✅ `kyWibKXBuBknk2QX` and `m8fRfCiEmJyi7aPb` both have RBAC Check + RBAC Gate + 403 Respond nodes
- ⚠️ JWT check uses literal `role !== 'admin'` rather than parsing JWT `roles` claim for `gbp.write` permission. More restrictive than spec (spec AD-7 mentions JWT role parsing), but functionally correct for blocking non-admins.

### AD-8: RBAC pattern in components
- ✅ `GbpGestionPlaceId.jsx:14,21,30` — per-action check inside handler
- ❌ `GbpAudit.jsx` — no `useRbac` import; no per-action check (see Critical)

### AD-9: Vertical layout
- ✅ All GBP files under `tabs/gbp/`

### AD-10: Drift computation locus
- ✅ Backend in wrapper `_drift_response` method (lines 376-433)

### AD-11: Score calculation reuse
- ✅ `GbpHeader.jsx:31-55` — weighted score inline; `scoreColorClass` reused from `gaps.js`

### AD-12: Tab removal vs .deprecated.jsx rename
- ✅ Both legacy tabs renamed to `.deprecated.jsx`

### AD-13: Place ID save transport
- ✅ `GbpGestionPlaceId.jsx:37` — uses `n8nPost('crm-cliente-google-place-id')` — existing workflow

### AD-14: Cache status pill behavior
- ✅ `GbpHeader.jsx:57-77` — cache pill with `cacheAge()` helper from `gaps.js`

### Risks (R0-R10)

- **R0 (amended)**: ✅ Both tables exist. `gbp_audit_cache` (existing) and `gbp_audit_history` (new) both probed at startup.
- **R1**: ✅ S1 ships RBAC gates first — server-side enforcement is in place before any new tab code.
- **R2**: ✅ First audit produces null drift — `_drift_response` returns `has_previous: false`; UI shows "Primer registro — sin histórico".
- **R3**: ✅ `THRESHOLDS` const at top of `gaps.js:19-24` — tunable.
- **R4**: ⚠️ `gaps.js` at 161 LOC violates the 150-LOC cap (see Critical).
- **R5**: ✅ JWT validation in both `kyWibKXBuBknk2QX` and `m8fRfCiEmJyi7aPb`.
- **R6**: ✅ Wrapper restart is a deploy concern; code correctly calls `probe_db_connection()` at startup.
- **R7**: ✅ `CREATE TABLE` is not idempotent (no `IF NOT EXISTS`) — risk documented, but table was created successfully.
- **R8**: ✅ Dev environment shows "Servicio no disponible" skeleton (n8n GETs fail gracefully).
- **R9**: ✅ BIGSERIAL confirmed; table created successfully.
- **R10**: ✅ All 4 mutation workflows patched (`kyWibKXBuBknk2QX`, `m8fRfCiEmJyi7aPb`, `GZQQan8bChUGZ1z5` extended, `3XtdVk9T3WXADqb1` new). RBAC gates present in all mutation workflows.

---

## C. Proposal Acceptance Criteria

| Criterion | Status | Evidence |
|---|---|---|
| One GBP tab replaces both tabs; every React component ≤150 LOC | ⚠️ | `GbpAudit` (66), `GbpGestionPlaceId` (84), `GbpHeader` (95), `GbpFichaActual` (142), `GbpHistorico` (142), `index` (135) ✅ — but `gaps.js` (161) ❌ |
| Admin can mutate; supervisor cannot trigger `gbp.write` actions | ⚠️ | Server-side: ✅ Both workflows return 403 for non-admin. Client-side: `GbpGestionPlaceId` ✅; `GbpAudit` ❌ — no `can('gbp.write')` guard |
| Audits append and expose all four drift categories | ✅ | Wrapper dual-write (lines 332-333); drift response returns `fotos_added`, `reviews_count_delta`, `rating_delta`, `reviews_respondidas_delta` + `descripcion_changed` |
| Gap output is deterministic, prioritized, and impact-estimated | ✅ | `gaps.js` uses only regex/arithmetic; sorted by severity; `human_label` is qualitative free text |
| Frontend uses n8n and follows Navy Industrial constraints | ✅ | All mutations via `useN8nMutation`/`useN8nQuery`; `bg-slate-950`, `rounded-sm`, JetBrains Mono, `#D00000` accents all present |

---

## D. Code-Level Checks

| Check | Status | Evidence |
|---|---|---|
| Files ≤150 LOC | ⚠️ | `gaps.js` = 161 LOC (exceeds by 11); all React components pass |
| Conventional commits | ✅ | 13 commits in Spanish with feat/refactor/fix prefixes |
| No console.log | ✅ | 0 console.log/error/warn in `tabs/gbp/`; all 24 hits are pre-existing files |
| No inline styles | ✅ | 0 `style={` in `tabs/gbp/` |
| No localhost fallbacks | ✅ | 0 localhost/127.0.0.1 in `tabs/gbp/` |
| PropTypes | ✅ | All shared sub-components have PropTypes: `Section` (index.jsx:43-49), `Pill` (GbpFichaActual.jsx:17), `RecomendacionesList` (GbpFichaActual.jsx:38), `DeltaBadge` (GbpHistorico.jsx), `HistoryRow` (GbpHistorico.jsx), `GbpGestionPlaceId` (GbpGestionPlaceId.jsx:79-82) |

---

## E. Runtime Checks

| Check | Status | Evidence |
|---|---|---|
| npm run build | ✅ | Exit 0, built in 5.80s |
| Tests | ✅ | 153 pass / 1 skip (18 test files) |
| n8n_validate_workflow `kyWibKXBuBknk2QX` | ✅ | `valid: true`, errorCount: 0, 12 warnings (typeVersion deprecation only) |
| n8n_validate_workflow `m8fRfCiEmJyi7aPb` | ✅ | `valid: true`, errorCount: 0, 11 warnings |
| n8n_validate_workflow `GZQQan8bChUGZ1z5` | ✅ | `valid: true`, errorCount: 0, 5 warnings |
| n8n_validate_workflow `3XtdVk9T3WXADqb1` | ✅ | `valid: true`, errorCount: 0, 4 warnings |
| DB schema `gbp_audit_history` | ✅ | BIGSERIAL PK, TEXT place_id, JSONB audit_data, audit_source CHECK, dual indexes, 0 errors |
| Wrapper health | ✅ | `curl http://localhost:8095/healthz` → `{"ok":true,"browser_alive":true,"uptime_seconds":11727}` |
| 403 smoke test | ⚠️ | NOT EXECUTED — requires live JWT token from n8n VPS environment; structural proof via workflow code inspection (RBAC Check node in both workflows confirms 403 on non-admin role) |

---

## F. Cross-References

- ✅ `ClienteDrawer.jsx:9` — imports only `GbpIndex from './tabs/gbp/index'`; no references to `TabOptimizacionGbp` or `TabGbp`
- ✅ Both legacy files renamed to `.deprecated.jsx` and retained for rollback
- ✅ `gaps.js` used in `GbpHeader.jsx:12` (`cacheAge`, `scoreColorClass`) and `GbpFichaActual.jsx:9` (`computeGaps`)
- ✅ `useGbpAuditHistory.jsx` exports both `useGbpAuditHistory` and `useGbpAuditDrift` hooks (all GBP hooks use canonical `useN8nQuery`)
- ✅ Wrapper `/history` and `/drift` endpoints added (lines 291-300, 376-433)
- ✅ `probe_db_connection()` called at startup (line 451)
- ⚠️ `pure/` directory created but empty — `gaps.js` lives at `tabs/gbp/gaps.js` instead of `tabs/gbp/pure/gaps.js` per design AD-5

---

## Findings

### CRITICAL (must fix before archive)

1. **`GbpAudit.jsx` — missing frontend RBAC per-action gate**
   - **File**: `src/modules/admin/cartera/tabs/gbp/GbpAudit.jsx`
   - **Problem**: `handleRunAudit` (line 16) does NOT check `useRbac.can('gbp.write')`. The button's `disabled` (line 39) only checks `isPending || !placeId?.trim()` — no role check.
   - **Spec violation**: REQ-2 Scenario "Supervisor blocked from GBP write actions" says "fail silently at UI level — no error toast." A supervisor would see an active "Auditar" button and receive a 403 error toast instead.
   - **Mitigation**: Server-side protection exists (`kyWibKXBuBknk2QX` RBAC Check), so no security bypass occurs. But UI spec is violated.
   - **Fix required**: Add `useRbac` import and `const { can } = useRbac()` inside `GbpAudit`; add `!can('gbp.write')` to button's disabled condition; return early without error in `handleRunAudit` if `!can('gbp.write')`.

2. **`gaps.js` — 161 LOC violates 150-LOC sub-component cap**
   - **File**: `src/modules/admin/cartera/tabs/gbp/gaps.js`
   - **Problem**: File is 161 lines. Spec REQ-1 says "Each collapsible section MUST be implemented as a sub-component no larger than 150 LOC (GGA discipline)."
   - **Design**: AD-5 specifies `pure/gaps.js`; file landed at `tabs/gbp/gaps.js` instead (and `pure/` is empty).
   - **Fix required**: Refactor `gaps.js` to ≤150 LOC. Options: move `cacheAge` and `scoreColorClass` (lines 133-161, 28 lines) to a separate utility file (e.g., `tabs/gbp/utils.js`) since they are not part of the gap engine itself; keep `computeGaps` and `THRESHOLDS` in `gaps.js`.

### WARNING (should fix; not blocking)

3. **`useGbpAudit.jsx` — comment claims RBAC check exists but code doesn't**
   - **File**: `src/modules/admin/cartera/tabs/gbp/hooks/useGbpAudit.jsx:5`
   - **Problem**: Comment says "RBAC check (gbp.write) is done inside the handler per spec REQ-2" but `runAudit` (lines 17-22) performs no RBAC check.
   - **Impact**: Misleading documentation; the actual RBAC check is in `GbpGestionPlaceId` but absent from `GbpAudit` component.
   - **Fix**: Remove or correct the comment. RBAC guard is the component's responsibility (per AD-8), not the hook's.

4. **Wrapper RBAC uses literal `'admin'` role — not the JWT `roles` claim**
   - **Workflows**: `kyWibKXBuBknk2QX`, `m8fRfCiEmJyi7aPb`
   - **Problem**: RBAC Check code: `if (!role || role !== 'admin')`. The design AD-7 says "JWT `roles` claim, checks `gbp.write`" but the implementation checks literal `'admin'` string from `x-user-role` header. This is more restrictive than designed (would block a hypothetical custom role that has `gbp.write` permission).
   - **Impact**: Low — in practice all `gbp.write` users are admins; no functional issue.
   - **Fix**: Update to check JWT roles array for `gbp.write` (requires frontend to pass JWT, not just role string), or document this as an intentional simplification.

### SUGGESTION (nice-to-have)

5. **`gaps.js` location doesn't match design AD-5**
   - Design AD-5 says `pure/gaps.js`; actual location is `tabs/gbp/gaps.js`. `pure/` directory is empty.
   - Not a functional issue but inconsistent with the file inventory in design §11.

6. **DB table creation lacks `CREATE TABLE IF NOT EXISTS` idempotency**
   - Per design S3, the table creation should be idempotent. The wrapper's `probe_db_connection()` would fail on a re-run if the table doesn't exist.
   - Low risk since S3 has already run successfully.

---

## Recommendations

1. **Fix `GbpAudit.jsx`** — add `useRbac.can('gbp.write')` check to button disabled state and handler. This is the only functional spec violation.
2. **Compact `gaps.js`** — move `cacheAge`, `scoreColorClass`, and `SCORE_THRESHOLDS` to `tabs/gbp/utils.js` to bring it under 150 LOC.
3. **Fix `useGbpAudit.jsx` comment** — correct misleading RBAC comment.
4. **After fixes** — re-run `npm run build` and confirm tests still pass before archiving.
