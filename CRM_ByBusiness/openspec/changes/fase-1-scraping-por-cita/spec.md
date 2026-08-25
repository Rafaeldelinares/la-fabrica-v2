# Spec: fase-1-scraping-por-cita

## Purpose

This change implements Phase 1 of the event-driven scraping architecture for CRM ByBusiness. A daily n8n workflow (`CRM_SCRAPEAR_POR_CITA`) detects clients with a cita (appointment) in the next 5 days whose Google Maps data is older than 3 days, triggers a re-scrape via SSH to the OnePlus 10T, persists a snapshot, runs diff detection against the previous snapshot, and — only when meaningful changes are detected — generates and emails two PDF reports (Estado GBP + Informe Competitivo v2) to the client's gestor. A companion workflow (`CRM_MANTENIMIENTO_SCRAPE`) handles stale clients without upcoming citas, scraping silently at a daily cap of 10 clients. Refresh-leads trigger is explicitly out of scope.

---

## Resolved Open Questions

### Q1: SSH VPS→OnePlus

**Answer**: Use the n8n `SSH` node (`nodes-base.ssh`) from the VPS n8n container.

- **Key generation**: Generate a new ed25519 key on the VPS host at `/root/.ssh/id_vps_to_oneplus` (`ssh-keygen -t ed25519 -f /root/.ssh/id_vps_to_oneplus -N "" -C "n8n-vps-to-oneplus"`).
- **OnePlus authorization**: Append the VPS public key to OnePlus `/data/data/com.termux/files/home/.ssh/authorized_keys` (same path where `~/.ssh/oneplus-to-vps` is already authorized).
- **SSH command**: `ssh -o StrictHostKeyChecking=no -i /root/.ssh/id_vps_to_oneplus -p 8022 u0_a325@100.89.189.113 "python3 ~/competitive_analysis.py --cliente-id {{ $json.cliente_id }} --json-output"`
- **n8n credential**: The `SSH` node uses username + private key credentials pointing to `/root/.ssh/id_vps_to_oneplus`.
- **Pre-flight**: SSH connection test before issuing the scrape command; if connection fails, set `scrape_status = 'failed'` and retry next day.

**Reference**: `crm/infraestructura-oneplus` (engram), `scripts/gbp/SESION_2026-08-24_ARQUITECTURA.md`

---

### Q2: WF `crm-informe-with-pdf` Status

**Answer**: Workflow does NOT exist (not in active or inactive n8n list). It must be rebuilt.

- The reference in `infra/scripts/enviar_informes.py:581` (`webhook/crm-informe-with-pdf`) is a leftover from the manual flow.
- **Decision**: Do NOT recreate `crm-informe-with-pdf` as a separate webhook workflow. Instead, embed the email-with-PDF pattern directly inside `CRM_SCRAPEAR_POR_CITA` using:
  - n8n `Send Email` node (SMTP, credential ID `8NbamWrMdRexLNwa`)
  - PDF files read from filesystem after generation via `report_to_pdf.py` or direct script output
- **PDF generation**: Run `estado_gbp_v2.py` and `informe_competitivo_v2.py` on the OnePlus via SSH; copy PDFs back via SCP or generate them locally on the VPS where n8n runs.
- **Attachment**: The `Send Email` node supports binary attachments; the workflow reads the generated PDF as binary data and attaches it.

**Reference**: `n8n-mcp-vps` workflow list (confirmed `crm-informe-with-pdf` absent), `openspec/changes/fase-1-scraping-por-cita/explore.md`

---

### Q3: Diff Detection Algorithm

**Answer**: Per-field comparison using structured columns in `gmaps_historico`, with a composite meaningful-change threshold.

**Algorithm**:

```
INPUT: new_snapshot (just inserted), prev_snapshot (latest prior for same cliente_id)
FIELDS_TO_COMPARE = [gmaps_rating, gmaps_resenas, gmaps_sentiment]

diff_found = FALSE

// Rating diff
IF new.gmaps_rating IS NOT NULL AND prev.gmaps_rating IS NOT NULL:
    IF ABS(new.gmaps_rating - prev.gmaps_rating) >= 0.1:
        diff_found = TRUE
        diff_detail.rating_delta = new.gmaps_rating - prev.gmaps_rating

// Review count diff
IF new.gmaps_reseñas IS NOT NULL AND prev.gmaps_reseñas IS NOT NULL:
    IF ABS(new.gmaps_reseñas - prev.gmaps_reseñas) >= 2:
        diff_found = TRUE
        diff_detail.resenas_delta = new.gmaps_reseñas - prev.gmaps_reseñas

// Sentiment structure diff (key changes in positive/negative ratios)
IF new.gmaps_sentiment IS NOT NULL AND prev.gmaps_sentiment IS NOT NULL:
    IF new.gmaps_sentiment->>'positive_ratio' != prev.gmaps_sentiment->>'positive_ratio':
        diff_found = TRUE
        diff_detail.sentiment_changed = TRUE

OUTPUT: diff_found (BOOLEAN), diff_detail (JSON)
```

**Threshold summary**:

| Field | Meaningful change threshold |
|---|---|
| `gmaps_rating` | ≥ 0.1 absolute delta |
| `gmaps_reseñas` | ≥ 2 count delta |
| `gmaps_sentiment` | `positive_ratio` key value changed |

If `diff_found = TRUE` → trigger PDF cascade and email.
If `diff_found = FALSE` → log `scrape_status = 'no_diff'`, skip PDFs, no email.

**Reference**: `gmaps_historico` schema (confirmed `gmaps_rating`, `gmaps_reseñas`, `gmaps_sentiment` exist), `scripts/gbp/SESION_2026-08-24_ARQUITECTURA.md`

---

### Q4: Email Recipients

**Answer**: Per-client gestor lookup via `clientes.clientes.gestor_id` → `auth.usuarios.email`.

**Lookup SQL**:
```sql
SELECT u.email
FROM clientes.clientes c
JOIN auth.usuarios u ON u.id = c.gestor_id
WHERE c.id = $1;
```

- If `gestor_id` is NULL or the JOIN yields no result, fallback to `rafaeldelinares@gmail.com`.
- Both the gestor email AND `rafaeldelinares@gmail.com` receive the email (CC).

**Reference**: `clientes.clientes.gestor_id` (integer, confirmed exists), `auth.usuarios` (confirmed has `id`, `email`)

---

### Q5: Idempotency + Alerts + Logging

**Answer**:

**Idempotency — state machine on `scrape_schedule.scrape_status`**:

```
State: pending → running → ok | failed | no_diff
```

- Before processing a client: `UPDATE scrape_schedule SET scrape_status='running' WHERE cliente_id=$1 AND scrape_status='pending'`
- If `scrape_status != 'pending'` → skip client (already processed today)
- After completion: `UPDATE scrape_schedule SET scrape_status='ok'|'failed'|'no_diff', last_scrape_at=NOW() WHERE cliente_id=$1`

**Alerting — consecutive failure counter**:

- Maintain `scrape_schedule.scrape_count` (increments each scrape attempt)
- If `scrape_status = 'failed'` AND `scrape_count >= 3` for same client → send alert email to `rafaeldelinares@gmail.com` with subject `[SCRAPE ALERT] Client X failing 3+ consecutive runs`
- Alert is sent ONCE per failure streak (not every run); counter resets when `ok` or `no_diff` is achieved.

**Logging — `clientes.scrape_events`**:

Every scrape attempt produces exactly ONE row:
```sql
INSERT INTO clientes.scrape_events
  (cliente_id, trigger_type, scrape_status, duration_seconds, error_message, n_results)
VALUES ($1, $2, $3, $4, $5, $6);
```

