# Tasks: S01 — stale-phase-label-cleanup

**Slice:** S01
**Area:** Cross (A/B/C)
**Title:** Stale "Fase X" label cleanup
**Capability:** `stale-phase-label-cleanup`
**Depends on:** none
**Delivery order:** 1 of 14

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~80 |
| 400-line budget risk | Low |
| Chained PRs recommended | Yes |
| Suggested split | Single PR |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: Low

---

## Phase 1: Label Removal

- [x] 1.1 Remove "Fase 9" badge at `GbpPanel.jsx:117` — replace with meaningful status badge ("Solo lectura" if read-only). Files: `src/modules/admin/gbp/GbpPanel.jsx`. Kind: frontend. Est: ~30 lines. Acceptance: "Fase 9" not in component render tree. Depends on: none.
- [x] 1.2 `rg "Fase [0-9]" src/` to find remaining "Fase X" labels in landing page / zone components. Files: TBD from grep. Kind: frontend. Est: ~20 lines. Acceptance: No numeric "Fase" labels remain in admin UI. Depends on: none.
- [x] 1.3 Add meaningful status badges (e.g., "Gestión activa", "Solo lectura") with Navy Industrial styling (`rounded-sm`, slate tones). Files: same as 1.1/1.2. Kind: frontend. Est: ~30 lines. Acceptance: badges use correct style tokens; no inline styles. Depends on: 1.1, 1.2.

---

## Commit Plan

```
feat(admin): remove stale Fase labels from GbpPanel and landing
feat(admin): replace Fase labels with descriptive status badges
```

**Commit 1** — `src/modules/admin/gbp/GbpPanel.jsx` + any landing files found by grep (≤3 files).

---

## Verification Plan

- `e2e/s01-stale-phase-label-cleanup.spec.js` — Playwright smoke: confirm no "Fase" text in `GbpPanel` and landing components after navigation.
- Visual check: status badges render with correct Navy Industrial style.
- Grep verification: `rg "Fase [0-9]" src/` returns zero matches in `GbpPanel` and landing components.

---

## Rollback Plan

Revert commits. No data change. Boundary: this slice only — no downstream effect.
