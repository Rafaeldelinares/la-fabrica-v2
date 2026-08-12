# Tasks: GBP Ficha Improvements — Sprint 2

**Change**: `gbp-sprint2`
**Date**: 2026-08-06
**Delivery strategy**: `ask-always` (3 chained slices, ≤400 LOC each, commits ≤3 files)
**Artifact store**: openspec
**Predecessor**: Sprint 1 `gbp-ficha-improvements` (verified working 2026-08-06)

---

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~600 (S2A: 150 + S2B: 250 + S2C: 200) |
| 400-line budget risk | **Low** (all slices well under 400-LOC ceiling) |
| Chained PRs recommended | **Yes** |
| Suggested split | 3 chained PRs: S2A → S2B → S2C |
| Chain strategy | stacked-to-main |
| Slices over 400 lines | None |

Decision needed before apply: **Yes** — confirm chain strategy + canary fixture (`cliente 693` AG FITNESS BURGOS) before `sdd-apply gbp-sprint2`.

Chained PRs recommended: **Yes**

```yaml
review_workload_forecast:
  total_changed_lines_estimate: 600
  slices_over_400_lines: []
  chained_prs_recommended: yes
  decision_needed_before_apply: yes
  rationale: "S2A is a quick win (150 LOC) unblocking realistic audit data. S2B depends on S2A; ~250 LOC for competitive analysis. S2C depends on S2A but independent of S2B; ~200 LOC for regression alerts. Total ~600 LOC across 3 chained slices, each under the 400-LOC ceiling. Chained PRs protect review focus and let each slice ship independently."
```

---

## Open Questions (pre-apply, orchestrator resolves)

| ID | Question | Owner | Blocking |
|----|----------|-------|----------|
| OQ-1 | Confirm `cliente 693` (AG FITNESS BURGOS) is still the right canary fixture for S2A verification. | orchestrator | S2A apply |
| OQ-2 | Confirm Playwright session cookies (`google_session.json`) are fresh on VPS — cookie wear from Sprint 1 may have expired. | orchestrator | S2A apply |
| OQ-3 | `categoria` and `ciudad` columns on `clientes` table — confirm they exist and are populated for cliente 693 (else S2B will need fallback). | orchestrator | S2B apply |
| OQ-4 | Confirm n8n SMTP credential `8NbamWrMdRexLNwa` (`informacion@ia-bybusiness.com`) exists and test-send works. | orchestrator | S2C apply |
| OQ-5 | Confirm `GBP_ALERT_DEFAULT_EMAIL` env var is set to `rafaeldelinares@gmail.com` in n8n credential config. | orchestrator | S2C apply |
| OQ-6 | Decision: trigger model for alert computation. **Resolved: post-audit hook in wrapper** (AD-15). Detection is synchronous with audit save; no new infrastructure; drift logic already exists in `_drift_response()` (extract to `_compute_alerts()`). | — | — |
| OQ-7 | Decision: synchronous vs async email dispatch. **Resolved: async via n8n cron** (AD-16). SMTP failure must not block audit save; decoupled design lets alerts queue in DB and retry every 5 min. | — | — |

---

## Pre-Apply Checklist

- [ ] VPS Playwright session alive: `journalctl -u gbp-ficha.service --since="5 minutes ago" | tail -5`
- [ ] Cliente 693 fixture confirmed: `place_id` valid, `categoria = "Entrenador personal"`, `ciudad = "Burgos"`
- [ ] OQ-1 (canary fixture) resolved
- [ ] OQ-2 (cookie freshness) resolved — decision needed before S2A apply
- [ ] OQ-3 (categoria/ciudad columns) resolved — decision needed before S2B apply
- [ ] Postgres-vps tunnel up: `postgres-vps` MCP responds
- [ ] n8n JWT infra confirmed working (Sprint 1 REQ-2 already validated)
- [ ] **S2C only**: n8n SMTP cred `8NbamWrMdRexLNwa` test-send works (send 1 email to `rafaeldelinares@gmail.com` from n8n UI, verify delivery)
- [ ] **S2C only**: `GBP_ALERT_DEFAULT_EMAIL` env var set to `rafaeldelinares@gmail.com` in n8n credential config
- [ ] **S2C only**: idempotent migration runs cleanly (`CREATE TABLE IF NOT EXISTS` + `ADD COLUMN IF NOT EXISTS`)