- `trigger_type`: `'cita_proxima'` | `'mantenimiento'` | `'manual'`
- `scrape_status`: `'ok'` | `'failed'` | `'no_diff'` | `'skipped'`
- `duration_seconds`: time from SSH command issued to result received
- `error_message`: populated on `'failed'`, NULL otherwise
- `n_results`: number of data points scraped (e.g., review count), populated on `'ok'`

**Reference**: `scrape_schedule` schema (confirmed `cliente_id`, `last_scrape_at`; new cols added per DDL), `scrape_events` (new table per DDL)

---

## Requirements

### REQ-001: Trigger 1 — Cita Proxima Detection

**Description**: The system SHALL detect clients with a cita (appointment) in the next 5 days whose last scrape is older than 3 days, using a deterministic daily SQL query.

**Acceptance Criteria**:

#### Scenario: Clients with cita in window and stale data are selected

- GIVEN client C has a `pendiente` cita on `operaciones.llamadas_programadas` with `fecha_programada` in `[NOW, NOW + 5 days]`
- AND `clientes.scrape_schedule` for C has `last_scrape_at` older than 3 days OR is NULL
- WHEN the daily cron trigger fires at 02:00
- THEN C appears in the Trigger 1 query result set ordered by `fecha_programada` ASC

#### Scenario: Clients with fresh data are excluded

- GIVEN client C has a `pendiente` cita within 5 days
- AND `scrape_schedule.last_scrape_at` is within the last 3 days
- WHEN the Trigger 1 query runs
- THEN C does NOT appear in the result set

#### Scenario: Clients without citas are excluded

- GIVEN client C has no row in `operaciones.llamadas_programadas` with `fecha_programada` within 5 days
- WHEN the Trigger 1 query runs
- THEN C does NOT appear in the result set regardless of `last_scrape_at`

#### Scenario: Inactive clients are excluded

- GIVEN client C has `estado != 'activo'`
- WHEN the Trigger 1 query runs
- THEN C does NOT appear in the result set

---

### REQ-002: Freshness Threshold with Cita

**Description**: Clients with a cita within 5 days SHALL be re-scraped only when their last scrape is older than 3 days.

**Acceptance Criteria**:

#### Scenario: Exactly 3-day-old scrape triggers re-scrape

- GIVEN client C's `scrape_schedule.last_scrape_at = NOW() - interval '3 days'`
- WHEN the Trigger 1 freshness condition is evaluated
- THEN C is included (threshold is `< NOW() - 3 days`, i.e., strictly older than 3 days)

#### Scenario: 2-day-old scrape does not trigger re-scrape

- GIVEN client C's `scrape_schedule.last_scrape_at = NOW() - interval '2 days'`
- WHEN the Trigger 1 freshness condition is evaluated
- THEN C is NOT included

---

### REQ-003: Scraping via SSH to OnePlus

**Description**: For each client returned by Trigger 1 or Trigger 2, the system SHALL execute a scraping command on the OnePlus 10T via SSH, using the `SSH` n8n node with the VPS-generated private key.

**Acceptance Criteria**:

#### Scenario: SSH connection to OnePlus succeeds

- GIVEN the n8n workflow is processing client C
- AND the OnePlus 10T is reachable at `100.89.189.113:8022`
- WHEN the `SSH` node executes `python3 ~/competitive_analysis.py --cliente-id C --json-output`
- THEN the command returns within 180 seconds with JSON output containing `gmaps_rating`, `gmaps_reseñas`, `gmaps_sentiment`, and `raw_json`

#### Scenario: SSH connection to OnePlus fails

- GIVEN the n8n workflow is processing client C
- AND the OnePlus 10T is unreachable (offline, network issue)
- WHEN the `SSH` node times out after 60 seconds
- THEN the system sets `scrape_schedule.scrape_status = 'failed'` and `scrape_schedule.last_error = 'SSH connection failed'`
- AND a row is inserted into `scrape_events` with `scrape_status = 'failed'` and `error_message = 'SSH connection failed'`
- AND the workflow proceeds to the next client (no crash)

#### Scenario: Pre-flight check prevents scrape on offline OnePlus

