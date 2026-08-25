# Exploration: fase-1-scraping-porCita

**Change**: `fase-1-scraping-por-cita`
**Phase**: Explore
**Date**: 2026-08-24
**Executor**: sdd-explore (haiku)
**Artifact store**: openspec (`fase-1-scraping-por-cita`)

---

## Status

```
status: complete
executive_summary: >
  WF "Scrapear por Cita" is well-specified in SESION_2026-08-24_ARQUITECTURA.md.
  Trigger 1 SQL runs correctly and returns 4 clients today (IDs 4,106,136,137).
  All 4 already have gmaps_fichas with recent data (last 3-4 days). The DDL for
  extending scrape_schedule and creating scrape_events is correct. Critical gaps
  found: (1) no SSH credential from n8n/VPS to OnePlus, (2) crm-informe-with-pdf
  webhook WF not visible in active WF list, (3) Trigger 2 returns 0 rows because
  all 193 clients were scraped in last 30 days (normal state after recent bulk scrape),
  (4) Trigger 3 cannot validate because operaciones.leads lacks the referenced
  columns — all need resolution in sdd-propose. No existing "Scrapear por Cita" WF found.
next_recommended: sdd-propose
risks: SSH access gap (HIGH), webhook WF missing (HIGH), idempotency (MEDIUM), email
  credential not identified (MEDIUM)
skill_resolution: none (skill registry not found for this project)
```

---

## 1. SQL Queries Validated

### Trigger 1 — "Scrapear por Cita" ✅ WORKS

```sql
SELECT c.id, c.nombre_fiscal, lp.fecha_programada
FROM clientes.clientes c
JOIN operaciones.llamadas_programadas lp ON lp.cliente_id = c.id
LEFT JOIN clientes.scrape_schedule s ON s.cliente_id = c.id
WHERE c.estado = 'activo'
  AND lp.estado = 'pendiente'
  AND lp.fecha_programada BETWEEN NOW() AND NOW() + interval '5 days'
  AND (s.last_scrape_at IS NULL OR s.last_scrape_at < NOW() - interval '3 days')
ORDER BY lp.fecha_programada ASC;
```

**Result today (2026-08-24)**: 4 clients returned:
- ID 4 — "Somos Tu Solución Inmobiliaria" — 2026-08-26
- ID 106 — "CONSTRUCCIÓN DE PISCINAS FRACTUM" — 2026-08-27
- ID 136 — "AMALIA VAZQUEZ NUTRICIONISTA" — 2026-08-28
- ID 137 — "PP COSTES & CROVETTO" — 2026-08-28

**Validation notes**:
- `clientes.clientes.estado` column exists (VARCHAR, nullable) — filter works
- `operaciones.llamadas_programadas.cliente_id` is populated for all 564 rows (sync trigger working)
- `operaciones.llamadas_programadas.fecha_programada` exists and is TIMESTAMP WITH TIME ZONE
- `clientes.scrape_schedule` exists with `cliente_id` (PK) and `last_scrape_at`
- No `place_id` or `google_place_id` for any of the 4 clients — they rely on `nombre_comercial` for scraping

**Issue**: All 4 clients already have `gmaps_fichas` with `gmaps_last_updated` within 3-4 days (2026-08-21 to 2026-08-22). This means the actual gmaps data is fresh even if `scrape_schedule.last_scrape_at` says otherwise. The query logic checks `scrape_schedule.last_scrape_at` which may not have been updated after the bulk scrape.

### Trigger 2 — "Mantenimiento" ⚠️ RETURNS 0 ROWS (expected, not a bug)

```sql
SELECT c.id, c.nombre_fiscal,
       EXTRACT(DAY FROM NOW() - s.last_scrape_at) AS dias_sin_scrape
FROM clientes.clientes c
LEFT JOIN clientes.scrape_schedule s ON s.cliente_id = c.id
WHERE c.estado = 'activo'
  AND c.id NOT IN (
    SELECT cliente_id FROM operaciones.llamadas_programadas
    WHERE fecha_programada BETWEEN NOW() AND NOW() + interval '30 days'
  )
  AND c.id NOT IN (
    SELECT cliente_id FROM clientes.scrape_schedule
    WHERE last_scrape_at > NOW() - interval '30 days'
  )
ORDER BY s.last_scrape_at NULLS FIRST
LIMIT 30;
```