---

## Slice S2A — Scraper Selectors Fix (REQ-5)

**Scope**: Rewrite 4 broken extraction blocks in `gbp_ficha_audit.py` with multi-fallback strategy (ARIA → CSS → regex). Verify canary cliente 693 returns realistic data.
**Spec**: REQ-5
**Design**: §10, S2A
**Dependencies**: None (first slice)
**Estimated LOC**: ~150

### Tasks

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 1.1 | Refactor `_extract_descripcion(page)` with ARIA + CSS + regex fallbacks | `scripts/gbp_ficha_audit.py` | ~40 | Spec REQ-5 Scenario "Descripcion extracted"; returns (value, strategy_used); stderr warning on full failure |
| 1.2 | Refactor `_extract_horarios(page)` — detect 7 day names from table OR body text | `scripts/gbp_ficha_audit.py` | ~30 | Spec REQ-5 Scenario "Horarios covers all 7 days"; ≥6 days for canary |
| 1.3 | Refactor `_extract_atributos(page)` — count attribute chips via semantic patterns | `scripts/gbp_ficha_audit.py` | ~40 | Spec REQ-5 Scenario "Atributos count matches Google attribute chips"; ≥8 for canary |
| 1.4 | Refactor `_extract_reviews_count(page)` — parse from ARIA + body regex | `scripts/gbp_ficha_audit.py` | ~30 | Spec REQ-5 Scenario "Reviews count extracted when Google shows total"; ≥10 for canary |
| 1.5 | Manual canary verification: re-run audit on cliente 693, diff JSON | (manual) | — | All 4 fields match Google Maps reality |
| 1.6 | Verify no regression: spot-check 5 other clientes — rating/fotos/categorias unchanged | (manual) | — | `audit_data` JSON shape stable except for the 4 fixed fields |

### Verification (S2A)

```bash
# 1. Restart wrapper to pick up new code
ssh root@72.60.191.179 "systemctl restart gbp-ficha.service"
sleep 5

# 2. Trigger audit for cliente 693 (canary)
curl -s "http://localhost:8095/run?place_id=ChIJ_AG_FITNESS_BURGOS" | jq

# 3. Verify all 4 fields
curl -s "http://localhost:8095/run?place_id=ChIJ_AG_FITNESS_BURGOS" | \
  jq '{reviews_count, descripcion, horarios_dias_cubiertos, atributos_seteados}'

# 4. Check stderr for warnings (should be empty for canary)
journalctl -u gbp-ficha.service --since="2 minutes ago" | grep "gbp_scraper"

# 5. UI verification — open cliente 693 in browser, check FICHA ACTUAL pill states
```

Expected canary output:
```json
{
  "reviews_count": 12,
  "descripcion": "AG FITNESS BURGOS — Gimnasio especializado en entrenamiento personal...",
  "horarios_dias_cubiertos": 7,
  "atributos_seteados": 12
}
```

**PR**: 1 work-unit (1 file: `gbp_ficha_audit.py`).

---

## Slice S2B — Competitive Analysis Endpoint (REQ-6)

**Scope**: Add wrapper endpoint `/competitive-analyze`, n8n workflow `CRM_GBP_COMPETITIVE_ANALYZE` with JWT gate, frontend sub-component `GbpBenchmark.jsx` mounted under `GbpFichaActual`. ALTER CHECK constraint to include `'competitive-analyze'`.
**Spec**: REQ-6
**Design**: §10, S2B
**Dependencies**: S2A complete
**Estimated LOC**: ~250

### Preflight Probe

