# Proposal: crm-tech-debt-cleanup

## Intent

Resolve 3 user-prioritized tech debt items from `crm-3-areas-improvements` (W-07, S-04, S-05, W-02) plus a live cron NameError. Each item is small, surgical, and independent.

## Scope

**In**: T01 drop localhost fallbacks (AD-12) in `useN8n.js:13`, `reputationService.js:7`, `api.js:11` docstring. T02 add 6 RBAC permissions (`auditoria.read`, `backup.admin`, `usuarios.write`, `leads.write`, `gbp.write`, `agenda.snapshots`) and update S10 components. T03 hotfix NameError at `alimentador_reputacion.py:347` (undefined `host, user, psql_cmd` → `args.ssh, args.ssh_user, args.psql_cmd`).

**Out**: W-01/W-03/W-04/W-05/W-06/S-01/S-02/S-03 (not user-prioritized); stale delta-spec docs (F01/F03 drift); CR-01/02/03 (already in `crm-critical-followups`); multi-tenant, TypeScript.

## Capabilities

> Research: 14 capabilities in `openspec/specs/`.

- **New**: None (T01/T03 config/bugfix; T02 extends existing).
- **Modified**: `rbac-coverage-first-slice` — add 6 perms to `ALL_PERMISSIONS`.

## Approach

3 slices ordered by urgency:

| Slice | Files | LOC | Commits | Order |
|-------|-------|-----|---------|-------|
| T01 localhost removal | 3 src + env-doc | ~50 | 1 | 2 |
| T02 RBAC additions | 1 rbac.js + 3-5 components | ~100 | 2 | 3 |
| T03 NameError hotfix | 1 script | ~5 | 1 | 1 |

**T01**: Drop `??`/`||` fallbacks; throw `Error` at module load if `VITE_N8N_URL`/`VITE_REPUTATION_API_URL` undefined. Update `api.js` docstring. Document required vars in `.env.example`.

**T02**: Extend `ALL_PERMISSIONS`. `admin` auto-includes all (line 80) — no role changes. Update `UsuariosList.jsx`, `LeadsPanel.jsx`, `GbpPanel.jsx`, `AgendaGlobalPanel.jsx` to use new perms.

**T03**: Extract `host, user, psql_cmd = args.ssh, args.ssh_user, args.psql_cmd` near top of `main()`; replace bare refs at line 347. Smoke-test `--batch 1 --vps`.

## Affected Areas

`src/shared/hooks/useN8n.js:13` (drop `??` fallback); `src/shared/query/api.js:11` (docstring); `src/services/reputationService.js:7` (drop `||` fallback); `src/shared/auth/rbac.js` (add 6 perms); `src/modules/admin/usuarios/UsuariosList.jsx`, `…/leads/LeadsPanel.jsx`, `…/gbp/GbpPanel.jsx`, `…/agenda/AgendaGlobalPanel.jsx` (use new perms); `scripts/alimentador_reputacion.py:347` (undefined `host` fix).

## Risks

- T01 misconfigured env crashes boot → document vars in `.env.example`; `.env.local`+`.env.production` already set (Medium)
- T01 CI fails without env → fail-fast is desired (Low)
- T02 admin loses panel access → `admin` auto-includes ALL_PERMISSIONS line 80 (Low)
- T02 non-admin misses new perm → assign to same role that had closest substitute (Low)
- T03 wrong var name → smoke-test `--batch 1 --vps` before merge (Low)

## Rollback Plan

All 3 slices revertible via `git revert <commit>`: T01 restores fallback; T02 removes new perms (S10 falls back to closest-available); T03 restores NameError (cron was already broken — no regression).

## Dependencies

None. T03 backend-only; T01/T02 frontend-only.

## Success Criteria

- [ ] `grep -rn "localhost" src/` → zero code matches
- [ ] `VITE_N8N_URL`/`VITE_REPUTATION_API_URL` throw `Error` if undefined
- [ ] `rbac.js ALL_PERMISSIONS` contains 6 new permissions
- [ ] S10 components use new permission names
- [ ] `alimentador_reputacion.py --vps --batch 1` exits 0
- [ ] Next `0 */6 * * *` cron run exits 0 (Hostinger CPU alert cleared)
- [ ] Commits ≤3 files, Spanish conventional messages