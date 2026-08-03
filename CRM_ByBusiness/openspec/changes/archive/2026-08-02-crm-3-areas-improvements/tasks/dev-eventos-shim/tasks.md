# Tasks: S03 — dev-eventos-shim

**Slice:** S03
**Area:** Cross
**Title:** R6 dev-DB gap: eventos_sistema local fallback + CONTRIBUTING note
**Capability:** `dev-eventos-shim`
**Depends on:** S02 (extends reportError)
**Delivery order:** 3 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~250 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Dev Shim

- [x] 1.1 Add `import.meta.env.DEV` branch to `src/shared/errors/reportError.js`: in dev mode, also call `console.error` with structured metadata before POST. In production, skip console entirely. Files: `src/shared/errors/reportError.js` (modify). Kind: frontend. Est: ~20 lines. Acceptance: dev mode logs; prod mode does not. Depends on: S02.

---

## Phase 2: Documentation

- [x] 2.1 Add dev DB gap note to `CONTRIBUTING.md`: explain that `sistema.eventos_sistema` lives on VPS, requires active tunnel (`tunnel-postgres-vps.service`), and FRONTEND_ERROR events only appear in VPS DB during local dev. Files: `CONTRIBUTING.md` (modify). Kind: docs. Est: ~30 lines. Acceptance: new developer can understand the gap from CONTRIBUTING. Depends on: none.

---

## Phase 3: E2E Smoke

- [x] 3.1 Create `e2e/s03-dev-eventos-shim.spec.js`. Test: verify `console.error` is NOT called in test environment (CI), and `reportError` degrades gracefully when table is unreachable. Files: `e2e/s03-dev-eventos-shim.spec.js` (new). Kind: test. Est: ~40 lines. Acceptance: spec passes in CI without console errors. Depends on: 1.1.

---

## Critical Risk

- ⚠️ **R6** (HIGH): `sistema.eventos_sistema` not in local `crm_bybusiness`. `reportError` must never throw even if POST fails.

---

## Commit Plan

```
feat(errors): add DEV console.error fallback in reportError
docs: document eventos_sistema dev gap and tunnel requirement in CONTRIBUTING
```

**Commit 1** — `src/shared/errors/reportError.js` (1 file).
**Commit 2** — `CONTRIBUTING.md` (1 file).
**Commit 3** — `e2e/s03-dev-eventos-shim.spec.js` (1 file).

---

## Verification Plan

- `npm run test:e2e` — `s03-dev-eventos-shim.spec.js` passes.
- Manual: run in dev, trigger an error, verify `console.error` fires.
- Manual: run in prod build, verify `console.error` does NOT fire.

---

## Rollback Plan

Revert shim commits. Events lost in dev only (acceptable per design). No DB state. Boundary: this slice only.
