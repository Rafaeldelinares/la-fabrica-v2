# Design — 2026-08-11-xiaomi-audits-and-heatmaps

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│  xiaomi-12 (Termux, aarch64, bionic, sin Docker)                  │
│                                                                     │
│  cron daemon (crond)                                                │
│  ├── feed-leads-v2.sh        */30  →  curl crm-gb-scap:8095/scrape  │
│  ├── audit-clientes-v2.sh    0 3*  →  idem + INSERT snapshot       │
│  ├── audit-competencia.sh    0 4*0 →  curl crm-gb-scap:8095/search  │
│  ├── search-sector.sh        0 5*1 →  idem + UPSERT aggregate       │
│  ├── search-cids-v2.sh       0 */6 →  curl crm-gb-scap:8095/search  │
│  └── watchdog.sh             */5  →  arranca wrapper si caído        │
│                                                                     │
│  crm-gb-scap (Puppeteer-core + cookies)                            │
│  └── Ejecuta queries en google.com/maps con sesión cookie            │
│  └── Devuelve JSON con 36 campos (rating, reviews, address, etc.)   │
│                                                                     │
│  insert-audit-snapshot.sh                                            │
│  └── ssh→psql: INSERT a gbp_audit_history con snapshot JSONB        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓ POST
┌─────────────────────────────────────────────────────────────────────┐
│  VPS n8n (intacto)                                                  │
│                                                                     │
│  CRM_GB_SCAPE_SAVE_LEAD    (existente)                             │
│  └── UPSERT operaciones.leads con rating, num_reseñas, etc.         │
│                                                                     │
│  CRM_GB_SCAPE_SAVE_CLIENTE (existente)                             │
│  └── UPSERT clientes.gmaps_fichas + UPDATE clientes.clientes        │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ↓
┌─────────────────────────────────────────────────────────────────────┐
│  PostgreSQL (crm_bybusiness)                                       │
│                                                                     │
│  operaciones.leads            (existente, refresh por feed-leads)   │
│  clientes.clientes            (existente, refresh por audit-clientes)│
│  clientes.gmaps_fichas        (existente, refresh por audit-clientes)│
│  clientes.gbp_audit_history   (existente, snapshot por cron)       │
│  clientes.competencia         (nuevo,    comparación semanal)       │
│  sector_aggregates            (nuevo,    heatmap semanal)            │
└─────────────────────────────────────────────────────────────────────┘
```

## 2. Component Details

### 2.1 Puppeteer-core wrapper (crm-gb-scap)

**Setup**:
- Localizado en `~/xiaomi-gb-scape/lib/crm-gb-scap.js` (21,978 bytes)
- Cookies: `~/xiaomi-gb-scape/lib/google_session.json` (31 cookies)
- Headless shell: `/data/data/com.termux/files/usr/bin/chromium/headless_shell` (Termux built-in)
- Arranca con: `~/xiaomi-gb-scape/run/start.sh` (corre `node crm-gb-scap.js`)

**API endpoints**:
- `GET /healthz` → `{ok: true, browser: true}`
- `GET /run?place_id=<cid>&refresh=<bool>` → JSON 36 campos
- `POST /search-by-name` body `{name, locality, provincia, address}` → un solo resultado

**Campos scrapeados**: rating, reviews_count, address, phone, website, categoria_principal, horarios_dias_cubiertos, atributos_total, atributos_seteados, fotos_count, qa_count, posts_count, descripcion, reviews_respondidas_count, reviews_respondidas_pct, owner, price_range, timezone, latitude, longitude, cid, scraped_at, scrape_duration_ms, etc.

**Único bug**: la URL `?cid=` devuelve URL larga (no CID puro). Fix: extraer CID con regex en el cron.

### 2.2 cron scripts (5 en xiaomi-12)

Patrón común:
1. SSH a VPS, query SQL filtrada
2. Loop: para cada row, llamar wrapper via curl
3. Parser JSON, transformar
4. POST a webhook O INSERT directo a DB
5. Update state file (`state/*.json`) para tracking
6. Rate limiting via cron schedule (no `sleep` en script)

**Parámetros comunes**:
- `LIMIT=N`: cuántos procesar por ejecución
- `STATE_FILE`: tracking de cuáles ya están procesados
- `LOG_DIR`: logs por cron

**Helper `insert-audit-snapshot.sh`**:
- Recibe `cliente_id` + `audit_json` como args
- Pipe stdin a `psql -f` vía `docker exec`
- INSERT a `clientes.gbp_audit_history` con ON CONFLICT update

### 2.3 Webhooks (VPS, sin cambios)

`CRM_GB_SCAPE_SAVE_LEAD` y `CRM_GB_SCAPE_SAVE_CLIENTE` siguen con el mismo contrato. Los cron scripts los llaman con `audit_data` que el wrapper scrapa.

**Schema de `audit_data`**:
```json
{
  "lead_id": 1234,                  // save-lead
  "audit_data": {
    "place_id": "0xAA:0xBB",          // ya extraído del URL via regex
    "name": "Cerrajería X",
    "rating": 4.7,
    "reviews_count": 23,
    "phone": "+34...",
    "address": "...",
    "latitude": 40.4,
    "longitude": -3.7,
    ...
  }
}
```

## 3. Data Mapping

| wrapper field | webhook field | DB column | captured |
|---|---|---|---|
| `title` | `audit_data.name` | `clientes.gmaps_fichas.gmaps_nombre` | ✅ |
| `place_id` (URL → CID) | `audit_data.place_id` | `gmaps_fichas.google_cid` | ✅ |
| `rating` | `audit_data.rating` | `gmaps_fichas.gmaps_rating` | ✅ |
| `reviews_count` | `audit_data.reviews_count` | `gmaps_fichas.gmaps_reseñas` | ✅ |
| `phone` | `audit_data.phone` | `gmaps_fichas.gmaps_phone` | ✅ |
| `address` | `audit_data.address` | `gmaps_fichas.gmaps_address` | ✅ |
| `latitude` | (no en DB) | — | pendiente |
| `longitude` | (no en DB) | — | pendiente |
| `category` | `audit_data.categoria` | `gmaps_fichas.gmaps_categoria` | ✅ |
| `data_id` | (no en payload) | — | extraído via regex |
| `user_reviews` | (no en payload) | — | capturado en snapshot JSONB |

## 4. Cron Schedule

```
*/30 * * * *   feed-leads           cada 30min      ~50 leads/30min
0  3 * * *    audit-clientes       diario 3AM       ~30 clientes/3AM
0  4 * * 0    audit-competencia    semanal dom 4AM  ~30 clientes
0  5 * * 1    search-sector        semanal lun 5AM  ~200 leads/clientes
0  */6 * * *  search-cids          cada 6h         solo nuevos leads
*/5 * * * *   watchdog             cada 5min       wrapper monitor
```

**Rationale**:
- feed-leads `*/30`: high frequency porque rating/reviews cambian rápido
- audit-clientes `0 3`: diario madrugada, ejecutar cuando nadie usa el VPS
- audit-competencia `0 4 * 0`: semanal dominio (fresh data)
- search-sector `0 5 * 1`: semanal lunes (heatmap semanal)
- search-cids `0 */6`: medium frequency, solo leads sin CID
- watchdog `*/5`: live monitoring

## 5. Tablas Nuevas

### 5.1 clientes.competencia

```sql
CREATE TABLE clientes.competencia (
  id bigserial PRIMARY KEY,
  cliente_id bigint,
  audited_at timestamptz DEFAULT NOW(),
  categoria text,
  geo_lat numeric,
  geo_lng numeric,
  competitors_count int,
  competitors_avg_rating numeric,
  competitors_avg_reviews numeric,
  client_rating numeric,
  client_reviews int,
  position_pct numeric,
  raw_competitors jsonb
);
```

**Nota**: `competitors_count` y `competitors_avg_rating` vienen de **Google Maps** (search "<categoria> <ciudad>"), NO cuentan nuestros clientes.

### 5.2 sector_aggregates

```sql
CREATE TABLE sector_aggregates (
  id bigserial PRIMARY KEY,
  category text NOT NULL,
  geo_lat numeric NOT NULL,
  geo_lng numeric NOT NULL,
  count_in_1km int,
  avg_rating numeric,
  avg_reviews numeric,
  total_leads int,
  total_clientes int,
  heat_score numeric,
  updated_at timestamptz DEFAULT NOW(),
  UNIQUE (category, geo_lat, geo_lng)
);
```

**Heat score fórmula**: `count * log(1 + avg_rating * 10) * log(1 + avg_reviews / 100)`

## 6. Migration: gbp_audit_history constraint

```sql
ALTER TABLE clientes.gbp_audit_history
DROP CONSTRAINT gbp_audit_history_audit_source_check;

