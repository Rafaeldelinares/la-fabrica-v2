# Archive Report — gbp-sprint2

**Date**: 2026-08-06
**Archived by**: sdd-archive
**Status**: ARCHIVED

## Summary

Sprint 2 of GBP Ficha Audit. 3 slices planned (S2A scraper fix, S2B análisis competitivo, S2C alertas regresión con email). Sprint 1 closed & verified working in production 2026-08-06.

## Final state (planning)

- 3 REQs added (REQ-5 scraper, REQ-6 competitive, REQ-7 alerts)
- 8 + 7 + 8 = 23 Given/When/Then scenarios
- ~600 LOC planned across 3 slices (each under 400 LOC budget)
- 1 DB schema change: ALTER TABLE clientes.clientes ADD COLUMN categoria + ciudad (applied 2026-08-06)
- 1 new workflow: CRM_GBP_REGRESSION_ALERTS (S2C)
- Email destination: rafaeldelinares@gmail.com (initial, configurable)
- SMTP: existing La Fábrica (informacion@ia-bybusiness.com)
- All 3 OQs resolved before planning closed

## Sprint 1 baseline (already deployed)

- 24 commits on origin/main as of 2026-08-06
- Feature works end-to-end (UI → n8n → wrapper → scraper → DB)
- Critical bug fix: x-user-role header propagation (was blocking all RBAC-gated mutations)
- CORS path mismatch fix on crm-interacciones-cliente
- Capture Link feature (frontend-native URL extraction)

## Sprint 2 status (pending apply)

- S2A — scraper selector fix (priority 1, quick win)
- S2B — análisis competitivo vs top-3 del sector
- S2C — alertas de regresión con email

## Lessons learned

- Multi-fallback selector strategy (ARIA → CSS → regex) is the correct order: semantic/stable before visual/brittle before heuristic/last-resort
- Decoupled dispatch (sync detection + async email) prevents SMTP failures from blocking audit saves
- Per-cliente email override via DB column avoids code changes for configuration

## Sprint 3+ candidates

- PDF monthly report
- Benchmarking by sector
- JWT migration (header → JWT roles claim)
- `scripts/google_session.json` → `.gitignore`
- E2E tests pre-existing failure fix
- Scraper NLP analysis (Qwen local)

## Artifact traceability

| Artifact | Location |
|----------|----------|
| proposal | `openspec/changes/archive/2026-08-06-gbp-sprint2/proposal.md` |
| spec | `openspec/changes/archive/2026-08-06-gbp-sprint2/spec.md` |
| design | `openspec/changes/archive/2026-08-06-gbp-sprint2/design.md` |
| tasks | `openspec/changes/archive/2026-08-06-gbp-sprint2/tasks.md` |
| verify-report | `openspec/changes/archive/2026-08-06-gbp-sprint2/verify-report.md` |

*Archived 2026-08-06 by sdd-archive*