**Result**: 0 rows — all 193 clients have been scraped in last 30 days. This is correct behavior after the recent bulk scrape. Trigger 2 will only activate once clients start becoming stale (post ~30 days from last scrape).

### Trigger 3 — "Refresh Leads" ❌ FAILS

```sql
SELECT id, nombre_comercial, place_id_cid, data_refreshed_at
FROM operaciones.leads
WHERE origen = 'competitor'
  AND estado IN ('nuevo', 'contactado')
  AND (data_refreshed_at IS NULL OR data_refreshed_at < NOW() - interval '30 days')
ORDER BY data_refreshed_at NULLS FIRST
LIMIT 10;
```

**Error**: `column "data_refreshed_at" does not exist`

The `operaciones.leads` table lacks the following columns referenced in the DDL:
- `data_refreshed_at` — does NOT exist
- `place_id_cid` — does NOT exist (table has `google_cid`)
- `has_email` — does NOT exist
- `has_phone` — does NOT exist
- `last_trigger` — does NOT exist

These columns are part of the DDL to be added in Phase 1. This is expected — the query validates that the DDL additions are needed.

---

## 2. DDL Validated

### `clientes.scrape_schedule` — current state

```sql
cliente_id     INTEGER PRIMARY KEY REFERENCES clientes.clientes(id)
last_scrape_at TIMESTAMP WITH TIME ZONE
```

**Proposed ALTER (from SESION_2026-08-24_ARQUITECTURA.md)**:
```sql
ALTER TABLE clientes.scrape_schedule
  ADD COLUMN IF NOT EXISTS next_scrape_at  TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS scrape_count    INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS scrape_status  VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error      TEXT,
  ADD COLUMN IF NOT EXISTS last_trigger   VARCHAR(50);
```

**Validation**: ✅ All column additions are additive (no conflicts). `scrape_status` values: `'pending'`, `'ok'`, `'failed'`. `last_trigger` values: `'cita_proxima'`, `'mantenimiento'`, `'lead_refresh'`, `'manual'`. No FK constraints violated.

### `clientes.scrape_events` — new table

```sql
CREATE TABLE clientes.scrape_events (
  id              SERIAL PRIMARY KEY,
  cliente_id      INTEGER,
  triggered_at     TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  trigger_type    VARCHAR(50),
  scrape_status   VARCHAR(20),
  duration_seconds INTEGER,
  error_message   TEXT,
  n_results       INTEGER
);
```

**Validation**: ✅ No conflicts with existing tables. `cliente_id` is nullable (allows for lead scraping events).

### `operaciones.leads` — ALTER additions

```sql
ALTER TABLE operaciones.leads
  ADD COLUMN IF NOT EXISTS data_refreshed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS has_email        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_phone        BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS last_trigger     VARCHAR(50);
```

**Validation**: ✅ All additive. Note: `operaciones.leads` has `google_cid` (not `place_id_cid`) — the script references `place_id_cid` in Trigger 3 but the column doesn't exist. The DDL adds `data_refreshed_at` etc. but not `place_id_cid`. The query uses `place_id_cid` which doesn't exist — this is a discrepancy between the query and the actual schema.

---

## 3. Workflow Candidates

### Existing WFs with partial reusability

| WF ID | Name | Nodes | Reusable for |
|-------|------|-------|-------------|
| `J9VibWYkxLQ7mMhm` | `CRM_GBP_COMPETITIVE_ANALYSIS` | 12 | Calls `competitive_analysis.py` internally via HTTP nodes — scrapes Google Maps via HTTP (not via SSH to OnePlus). Webhook-based (not cron). **Not reusable as-is** — different invocation model |
| `2o5aXuUx00MTZgPJ` | `CRM_INFORME_COMPETENCIA_V4` | 4 | Email send only (webhook). Minimal — would need to add PDF attachment and SSH scraping steps |
| `bFXZei2W4GmFhid1` | `CRM_SCRAPER_HEALTH` | 4 | Health check — returns DB metadata. Not relevant for scraping workflow |

