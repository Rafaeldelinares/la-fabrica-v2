# fase-1-scraping-por-cita

## Why

The CRM ByBusiness has 193 active clients and a manual monthly scraping cycle driven by `fill_missing_gbp_v2.py` (executed ad-hoc on the OnePlus 10T). This cycle wastes capacity on clients who will never have a meeting and, worse, may leave clients with imminent meetings (1-5 days away) with stale data — a critical failure mode right before a sales call. The current "reportes_batch" approach treats all clients equally regardless of business relevance.

The session on 2026-08-24 archived the architecture decision: **scrape is event-driven, anchored on the cita (appointment), not on the calendar day**. A client with a meeting in 2 days needs fresh data more urgently than one without any meeting in the next 90 days. Additionally, only 2 of the 14 implemented reports have user demand (`Estado GBP` and `Informe Competitivo v2`) — the rest are dormant in code.

This change implements Phase 1 of that architecture: a daily n8n workflow "Scrapear por Cita" (2am) that detects clients with cita in the next 5 days whose last scrape is older than 3 days, triggers a re-scrape via the OnePlus, and generates+emails the 2 active reports. A companion workflow "Mantenimiento" (3am, daily with cup of 10) handles clients without upcoming citas whose last scrape exceeds 30 days. Diff detection between the current and previous snapshot activates a PDF cascade so the email only fires when meaningful changes exist. Refresh-leads trigger (originally Trigger 3) is explicitly excluded from this change.

The expected outcome: when Rafael or any gestor de ficha has a cita with a client, they receive fresh, relevant, actionable reports 24-48h before the meeting — without manual scraping. Volatility of Google Maps ranking means the competitive landscape is captured daily, not weekly.

## What Changes

### Schema (VPS Postgres — applied via `psql` direct, not MCP)

**`clientes.scrape_schedule` — 5 column extensions** (table already exists with `cliente_id PK` + `last_scrape_at`):
```sql
ALTER TABLE clientes.scrape_schedule
  ADD COLUMN IF NOT EXISTS next_scrape_at   TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scrape_count     INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scrape_status    VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error       TEXT,
  ADD COLUMN IF NOT EXISTS last_trigger     VARCHAR(50);
```

**`clientes.scrape_events` — new table** (audit log):
```sql
CREATE TABLE clientes.scrape_events (
  id               SERIAL PRIMARY KEY,
  cliente_id       INTEGER,
  triggered_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_type     VARCHAR(50),     -- 'cita_proxima', 'mantenimiento', 'manual'
  scrape_status    VARCHAR(20),     -- 'ok', 'failed', 'no_diff', 'skipped'
  duration_seconds INTEGER,
  error_message    TEXT,
  n_results        INTEGER
);
```

**`operaciones.leads` — NO changes** (Refresh Leads trigger is out of scope).

### n8n Workflows (VPS)

| Action | Name | Trigger | Purpose |
|---|---|---|---|
| **NEW** | `CRM_SCRAPEAR_POR_CITA` | Cron daily 02:00 | Detect clients with cita in next 5d + stale >3d; SSH to OnePlus to scrape; diff detect; generate PDFs; email |
| **NEW** | `CRM_MANTENIMIENTO_SCRAPE` | Cron daily 03:00 | Detect clients without cita in 30d + stale >30d; SSH to OnePlus; cap at 10/day; silent (no email) |

Both workflows are webhook-free (cron-only) and follow this skeleton: `Cron → Postgres SELECT → Loop clients → Execute Command (SSH) → Postgres UPDATE scrape_schedule → diff check → [if diff] generate 2 PDFs via `report_to_pdf.py` → SMTP send → log scrape_event`. The `crm-informe-with-pdf` webhook referenced in `infra/scripts/enviar_informes.py:581` is the candidate email-send mechanism — status (active/archived) to be verified in spec phase.

### Scripts (OnePlus + VPS)

- **Adapt** `scripts/gbp/competitive/competitive_analysis.py` and `scripts/gbp/estado_gbp/estado_gbp_v2.py` for SSH-invocation from VPS n8n (currently hardcoded for local). Move hardcoded DB credentials (`Fabrica_Industrial_2026_Secure!`) to env vars.
- **NEW** wrapper `scripts/gbp/scrape_from_vps.sh` — invoked via SSH by n8n; calls `competitive_analysis.py --cliente-id X --json-diff` on the OnePlus; writes JSON diff to stdout for n8n parsing.
- **Externalize** DB credentials in `report_to_pdf.py` (reads `os.environ['CRM_DB_DSN']` instead of hardcoded).

### Data

