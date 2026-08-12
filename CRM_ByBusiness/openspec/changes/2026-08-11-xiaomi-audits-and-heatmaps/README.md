# Sprint 2026-08-11-xiaomi-audits-and-heatmaps

## Índice Operativo

```
openspec/changes/2026-08-11-xiaomi-audits-and-heatmaps/
├── proposal.md     — overview, acceptance criteria, risks
├── design.md       — arquitectura, data mapping, cron schedule
├── tasks.md        — breakdown de implementación con todas las tasks
└── README.md       — este archivo (operación + cómo usar)
```

## Quick Start

### Login en xiaomi-12

```bash
ssh -p 8022 100.75.94.18
```

### Ver crontab activo

```bash
crontab -l | grep -v "^#"
```

Output esperado:
```
*/30 * * * *   /data/data/com.termux/files/home/xiaomi-gb-scape/cron/feed-leads-v2.sh >/dev/null 2>&1
0 3 * * *      /data/data/com.termux/files/home/xiaomi-gb-scape/cron/audit-clientes-v2.sh >/dev/null 2>&1
0 4 * * 0      /data/data/com.termux/files/home/xiaomi-gb-scape/cron/audit-competencia.sh >/dev/null 2>&1
0 5 * * 1      /data/data/com.termux/files/home/xiaomi-gb-scape/cron/search-sector.sh >/dev/null 2>&1
0 */6 * * *     /data/data/com.termux/files/home/xiaomi-gb-scape/cron/search-cids-v2.sh >/dev/null 2>&1
*/5 * * * *     /data/data/com.termux/files/home/xiaomi-gb-scape/cron/watchdog.sh >/dev/null 2>&1
```

### Ver logs recientes

```bash
ls -la ~/xiaomi-gb-scape/logs/
tail -f ~/xiaomi-gb-scape/logs/feed-leads.log
tail -f ~/xiaomi-gb-scape/logs/audit-clientes.log
```

### Health check del wrapper

```bash
curl -sS http://127.0.0.1:8095/healthz
```

Expected: `{"ok":true,"browser":true,"uptime":XXX}`

### Tests manuales

```bash
# Forzar actualización de leads
cd ~/xiaomi-gb-scape && LIMIT=5 bash cron/feed-leads-v2.sh

# Forzar audit de clientes
cd ~/xiaomi-gb-scape && LIMIT=5 bash cron/audit-clientes-v2.sh

# Verificar que insertó snapshots
ls -la ~/xiaomi-gb-scape/state/

# Verificar DB
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c 'SELECT count(*) FROM clientes.gbp_audit_history'"
```

### Refresh de cookies (cada 2-4 semanas)

```bash
# 1. Login google.com en Termux chromium
chromium-browser https://accounts.google.com/ --user-data-dir=/tmp/chrome-session

# 2. DevTools → Application → Storage → Cookies → Copy as JSON
# 3. Pegar en el xiaomi-12:
ssh -p 8022 100.75.94.18
cat > ~/xiaomi-gb-scape/lib/google_session.json <<'EOF'
# (Paste cookies array here)
EOF

# 4. Reiniciar wrapper
pkill -f "node crm-gb-scap.js" || true
~/xiaomi-gb-scape/run/start.sh
```

### Debug

```bash
# Ver si crond está vivo
ls /proc | grep "^[0-9]" | while read p; do
  cmdline=$(tr -d "\0" < "/proc/$p/cmdline" 2>/dev/null)
  if echo "$cmdline" | grep -q "^crond\|^/data.*crond"; then
    echo "PID $p: $cmdline"
  fi
done

# Ver procesos zombie (timeout > 30min)
ps -eo pid,etime,stat,comm --no-headers | awk '$2 ~ /^[0-9]+:[0-9]+$/ && $2+0 > 1800 && $3 ~ /S/'

# Matar zombie
kill -9 $(pgrep -f "timeout 600")
```

## Queries Útiles DB