```bash
# Verify VPS postgres tunnel before S2B apply
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c 'SELECT 1'" \
  && echo "TUNNEL_OK" || echo "TUNNEL_DOWN"

# Verify cliente 693 has categoria + ciudad
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness \
  -c \"SELECT id, categoria, ciudad FROM clientes WHERE id = 693\""
```

### Tasks

#### Work-Unit S2B-a (Backend: wrapper + DB + n8n)

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 2.1 | Add `POST /competitive-analyze` endpoint to `gbp_http_wrapper.py` | `scripts/gbp_http_wrapper.py` | ~80 | Spec REQ-6 Scenario "Competitive analysis returns 3 competitors"; filters `exclude_place_id`; pads with #N+1 |
| 2.2 | Implement `_extract_search_results(page)` helper — scrape place_ids from Google Maps search | `scripts/gbp_http_wrapper.py` | ~30 | Returns ordered list of place_ids from search results page |
| 2.3 | Implement `_normalize_competitor(audit)` — extract {fotos_count, reviews_count, rating, horarios_dias_cubiertos, posts_count} | `scripts/gbp_http_wrapper.py` | ~20 | Returns competitor dict matching response shape |
| 2.4 | ALTER CHECK constraint: include `'competitive-analyze'` in audit_source enum | SQL migration | ~10 | Idempotent; rollback-safe with `DROP CONSTRAINT IF EXISTS` |
| 2.5 | Create n8n `CRM_GBP_COMPETITIVE_ANALYZE` workflow (POST webhook + JWT gate + DB read + wrapper call + history INSERT) | n8n workflow | ~80 | Spec REQ-6 Scenarios: returns 3 competitors, excludes self, 403 without `gbp.write`, 400 without place_id |
| 2.6 | Restart wrapper + verify `/competitive-analyze` responds | (deploy) | — | `curl localhost:8095/competitive-analyze -X POST -d '{"categoria":"X","ciudad":"Y"}'` returns 200 |

#### Work-Unit S2B-b (Frontend: GbpBenchmark component)

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 2.7 | Implement `GbpBenchmark.jsx` — sub-component with `useN8nQuery` + table render | `src/modules/admin/cartera/tabs/gbp/GbpBenchmark.jsx` | ~140 | Spec REQ-6 Scenario "Frontend renders benchmark table with delta column"; ≤150 LOC; Navy Industrial |
| 2.8 | Mount `<GbpBenchmark cliente={cliente} />` below existing sections in `GbpFichaActual.jsx` | `src/modules/admin/cartera/tabs/gbp/GbpFichaActual.jsx` | ~10 | Component renders; falls back to empty state if no data |
| 2.9 | Manual UI verification — open cliente 693, verify benchmark table renders | (manual) | — | Table shows métrica/cliente/top-3/delta columns; color coding works |

### Verification (S2B)

