# Archive Report — gbp-ficha-improvements Sprint 1

**Date**: 2026-08-06
**Archived by**: sdd-archive
**Status**: ARCHIVED

## Summary

Sprint 1 of GBP Ficha Audit improvements successfully archived.

## Final State

| Metric | Value |
|--------|-------|
| Commits | 16 |
| Files modified | 34 |
| Tests passing | 159 (153 → 159, +6 new RBAC tests) |
| n8n workflows updated | 4 patched + 1 new created |
| DB tables | 1 added (`clientes.gbp_audit_history`) |

## Specs Satisfied

All 4 requirements (REQ-1 through REQ-4) satisfied, all 17 spec scenarios pass.

### REQ-1: Unified GBP Tab with Collapsible Sections
- 5 collapsible sections: Header, Ficha Actual, Audit, Historico, Gestion place_id
- 6 sub-components all ≤150 LOC (after post-verify refactor: gaps.js → pure/gaps.js + pure/severity.js)

### REQ-2: RBAC Mutation Gates
- Server-side: 2 workflows with RBAC Check + RBAC Gate + 403 Respond
- Client-side: per-action `can('gbp.write')` gates in GbpAudit.jsx and GbpGestionPlaceId.jsx
- Header-based RBAC (x-user-role MVP) — JWT roles migration deferred to Sprint 2

### REQ-3: Append-Only Audit History + Drift Detection
- Wrapper dual-write: `save_cache()` + `save_history()` both called
- Endpoints: `/history` and `/drift` with `has_previous: false` for first audit
- Drift categories: fotos_added, reviews_count_delta, rating_delta, reviews_respondidas_delta, descripcion_changed

### REQ-4: Gap Analysis Prioritized (Deterministic First)
- 8 gap rules: horarios_incompletos (high), descripcion_corta (high), pocas_fotos (med), sin_categorias_secundarias (med), sin_posts (low), qa_sin_responder (med), rating_bajo (med), sin_horario_fin_semana (high)
- Sorted by severity: high → med → low
- Deterministic: regex and arithmetic only, no randomness

## Post-Verify Fixes (2 CRITICAL closed)

1. **GbpAudit.jsx** — Added `useRbac.can('gbp.write')` guard to button disabled state and handler
2. **gaps.js** — Refactored to `pure/gaps.js` (94 LOC) + `pure/severity.js` (27 LOC) + barrel re-export; all sub-components ≤150 LOC

## Warnings (Sprint 2 Backlog)

1. **Header-based RBAC MVP** — JWT roles claim migration not shipped; header-based (x-user-role) used instead
2. **pure/ directory naming** — gaps.js landed at tabs/gbp/gaps.js instead of tabs/gbp/pure/gaps.js (empty pure/ created); resolved via post-verify refactor

## Sprint 2 Backlog (Out of Scope)

1. PDF report generation
2. Email alerts for regression
3. Competitive analysis
4. Benchmarking
5. NLP reviews analysis (Qwen local)
6. Posts generator
7. Migrate RBAC from header-based to JWT roles claim

## Lessons Learned

- **Verify pre-apply facts with real DB queries** — R0 false alarm avoided wasted migration work (cache table existed)
- **Reuse existing workflows over creating new ones** — GZQQan8bChUGZ1z5 + HCxYTf8KJvxXzg3N already existed for history/fichas; saved ~100 LOC
- **Per-action useRbac gates are spec-required** even when server-side blocks (UX coherence: fail silently at UI level, no error toast)
- **Pre-apply checklist caught R0 + resolved OQ-2** (workflow name) — saved debug time during apply

## Artifacts

| Artifact | Path |
|----------|------|
| proposal | `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/proposal/proposal.md` |
| spec | `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/specs/clientes/spec.md` |
| design | `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/design/design.md` |
| tasks | `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/tasks/tasks.md` |
| verify-report | `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/verify-report.md` |

## Next Action

User authorization required: phrase "AUTORIZO DESPLIEGUE FINAL" to push 16 commits to origin/main (stacked-to-main strategy).
