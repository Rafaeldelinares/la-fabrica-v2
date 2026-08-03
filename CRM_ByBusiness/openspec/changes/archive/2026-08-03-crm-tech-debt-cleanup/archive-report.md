# Archive Report: crm-tech-debt-cleanup

**Change:** `crm-tech-debt-cleanup`
**Archived:** 2026-08-03
**Phase:** sdd-archive
**Mode:** openspec
**Status:** ARCHIVED — passed

---

## 1. Executive Summary

All 3 slices (T03 cron hotfix, T01 localhost cleanup, T02 RBAC additions) were committed to `main`. T03 was a live production hotfix outside the CRM_ByBusiness git repo (in `/opt/fabrica/scripts/`). T01 and T02 are committed to `main`. Delta spec for T02 synced to `openspec/specs/rbac-coverage-first-slice/spec.md` (6 new permissions now documented as implemented). The change is archived at `openspec/changes/archive/2026-08-03-crm-tech-debt-cleanup/`.

---

## 2. Slice Delivery Table

| Slice | Capability | Files | LOC | Commit | E2E | Verdict |
|-------|-----------|-------|-----|--------|-----|---------|
| T03 | Cron NameError hotfix | `scripts/alimentador_reputacion.py` | ~5 | N/A (live hotfix, not in CRM git) | N/A | PASS |
| T01 | Localhost fallbacks removal | 4 src files + `.env.example` | ~50 | `main` | ✅ build | PASS |
| T02 | RBAC additions (6 perms) | `rbac.js` + 8 components | ~120 | `main` (2 commits) | ✅ E2E | PASS |

**Total: 5 commits (T03 was live hotfix outside CRM git)**.

---

## 3. Commit Details

| Slice | Commit | Message | Files |
|-------|--------|---------|-------|
| T03 | N/A | Live hotfix applied directly to `/opt/fabrica/scripts/alimentador_reputacion.py` — NOT in CRM_ByBusiness git | 1 |
| T01 | C1 | `refactor(env): remove localhost fallbacks from useN8n, reputationService, reportError` | 4 |
| T01 | C2 | `docs(env): update api.js docstring and create .env.example` | 2 |
| T02 | C1 | `feat(rbac): add 6 new permissions to ALL_PERMISSIONS` | 1 |
| T02 | C2 | `refactor(admin): migrate S10 components to use new granular permissions` | 7 |

---

## 4. Spec Sync

**T02 delta spec** (`openspec/changes/archive/2026-08-03-crm-tech-debt-cleanup/specs/rbac-coverage-first-slice/spec.md`) was merged into the live spec at `openspec/specs/rbac-coverage-first-slice/spec.md`.

An "Implemented Requirements" section was appended to the live spec documenting that all 6 permissions (`auditoria.read`, `backup.admin`, `usuarios.write`, `leads.write`, `gbp.write`, `agenda.snapshots`) are now present in `ALL_PERMISSIONS` in `src/shared/auth/rbac.js`.

| Domain | Spec File | Action |
|--------|-----------|--------|
| rbac-coverage-first-slice | `openspec/specs/rbac-coverage-first-slice/spec.md` | Updated — appended Implemented Requirements (T02) |

---

## 5. Verify Findings Summary

| Severity | Count | Detail |
|----------|-------|--------|
| CRITICAL | 0 | — |
| WARNING | 0 | — |
| SUGGESTION | 1 | `leads.read` was pre-existing in `ALL_PERMISSIONS` before T02. Components migrated to `leads.write` reuse an existing perm — spec is accurate. Not an issue. |

---

## 6. Special Notes

### T03 — File Outside CRM Git

The `alimentador_reputacion.py` hotfix was applied directly to `/opt/fabrica/scripts/`, which is the parent repo of CRM_ByBusiness. The fix is NOT tracked in CRM_ByBusiness git history. This is expected and correct — the script is a sibling repository, not part of the CRM frontend.

- **File location**: `/opt/fabrica/scripts/alimentador_reputacion.py`
- **Fix**: Line 347 changed from `ssh_psql(sql, host, user, psql_cmd)` to `ssh_psql(sql, args.ssh, args.ssh_user, args.psql_cmd)`
- **Verification**: `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1` exits 0; INSERT events registered (id 70, 71)

### T02 — RBAC Permissions

The 6 new permissions added to `ALL_PERMISSIONS` resolve findings S-04 and W-02 from the `crm-3-areas-improvements` archive (2026-08-02), which noted that `auditoria.read` and `backup.admin` were referenced in scenarios but not defined in rbac.js.

---

## 7. Known Follow-Ups

None blocking. All acceptance criteria from the proposal were met.

---

## 8. Archive Contents

```
openspec/changes/archive/2026-08-03-crm-tech-debt-cleanup/
├── archive-report.md              ← this file
├── design/design.md
├── proposal/proposal.md
├── specs/
│   └── rbac-coverage-first-slice/spec.md   ← T02 delta spec (archived)
├── tasks/
│   ├── forecast.md               ← review workload forecast
│   ├── cron-hotfix/tasks.md
│   ├── localhost-cleanup/tasks.md
│   └── rbac-additions/tasks.md
└── verify-report.md

openspec/specs/                   ← source of truth updated
└── rbac-coverage-first-slice/spec.md  ← T02 merge applied here
```

---

## 9. Memory References

- Finding S-04 (crm-3-areas-improvements archive): `auditoria.read` and `backup.admin` not in rbac.js → **resolved by T02**
- Finding W-02 (crm-3-areas-improvements archive): RBAC permission deviations → **resolved by T02**
- Finding W-07 (crm-3-areas-improvements archive): localhost fallbacks → **resolved by T01**

---

*Archived by sdd-archive on 2026-08-03. This archive is an immutable audit trail.*