- Initial scrape volume: 0-4 clients/day (Por Cita) + up to 10/day (Mantenimiento). Within OnePlus capacity (~5-6h/week per architecture doc).
- Migration: `scrape_schedule` already has rows for 193 clients (from manual cycles); new columns default to NULL/`pending`/`0`.
- Email volume: 0-4 emails/day when 9-client cita window is active.

### Configuration

- **SSH key**: generate `id_vps_to_oneplus` (ed25519) on VPS host; public key added to OnePlus `/data/data/com.termux/files/home/.ssh/authorized_keys`. Mechanism for n8n container to access this key — TBD (spec phase).
- **SMTP credential**: reuses existing `informacion@ia-bybusiness.com` (n8n cred ID `8NbamWrMdRexLNwa`).
- **DB credentials**: externalized to `CRM_DB_DSN` env var on the VPS n8n container.

## Impact

- **VPS Postgres**: 2 DDL changes (`scrape_schedule` ALTER, `scrape_events` CREATE). Idempotent (`IF NOT EXISTS`).
- **VPS n8n**: 2 new cron workflows (~10-15 nodes each). New SSH key infrastructure.
- **OnePlus**: 1 new wrapper script; 2 existing scripts made SSH-invokable. Watchdog already in place — no changes needed.
- **Frontend**: NONE. This change is invisible to React UI; clients receive emails directly.
- **Gestor de ficha**: receives 0-4 emails/day with PDF bundle (Estado GBP + Informe Competitivo v2) 24-48h before each cita.
- **Performance/storage**: 2 emails/day at peak (~120/month). No new tables grow large (`scrape_events` ~30 rows/day, ~11k rows/year). PDFs not stored (on-demand only) — already policy.
- **Compatibility**: `scrape_schedule.last_scrape_at` is read by existing logic; new columns are additive (NULL-safe).

## Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| No SSH credential from VPS to OnePlus | HIGH | HIGH | Generate VPS ed25519 key in spec phase; add to OnePlus `authorized_keys`; test SSH round-trip before deploy |
| `crm-informe-with-pdf` webhook missing/archived | HIGH | HIGH | Verify status via n8n list in spec phase; rebuild if needed (8-node pattern: webhook → SQL → SMTP with PDF b64) |
| OnePlus offline during cron | MED | HIGH | Pre-flight ping check; soft-fail with scrape_status='failed'; retry next day |
| Re-scrape fires for clients with already-fresh data | MED | LOW | Diff detection gate: only generate+email PDFs when JSON diff > threshold; else log `no_diff` and skip |
| Concurrent WF executions (Por Cita + Mantenimiento overlap) | LOW | MED | Soft lock via `scrape_schedule.scrape_status='running'`; check before processing each client |
| Google Maps rate limiting during SSH scrape | MED | MED | Retry with exponential backoff in `competitive_analysis.py` invocation |
| Email recipient logic ambiguous (currently rafael@) | MED | MED | Look up via `clientes.clientes.gestor_id` → `auth.usuarios.email` (mirrors ciclo-facturacion-nuevo pattern) |
| Hardcoded credentials in PDF scripts | MED | MED | Externalize to env var BEFORE production deploy; rotate password |

## Alternatives Considered

1. **Weekly maintenance (lunes 3am, 30 clients)** — rejected. With 193 clients, weekly-30 takes ~6.5 weeks per cycle (data stale 1-1.5 months). Daily with cup of 10 keeps the cycle at ~3 weeks. User feedback: "establecer cupos por fechas de ultimo disparo, hacerlo escalonado en varios dias" — this is exactly the daily-cup-10 model.
2. **Refresh Leads trigger included in Phase 1** — rejected. The user said "Refresh Leads DESCARTADO" for this change; leads scraping uses different scripts (`fill_missing_gbp_v2.py` vs `competitive_analysis.py`) and has its own email-notify-new-email logic. Deferred to a future change.
3. **Scrape all 193 clients every run** — rejected. Wastes OnePlus capacity (~180s per client = 9.7h) on clients with no immediate business value. Event-driven approach targets 0-10 clients/day.
4. **Single combined trigger** (Por Cita + Mantenimiento in one WF) — rejected. Different freshness thresholds (3d vs 30d), different email policies (notify vs silent), different cadences (daily vs daily-with-cup) make them naturally separable; clearer failure isolation.

## Open Questions

To resolve in spec phase:

