# Archive Report: crm-3-areas-improvements

**Change:** `crm-3-areas-improvements`
**Archived:** 2026-08-02
**Phase:** sdd-archive
**Mode:** openspec
**Status:** ARCHIVED — pass-with-warnings

---

## 1. Executive Summary

All 14 slices (S01–S14) were committed to `main`. Delta specs synced as full new specs into `openspec/specs/`. The change is archived at `openspec/changes/archive/2026-08-02-crm-3-areas-improvements/`. Three CRITICAL findings remain open for follow-up changes.

---

## 2. Slice Delivery Table

| Slice | Capability | Commits | E2E | Workflow Created | Verdict |
|-------|-----------|---------|-----|------------------|---------|
| S01 | stale-phase-label-cleanup | a13f3cf | ✅ | N/A | PASS |
| S02 | admin-error-boundaries | 131f4c3, 7e7761c | ✅ | Extended | PASS |
| S03 | dev-eventos-shim | 5f97e1d, c9c865b | ✅ | N/A | PASS |
| S04 | operator-live-kpis | 098027f | ✅ | ⚠️ unconfirmed | WARNING |
| S05 | lead-callbacks | 8acf56e | ✅ | ✅ | WARNING |
| S06 | react-query-operator-data | 34c7894 | ✅ | N/A | PASS |
| S07 | lead-freeze-list | 998ac81, fad634e | ✅ | Extended | PASS |
| S08 | admin-audit-trail | 1ff0a9f | ✅ | ⚠️ not activated | WARNING |
| S09 | backup-operations | 3594943, 5f14389, b2c8a08 | ✅ | ✅ | WARNING (routing) |
| S10 | rbac-coverage-first-slice | b0a1b41, 3390d3e, c38dae0, a4b6739 | ✅ | N/A | WARNING (perms) |
| S11 | scraper-health-panel | 3c7ec75, 829eca3 | ✅ | ⚠️ degraded | WARNING |
| S12 | reputation-feed | 14939bf | ✅ | ⚠️ not activated | WARNING |
| S13 | lead-freshness-config | 5bf7477, 8f15933, 14c9496 | ✅ | ✅ | WARNING |
| S14 | scraper-config-panel | 123c902, 9ab6807 | ✅ | ⚠️ degraded | WARNING |

**Total: 28 commits across 14 slices.**

---

## 3. Spec Sync

All 14 capabilities were new (no existing spec in `openspec/specs/`). Each delta spec was copied as a full spec to `openspec/specs/{capability}/spec.md`:

| Domain | Spec File |
|--------|-----------|
| admin-audit-trail | openspec/specs/admin-audit-trail/spec.md |
| admin-error-boundaries | openspec/specs/admin-error-boundaries/spec.md |
| backup-operations | openspec/specs/backup-operations/spec.md |
| dev-eventos-shim | openspec/specs/dev-eventos-shim/spec.md |
| lead-callbacks | openspec/specs/lead-callbacks/spec.md |
| lead-freeze-list | openspec/specs/lead-freeze-list/spec.md |
| lead-freshness-config | openspec/specs/lead-freshness-config/spec.md |
| operator-live-kpis | openspec/specs/operator-live-kpis/spec.md |
| rbac-coverage-first-slice | openspec/specs/rbac-coverage-first-slice/spec.md |
| react-query-operator-data | openspec/specs/react-query-operator-data/spec.md |
| reputation-feed | openspec/specs/reputation-feed/spec.md |
| scraper-config-panel | openspec/specs/scraper-config-panel/spec.md |
| scraper-health-panel | openspec/specs/scraper-health-panel/spec.md |
| stale-phase-label-cleanup | openspec/specs/stale-phase-label-cleanup/spec.md |

---

## 4. Verify Findings Summary

### Critical (3) — require follow-up changes

| ID | Finding | Slice(s) | Recommendation |
|----|---------|----------|---------------|
| CR-01 | 5 components exceed 150 LOC ceiling (BackupPanel 354, ScraperConfigPanel 335, MisCallbacksPanel 311, ReputacionTab 170, MisKpiStrip 158) | S05, S09, S12, S14, S04 | Refactor into sub-components in follow-up |
| CR-02 | BackupPanel (S09) not reachable via sidebar navigation. Same gap for AdminAuditPanel (S08), ScraperStatusPanel (S11), ScraperConfigPanel (S14) | S08, S09, S11, S14 | Add sidebar navigation entries |
| CR-03 | S05 R4 watchdog verification never completed — potential double-processing of cancelled callbacks | S05 | Infra team sign-off and verification |