```bash
# WU-a: Backend
# 1. Wrapper probe
curl -s -X POST "http://localhost:8095/competitive-analyze" \
  -H "Content-Type: application/json" \
  -d '{"categoria":"Entrenador personal","ciudad":"Burgos","top_n":3,"exclude_place_id":"ChIJ_SELF"}' \
  | jq '.competitors | length'

# 2. n8n JWT gate test (expect 403)
curl -s -X POST "https://n8n.ia-bybusiness.online/webhook/crm-gbp-competitive-analyze" \
  -H "Authorization: Bearer $TOKEN_NO_GBP_WRITE" \
  -H "Content-Type: application/json" \
  -d '{"cliente_id":693,"categoria":"Entrenador personal","ciudad":"Burgos"}' \
  | jq '.code'

# 3. n8n JWT gate test with valid token (expect 200 + 3 competitors)
curl -s -X POST "https://n8n.ia-bybusiness.online/webhook/crm-gbp-competitive-analyze" \
  -H "Authorization: Bearer $TOKEN_WITH_GBP_WRITE" \
  -H "Content-Type: application/json" \
  -d '{"cliente_id":693,"categoria":"Entrenador personal","ciudad":"Burgos"}' \
  | jq '.competitors | length'

# 4. Validate placeholder (cliente without place_id)
curl -s -X POST "https://n8n.ia-bybusiness.online/webhook/crm-gbp-competitive-analyze" \
  -H "Authorization: Bearer $TOKEN_WITH_GBP_WRITE" \
  -H "Content-Type: application/json" \
  -d '{"cliente_id":999,"categoria":"X","ciudad":"Y"}' \
  | jq '.code'  # expect 400

# 5. Verify history row written
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness \
  -c \"SELECT audit_source, scrape_duration_ms FROM clientes.gbp_audit_history \
  WHERE audit_source = 'competitive-analyze' ORDER BY audited_at DESC LIMIT 1\""

# WU-b: Frontend
# 6. Build clean
npm run build 2>&1 | tail -10

# 7. Manual browser check on cliente 693
# - Open GBP tab
# - Verify "Benchmark del sector" sub-section appears below Ficha actual
# - Verify table renders 3 competitors with deltas
```

**PRs**: 2 work-units. WU-a: wrapper endpoint + DB ALTER + n8n workflow (3 files max). WU-b: frontend component + integration (2 files).

---

## Slice S2C — Regression Alerts via Email (REQ-7)

**Scope**: Extract `_compute_alerts()` helper from existing `_drift_response()`; hook into `/run` after `save_history()` to write triggered alerts to `clientes.gbp_alerts`. Add 3 new n8n workflows (dispatch cron + list + dismiss). Add `GbpAlerts.jsx` (≤150 LOC) mounted under `GbpHeader`. SMTP uses existing `informacion@ia-bybusiness.com` cred; email destination is per-cliente via `clientes.email_destinatario`.
**Spec**: REQ-7
**Design**: §10, S2C
**Dependencies**: S2A complete (alert computation needs realistic `audit_data` from fixed selectors); independent of S2B
**Estimated LOC**: ~200

### Preflight Probe

```bash
# Verify SMTP credential + test-send
ssh root@72.60.191.179 "curl -s -X POST 'https://n8n.ia-bybusiness.online/api/v1/credentials/8NbamWrMdRexLNwa/test' \
  -H 'X-N8N-API-KEY: <key>' -H 'Content-Type: application/json' -d '{}'"
# (Manual alternative: open n8n UI → Credentials → 8NbamWrMdRexLNwa → "Test" → verify delivery to rafaeldelinares@gmail.com)

# Verify idempotent migration is reversible
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness \
  -c \"SELECT column_name FROM information_schema.columns \
  WHERE table_name='clientes' AND column_name='email_destinatario'\""
```

### Tasks

