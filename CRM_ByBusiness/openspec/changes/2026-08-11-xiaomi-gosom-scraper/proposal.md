# 2026-08-11-xiaomi-gosom-scraper

## Why

El scraper actual en xiaomi-12 está **completamente caído** y los cron jobs están desactivados:

- **Wrapper roto**: `~/xiaomi-gb-scape/lib/crm-gb-scap.js` (puppeteer-core + cookies) — 21,978 líneas de código frágil. URL `?cid=` deprecada por Google, selectores HTML outdated, falta dep `@puppeteer/browsers`.
- **Cron jobs desactivados**: `feed-leads-v2.sh`, `audit-clientes-v2.sh`, `search-cids-v2.sh`, `watchdog.sh` — crontab vaciado desde el diagnóstico de la sesión 2026-08-11.
- **Deuda acumulada**: 5,275 leads sin CID "archivados" por scraper inoperativo. **9 leads con estado `vendido` sin CID son ORO** — clientes que ya pagaron y necesitan re-contacto.
- **Contactabilidad degradada**: threshold temporal en 90 días (vs 30 originales) porque scrapers están DOWN desde ~2026-05-09. Volver a 30 días requiere scraper operativo.
- **Alternativas descartadas**: Places API (rechazado por usuario — costo). VPS migration (rechazado — mantener xiaomi-12).

**Adoptar `gosom/google-maps-scraper`** (⭐ 5.5k stars, MIT, 326 commits, Go + Playwright) como reemplazo:
- Mejor anti-detección que puppeteer-core (Playwright sobre Chromium evita heurísticas de Puppeteer).
- CLI batch file-based con output CSV / JSON / PostgreSQL directo vía `-dsn`.
- 36 data points por lugar (name, place_id, cid, rating, reviews, address, phone, website, lat/lng, popular_times, owner, hours, photos, attributes, reviews_per_rating, etc).
- Throughput documentado ~120 places/min con `-c 8 -depth 1`.
- Sin cookies, sin sesión persistente — stateless y resistente.

**Decisiones ya adoptadas** (no re-debatir):
- ✅ `gosom/google-maps-scraper` como tecnología objetivo.
- ✅ Mantener `xiaomi-12` como host (no migrar a VPS).
- ✅ Mantener webhooks n8n existentes (`EPjSea8GBZsTVKkk` / `fJy7pfNYVZqj6LXY`).
- ✅ Mantener DB schema actual (`crm_bybusiness.operaciones.leads`, `clientes.clientes`, `clientes.gmaps_fichas`, `clientes.gbp_audit_history`).
- ❌ NO Places API.
- ❌ NO cambio de DB schema.

## What changes

### Engine: `puppeteer-core + cookies` → `gosom/google-maps-scraper` (Go + Playwright)

- **Wrapper**: `~/xiaomi-gb-scape/lib/crm-gb-scap.js` queda reemplazado por `crm-gb-scap.sh` (orquesta gosom CLI) + archivos `.bak-pre-*` como fallback.
- **Paradigma**: HTTP server on-demand → **CLI batch file-based**. Cambio importante: scraper ya no responde a una llamada HTTP; consume listas de CIDs/URLs desde archivos en disco y produce JSON/CSV.
- **Anti-detección**: Playwright reemplaza puppeteer-core. Sin cookies persistentes; throughput esperado ~120 places/min vs ~30-50 previo.

### Cron jobs (mantienen nombre, cambian internamente)

| Script | Cambio |
|---|---|
| `feed-leads-v2.sh` | Lista CIDs desde DB → archivo input → invoca gosom CLI → webhook `CRM_GB_SCAPE_SAVE_LEAD` |
| `audit-clientes-v2.sh` | Lista clientes con `gmaps_url` → archivo input → invoca gosom CLI → webhook `CRM_GB_SCAPE_SAVE_CLIENTE` |
| `search-cids-v2.sh` | **Reescrito**: pre-resuelve URLs de Google Search → extrae CIDs → enqueue a `feed-leads-v2.sh` (gosom no tiene search-by-name nativo) |
| `watchdog.sh` | Vigila exit code gosom + espacio en disco + alertas a webhook |

### Interfaz externa (sin cambios)

- **Webhooks n8n**: `CRM_GB_SCAPE_SAVE_LEAD` (`EPjSea8GBZsTVKkk`) y `CRM_GB_SCAPE_SAVE_CLIENTE` (`fJy7pfNYVZqj6LXY`) — contratos `{lead_id, audit_data}` y `{cliente_id, audit_data}` sin modificación.
- **DB schema**: `crm_bybusiness.operaciones.leads`, `clientes.clientes`, `clientes.gmaps_fichas`, `clientes.gbp_audit_history` — sin modificación.

### Specs impact

Este cambio **no introduce nuevas capabilities OpenSpec** a nivel de spec. La spec `cliente-gbp-audit` ya define el comportamiento esperado del scraper; el cambio es puramente de implementación interna. `sdd-spec` no generará delta specs nuevos.