- GIVEN the OnePlus 10T is offline at cron time
- WHEN the pre-flight SSH connectivity test fails
- THEN all clients for that day's run are marked `scrape_status = 'failed'` with `last_error = 'OnePlus offline'`
- AND the daily run terminates gracefully

---

### REQ-004: Snapshot Persistence in gmaps_historico

**Description**: After each successful scrape, the system SHALL insert a new snapshot row into `clientes.gmaps_historico` with the scraped data before running diff detection.

**Acceptance Criteria**:

#### Scenario: New snapshot inserted after successful scrape

- GIVEN the SSH scrape for client C returns valid data
- WHEN the workflow completes the scrape
- THEN exactly one new row is inserted into `clientes.gmaps_historico` with `cliente_id = C`, `gmaps_rating`, `gmaps_reseñas`, `gmaps_sentiment`, and `raw_json`
- AND `fecha_snapshot = CURRENT_DATE`

#### Scenario: No snapshot inserted on scrape failure

- GIVEN the SSH scrape for client C fails (connection error or script error)
- WHEN the scrape completes with failure
- THEN no new row is inserted into `clientes.gmaps_historico`
- AND `scrape_schedule.last_error` is updated with the error message

---

### REQ-005: Diff Detection

**Description**: The system SHALL compare the newly inserted snapshot against the most recent prior snapshot for the same client, and determine whether a "meaningful change" occurred based on the threshold table.

**Acceptance Criteria**:

#### Scenario: Rating delta of 0.1 triggers diff

- GIVEN client C's new snapshot has `gmaps_rating = 4.3`
- AND the previous snapshot has `gmaps_rating = 4.1`
- WHEN the diff detection runs
- THEN `diff_found = TRUE` (delta = 0.2 ≥ 0.1 threshold)

#### Scenario: Review count delta of 2 triggers diff

- GIVEN client C's new snapshot has `gmaps_reseñas = 47`
- AND the previous snapshot has `gmaps_reseñas = 44`
- WHEN the diff detection runs
- THEN `diff_found = TRUE` (delta = 3 ≥ 2 threshold)

#### Scenario: Sub-threshold changes do not trigger diff

- GIVEN client C's new snapshot has `gmaps_rating = 4.2` and previous `gmaps_rating = 4.15`
- AND `gmaps_reseñas` delta is 1
- AND `gmaps_sentiment.positive_ratio` is unchanged
- WHEN the diff detection runs
- THEN `diff_found = FALSE`

#### Scenario: No previous snapshot treated as full diff

- GIVEN client C has no prior row in `gmaps_historico`
- WHEN the first scrape completes
- THEN `diff_found = TRUE` (first snapshot always triggers cascade)

---

### REQ-006: PDF Cascade — Estado GBP + Informe Competitivo

**Description**: When `diff_found = TRUE` for a Trigger 1 client, the system SHALL generate the two active PDF reports and email them to the resolved recipient(s).

**Acceptance Criteria**:

#### Scenario: PDFs generated and emailed on meaningful diff

- GIVEN `diff_found = TRUE` for client C
- WHEN the PDF cascade begins
- THEN `estado_gbp_v2.py --cliente-id C` generates `estado_gbp_<C>.pdf`
- AND `informe_competitivo_v2.py --cliente-id C` generates `informe_competitivo_<C>.pdf`
- AND both PDFs are attached to a single email sent to the resolved recipient(s)

#### Scenario: No PDFs generated when no meaningful diff

- GIVEN `diff_found = FALSE` for client C
- WHEN the diff detection completes
- THEN NO PDF files are generated
- AND NO email is sent
- AND `scrape_schedule.scrape_status = 'no_diff'`

#### Scenario: PDFs not stored after sending

- GIVEN PDFs for client C have been generated and emailed
- WHEN email delivery is confirmed
- THEN the temporary PDF files are deleted from the filesystem
- AND no PDF artifact is persisted to disk

---

### REQ-007: Email to Gestor

