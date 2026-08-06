# Proposal: GBP Ficha Improvements — Sprint 1

## Context

CRM exposes two parallel GBP tabs in `ClienteDrawer.jsx`: `TabOptimizacionGbp.jsx` (322 LOC) and `TabGbp.jsx` (793 LOC). This duplicates workflows and violates the 150-LOC limit. Critically, `TabOptimizacionGbp.jsx` has no internal RBAC guard, so supervisors with `gbp.read` can invoke Save despite lacking `gbp.write`. The audit cache overwrites results after 24 hours, preventing trend analysis.

## Scope

1. Replace both tabs with one **GBP** tab containing collapsible, sub-150-LOC sections.
2. Enforce `gbp.read` for visibility and `gbp.write` for every mutation; supervisors remain read-only.
3. Convert `clientes.gbp_audit_cache` from overwrite cache to append-only audit history and calculate photo, review-response, rating, and description drift.
4. Produce prioritized, impact-estimated gaps using deterministic regex and heuristics; reserve local Qwen for later summaries.

## Out of Scope

- Sprint 2+ PDF reports, email alerts, campaigns, or advanced NLP.
- Payments, subscriptions, or multi-tenant behavior.
- Google Business Profile API, paid APIs, or external AI.
- Granting supervisors `gbp.write`.

## Capabilities

### New Capabilities
- `gbp-ficha-audit`: Unified GBP audit, permission-safe actions, historical drift, and prioritized gap analysis.

### Modified Capabilities
- `rbac-coverage-first-slice`: Clarify that GBP read access never permits write actions inside `ClienteDrawer`.

## Approach

Compose the unified tab from focused sections and shared hooks. Apply RBAC at tab and action boundaries. Route persistence through n8n; migrate cache rows before append-only writes. Compute drift against the previous audit and derive gaps from deterministic rules. Preserve Navy Industrial styling.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| RBAC bypass remains exploitable during transition | High | Gate mutations first or atomically with the merge; add admin/supervisor tests |
| Cache-to-history migration loses current records | Medium | Backup, migrate idempotently, verify counts, then switch writes |
| Unified tab becomes unwieldy | Medium | Collapsible sections and components ≤150 LOC |
| Qwen 3.5-9B capacity reduces summary quality | Medium | Keep scoring deterministic; Qwen remains optional and local |

## Rollback Plan

Revert frontend and n8n changes per ≤3-file commit. Restore the previous cache write path only after preserving historical rows; retain the migration snapshot. No permission widening is introduced.

## Dependencies

- `src/modules/admin/cartera/ClienteDrawer.jsx`
- `src/modules/admin/cartera/tabs/TabOptimizacionGbp.jsx`
- `src/modules/admin/cartera/tabs/TabGbp.jsx`
- New GBP components/hooks under `src/modules/admin/cartera/`
- `src/shared/auth/rbac.js` and GBP RBAC tests
- `/opt/fabrica/scripts/gbp_ficha_audit.py`, `/opt/fabrica/scripts/gbp_http_wrapper.py`
- VPS workflows `CRM_GBP_FICHA_AUDIT` (`kyWibKXBuBknk2QX`) and Place ID save
- PostgreSQL `clientes.gbp_audit_cache` migration on `postgres-vps`

## Acceptance Criteria

- [ ] One GBP tab replaces both tabs; every React component is ≤150 LOC.
- [ ] Admin can mutate; supervisor cannot trigger `gbp.write` actions.
- [ ] Audits append and expose all four drift categories.
- [ ] Gap output is deterministic, prioritized, and impact-estimated.
- [ ] Frontend uses n8n and follows Navy Industrial constraints.
