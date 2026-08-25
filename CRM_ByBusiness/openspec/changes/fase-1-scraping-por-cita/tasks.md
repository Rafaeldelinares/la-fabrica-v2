---
id: 1923
sync_id: "obs-28b0e796cd889893"
title: "Tasks: fase-1-scraping-porcita SDD"
type: plan
project: crm_bybusiness
topic_key: "sdd/fase-1-scraping-porcita/tasks"
scope: project
created_at: "2026-08-24 19:58:52"
updated_at: "2026-08-24 19:58:52"
revision_count: 1
tags: [engram, plan, crm_bybusiness]
---

# Tasks: fase-1-scraping-porcita SDD

# Tasks: fase-1-scraping-porcita

## Metadata

| Field | Value |
|-------|-------|
| Change | `fase-1-scraping-porcita` |
| Effort | ~3 days focused + 1 week monitoring |
| Branch | `feature/fase-1-scraping-porcita` |
| Commit convention | Conventional commits, max 3 files (GGA discipline) |
| Artifact store | `openspec` |
| Delivery strategy | `ask-on-risk` |
| Review workload risk | **HIGH** |
| Chained PRs recommended | **Yes** |

Decision needed before apply: **Yes**
Chained PRs recommended: **Yes**
Chain strategy: **pending** (awaiting user decision: stacked-to-main vs feature-branch-chain)
400-line budget risk: **High**

## Suggested Work Units (5 PRs)

| Unit | Goal | Base | Depends |
|------|------|------|---------|
| 1 | Infrastructure (DDL + SSH + Docker) | main | — |
| 2 | OnePlus wrapper + test | main | — |
| 3 | CRM_SCRAPEAR_POR_CITA WF + test | main | — |
| 4 | CRM_MANTENIMIENTO_SCRAPE WF + test | main | — |
| 5 | Monitoring (health check + runbook) | main | — |

## Phase 0 (2 tasks): Prerequisites
- T0.1: Verify scope/context, load design+spec, confirm VPS/OnePlus/n8n connectivity
- T0.2: pg_dump backup to /opt/fabrica/backups/crm/

## Phase 1 (8 tasks): Infrastructure
- T1.1: ALTER scrape_schedule (5 cols) → 01_alter_scrape_schedule.sql
- T1.2: CREATE scrape_events + 3 indexes → 02_create_scrape_events.sql
- T1.3: ADD consecutive_failures → 03_alter_scrape_schedule_consecutive_failures.sql
- T1.4: DEFER operaciones.leads DDL (Refresh Leads out of scope)
- T1.5: Generate ed25519 key on VPS at /root/.ssh/id_vps_to_oneplus
- T1.6: Push pubkey to OnePlus, append to authorized_keys, round-trip test
- T1.7: Bind-mount SSH key into n8n container, restart, round-trip from container
- T1.8: Verify Python deps (weasyprint, psycopg2, markdown) in n8n container; fix if missing

## Phase 2 (3 tasks): OnePlus Wrapper Script
- T2.1: Create competitive_analysis_oneplus.py at scripts/gbp/competitive/
  - Interface: --cliente-id --json-output --mode {cita,mantenimiento}
  - cita = full scraping; mantenimiento = ficha only
  - JSON stdout: {success, raw_json, n_reviews, rating, sentiment, error}
- T2.2: Push to OnePlus via scp, chmod +x
- T2.3: Test with cliente 4 --mode cita, verify JSON output

## Phase 3 (4 tasks): WF CRM_SCRAPEAR_POR_CITA
- T3.1: Build 23-node workflow inactive (per design C2)
- T3.2: Test with cliente 4 (has cita 2026-08-26); verify gmaps_historico insert, scrape_schedule update, email+PDFs
- T3.3: Deactivate WF after test
- T3.4: Activate for production (cron 02:00 UTC)

## Phase 4 (3 tasks): WF CRM_MANTENIMIENTO_SCRAPE
- T4.1: Build ~10-node workflow inactive (per design C3, skips diff/PDFs/email)
- T4.2: Test with 1 client manually; verify no email, no PDFs, trigger_type='mantenimiento'
- T4.3: Activate for production (cron 03:00 UTC)

## Phase 5 (3 tasks): Monitoring + Runbook
- T5.1: health_check.sql query (last 24h, success rate, top-5 failures, avg duration)
- T5.2: RUNBOOK_fase1_scraping_por_cita.md (diagnostics, pause WF, manual scrape, rollback)
- T5.3: 7-day monitoring period, day-3 and day-7 reports to user

## Blocking Dependencies
T0 → T1.1-T1.8 → T2.1 → T2.2 → T2.3 → T3.1 → T3.2-T3.4
T1.1-T1.3 → T3.1 (DDL must exist before WF uses it)
T3.4 + T4.3 → T5.1 → T5.2 → T5.3

## Files to Create
- openspec/changes/fase-1-scraping-porcita/sql/01_alter_scrape_schedule.sql
- openspec/changes/fase-1-scraping-porcita/sql/02_create_scrape_events.sql
- openspec/changes/fase-1-scraping-porcita/sql/03_alter_scrape_schedule_consecutive_failures.sql
- openspec/changes/fase-1-scraping-porcita/sql/health_check.sql
- scripts/gbp/competitive/competitive_analysis_oneplus.py
- docs/RUNBOOK_fase1_scraping_por_cita.md

## Files to Modify
- /opt/fabrica/docker-compose.yml (bind-mount SSH key)
- /opt/fabrica/n8n-custom/Dockerfile (only if weasyprint missing)

## Total: 23 tasks across 6 phases
**Estimated time**: ~3 days focused + 1 week monitoring

---
*Engram · plan · crm_bybusiness · 2026-08-24 19:58:52*