### Missing WF: "Scrapear por Cita"

**No existing WF found matching** "Scrapear", "Cita", "Scrape", "Scraping por cita", or similar. The document SESION_2026-08-24_ARQUITECTURA.md describes the intended WF but it has NOT been created yet.

### `crm-informe-with-pdf` webhook

Found referenced in `/opt/fabrica/CRM_ByBusiness/infra/scripts/enviar_informes.py` line 581:
```
webhook_url = "https://n8n.ia-bybusiness.online/webhook/crm-informe-with-pdf"
```
Payload: `{to, subject, body, pdf_b64, pdf_filename, pdf_size}` → sends email with PDF attachment.

**Status unknown**: Not visible in the 228-workflow list. May be archived, renamed, or deleted. This is the email sending component used in the manual flow.

### Email sending options identified

1. **`crm-informe-with-pdf`** (webhook) — sends email with PDF attachment. Payload: `{to, subject, body, pdf_b64, pdf_filename, pdf_size}`. Status: unknown (not in active list).
2. **`CRM_INFORME_COMPETENCIA_V4`** (webhook) — simpler email, no PDF. Can be extended.

### PDF generation scripts

Both scripts take `--cliente-id N` as parameter and run on the machine where they execute:

- `/opt/fabrica/CRM_ByBusiness/scripts/gbp/competitive/informe_competitivo_v2.py` → outputs `competitive/pdf/comp_cliente_<id>.pdf`
- `/opt/fabrica/CRM_ByBusiness/scripts/gbp/estado_gbp/estado_gbp_v2.py` → outputs `estado_gbp/pdf/estado_gbp_<id>.pdf`
- `/opt/fabrica/CRM_ByBusiness/scripts/gbp/report_to_pdf.py` → generic markdown-to-PDF converter

Both use `weasyprint` for PDF generation and read from DB directly via `psycopg2` with hardcoded credentials.

### SSH invocation mechanism

The `competitive_analysis.py` script SSHs from the LOCAL machine to OnePlus:
```python
ONEPLUS_SSH = "ssh -o StrictHostKeyChecking=no -i /home/rafael/.ssh/id_fabrica -p 8022 u0_a325@100.89.189.113"
```

For the n8n WF on VPS to invoke scraping, it needs its own SSH command to OnePlus. Tailscale IPs:
- OnePlus: `100.89.189.113:8022`
- VPS: `100.107.67.35`

**No SSH credential from VPS to OnePlus is currently configured.** This is a critical gap.

---

## 4. OnePlus Connection

| Item | Value |
|------|-------|
| Tailscale IP | `100.89.189.113` |
| SSH port | 8022 (Tailscale) |
| User | `u0_a325` |
| Key (from local) | `~/.ssh/id_fabrica` |
| Key (from OnePlus to VPS) | `~/.ssh/oneplus-to-vps` (ed25519) |
| gms-browser binary | `/root/gms-browser` in proot-distro Debian |
| Scripts on OnePlus | `~/fill_*.py` (operativa) |

**Gap**: The VPS n8n container has no SSH key configured to access the OnePlus. Options:
1. Add VPS host public key to OnePlus `authorized_keys`
2. Use n8n `Execute Command` node via SSH to run commands on OnePlus
3. Invoke a webhook on the OnePlus ( gosom-proxy on tmux session)

---

## 5. Gaps Identified

### HIGH — Must resolve in sdd-propose

1. **No SSH credential from n8n/VPS to OnePlus** — The WF needs to SSH into OnePlus to trigger scraping. Currently only the local machine has SSH access configured. The n8n container on VPS has no SSH key for OnePlus.

2. **`crm-informe-with-pdf` webhook WF not in active list** — The email-with-PDF attachment mechanism used in the manual flow is not visible in the 228-workflow list. It may be archived or deleted. A replacement or re-creation is needed.

3. **Trigger 3 query references `place_id_cid` column that doesn't exist** — The `operaciones.leads` table has `google_cid`, not `place_id_cid`. The query needs to be corrected or the column needs to be added/aliased.