## Impact

| Área | Tipo | Descripción |
|---|---|---|
| `xiaomi-12` (Tailscale 100.75.94.18:8022) | Modified | Reinstala gosom (Go binary aarch64) + dependencias runtime |
| `~/xiaomi-gb-scape/lib/crm-gb-scap.js` | Removed | Reemplazado; backup preservado como `.bak-pre-gosom` |
| `~/xiaomi-gb-scape/scripts/feed-leads-v2.sh` | Modified | Invoca gosom CLI vía subprocess |
| `~/xiaomi-gb-scape/scripts/audit-clientes-v2.sh` | Modified | Invoca gosom CLI vía subprocess |
| `~/xiaomi-gb-scape/scripts/search-cids-v2.sh` | Rewritten | Pre-resuelve URLs de Google Search → CIDs antes de gosom |
| `~/xiaomi-gb-scape/scripts/watchdog.sh` | Modified | Vigila gosom + espacio disco |
| `~/xiaomi-gb-scape/lib/google_session.json` | Unchanged | Quedará sin uso (gosom no usa cookies) |
| `crontab` xiaomi-12 | Modified | Reactivar jobs con scripts v3 |
| n8n workflows `CRM_GB_SCAPE_SAVE_*` | Unchanged | contratos `{lead_id, audit_data}` y `{cliente_id, audit_data}` |
| DB `crm_bybusiness` | Unchanged | schema persiste |
| `[parallel]` `openspec/changes/2026-08-11-gbp-ficha-enrichment` | Unaffected | Trabaja sobre el output del scraper — ambos convergen en DB |

## Out of scope

- ❌ NO Places API (rechazado por usuario en sesión anterior).
- ❌ NO migrar scraper a VPS (queremos xiaomi-12).
- ❌ NO cambiar DB schema (mantener `operaciones.leads`, `clientes.gmaps_fichas`).
- ❌ NO rediseñar frontend CRM (sprint `gbp-ficha-enrichment` es quien toca UI).
- ❌ NO nuevos contratos n8n (mantener `EPjSea8GBZsTVKkk` / `fJy7pfNYVZqj6LXY`).
- ❌ NO nuevas fuentes de scraper (solo restaurar — Adapters de Yelp, Foursquare, etc no entran aquí).
- ❌ NO anti-detección avanzada (proxies rotativos, captcha solving) — fuera de scope inicial.

## Acceptance criteria

- [ ] **Cron jobs activos**: `crontab -l` muestra los 4 jobs (`feed-leads-v2`, `audit-clientes-v2`, `search-cids-v2`, `watchdog`).
- [ ] **gosom operativo en xiaomi-12**: binario Go nativo funcional (sin Docker).
- [ ] **DB persiste data real**: sample de 10 leads procesados, 0% URLs bogus en `operaciones.leads.url` (validación manual).
- [ ] **`search-cids-v2.sh` resuelve**: URL de Google Search → CID → enqueue a `feed-leads-v2.sh`.
- [ ] **9 leads "vendido" sin CID obtienen CID** (gold test, base del negocio).
- [ ] **Watchdog alerta en fallo**: exit code != 0 de gosom dispara notificación.
- [ ] **Webhooks n8n** `CRM_GB_SCAPE_SAVE_LEAD` / `CRM_GB_SCAPE_SAVE_CLIENTE` reciben payloads y `status: success`.
- [ ] **Backups `*.bak-pre-*` preservados** durante todo el sprint.
- [ ] **Storage liberado** suficiente para gosom binary (~50MB) + temporales (~20MB).
- [ ] **Backfill operativo**: workflow `CRM_BACKFILL_REPUTACION` puede ejecutarse cuando scraper esté estable.

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| **Docker NO disponible en xiaomi-12** (Android Termux aarch64) | Alta (confirmado) | Go binary nativo cross-compiled desde Linux amd64 → aarch64. Alternativa degradada: gosom en VPS vía SSH + rsync (no preferida). |
| **Storage 100% lleno (741MB / 741MB)** | Alta (confirmado) | Limpieza pre-deploy: `pm clear`, logrotate, `apt clean`, gosom output a `/dev/shm` ramdisk. **Posponer sprint si no resuelve**. |
| **gosom NO tiene search-by-name** | Alta (confirmado en repo) | Pre-step en `search-cids-v2.sh`: extraer URLs de Google Search (HTML parsing con curl + jq) → invocar gosom por URL. |
| **Cambio paradigma on-demand → batch** | Alta | Documentar; aceptar latencia de cron; rediseño del watchdog. Cron jobs siguen satisfaciendo SLA operativo. |
| **Throughput menor al esperado** | Media | gosom usa Playwright sin cookies; menor stealth que cookies manuales. Monitorear CAPTCHA; bajar `-c` si hay rate limiting. |
| **Anti-detección Google (CAPTCHA / shadow ban)** | Media | Bajar concurrencia (`-c 4` inicio), exit-on-inactivity, monitor watchdog. Aceptar throughput ~50-80 places/min inicialmente. |
| **Cross-compilation aarch64 fallida** | Baja | Verificar build local antes de deploy a xiaomi-12. Test binario en QEMU aarch64 si disponible. |
| **Permisos Termux + Tailscale** | Baja | Tailscale stable en xiaomi-12; `pm clear` requiere `--user 0` desde adb. |