### Warning (7)

| ID | Finding | Slice(s) |
|----|---------|----------|
| W-01 | S04 tasks.md all unchecked despite delivery + CRM_OPERADOR_KPI_LIVE workflow unconfirmed | S04 |
| W-02 | RBAC permission deviations in S10 — actual permissions diverge from spec promises | S10 |
| W-03 | S08 CRM_ADMIN_AUDIT_GET workflow not activated (n8n validator false positive) | S08 |
| W-04 | VPS n8n cannot reach local Docker scrapers — graceful degradation in place | S11, S12, S14 |
| W-05 | CRM_OPERADOR_KPI_LIVE workflow existence/activation unconfirmed | S04 |
| W-06 | S12 CRM_REPUTACION_LEAD workflow not activated (JS Task Runner bug) | S12 |
| W-07 | localhost fallbacks in 3 infrastructure files (useN8n.js, api.js, reputationService.js) | S04, S06, S12 |

### Suggestion (5)

| ID | Finding |
|----|---------|
| S-01 | S04 tasks.md never updated — documentation lag |
| S-02 | S13 E2E spec exists but task 4.1 unchecked |
| S-03 | MisFreezeList (209 LOC) and AdminAuditPanel (160 LOC) near 150 LOC ceiling |
| S-04 | S10 spec promises `auditoria.read` and `backup.admin` permissions — neither exists in rbac.js |
| S-05 | AgendaGlobalPanel RBAC guard mismatch (actual: `admin.system.config`, spec: `agenda.snapshots`) |

---

## 5. Known Follow-Ups for Future Changes

1. **Sidebar routing fix** — Add navigation entries for BackupPanel, AdminAuditPanel, ScraperStatusPanel, ScraperConfigPanel (CR-02)
2. **Component size refactor** — Split BackupPanel, ScraperConfigPanel, MisCallbacksPanel, ReputacionTab, MisKpiStrip to meet 150 LOC ceiling (CR-01)
3. **S05 R4 watchdog verification** — Confirm CRM_WATCHDOG_CALLBACKS doesn't double-process cancelled callbacks (CR-03)
4. **RBAC follow-up** — Add `auditoria.read` and `backup.admin` permissions to rbac.js, or formally deprecate spec names (S-04)
5. **Workflow activations** — Manually activate CRM_ADMIN_AUDIT_GET (S08) and CRM_REPUTACION_LEAD (S12) in n8n UI (W-03, W-06)
6. **localhost fallback cleanup** — Remove `http://localhost:5678` and `http://localhost:8092` fallbacks from shared infrastructure (W-07)
7. **S04/S13 task docs** — Update tasks.md checkboxes for S04 and S13 (S-01, S-02)

---

## 6. Archive Contents

```
openspec/changes/archive/2026-08-02-crm-3-areas-improvements/
├── archive-report.md          ← this file
├── specs/                    ← 14 delta specs (source of truth for archive)
│   ├── admin-audit-trail/spec.md
│   ├── admin-error-boundaries/spec.md
│   ├── backup-operations/spec.md
│   ├── dev-eventos-shim/spec.md
│   ├── lead-callbacks/spec.md
│   ├── lead-freeze-list/spec.md
│   ├── lead-freshness-config/spec.md
│   ├── operator-live-kpis/spec.md
│   ├── rbac-coverage-first-slice/spec.md
│   ├── react-query-operator-data/spec.md
│   ├── reputation-feed/spec.md
│   ├── scraper-config-panel/spec.md
│   ├── scraper-health-panel/spec.md
│   └── stale-phase-label-cleanup/spec.md
├── design/design.md
├── tasks.md                  ← updated by sdd-apply
└── verify-report.md

openspec/specs/               ← source of truth updated (14 new specs)
```

---

## 7. Memory References

- `#1405` — S08 workflow activation blocker (n8n validator false positive)
- `#1406` — VPS-to-local Docker network unreachable (affects S11/S12/S14)

---

*Archived by sdd-archive on 2026-08-02. This archive is an immutable audit trail.*