```sql
-- Datos scrapeados últimas 6h
SELECT 'operaciones.leads' AS tbl, id, rating::text, reputacion_at
FROM operaciones.leads
WHERE reputacion_at > NOW() - INTERVAL '6 hours'
UNION ALL
SELECT 'gmaps_fichas', cliente_id, gmaps_rating::text, gmaps_last_updated
FROM clientes.gmaps_fichas
WHERE gmaps_last_updated > NOW() - INTERVAL '6 hours'
UNION ALL
SELECT 'gbp_audit_history', cliente_id, audit_source, audited_at
FROM clientes.gbp_audit_history
WHERE audited_at > NOW() - INTERVAL '6 hours'
ORDER BY 4 DESC LIMIT 20;

-- Competencia (semanal)
SELECT cliente_id, categoria, competitors_count, competitors_avg_rating, position_pct
FROM clientes.competencia
ORDER BY audited_at DESC LIMIT 20;

-- Heatmap sectores
SELECT category, geo_lat, geo_lng, count_in_1km, avg_rating, total_leads, total_clientes, heat_score
FROM sector_aggregates
ORDER BY heat_score DESC LIMIT 20;
```

## Archivos del Sprint

| Archivo | Propósito |
|---|---|
| `proposal.md` | Overview, acceptance criteria, risks, architectural decisions |
| `design.md` | Arquitectura, data mapping, cron schedule, error handling |
| `tasks.md` | Breakdown de implementación, todas las tasks con status |
| `README.md` | Este archivo — operación y quick start |

## Scripts Cron en xiaomi-12

| Script | Schedule | Función |
|---|---|---|
| `feed-leads-v2.sh` | */30 | Refresh leads (rating, reviews) |
| `audit-clientes-v2.sh` | 0 3 | Audit diario clientes + INSERT snapshot |
| `audit-competencia.sh` | 0 4 * 0 | Audit semanal competencia vs sector |
| `search-sector.sh` | 0 5 * 1 | Agregados sector para heatmap semanal |
| `search-cids-v2.sh` | 0 */6 | Search CIDs faltantes |
| `watchdog.sh` | */5 | Vigila wrapper (deprecated, mantener) |
| `insert-audit-snapshot.sh` | helper | INSERT a gbp_audit_history |

## Hallazgos Críticos

1. **Patch bug fix**: comparación `"0.0"` (string) vs Python `0` (int). Fix: `rating == 0 and reviews == 0 and '/data=' in place_id`
2. **Constraint gbp_audit_history**: original solo aceptaba 6 valores. Extendida con 3 nuevos (`cron_daily`, `cron_weekly`, `webhook`)
3. **Wrapper URL format**: `?cid=` devuelve URL completa, no CID puro. Regex: `0x[0-9a-f]+:0x[0-9a-f]+`
4. **Skip data vacía**: necesario porque CIDs inválidos retornan URL search sin datos
5. **Cron zombie**: `timeout 600` puede quedar colgado. Cleanup manual o watchdog para cron

## Decisión Arquitectónica

**Puppeteer-core wrapper (Plan A)** vs **gosom browser mode (Plan C)**:
- Elegido: **Puppeteer-core** (más rápido, menos setup)
- Gosom queda como backup para casos especiales

## Limitaciones Conocidas

1. Cookies expiran cada 2-4 semanas (refresh manual)
2. Sin lat/lng persistido en DB (heatmap depende de JSONB live)
3. audit-competencia con 1 resultado por query (wrapper search devuelve 1)
4. Sin alertas automáticas (solo log)
5. search-sector sin lat/lng suficiente para muchas leads

## Mejoras Futuras

- Persistir lat/lng en gmaps_fichas
- Multi-result search en gosom browser
- Frontend visualization del heatmap
- Alertas cuando cliente pierde >X posiciones
- Refresh cookies automatizado via browser cron

## Estado

✅ **Sprint COMPLETADO** — 5 cron jobs activos, datos scrapeándose, audit trail persistido.

Fecha: 2026-08-11
Próxima acción: monitoring + refresh cookies manual (Sep-Oct 2026)