#### Work-Unit S2C-a (Backend: wrapper helper + DB + n8n workflows)

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 3.1 | Extract `_compute_alerts(prev_data, curr_data) -> list[Alert]` from existing `_drift_response()` drift logic | `scripts/gbp_http_wrapper.py` | ~30 | Pure function; returns list of alert dicts with `alert_type`, `severity`, `delta_json`; thresholds hardcoded constants |
| 3.2 | Add helper `_save_alerts(place_id, cliente_id, prev_audit_id, alerts) -> int` — INSERT with `ON CONFLICT DO NOTHING` | `scripts/gbp_http_wrapper.py` | ~15 | Idempotent; returns count of rows written; UNIQUE constraint enforced |
| 3.3 | Hook into `/run` handler: after `save_history()` returns, fetch prev via `get_recent_history(place_id)`, call `_compute_alerts()` + `_save_alerts()` | `scripts/gbp_http_wrapper.py` | ~10 | Triggered automatically on every audit save; no API change to `/run` response |
| 3.4 | DB migration: `CREATE TABLE IF NOT EXISTS clientes.gbp_alerts (...)` + indexes | SQL migration | ~10 | Idempotent; rollback-safe with `DROP TABLE` |
| 3.5 | DB migration: `ALTER TABLE clientes.clientes ADD COLUMN IF NOT EXISTS email_destinatario TEXT` | SQL migration | ~5 | Idempotent; nullable; rollback-safe with `DROP COLUMN` |
| 3.6 | Create n8n `CRM_GBP_ALERTS_DISPATCH` workflow (cron every 5 min, SELECT unsent rows grouped by cliente, send SMTP email via cred `8NbamWrMdRexLNwa`, UPDATE `sent_at`) | n8n workflow | ~40 | Spec REQ-7.1 + REQ-7.8: email sent within 5-10 min; SMTP failure leaves `sent_at IS NULL`; cron retries |
| 3.7 | Create n8n `CRM_GBP_ALERTS_LIST` workflow (GET webhook, JWT `gbp.read`, SELECT undismissed alerts for cliente, return JSON) | n8n workflow | ~20 | Spec REQ-7.7: returns up to 10 undismissed alerts; 403 without `gbp.read` |
| 3.8 | Create n8n `CRM_GBP_ALERTS_DISMISS` workflow (POST webhook, JWT `gbp.write`, UPDATE `dismissed_at = NOW()`, return JSON) | n8n workflow | ~15 | Spec REQ-7.7: dismisses by `alert_id`; 403 without `gbp.write`; idempotent |
| 3.9 | Restart wrapper + verify `_compute_alerts()` triggers correctly on simulated rating drop | (deploy) | — | SQL inject `rating=4.5` in `gbp_audit_history.audit_data`, run `/run`, verify `gbp_alerts` row |

#### Work-Unit S2C-b (Frontend: GbpAlerts component)

| # | Task | Files | LOC est. | Acceptance criteria |
|---|------|-------|---------|-------------------|
| 3.10 | Implement `GbpAlerts.jsx` — sub-component with `useN8nQuery('gbp-alerts-list')` + alert banner rows + dismiss button | `src/modules/admin/cartera/tabs/gbp/GbpAlerts.jsx` | ~120 | Spec REQ-7.7: renders ≤10 banners with type icon + delta + timestamp; dismiss button calls `CRM_GBP_ALERTS_DISMISS` with JWT `gbp.write`; ≤150 LOC; Navy Industrial |
| 3.11 | Mount `<GbpAlerts cliente={cliente} canDismiss={hasGbpWrite} />` below score pill in `GbpHeader.jsx` | `src/modules/admin/cartera/tabs/gbp/GbpHeader.jsx` | ~5 | Component renders; empty alerts → returns null; user without `gbp.write` sees disabled dismiss button |
| 3.12 | Manual UI verification — open cliente 693, inject rating drop, verify banner appears within 5-10 min, click dismiss | (manual) | — | Banner shows correct delta; dismiss updates `dismissed_at`; optimistic UI removes banner |

### Verification (S2C)

