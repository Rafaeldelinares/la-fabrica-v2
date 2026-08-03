# Tasks: T01 — Localhost Fallbacks Removal

**Slice:** T01
**Title:** Remove localhost fallbacks from env-var consumers (AD-12)
**Capability:** n/a (env var enforcement)
**Depends on:** none
**Delivery order:** 2 of 3

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~50 |
| 400-line budget risk | Medium |
| Chained PRs recommended | Yes |
| Suggested split | Two commits |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Medium

---

## Phase 1: Create envValidation helper

 - [x] 1.1 Create `src/shared/utils/envValidation.js` with `requireEnvVar(name)` that reads `import.meta.env[name]`, throws `Error` if missing/empty, and returns the value. File: `src/shared/utils/envValidation.js` (new). Kind: new-file. Est: ~15 lines. Acceptance: helper throws at module load with descriptive message; works in both dev and production builds. Depends on: none.

---

## Phase 2: Remove localhost fallbacks from useN8n.js

 - [x] 2.1 In `src/shared/hooks/useN8n.js:13`, replace `import.meta.env.VITE_N8N_URL ?? 'http://localhost:5678/webhook'` with `requireEnvVar('VITE_N8N_URL')`. Add import for `requireEnvVar` from `envValidation.js`. File: `src/shared/hooks/useN8n.js` (modify). Kind: refactor. Est: ~3 lines. Acceptance: app throws at boot if `VITE_N8N_URL` is missing; no `localhost` fallback in code. Depends on: 1.1.

---

## Phase 3: Remove localhost fallbacks from reputationService.js

 - [x] 3.1 In `src/services/reputationService.js:7`, replace `import.meta.env.VITE_REPUTATION_API_URL || 'http://localhost:8092'` with `requireEnvVar('VITE_REPUTATION_API_URL')`. Add import for `requireEnvVar`. File: `src/services/reputationService.js` (modify). Kind: refactor. Est: ~3 lines. Acceptance: throws at module load if var missing; no localhost fallback. Depends on: 1.1.

---

## Phase 4: Remove localhost fallback from reportError.js

 - [x] 4.1 In `src/shared/errors/reportError.js:21`, replace the `|| 'https://n8n.ia-bybusiness.online/webhook'` fallback with `requireEnvVar('VITE_N8N_URL')`. File: `src/shared/errors/reportError.js` (modify). Kind: refactor. Est: ~2 lines. Acceptance: throws at first error report if var missing; consistent with useN8n.js. Depends on: 1.1.

---

## Phase 5: Update api.js docstring and create .env.example

 - [x] 5.1 Update the docstring in `src/shared/query/api.js` to remove any mention of localhost fallback and document that `VITE_N8N_URL` is required. File: `src/shared/query/api.js` (modify). Kind: docs. Est: ~3 lines. Acceptance: docstring reflects required env vars; no mention of localhost. Depends on: none.

 - [x] 5.2 Create `.env.example` in the project root documenting the 4 required VITE_ vars: `VITE_N8N_URL`, `VITE_REPUTATION_API_URL`, and any others found in `.env.production`. Mirror the structure of `.env.production`. File: `.env.example` (new). Kind: docs. Est: ~10 lines. Acceptance: developer reading `.env.example` knows exactly which vars to set. Depends on: none.

 - [x] 5.3 Verify `.env.local` and `.env.production` exist in the project root (not just in the worktree). These must be present or the app will throw at boot. File: project root (check). Kind: verification. Est: ~2 lines. Acceptance: both files exist with non-empty values for `VITE_N8N_URL` and `VITE_REPUTATION_API_URL`. Depends on: none.

---

## Critical Risks

- ⚠️ **Missing env vars crash boot**: if `.env.local` or `.env.production` is missing or incomplete, the app throws at module load. Verify files exist before applying this slice.
- ⚠️ **CI may fail**: CI environments without these vars will fail fast. This is the desired behavior per AD-12.

---

## Commit Plan

```
refactor(env): remove localhost fallbacks from useN8n, reputationService, reportError
docs(env): update api.js docstring and create .env.example for AD-12 compliance
```

**Commit 1** — `src/shared/utils/envValidation.js` (new), `src/shared/hooks/useN8n.js`, `src/services/reputationService.js`, `src/shared/errors/reportError.js`.

**Commit 2** — `src/shared/query/api.js` (docstring only), `.env.example` (new).

---

## Verification Plan

- `npm run build` fails with `Error: [envValidation] Missing required env var: VITE_N8N_URL` when vars are absent.
- `npm run dev` boots without errors when `VITE_N8N_URL` and `VITE_REPUTATION_API_URL` are set in `.env.local`.
- `grep -rn "localhost" src/` returns zero code matches after both commits.

---

## Rollback Plan

`git revert <commit>` restores `??`/`||` localhost fallbacks in all three consumer files. App boots with localhost defaults again.
