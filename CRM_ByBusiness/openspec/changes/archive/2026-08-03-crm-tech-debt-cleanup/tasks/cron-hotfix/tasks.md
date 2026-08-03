# Tasks: T03 — Cron NameError Hotfix

**Slice:** T03
**Title:** Fix NameError in alimentador_reputacion.py line 347
**Capability:** n/a (hotfix)
**Depends on:** none
**Delivery order:** 1 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~5 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Fix NameError in alimentador_reputacion.py

- [x] 1.1 In `scripts/alimentador_reputacion.py:347`, replace bare references `host, user, psql_cmd` with `args.ssh, args.ssh_user, args.psql_cmd` inside the REPAIR_GBP block (`if not dry_run:`). File: `scripts/alimentador_reputacion.py` (modify). Kind: bugfix. Est: ~5 lines. Acceptance: `ssh_psql` call at line 347 uses `args.ssh`, `args.ssh_user`, `args.psql_cmd`. Depends on: none.

---

## Critical Risks

- ⚠️ **Live production cron**: This script runs on VPS via cron. Smoke test is mandatory before merge.

---

## Commit Plan

```
fix(cron): fix NameError in alimentador_reputacion.py line 347
```

**Commit 1** — `scripts/alimentador_reputacion.py`

---

## Verification Plan

- `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1; echo $?` exits 0.
- No `NameError` in traceback.
- Confirm REPAIR_GBP event can be registered (dry-run sufficient for smoke).

---

## Rollback Plan

`git revert <commit>` restores the bare `host, user, psql_cmd` references. No regression since cron was already broken.