ALTER TABLE clientes.gbp_audit_history
ADD CONSTRAINT gbp_audit_history_audit_source_check
CHECK (audit_source = ANY (ARRAY[
  'manual'::text,
  'cache-refresh'::text,
  'scheduled'::text,
  'pre-audit-v2'::text,
  'pre-audit-v2-resume'::text,
  'backfill'::text,
  'cron_daily'::text,   -- NUEVO
  'cron_weekly'::text,  -- NUEVO
  'webhook'::text       -- NUEVO
]));
```

## 7. APIs del helper

### 7.1 `insert-audit-snapshot.sh`

```bash
insert-audit-snapshot.sh <cliente_id> <audit_json>
```

**Process**:
1. Python script inline
2. Extrae CID del URL via regex `0x[0-9a-f]+:0x[0-9a-f]+`
3. Escapa single quotes (SQL injection prevention)
4. Escribe SQL en temp file
5. `cat temp_file | ssh ... docker exec -i ... psql -U ... -d crm_bybusiness`
6. PostgreSQL procesa stdin

**Output**: `snapshot OK` o `snapshot FAIL: <error>`

## 8. Error Handling

### Watchdog pattern
```bash
#!/bin/bash
# Si wrapper no responde, reiniciar
if ! curl -sS http://127.0.0.1:8095/healthz -m 5 >/dev/null; then
  ~/xiaomi-gb-scape/run/start.sh