**Description**: The system SHALL send the PDF bundle to the client's gestor, with `rafaeldelinares@gmail.com` as CC, using the SMTP credential `8NbamWrMdRexLNwa`.

**Acceptance Criteria**:

#### Scenario: Email sent to gestor with CC

- GIVEN client C has `gestor_id = G`
- AND `auth.usuarios.id = G` has `email = 'gestor@example.com'`
- WHEN the email is composed
- THEN `TO: gestor@example.com`
- AND `CC: rafaeldelinares@gmail.com`
- AND subject contains the client name and date

#### Scenario: Fallback to rafaeldelinares@gmail.com when gestor has no email

- GIVEN client C has `gestor_id = NULL` or the JOIN yields no email
- WHEN the email recipient is resolved
- THEN `TO: rafaeldelinares@gmail.com`
- AND `CC:` is omitted

#### Scenario: Email with no diff — no email sent

- GIVEN `diff_found = FALSE` for client C
- WHEN the workflow completes
- THEN NO email is sent regardless of recipient availability

---

### REQ-008: Trigger 2 — Mantenimiento with Daily Cup

**Description**: The system SHALL detect clients without a cita in the next 14 days whose last scrape is older than 30 days, and scrape up to 10 unique clients per day in oldest-first order.

**Acceptance Criteria**:

#### Scenario: Excludes clients with cita in 14-day window

- GIVEN client C has a `pendiente` cita on `operaciones.llamadas_programadas` with `fecha_programada` in `[NOW, NOW + 14 days]`
- WHEN the Trigger 2 query runs
- THEN C does NOT appear in the result set

#### Scenario: Excludes clients scraped within 30 days

- GIVEN client C's `scrape_schedule.last_scrape_at = NOW() - interval '20 days'`
- WHEN the Trigger 2 freshness condition is evaluated
- THEN C is NOT included

#### Scenario: Respects daily cup of 10 clients

- GIVEN more than 10 clients match the Trigger 2 criteria
- WHEN the query executes with `LIMIT 10`
- THEN only 10 clients are returned, ordered by `last_scrape_at ASC NULLS FIRST`

#### Scenario: No email sent for mantenimiento clients

- GIVEN client C is scraped via Trigger 2
- WHEN the scrape completes successfully
- THEN NO email is sent
- AND `scrape_schedule.last_trigger = 'mantenimiento'`
- AND `scrape_schedule.scrape_status = 'ok'`

#### Scenario: Trigger 2 does not run rank queries

- GIVEN client C is processed via Trigger 2 (mantenimiento)
- WHEN the scraping script runs
- THEN only the static GBP ficha is scraped (no rank position queries)
- AND the scrape uses the `mantenimiento` invocation mode

---

### REQ-009: Freshness Threshold without Cita (30 days)

**Description**: Clients without a cita in the next 14 days SHALL be considered for mantenimiento scraping only when their last scrape is older than 30 days.

**Acceptance Criteria**:

#### Scenario: Exactly 30-day-old scrape does not trigger mantenimiento

- GIVEN client C's `scrape_schedule.last_scrape_at = NOW() - interval '30 days'`
- WHEN the Trigger 2 freshness condition is evaluated
- THEN C is NOT included (threshold is strictly older than 30 days)

#### Scenario: 31-day-old scrape triggers mantenimiento

- GIVEN client C's `scrape_schedule.last_scrape_at = NOW() - interval '31 days'`
- WHEN the Trigger 2 freshness condition is evaluated
- THEN C is included

---

### REQ-010: Idempotency — No Double Scraping

**Description**: The system SHALL ensure that re-running either workflow on the same day does not re-scrape a client that has already been processed.

**Acceptance Criteria**:

#### Scenario: Client already processed today is skipped

- GIVEN `scrape_schedule.scrape_status = 'ok'` for client C from today's run
- WHEN Trigger 1 or Trigger 2 queries run later the same day
- THEN C does NOT appear in the result set

#### Scenario: Client with pending status from failed run is retried