4. **`competitive_analysis.py` is designed to run on LOCAL, not on VPS** — The script hardcodes `ONEPLUS_SSH` pointing to the LOCAL `id_fabrica` key. For the n8n WF on VPS, a separate invocation mechanism is needed (either a wrapper script on VPS that SSH's to OnePlus, or direct SSH from n8n's `Execute Command` node).

### MEDIUM — Should resolve in sdd-design

5. **Idempotency not addressed** — If the WF runs while a previous execution is still in progress (e.g., scraping takes >10min), there is no locking or deduplication. Recommendation: use `scrape_schedule.scrape_status = 'pending'/'running'` as a soft lock, or a dedicated lock in `scrape_events`.

6. **No alerting on failure** — If OnePlus is offline, scraper times out, or email fails, no one is notified. The WF should have an error branch that sends an alert (email/webhook) on failure.

7. **Hardcoded DB credentials in scripts** — Both PDF scripts have `DB_DSN` with hardcoded password `Fabrica_Industrial_2026_Secure!`. This should be moved to environment variables or n8n credentials.

8. **Email recipient logic** — The manual flow sends to `rafaeldelinares@gmail.com`. For the automated WF, recipients should come from `clientes.clientes.gestor_id` or `clientes.clientes.competitive_recipients` (JSONB column exists).

9. **Parallel scraping capacity** — The architecture doc says 0-3 clients/day. If multiple triggers fire simultaneously, OnePlus can only handle sequential scraping (single browser instance). The WF should process clients sequentially within the loop.

10. **`clientes.scrape_schedule.last_scrape_at` may not reflect actual scraping** — The bulk scrape updated `gmaps_fichas.gmaps_last_updated` but may not have updated `scrape_schedule.last_scrape_at`. The Trigger 1 re-scrape condition may fire unnecessarily for clients with fresh data.

### LOW — Design decision needed

11. **Google Maps rate limiting** — gms-browser may return rate-limited results. The script has no retry-with-backoff mechanism. Should the WF retry on rate limit?

12. **OnePlus availability** — If OnePlus is off/sleeping, the WF fails. Should there be a pre-flight check (ping to Tailscale IP) before attempting scraping?

13. **PDF storage** — The architecture says "PDFs on-demand, not stored". But the scripts write to `competitive/pdf/` and `estado_gbp/pdf/`. Should these be cleaned after email sending, or is the filesystem cleanup out of scope?

14. **What to scrape for Trigger 1** — The doc says "ssh OnePlus → python3 competitive_analysis.py --cliente-id X". But this script does COMPETITIVE ANALYSIS (searches competitors). For the "Scrapear por Cita" trigger, should we also re-scrape the client's own GBP data first via `fill_missing_gbp_v2.py`? The doc doesn't specify whether to update the client's own gmaps_ficha before generating PDFs.

---

## 6. Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| No SSH from VPS to OnePlus | HIGH | HIGH | Configure VPS host key in OnePlus `authorized_keys`; use `Execute Command` node with SSH |
| `crm-informe-with-pdf` WF missing | HIGH | HIGH | Verify if it exists (archived/renamed); recreate if needed; or use `Send Email` node with attachment |
| OnePlus offline during execution | MEDIUM | HIGH | Add pre-flight health check (ping/ssh connection test); retry on next cron run |
| Re-scrape already-fresh data | MEDIUM | LOW | Verify `scrape_schedule.last_scrape_at` is updated by bulk scrape; if not, update it |
| Concurrent WF executions | LOW | MEDIUM | Add `scrape_status = 'running'` check before processing each client |
| Google Maps rate limiting | MEDIUM | MEDIUM | Implement retry with exponential backoff in gms-browser invocation |
| Email delivery failure | LOW | MEDIUM | Error branch with notification; fallback to `CRM_INFORME_COMPETENCIA_V4` without attachment |
| Hardcoded credentials in scripts | MEDIUM | MEDIUM | Move to n8n credentials or environment variables before production |

---

## 7. Complexity Estimation

