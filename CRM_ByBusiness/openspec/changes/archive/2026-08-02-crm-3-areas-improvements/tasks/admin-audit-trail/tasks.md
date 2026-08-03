# Tasks: S08 — admin-audit-trail

**Slice:** S08
**Area:** C (Administrador)
**Title:** Admin audit trail panel reading sistema.eventos_sistema
**Capability:** `admin-audit-trail`
**Depends on:** S03 (dev eventos shim), S02 (FRONTEND_ERROR events)
**Delivery order:** 8 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~700 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: AdminAuditPanel Component

- [x] 1.1 Create `src/modules/admin/auditoria/AdminAuditPanel.jsx` (~160 LOC). Filterable by event_type, user, date range. Paginated (50/page). Reads from `CRM_ADMIN_AUDIT_GET`. Skeleton loading. Empty state: "Sin eventos registrados". Uses `useN8nQuery` with manual refetch. Files: `src/modules/admin/auditoria/AdminAuditPanel.jsx` (new). Kind: frontend. Est: ~140 lines. Acceptance: filters work AND-logic; pagination navigates correctly; empty state shown. Depends on: S03.
- [x] 1.2 Add RBAC guard: `useRbac` with `reportes.read` permission. Access-denied state shown to unauthorized users. Files: `src/modules/admin/auditoria/AdminAuditPanel.jsx` (same file). Kind: frontend. Est: ~10 lines. Acceptance: non-admin sees access-denied; admin sees panel. Depends on: 1.1.
- [x] 1.3 Handle graceful degradation when VPS tunnel is down or table absent: show notice "Audit trail solo disponible en producción (VPS)" instead of error. Files: `src/modules/admin/auditoria/AdminAuditPanel.jsx` (same file). Kind: frontend. Est: ~15 lines. Acceptance: no crash when table unreachable; notice displayed. Depends on: S03.

---

## Phase 2: Workflow

- [x] 2.1 Create `CRM_ADMIN_AUDIT_GET` n8n workflow (new). Accepts `{ event_type?, user_id?, desde?, hasta?, page?, page_size? }`. Returns `{ events: [...], total, page, page_size }` from `sistema.eventos_sistema`. Gracefully returns empty `events: []` when table absent (S03 dev shim integration). Files: workflow JSON (via n8n MCP or SSH+curl). Kind: backend-workflow. Est: ~200 lines. Acceptance: paginated events returned; FRONTEND_ERROR events queryable; empty result when table absent. Depends on: S03. NOTE: Workflow created (ID: RTvcwCDw4zkd3AfF) but has n8n expression validator warnings on jsCode fields — manual activation required in n8n UI. See `.workflows/s08-admin-audit-get.md`.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/s08-admin-audit-trail.spec.js`. Test: admin logs in, navigates to audit panel, verifies events listed or empty notice shown. Files: `e2e/s08-admin-audit-trail.spec.js` (new). Kind: test. Est: ~60 lines. Acceptance: spec passes. Depends on: 1.1, 2.1.

---

## Critical Risk

- ⚠️ **R6** (HIGH): `sistema.eventos_sistema` not in local dev — S03 shim ensures `reportError` is graceful; S08 must show notice, not crash.

---

## Commit Plan

```
feat(admin): create AdminAuditPanel for sistema.eventos_sistema events
feat(admin): add reportes.read RBAC guard to AdminAuditPanel
feat(admin): handle graceful degradation when eventos_sistema table absent
feat(workflow): create CRM_ADMIN_AUDIT_GET for paginated audit queries
```

**Commit 1** — `src/modules/admin/auditoria/AdminAuditPanel.jsx` (1 file).
**Commit 2** — workflow (via n8n MCP or SSH+curl).

---

## Verification Plan

- `npm run test:e2e` — `s08-admin-audit-trail.spec.js` passes.
- Manual: apply filters (event type + user + date); verify AND-logic.
- Manual: in local dev without VPS tunnel, verify notice shown instead of error.

---

## Rollback Plan

Revert commits. Set feature flag to disable; existing `AuditoriaPanel` keeps working. Disable `CRM_ADMIN_AUDIT_GET` workflow. Boundary: this slice only.