1. **SSH VPS→OnePlus**: exact key path inside the n8n container, user (`u0_a325`), how n8n `Execute Command` node calls `ssh` with the key (env var or file mount). Currently the VPS n8n container has no SSH key for OnePlus.
2. **WF `crm-informe-with-pdf` status**: archived? renamed? need to recreate? Decision branch: rebuild (8 nodes, ~1.5h) vs use n8n `Send Email` node with PDF attachment directly.
3. **Diff detection algorithm**: per-field comparison (rating, reviews_count, rank, hours) vs hash-of-row vs full JSON snapshot diff. Threshold for "meaningful change" (e.g., rating delta ≥ 0.1 OR reviews_count delta ≥ 2).
4. **Email recipients lookup**: per-client `gestor_id` → email, OR all to `rafaeldelinares@gmail.com` (manual flow default), OR separate mailing list.
5. **Idempotency + alerts + logging**: scrape_status state machine (pending → running → ok/failed); alert on consecutive failures (e.g., 3 in a row → email to ops); structured logging format for scrape_events.

## Acceptance Criteria

1. `CRM_SCRAPEAR_POR_CITA` runs daily at 02:00 VPS time, detects clients with cita in next 5 days and `last_scrape_at < NOW()-3d`, SSHs to OnePlus, scrapes via `competitive_analysis.py`, and updates `scrape_schedule` + `scrape_events`.
2. `CRM_MANTENIMIENTO_SCRAPE` runs daily at 03:00 VPS time, detects clients without cita in next 30 days and `last_scrape_at < NOW()-30d`, scrapes up to 10 clients, no email sent.
3. When the new scrape produces a meaningful diff vs the previous snapshot, the 2 active PDFs (Estado GBP + Informe Competitivo v2) are generated and emailed to the resolved recipient. When no meaningful diff, no email is sent but the scrape event is logged with `scrape_status='no_diff'`.
4. Every scrape attempt produces exactly one row in `clientes.scrape_events` with `trigger_type`, `scrape_status`, `duration_seconds`, and either `n_results` (success) or `error_message` (failure).
5. Re-running the WF on the same day does NOT re-scrape clients already processed (idempotency check via `scrape_schedule.last_scrape_at` and `scrape_status`).
6. DDL applied to VPS Postgres with no errors; `IF NOT EXISTS` clauses ensure re-runnability.

## Effort Estimate

**Medium** (~3 days of focused work):

| Component | Effort | Justification |
|---|---|---|
| DDL migration + apply | 0.25d | 2 statements, additive, idempotent |
| SSH VPS→OnePlus setup | 0.5d | New key exchange; needs round-trip test from n8n container |
| `CRM_SCRAPEAR_POR_CITA` WF | 1.0d | 12-15 nodes: cron, Postgres, loop, SSH exec, diff check, 2x PDF gen, email, 2x UPDATE |
| `CRM_MANTENIMIENTO_SCRAPE` WF | 0.5d | 8-10 nodes (no email/branch); shares SSH + UPDATE pattern |
| Script adaptations (OnePlus + credentials) | 0.5d | 3 files; env var externalization; SSH wrapper |
| E2E testing + monitoring | 0.25d | Dry-run with 1 client; verify emails; check scrape_events |

**Out of scope (separate SDD changes)**:
- Phase 2 (Mantenimiento expansion to weekly batch + 30 clientes)
- Refresh Leads trigger (`operaciones.leads` DDL + Workflow)
- `gmaps_historico_diffs` table + AFTER INSERT trigger for history-driven diff
- Streamlit dashboard for scraper status

## Rollback Plan

- **DDL**: `ALTER TABLE clientes.scrape_schedule DROP COLUMN IF EXISTS ...` per column; `DROP TABLE IF EXISTS clientes.scrape_events;`. Safe because no code reads these columns until workflows are deployed.
- **Workflows**: deactivate both WFs via n8n toggle. No destructive operations on existing data; existing scraping manual flow (`fill_missing_gbp_v2.py`) remains operational.
- **SSH key**: remove VPS public key from OnePlus `~/.ssh/authorized_keys`. No other service uses this key.
- **Scripts**: revert wrapper script (`scrape_from_vps.sh`) and env var changes; restore hardcoded credentials (not recommended for prod but reverts cleanly).

## References

- `openspec/changes/fase-1-scraping-por-cita/explore.md` — full exploration analysis (353 lines, validated SQL/DDL/WF candidates)
- `scripts/gbp/SESION_2026-08-24_ARQUITECTURA.md` — canonical architecture doc (Triggers 1/2/3 + DDL + roadmap)
- `scripts/gbp/competitive/informe_competitivo_v2.py` — Informe Competitivo PDF generator (active)
- `scripts/gbp/estado_gbp/estado_gbp_v2.py` — Estado GBP PDF generator (active)
- `scripts/gbp/competitive/competitive_analysis.py` — OnePlus scraping invocation (needs SSH adaptation)
- `infra/scripts/enviar_informes.py:581` — `crm-informe-with-pdf` webhook reference (status TBD)
- `openspec/changes/archive/2026-08-18-ciclo-facturacion-nuevo/` — analogous pattern: VPS n8n WF + cron + SMTP email + DB UPDATE
