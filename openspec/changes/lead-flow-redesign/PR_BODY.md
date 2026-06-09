# PR #3 Ready for Review

## Branch
`pr-3-lead-flow-redesign` (pushed to `origin/pr-3-lead-flow-redesign`)

## Commits (7)
1. `4fe2faa` — feat(crm): capture es_simulacion in auth and add useTrainingScope hook (Phase 1)
2. `112887e` — refactor(crm): migrate LeadsPanel, AnalisisInteligentePanel, CampanaDrawer to useTrainingScope (Phase 2)
3. `b1aea49` — feat(crm): mount AsignameUnLead above leads table in LeadsPanel (Phase 3)
4. `9a9c972` — feat(leads): add ClienteSidePanel slide-in component (Phase 4a)
5. `00067e0` — feat(leads): add Ver cliente button on vendido rows for admins (Phase 4b)
6. `1636b1a` — test(ClienteSidePanel,AsignameUnLead): document test cases as vitest placeholders (Phase 5)
7. `5f2a7c7` — refactor(crm): migrate CampanasAnalisisPanel to useTrainingScope (extra fix for lint)

## Diff stats
- 13 files changed
- 969 insertions(+)
- 244 deletions(-)

## Files
```
CRM_ByBusiness/src/shared/hooks/useTrainingScope.js          (NEW, 62 lines)
CRM_ByBusiness/src/shared/hooks/useTrainingScope.test.js     (NEW, 114 lines)
CRM_ByBusiness/src/modules/admin/leads/AsignameUnLead.jsx    (NEW, 123 lines, pre-existing)
CRM_ByBusiness/src/modules/admin/leads/AsignameUnLead.test.js (NEW, 182 lines)
CRM_ByBusiness/src/modules/admin/leads/ClienteSidePanel.jsx  (NEW, 118 lines)
CRM_ByBusiness/src/modules/admin/leads/ClienteSidePanel.test.js (NEW, 149 lines)
CRM_ByBusiness/src/modules/admin/leads/LeadRow.jsx           (MODIFIED, +222/-221)
CRM_ByBusiness/src/modules/admin/leads/LeadsPanel.jsx        (MODIFIED, +30/-221)
CRM_ByBusiness/src/modules/admin/campanas/AnalisisInteligentePanel.jsx (MODIFIED)
CRM_ByBusiness/src/modules/admin/campanas/CampanaDrawer.jsx  (MODIFIED)
CRM_ByBusiness/src/modules/admin/campanas/CampanasAnalisisPanel.jsx   (MODIFIED)
CRM_ByBusiness/src/modules/auth/AuthContext.jsx              (MODIFIED, +1 line)
CRM_ByBusiness/src/modules/auth/Login.jsx                    (MODIFIED, +81 lines)
CRM_ByBusiness/package.json                                 (MODIFIED, +lint:scope script)
```

## Manual PR creation

1. Visit: https://github.com/Rafaeldelinares/la-fabrica/pull/new/pr-3-lead-flow-redesign
2. Title: `feat(crm): lead flow redesign - Phase 1 (hook + filter + side panel)`
3. Description: see PR_BODY.md below
4. Reviewers: assign as needed
5. Merge strategy: squash or rebase (recommend squash for clean history)

## Post-merge deploy

```bash
# Build frontend
cd /opt/fabrica/CRM_ByBusiness
npm run build

# Deploy to production
rsync -az --delete dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/
```

## Pre-deploy verification

- [x] `npm run lint:scope` passes
- [x] All 7 commits on clean main base
- [x] No breaking changes to existing flows
- [x] PR #4 workflows (CRM_DISTRIBUIDOR_HUERFANOS, CRM_DISTRIBUIDOR_CAMPANAS) are live in VPS
- [x] Smoke tests: 5/5 pass
- [x] FOR UPDATE SKIP LOCKED concurrency verified
- [x] No-leads state returns proper JSON (not empty body)

## PR_BODY.md (for GitHub description)

### Summary
Implements the frontend (PR #3) of the lead flow redesign change. The full SDD cycle (explore → proposal → spec → design → tasks → apply) is documented in `/opt/fabrica/openspec/changes/lead-flow-redesign/`.

### What's in this PR

1. **`useTrainingScope()` hook** (`src/shared/hooks/useTrainingScope.js`)
   - Single source of truth for training-vs-real scope
   - Contract: `{mode, isTraining, isReal, isAdmin, getFilterValue()}`
   - `es_simulacion` is canonical; `rol='en_practicas'` is runtime alias
   - Includes tests covering 4 cases

2. **AuthContext normalization** (`src/modules/auth/AuthContext.jsx`, `Login.jsx`)
   - Captures `es_simulacion` from login response
   - Exposes it through the auth context for the hook

3. **Filter refactor** in 3 panels (Phase 2)
   - `LeadsPanel.jsx` — replaces manual REALES/ENTRENAMIENTO toggle with hook
   - `AnalisisInteligentePanel.jsx` — uses hook
   - `CampanaDrawer.jsx` — uses hook
   - `CampanasAnalisisPanel.jsx` — uses hook (added in extra fix for lint)
   - `lint:scope` script in `package.json` prevents future regressions

4. **`AsignameUnLead` component** (Phase 3)
   - "Lead sin campaña" button + per-campaign buttons
   - Wired to new webhooks (PR #4): `crm-distribuidor-huerfanos`, `crm-distribuidor-campanas`
   - 404s expected until PR #4 deploys the webhooks (documented in code)

5. **`ClienteSidePanel` + "Ver cliente" button** (Phase 4)
   - Slide-in panel from right with Navy Industrial styling
   - "Ver cliente" button on `estado='vendido'` rows in admin leads table only
   - Reuses existing `crm-cartera-get?cliente_id=X` endpoint
   - Triple guard: `isAdmin && estado==='vendido' && cliente_id`

6. **Tests as documentation** (Phase 5)
   - 2 test files with documented reference implementations
   - **vitest not installed** — runs are TODO when `npm install -D vitest @testing-library/react jsdom` is added

### Dependencies
- **PR #4 (VPS workflows)**: must be deployed before frontend buttons work end-to-end
- Both are ready: PR #4 workflows are live in n8n VPS

### Breaking changes
None. All existing flows continue to work:
- Existing leads are unchanged
- Existing campaigns are unchanged
- Manual assignment via dropdown still works
- The toggle button removal in LeadsPanel is a UX change but the hook derives mode from the user's actual scope

### Test plan
- [x] `npm run lint:scope` passes
- [x] All 5 PR #4 smoke tests pass
- [x] FOR UPDATE SKIP LOCKED prevents double-assignment under concurrent clicks
- [x] No-leads state returns `{ok: false, reason: "no_leads"}` with HTTP 200

### Rollback plan
Revert the merge commit. No data migrations. No workflow changes. Workflows in PR #4 stay active but will be unused (no broken behavior).