- GIVEN `scrape_schedule.scrape_status = 'failed'` for client C from today's run
- AND `scrape_schedule.last_error` is set
- WHEN Trigger 1 or Trigger 2 queries run
- THEN C appears in the result set (eligible for retry)

#### Scenario: Soft lock prevents concurrent processing

- GIVEN client C is currently being processed (`scrape_status = 'running'`)
- AND a second workflow execution starts
- WHEN the second execution queries client C
- THEN C is skipped because `scrape_status != 'pending'`

---

### REQ-011: Alerting — Consecutive Failures

**Description**: The system SHALL alert `rafaeldelinares@gmail.com` when a client fails to scrape 3 or more consecutive times.

**Acceptance Criteria**:

#### Scenario: Alert fires on 3rd consecutive failure

- GIVEN client C has `scrape_count = 2` and `scrape_status = 'failed'`
- WHEN a new scrape attempt fails for C
- THEN an alert email is sent to `rafaeldelinares@gmail.com` with subject `[SCRAPE ALERT] Client C failing 3+ consecutive runs`
- AND the alert reason includes the last error message

#### Scenario: Alert not fired on successful scrape

- GIVEN client C has `scrape_count >= 3` with mixed `ok` and `failed` in history
- AND the most recent scrape for C has `scrape_status = 'ok'`
- WHEN a new scrape attempt fails
- THEN the consecutive failure counter resets
- AND no alert is sent yet (only 1 failure in current streak)

#### Scenario: Alert not fired for no_diff status

- GIVEN client C has `scrape_status = 'no_diff'`
- WHEN a new scrape attempt fails
- THEN this is considered the first failure of a new streak

---

### REQ-012: Logging — scrape_events Audit Log

**Description**: Every scrape attempt SHALL produce exactly one row in `clientes.scrape_events` capturing trigger type, status, duration, and outcome.

**Acceptance Criteria**:

#### Scenario: Successful scrape logged with metrics

- GIVEN client C's scrape completes with `scrape_status = 'ok'`
- WHEN the workflow inserts the log row
- THEN `scrape_events.cliente_id = C`
- AND `scrape_events.trigger_type` is `'cita_proxima'` or `'mantenimiento'`
- AND `scrape_events.scrape_status = 'ok'`
- AND `scrape_events.duration_seconds` is populated
- AND `scrape_events.n_results` is the review count from the scrape

#### Scenario: Failed scrape logged with error message

- GIVEN client C's scrape fails with error "SSH connection timeout"
- WHEN the workflow inserts the log row
- THEN `scrape_events.scrape_status = 'failed'`
- AND `scrape_events.error_message = 'SSH connection timeout'`
- AND `scrape_events.duration_seconds` is populated

#### Scenario: Skipped client logged

- GIVEN client C is skipped because `scrape_status != 'pending'`
- WHEN the workflow inserts the log row
- THEN `scrape_events.scrape_status = 'skipped'`
- AND `n_results` and `error_message` are NULL

---

### REQ-013: DDL Migration

**Description**: The system SHALL apply the schema extensions to `clientes.scrape_schedule` and create `clientes.scrape_events` using idempotent DDL statements executed via `psql` directly (not via MCP).

**Acceptance Criteria**:

#### Scenario: ALTER TABLE scrape_schedule adds 5 columns idempotently

- GIVEN the DDL runs on a clean `scrape_schedule` (only `cliente_id` and `last_scrape_at`)
- WHEN the `ALTER TABLE` statements execute
- THEN all 5 new columns exist: `next_scrape_at`, `scrape_count`, `scrape_status`, `last_error`, `last_trigger`
- AND existing rows have `scrape_status = 'pending'`, `scrape_count = 0`

#### Scenario: CREATE TABLE scrape_events succeeds

- GIVEN `scrape_events` does not exist
- WHEN the `CREATE TABLE` statement executes
- THEN the table is created with the specified schema
- AND subsequent re-runs with `IF NOT EXISTS` produce no error

