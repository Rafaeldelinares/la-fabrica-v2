# Design: crm-tech-debt-cleanup

**Phase:** sdd-design · **Date:** 2026-08-03 · **Delivery:** `force-chained`, stacked-to-main, ≤800 LOC/slice, ≤3 files/commit (GGA)

Three slices closing W-07 (localhost fallbacks), S-04 + S-05 + W-02 (RBAC gaps), and one live cron NameError. No DB schema changes, no new n8n workflows, no public API changes.

| Slice | Resolves | Files | LOC | Commits |
|-------|----------|-------|-----|---------|
| T01 | W-07 (AD-12) | 3 src + 1 new helper + `.env.example` | ~60 | 1 |
| T02 | S-04, S-05, W-02 | 1 rbac.js + 7 components | ~120 | 2 |
| T03 | cron NameError | 1 script | ~5 | 1 |

## 2. Architecture Decisions

| # | Decision | Choice | Rationale |
|---|---------|--------|-----------|
| AD-1 | Env validation | New `src/shared/utils/envValidation.js` with `requireEnvVar(name)` that throws at module load | DRY across 3+ files; fail-fast beats silent fallbacks |
| AD-2 | `reportError.js:21` | Drop `\|\|` fallback in T01 commit | `\|\|` hides misconfig — same risk class |
| AD-3 | `LeadsPanel` gate | `leads.assign` → `leads.write`; keep `leads.update.status` for row-edit | Spec mandates `leads.write`; `update.status` is a valid fine-grained perm |
| AD-4 | `ClienteDrawer` | `leads.read.all` → `leads.read`; `clientes.update` → `leads.write` | Spec unifies drawer under `leads.*` |
| AD-5 | `AgendaGlobalPanel` split-gate | Outer panel keeps `admin.system.config`; `gbp_snapshot` toggle wraps in `can('agenda.snapshots')` | Spec is toggle-specific; other toggles stay admin-only |
| AD-6 | `AdminAuditPanel`/`BackupPanel` | `reportes.read` → `auditoria.read`; `admin.system.config` → `backup.admin` | Spec mandates. Admin auto-includes all 6 (rbac.js:80) |
| AD-7 | T03 fix shape | Inline `args.ssh, args.ssh_user, args.psql_cmd` at line 347 | 5 LOC vs 7; matches line 309 pattern |
| AD-8 | Commit order | T03 → T01 → T02 | T03 unblocks cron first; T01+T02 independent stacked PRs |
| AD-9 | `.env.example` | Create new file mirroring `.env.production` | Document required vars; not in `.gitignore` |

## 3. T01 — Localhost Fallbacks Removal (W-07)

```js
// src/shared/utils/envValidation.js (NEW)
export function requireEnvVar(name) {
  const value = import.meta.env?.[name];
  if (!value || typeof value !== 'string') {
    throw new Error(
      `[envValidation] Missing required env var: ${name}. ` +
      `Set it in .env.local (dev) or .env.production (build).`
    );
  }
  return value;
}
```

| File | Change |
|------|--------|
| `src/shared/utils/envValidation.js` | **Create** — `requireEnvVar` helper |
| `src/shared/hooks/useN8n.js:13` | Drop `?? 'http://localhost:5678/webhook'` |
| `src/services/reputationService.js:7` | Drop `\|\| 'http://localhost:8092'` |
| `src/shared/query/api.js:11` | Update docstring |
| `src/shared/errors/reportError.js:21` | Drop `\|\| 'https://n8n...'` fallback |
| `.env.example` | **Create** — document 4 required VITE_ vars |

**Migration**: 1 commit. `.env.local` (LAN) and `.env.production` already configured. `vite build` fails fast on missing vars.

## 4. T02 — RBAC Additions (S-04, S-05, W-02)

Add 6 missing perms to `ALL_PERMISSIONS` (admin auto-includes, line 80):

```js
// src/shared/auth/rbac.js  (appended to ALL_PERMISSIONS)
'auditoria.read', 'backup.admin', 'usuarios.write',
'leads.write',   'gbp.write',    'agenda.snapshots',
```

| File | BEFORE | AFTER |
|------|--------|-------|
| `usuarios/UsuariosList.jsx:313,316` | `admin.users.manage` | `usuarios.write` |
| `leads/LeadsPanel.jsx:25,140,222` | `leads.assign` (gate), `leads.update.status` (canEdit) | `leads.write`, `leads.read` |
| `cartera/ClienteDrawer.jsx:45,48` | `leads.read.all` (gate), `clientes.update` | `leads.read`, `leads.write` |
| `gbp/{GbpPanel,GbpDashboardPanel,GbpFichasPanel}.jsx` | `admin.system.config` | `gbp.write` |
| `auditoria/AdminAuditPanel.jsx:39` | `reportes.read` | `auditoria.read` |
| `backup/BackupPanel.jsx:33` | `admin.system.config` | `backup.admin` |
| `agenda/AgendaGlobalPanel.jsx:450,611` | `admin.system.config` (outer) | Keep + wrap `gbp_snapshot` row with `can('agenda.snapshots')` |

**Migration**: 2 commits — (a) `rbac.js` adds 6 perms; (b) component gates updated. Admin includes all 6 (line 80); 14 E2E specs pass unmodified.

## 5. T03 — Cron NameError Hotfix

**Bug**: `alimentador_reputacion.py:347` calls `ssh_psql(sql, host, user, psql_cmd)` with bare-name args that exist only as params of `log_evento_cron` (line 169-170), not as locals in `main()`. `args.ssh/ssh_user/psql_cmd` exist (line 209-211).

```python
# Line 347 (BEFORE)
r = ssh_psql(sql, host, user, psql_cmd)
# AFTER
r = ssh_psql(sql, args.ssh, args.ssh_user, args.psql_cmd)
```

**Migration**: 1 commit. Smoke: `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1; echo $?` → 0. Clears Hostinger CPU alert.

## 6. Testing

| Layer | What | How |
|-------|------|-----|
| T01 build | build fails without vars | `unset VITE_N8N_URL && npm run build` |
| T01 runtime | `.env.local` works | `npm run dev` → `n8nHealthCheck()` true |
| T02 E2E | 14 specs pass unmodified | `npm run test:e2e` |
| T02 manual | 6 new perms visible | log `ALL_PERMISSIONS` at /admin |
| T03 smoke | `--vps --batch 1` exits 0 | `python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 1` |

## 7. Open Questions

- T01: `reportError.js` same commit or split? (default: same)
- T02: `LeadsPanel` `canEdit` → `leads.read` or keep `leads.update.status`? (default: `leads.read`)
- T02: `AgendaGlobalPanel` outer gate keeps `admin.system.config`; wrap `gbp_snapshot` row with `agenda.snapshots`

No public API changes · No new RBAC roles · No DB schema changes · Frontend never hits PostgreSQL · ≤800 LOC/slice · ≤3 files/commit (GGA) · 14 E2E specs unchanged · No localhost fallback