fi
```

### Retry en scripts
- Cada cron: si falla, log + exit (no retry)
- Próximo slot del cron retry automático
- Script con state file procesa solo nuevos en cada run

### Process death
- Wrapper zombie (timeout) matado manualmente en esta sesión
- Helper de cleanup: `kill -9 $(pgrep -f "timeout 600")` si lleva > 30min

## 9. Storage y Performance

| Recursos | Uso |
|---|---|
| xiaomi-12 RAM | 4.3GB used / 7GB total |
| Cookies | 15KB (31 entries en google_session.json) |
| Wrapper binary | 21KB |
| Logs rotación | Daily, max 5 archivos |
| VPS storage | snapshots JSONB ~2KB cada uno, ~200 leads/día = 400KB/día |

## 10. Limitaciones Conocidas

| Limitación | Impacto | Solución |
|---|---|---|
| Cookies expiran 2-4 sem | Cron puede fallar | Procedimiento manual refresh |
| Wrapper retorna URL en lugar de CID | Regex extract | Patch cron client-side |
| Sin lat/lng persistido | Heatmap depende de API | Migración futura |
| Cookie refresh manual | 30min de trabajo | Documentado |

## 11. Operación Diaria

```bash
# Login en xiaomi
ssh -p 8022 100.75.94.18

# Ver logs
tail -f ~/xiaomi-gb-scape/logs/feed-leads.log
tail -f ~/xiaomi-gb-scape/logs/audit-clientes.log

# Verificar cron
crontab -l | grep -v "^#"

# Health check
~/xiaomi-gb-scape/run/start.sh && curl -sS http://127.0.0.1:8095/healthz

# Refresh cookies (cada 2-4 sem)
# 1. Login google.com en Termux chromium
# 2. DevTools → Application → Cookies → Copy as JSON
# 3. Pegar en ~/xiaomi-gb-scape/lib/google_session.json
# 4. Reiniciar wrapper: pkill -f crm-gb-scap.js && ~/xiaomi-gb-scape/run/start.sh
```

## 12. Decisión Arquitectónica

Puppeteer-core (Plan A) vs gosom (Plan C) — **elegimos Puppeteer-core**.

Razón: en xiaomi-12 (sin Docker, sin proot) el wrapper Puppeteer-core funciona nativamente con cookies y es rápido. gosom requiere más setup (proot + Ubuntu) y es más lento.

Gosom queda disponible como backup para casos donde se necesite browser mode real en el futuro.