#### Scenario: DDL is re-runnable (idempotent)

- GIVEN the DDL has already been applied
- WHEN the DDL scripts run again
- THEN each statement completes without error (`IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`)
- AND no data is lost or modified

---

## Non-Requirements (Out of Scope)

1. **Refresh Leads trigger** — `operaciones.leads` scraping and DDL additions (`data_refreshed_at`, `has_email`, etc.) are deferred to a separate SDD change.
2. **Dashboard web** — No Streamlit or React UI for scraper status monitoring in this phase.
3. **gmaps_historico_diffs table** — Diff history table with AFTER INSERT trigger deferred to Phase 2.
4. **PDF storage** — PDFs are sent and deleted; no persistent storage of PDF artifacts.
5. **Google Maps rate-limit retry logic** — Exponential backoff in `competitive_analysis.py` is out of scope; the script handles this internally if implemented.
6. **Rank position tracking for mantenimiento clients** — Trigger 2 scrapes static ficha only, no rank queries.

---

## Edge Cases

### Client without place_id
- Clients whose `gmaps_fichas` record has no `place_id` rely on `nombre_comercial` for scraping.
- The scraping script (`competitive_analysis.py`) uses `nombre_fiscal` as the search term when `place_id` is absent.
- The WF does NOT skip such clients; the scraping script handles the fallback internally.

### Client without email for gestor
- If `clientes.gestor_id` is NULL or the `auth.usuarios` lookup yields no email, the system falls back to `rafaeldelinares@gmail.com` as the sole recipient (no CC).

### OnePlus offline during cron
- Pre-flight SSH check fails → all clients for that run get `scrape_status = 'failed'`, `last_error = 'OnePlus offline'`.
- No scrape events logged for individual clients (the run itself failed at pre-flight).
- Alert fired if this is the 3rd consecutive failure for any client in the previous run.

### Email delivery failure (rebound)
- If the `Send Email` node returns an error, the workflow catches it and:
  - Sets `scrape_status = 'failed'` with `last_error = 'Email delivery failed'`
  - Logs the failure in `scrape_events`
  - Does NOT retry within the same run (retry next day).

### Workflow fired twice same day
- First run: clients go `pending → running → ok/failed/no_diff`
- Second run (same day): `scrape_status != 'pending'` → clients are skipped (`skipped` logged in `scrape_events`)

### Previous snapshot missing (first scrape)
- If `gmaps_historico` has no prior row for the client, `diff_found = TRUE` by definition.
- The diff detection code performs a `LEFT JOIN` to get the previous snapshot; NULL previous snapshot triggers full diff.

### Snapshot data missing critical fields
- If the scraped data has NULL for `gmaps_rating` or `gmaps_reseñas`, those specific field comparisons are skipped.
- `raw_json` being NULL does not prevent snapshot insertion but does affect diff detection.

---

## Requirement Summary

| ID | Name | Trigger | Email? |
|----|------|---------|--------|
| REQ-001 | Cita Proxima Detection | Trigger 1 | — |
| REQ-002 | Freshness Threshold with Cita (3d) | Trigger 1 | — |
| REQ-003 | SSH Scraping via OnePlus | Both | — |
| REQ-004 | Snapshot Persistence | Both | — |
| REQ-005 | Diff Detection | Trigger 1 | — |
| REQ-006 | PDF Cascade (Estado GBP + Informe Competitivo) | Trigger 1 + diff | Yes |
| REQ-007 | Email to Gestor | Trigger 1 + diff | Yes |
| REQ-008 | Mantenimiento with Daily Cup (10) | Trigger 2 | No |
| REQ-009 | Freshness Threshold without Cita (30d) | Trigger 2 | — |
| REQ-010 | Idempotency / No Double Scraping | Both | — |
| REQ-011 | Alerting on Consecutive Failures | Both | Yes |
| REQ-012 | Logging — scrape_events | Both | — |
| REQ-013 | DDL Migration | Both | — |
