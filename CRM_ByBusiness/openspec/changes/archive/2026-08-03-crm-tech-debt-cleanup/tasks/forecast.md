# Review Workload Forecast: crm-tech-debt-cleanup

## Review Workload Forecast
slice_count: 3
total_changed_lines_estimate: 175
per_slice_lines: [
  { slice: "T03", lines: 5 },
  { slice: "T01", lines: 50 },
  { slice: "T02", lines: 120 }
]
max_slice_lines: 120
review_budget_lines: 800
budget_exceeded_slices: []
chained_PRs_recommended: yes
decision_needed_before_apply: no
decision_reasons: []

---

## Summary

- **3 slices**, all within 800-line budget (max: 120, T02).
- **Force-chained delivery**: orchestrator proceeds without asking.
- Chain strategy: **stacked-to-main** (each PR merges to main in order T03→T01→T02).
- Order: T03 (hotfix) → T01 (env var enforcement) → T02 (RBAC additions).

---

## Critical Risks

| Risk | Slice | Mitigation |
|------|-------|------------|
| T01: `.env.local`/`.env.production` missing → app crashes at boot | T01 | Verify both files exist before applying; orchestrator checks |
| T01: CI fails without env vars → desired fail-fast | T01 | Document vars in `.env.example`; CI must provide vars |
| T03: live production cron — smoke test mandatory | T03 | `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1; echo $?` → 0 |
| T02: LeadsPanel uses `leads.assign` per design, not `leads.read.all` | T02 | Gate updates per design decisions AD-3/AD-4 |

---

## Implementation Order

**T03 → T01 → T02**

- **T03** (hotfix, ~5 LOC, Low risk): Fixes live cron NameError. Smallest and most urgent — cron is currently broken on VPS.
- **T01** (~50 LOC, Medium risk): Removes localhost fallbacks from 4 files. Risk: boot crash if env vars missing. Mitigation: verify `.env.local` and `.env.production` exist first.
- **T02** (~120 LOC, Low risk): Adds 6 RBAC permissions and updates 7 component gates. Additive only; admin auto-includes all perms (rbac.js:80).

---

## Quality Gates

- **T03**: `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1; echo $?` exits 0.
- **T01**: `npm run build` fails fast if `VITE_N8N_URL`/`VITE_REPUTATION_API_URL` missing; `npm run dev` boots with correct env.
- **T02**: 14 existing E2E specs pass unmodified; new 6 permissions visible in `ALL_PERMISSIONS`.

---

## Rollback

All slices revertible via `git revert <commit>`. Reverse order T02→T01→T03.

- **T03**: restores NameError — cron was already broken, so no regression risk.
- **T01**: restores `??`/`||` fallbacks — app boots again with localhost defaults.
- **T02**: removes 6 new permissions — S10 components fall back to closest available permission.

---

## File Inventory

| Slice | File | Kind |
|-------|------|------|
| T03 | `scripts/alimentador_reputacion.py` | fix |
| T01 | `src/shared/utils/envValidation.js` | new |
| T01 | `src/shared/hooks/useN8n.js` | refactor |
| T01 | `src/services/reputationService.js` | refactor |
| T01 | `src/shared/errors/reportError.js` | refactor |
| T01 | `src/shared/query/api.js` | docs |
| T01 | `.env.example` | new |
| T02 | `src/shared/auth/rbac.js` | feat |
| T02 | `src/modules/admin/usuarios/UsuariosList.jsx` | refactor |
| T02 | `src/modules/admin/leads/LeadsPanel.jsx` | refactor |
| T02 | `src/modules/admin/cartera/ClienteDrawer.jsx` | refactor |
| T02 | `src/modules/admin/gbp/GbpPanel.jsx` | refactor |
| T02 | `src/modules/admin/gbp/GbpDashboardPanel.jsx` | refactor |
| T02 | `src/modules/admin/gbp/GbpFichasPanel.jsx` | refactor |
| T02 | `src/modules/admin/agenda/AgendaGlobalPanel.jsx` | refactor |
| T02 | `src/modules/admin/auditoria/AdminAuditPanel.jsx` | refactor |
| T02 | `src/modules/admin/backup/BackupPanel.jsx` | refactor |

---

## Commit Summary

| Slice | # | Message | Files |
|-------|---|---------|-------|
| T03 | C1 | `fix(cron): fix NameError in alimentador_reputacion.py line 347` | 1 |
| T01 | C1 | `refactor(env): remove localhost fallbacks from useN8n, reputationService, reportError` | 4 |
| T01 | C2 | `docs(env): update api.js docstring and create .env.example` | 2 |
| T02 | C1 | `feat(rbac): add 6 new permissions to ALL_PERMISSIONS` | 1 |
| T02 | C2 | `refactor(admin): migrate S10 components to use new granular permissions` | 7 |

**Total commits**: 5 across 3 slices.