## Rollback plan

- **Backups `*.bak-pre-*` preservados** en `~/xiaomi-gb-scape/` (estado al cierre de la sesión diagnóstica).
- **Restaurar wrapper Node.js**:
  ```bash
  ssh xiaomi-12 "cd ~/xiaomi-gb-scape && \
    cp lib/crm-gb-scap.js.bak-pre-gosom lib/crm-gb-scap.js && \
    npm install --prefix . && \
    crontab crontab.bak-pre-gosom"
  ```
- **Tiempo de rollback estimado**: < 15 min (scripts locales + crontab).
- **DB no cambia** → rollback de datos no aplica.
- **Webhooks n8n no cambian** → no requieren rollback.
- **Validación post-rollback**: ejecutar `crm-gb-scap --help` y revisar último log de cron job.

## Dependencies

- `gosom/google-maps-scraper` binary cross-compiled aarch64 (~50MB). Build local en `/opt/fabrica/` desde release v0.7.0+ (commit estable).
- Go runtime NO requerido (gosom es binario estático).
- Termux packages: `curl`, `jq`, `bash`, `coreutils` (la mayoría ya instalados).
- Tailscale functional (verificar `tailscale status` antes de deploy).
- DB `crm_bybusiness` accesible vía webhooks n8n (sin cambios).
- n8n workflows `CRM_GB_SCAPE_SAVE_LEAD` y `CRM_GB_SCAPE_SAVE_CLIENTE` activos.

## Architectural decision (a resolver en design phase)

**Docker vs Go binary nativo en xiaomi-12**:

| Opción | Pros | Contras |
|---|---|---|
| **Go binary nativo** | Independiente, sin daemon, sin storage extra, simple | Cross-compile manual, sin `gosom` GUI, sin `-web` UI |
| Docker | Imagen oficial, Playwright embedded, web UI | NO disponible en Termux aarch64 |
| gosom en VPS (SSH) | No impacta xiaomi-12 | Latencia, doble deploy, contradice "queremos xiaomi-12" |

**Recomendación**: **Go binary nativo**. Confirmar factibilidad de cross-compile en `sdd-design`.

## Open questions

- ¿Qué versión exacta de gosom release usar? (v0.7.0+ recomendada, validar compat con Playwright actual).
- ¿Lanzar binary como background daemon o por cron directo? (cron directo: más simple; daemon: control PID).
- ¿Política de retención de archivos temporales de gosom? (recomendado: borrar después de webhook success).
- ¿Backfill de los 5,275 leads sin CID: gradual o agresivo? (propuesta: gradual 50 leads/día para evitar rate limit).
- ¿Notificación de watchdog: webhook nuevo o email? (recomendado: webhook a `CRM_WATCHDOG_ALERT`).

## Preflight

- **Pace**: A2 (Auto) — ejecución autónoma, el usuario aprueba hitos.
- **Artifacts**: B1 (OpenSpec) — propuesta + specs + design + tasks en filesystem.
- **PRs**: C1 + C3 (Ask me + Chained) — confirmación humana por fase + sub-PRs por área.
- **Review budget**: D1 (400 lines) — límite de líneas por PR, work-unit commits.

## Owners

- **Implementador**: sub-agent `sdd-apply` (modelo: sonnet).
- **Spec writer**: sub-agent `sdd-spec` (modelo: sonnet).
- **Decisor**: Rafael (querystate, prioridad comercial).
- **Reviewer**: Rafael (chained PRs).

## Referencias

- Engram `#1677` — xiaomi-12 wrapper roto: scraper Plan A quebrado, crons desactivados.
- Engram `#1674` — Exploración Google APIs para mejorar GBP audit.
- Engram `#1668` — xiaomi-12 `crm-gb-scap` standalone con Plan A (Node.js).
- Engram `#1669` — Plan A+C: scripts v2 con API REST para leads/clientes.
- Sprint paralelo: `openspec/changes/2026-08-11-gbp-ficha-enrichment/` (consume output del scraper).
- gosom repo: `https://github.com/gosom/google-maps-scraper` (⭐ 5.5k, MIT).
- xiaomi-12 host: `ssh rafael@100.75.94.18:8022` via Tailscale.
- Webhooks n8n: `EPjSea8GBZsTVKkk` (LEAD), `fJy7pfNYVZqj6LXY` (CLIENTE).
- DB: `crm_bybusiness` (22,864 leads totales; 17,589 con CID; 5,275 sin CID).