| Aspect | Assessment |
|--------|------------|
| SQL/DDL | LOW — 2 ALTER TABLE statements, 1 CREATE TABLE, all additive |
| n8n WF creation | MEDIUM — new WF with 10-15 nodes: cron trigger, PostgreSQL query, loop, SSH command, 2x PDF generation, email send, DB update |
| SSH setup | HIGH — requires configuring SSH access from VPS to OnePlus (new key exchange) |
| Script adaptation | MEDIUM — `competitive_analysis.py` needs to be callable from VPS n8n (SSH invocation from n8n vs. local); PDF scripts need credential externalization |
| Testing | MEDIUM — end-to-end test without sending real emails (use test email address or webhook inspection) |

**Overall: MEDIUM** — primarily a new n8n WF with moderate complexity, but SSH connectivity is a new infrastructure concern.

---

## 8. Acceptance Criteria (Probable)

Based on the 9 clients with cita in next 14 days and the architecture document:

1. **Trigger detection**: On 2026-08-24, the cron WF should detect 4 clients (IDs 4,106,136,137) for next 5 days (26-29 Aug)
2. **Scraping**: Each client triggers `competitive_analysis.py` on OnePlus (or equivalent scraping mechanism)
3. **PDF generation**: 2 PDFs per client — `Estado GBP` + `Informe Competitivo v2`
4. **Email sent**: 1 email per client (or 1 consolidated email) to the appropriate gestor
5. **DB updated**: `scrape_schedule` updated with `last_scrape_at = NOW()`, `scrape_status = 'ok'`, `scrape_count++`, `last_trigger = 'cita_proxima'`
6. **scrape_events logged**: 1 row per client in `scrape_events`
7. **Idempotency**: Re-running on same day does NOT re-scrape clients already processed (based on `last_scrape_at` check)

**Estimated volume**: 0-4 clients/day → 2-8 emails/day (once all 9 clients have upcoming citas).

---

## 9. Recommendation

**Proceed to sdd-propose** with the following clarifications required:

1. **SSH access**: Confirm how n8n on VPS will SSH to OnePlus (key location, user). This is the highest-risk item.
2. **Email WF**: Confirm status of `crm-informe-with-pdf` or choose between rebuilding it or using the `Send Email` node with attachment.
3. **Scraping scope per trigger**: Confirm if "Scrapear por Cita" includes re-scraping client's own GBP data (`fill_missing_gbp_v2.py`) or only runs competitive analysis (`competitive_analysis.py`).
4. **Email recipients**: Confirm if all emails go to `rafaeldelinares@gmail.com` or to each client's `gestor_id`.

**Scope for sdd-propose**: Phase 1 only (WF "Scrapear por Cita" + DDL Phase 1). Phases 2 and 3 (Mantenimiento, Refresh Leads) should be separate SDD changes.

---

## Files Referenced

| Path | Relevance |
|------|-----------|
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/SESION_2026-08-24_ARQUITECTURA.md` | Canonical source for SQL, DDL, WF design |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/competitive/informe_competitivo_v2.py` | PDF generation for competitive report |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/estado_gbp/estado_gbp_v2.py` | PDF generation for GBP status report |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/competitive/competitive_analysis.py` | Scraping invocation (runs on OnePlus) |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/report_to_pdf.py` | Markdown-to-PDF utility |
| `/opt/fabrica/CRM_ByBusiness/infra/scripts/enviar_informes.py` | Reference for `crm-informe-with-pdf` webhook usage |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/fill_missing_gbp_v2.py` | Reference for OnePlus scraping approach |
| `/opt/fabrica/CRM_ByBusiness/openspec/config.yaml` | OpenSpec conventions |

---

## Next Steps

1. **sdd-propose**: Document the proposed WF design, SSH invocation mechanism, email approach, and DDL changes
2. **DB migration**: Run DDL for `scrape_schedule`, `scrape_events`, `operaciones.leads` additions (requires psql direct, not MCP)
3. **SSH setup**: Configure VPS→OnePlus SSH access
4. **WF creation**: Build the n8n workflow incrementally (cron → query → loop → SSH → PDF → email → DB update)
5. **Testing**: Dry-run with 1 client, capture output, verify emails sent
