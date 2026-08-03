# Archive Report: crm-critical-followups

**Change:** `crm-critical-followups`
**Archived:** 2026-08-03
**Phase:** sdd-archive
**Mode:** openspec
**Status:** ARCHIVED — passed-with-warnings

---

## 1. Executive Summary

Three slices (F01 sidebar routing, F02 watchdog verification, F03 component splits) were committed to `main`. All 8 commits applied cleanly. Delta specs synced into live specs at `openspec/specs/`. The change is archived at `openspec/changes/archive/2026-08-03-crm-critical-followups/`. One critical documentation drift and two warnings were found during verification — all are spec/documentation issues, not implementation defects.

---

## 2. Slice Delivery Table

| Slice | Capability | CR | Commits | E2E | Verdict |
|-------|-----------|----|---------|-----|---------|
| F01 Sidebar Routing | admin-audit-trail, scraper-health-panel, scraper-config-panel, backup-operations | CR-02 | 1 (2da5601) | ✅ | PASS |
| F02 Watchdog Verify | lead-callbacks | CR-03 | 2 (6ff567a, e7c85ac) | ⚠️ filename drift | PASS |
| F03 Component Splits | operator-live-kpis, reputation-feed, lead-callbacks, backup-operations, scraper-config-panel | CR-01 | 5 (e5c6232..a96e9d0) | ✅ | PASS |

**Total: 8 commits across 3 slices.**

---

## 3. Spec Sync

Delta specs merged into live specs at `openspec/specs/`:

| Domain | Change | Notes |
|--------|--------|-------|
| `lead-callbacks` | REQ-005 verification evidence added | Already merged per verify report; no change needed |
| `backup-operations` | REQ-006 (sidebar nav) + REQ-007 (component split) appended | F01 sidebar + F03 split |
| `admin-audit-trail` | REQ-006 (sidebar nav) appended | RBAC corrected to `reportes.read` per AD-1 |
| `scraper-health-panel` | REQ-005 (sidebar nav) appended | RBAC corrected to `admin.system.config` per AD-1 |
| `scraper-config-panel` | REQ-005 (sidebar nav) + REQ-006 (component split) appended | F01 sidebar + F03 split |
| `operator-live-kpis` | REQ-005 (MisKpiStrip split) appended | F03 split |
| `reputation-feed` | REQ-004 (ReputacionTab split) appended | F03 split |

---

## 4. Verify Findings Summary

### Critical (1) — documentation drift, non-blocking

| ID | Finding | Root Cause | Disposition |
|----|---------|------------|-------------|
| CR-01 | F02 delta spec line 28 references `f02-watchdog-callbacks-skip.spec.js` but actual file is `f02-watchdog-skip-coverage.spec.js` | E2E filename chosen at apply time differed from spec prediction | Implementation correct (playwright.config.js registers correct name); delta spec is stale |

### Warnings (2) — spec-to-implementation discrepancies where implementation is correct

| ID | Finding | Root Cause | Disposition |
|----|---------|------------|-------------|
| W-01 | admin-audit-trail delta spec references RBAC `auditoria.read` but implementation uses `reportes.read` per AD-1 | Spec written before AD-1 decision; `auditoria.read` does not exist in `rbac.js` | Implementation correct; delta spec is stale |
| W-02 | scraper-health-panel delta spec references `scraper.read` permission which does not exist in `rbac.js` | Spec written before AD-1 decision | Implementation correct (`admin.system.config` only); delta spec is stale |

---

## 5. Commit Summary

| Commit | Message | Slice |
|--------|---------|-------|
| 2da5601 | `feat(admin): add sidebar entries for backup, audit, and scraper panels` | F01 |
| 6ff567a | `docs(workflow): document CRM_WATCHDOG_CALLBACKS skip behavior verification` | F02 |
| e7c85ac | `test(e2e): add f02-watchdog-callbacks-skip coverage` | F02 |
| e5c6232 | `refactor(dashboard): extract useKpiStripLogic hook from MisKpiStrip` | F03 |
| c55e5ad | `refactor(dashboard): extract reputacionHelpers and ReviewCard from ReputacionTab` | F03 |
| 4003e5f | `refactor(dashboard): extract useCallbacksLogic and helpers from MisCallbacksPanel` | F03 |
| 64871e0 | `refactor(admin): extract useBackupOps and backupHelpers from BackupPanel` | F03 |
| a96e9d0 | `refactor(admin): extract useScraperConfig and helpers from ScraperConfigPanel` | F03 |

---

## 6. Known Follow-Ups for Future Changes

1. **Update stale delta spec references** — The delta specs for F01 (admin-audit-trail, scraper-health-panel) and F02 (lead-callbacks) contain stale RBAC/E2E filename references. These should be corrected in a future doc-cleanup change (implementation is already correct).
2. **E2E filename convention** — Consider naming E2E specs with `-coverage` suffix to avoid ambiguity between skip-logic and skip-coverage intent.

---

## 7. Archive Contents

```
openspec/changes/archive/2026-08-03-crm-critical-followups/
├── archive-report.md              ← this file
├── proposal/proposal.md
├── design/design.md
├── specs/                        ← 7 delta specs
│   ├── admin-audit-trail/spec.md
│   ├── backup-operations/spec.md
│   ├── lead-callbacks/spec.md
│   ├── operator-live-kpis/spec.md
│   ├── reputation-feed/spec.md
│   ├── scraper-config-panel/spec.md
│   └── scraper-health-panel/spec.md
├── tasks/                        ← 4 task files
│   ├── forecast.md
│   ├── sidebar-routing/tasks.md
│   ├── watchdog-verify/tasks.md
│   └── component-splits/tasks.md
└── verify-report.md

openspec/specs/                   ← source of truth updated (7 specs amended)
```

---

## 8. Memory References

This archive closes CR-01, CR-02, CR-03 from `crm-3-areas-improvements` (archived 2026-08-02).

---

*Archived by sdd-archive on 2026-08-03. This archive is an immutable audit trail.*