```bash
# WU-a: Backend + DB + cron
# 1. Migration verification (idempotent — should succeed even if re-run)
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  '\\d clientes.gbp_alerts'"
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"SELECT email_destinatario FROM clientes.clientes WHERE id = 693\""

# 2. Inject rating drop simulation
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"UPDATE clientes.gbp_audit_history SET audit_data = jsonb_set(audit_data, '{rating_promedio}', '4.5') \
  WHERE place_id = 'ChIJ_AG_FITNESS_BURGOS' AND audited_at = (SELECT MAX(audited_at) FROM clientes.gbp_audit_history WHERE place_id = 'ChIJ_AG_FITNESS_BURGOS')\""

# 3. Trigger audit to fire _compute_alerts
curl -s "http://localhost:8095/run?place_id=ChIJ_AG_FITNESS_BURGOS&refresh=true" | jq

# 4. Verify alert row created
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"SELECT alert_type, severity, delta_json, sent_at FROM clientes.gbp_alerts WHERE cliente_id = 693 ORDER BY created_at DESC LIMIT 3\""

# 5. Wait for cron tick (max 5 min) and verify sent_at populated
sleep 300
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"SELECT alert_type, sent_at FROM clientes.gbp_alerts WHERE cliente_id = 693 ORDER BY created_at DESC LIMIT 3\""

# 6. Verify email landed in rafaeldelinares@gmail.com (manual)

# 7. SMTP failure scenario — temporarily disable cred, verify retry on next tick
# (Manual via n8n UI: deactivate CRM_GBP_ALERTS_DISPATCH, wait 5 min, verify sent_at IS NULL; re-enable, verify retry works)

# 8. Per-cliente override scenario
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \
  \"UPDATE clientes.clientes SET email_destinatario = 'test@example.com' WHERE id = 693\""
# Repeat steps 2-5 — email should route to test@example.com

# WU-b: Frontend
# 9. Build clean
npm run build 2>&1 | tail -10

# 10. Manual browser check on cliente 693
# - Open GBP tab
# - Verify "Alerts" banner appears below GbpHeader score pill
# - Verify dismiss button works (calls CRM_GBP_ALERTS_DISMISS, updates dismissed_at)
# - Verify user without gbp.write sees disabled dismiss with tooltip
```

**PRs**: 2 work-units. WU-a: wrapper helper + DB migrations + 3 n8n workflows (~145 LOC across 5 files). WU-b: frontend component + integration (~125 LOC across 2 files). Total S2C ~200 LOC.

---

## Dependency Graph

```
S2A ──────────────────────────────► S2B-a (wrapper + DB + n8n) ─�─► S2B-b (frontend)
│                                                            │
│                                                            │
└────────► S2C-a (wrapper helper + DB + 3 n8n workflows) ────┬─► S2C-b (frontend)
                                                             │
                                              (S2B and S2C can parallelize after S2A)
```

**Parallelization note**: S2B-a (backend) and S2B-b (frontend) are independent once S2A lands. S2C-a (backend) and S2C-b (frontend) are independent once S2A lands. S2B and S2C can be developed in parallel by separate agents after S2A merges. WU-b within each slice can be developed in parallel with WU-a.

---

## Rollback Quick Reference

| Slice | Revert command |
|-------|----------------|
| S2A | `git revert HEAD` (1 file: `gbp_ficha_audit.py`) + restart wrapper |
| S2B-a | `git revert HEAD` (wrapper endpoint removed) + `DROP CONSTRAINT IF EXISTS gbp_audit_history_audit_source_check; ADD CONSTRAINT ... CHECK (... IN ('manual','cache-refresh','scheduled'))` + deactivate n8n workflow |
| S2B-b | `git revert HEAD` (2 files: `GbpBenchmark.jsx` + integration in `GbpFichaActual.jsx`) |
| S2C-a | `git revert HEAD` (wrapper helper + post-save hook removed) + `DROP TABLE IF EXISTS clientes.gbp_alerts` + `ALTER TABLE clientes.clientes DROP COLUMN IF EXISTS email_destinatario` + deactivate 3 n8n workflows (`CRM_GBP_ALERTS_DISPATCH`, `LIST`, `DISMISS`) |
| S2C-b | `git revert HEAD` (2 files: `GbpAlerts.jsx` + integration in `GbpHeader.jsx`) |

---

## Chained PR Chain Strategy

**Recommended**: `stacked-to-main` — S2A merges first, then S2B-a/b (parallelized), then S2C-a/b (parallelized). Fast iteration, fix on the go. S2B and S2C can be developed in parallel after S2A.

Alternative: `feature-branch-chain` — each PR targets the tracker branch. Only the tracker merges to main. Best for rollback control.

**Order recommendation**: S2A → S2B-a → S2C-a → S2B-b → S2C-b (backends first to unblock frontend integration testing).

User decision required before `sdd-apply gbp-sprint2`.

---

*Tasks generated by sdd-tasks phase agent. Review workload forecast embedded per orchestrator contract.*