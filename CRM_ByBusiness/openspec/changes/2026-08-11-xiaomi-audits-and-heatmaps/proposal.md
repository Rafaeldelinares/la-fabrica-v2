# 2026-08-11-xiaomi-audits-and-heatmaps

## Why

El usuario quiere 4 procesos automatizados en xiaomi-12 (sin VPS, sin browser glibc):

1. **Refresh leads existentes** (cada 30 min) — datos frescos en `operaciones.leads`
2. **Audit clientes diarios** (3 AM) — snapshots históricos en `clientes.gbp_audit_history`
3. **Audit competencia semanal** (domingo 4 AM) — comparación vs sector por cliente
4. **Mapa calor por sector** (lunes 5 AM) — agregados para heatmap

**Por qué ahora**:
- Sprint xiaomi-gosom-scraper (anterior) dejó gosom browser mode funcional en xiaomi
- Pero Puppeteer-core wrapper (Plan A) resulta más rápido (5-10s/cliente vs 30s+ de gosom) y usa cookies existentes
- Decisión: usar Puppeteer-core+cookies para cron, dejar gosom como backup opcional

**Hallazgo del sprint**:
- Puppeteer-core wrapper + cookies funcionan perfectamente en Termux
- URL `?cid=` retorna URL larga (no CID puro), se extrae CID con regex `0x[0-9a-f]+:0x[0-9a-f]+`
- Skip automático cuando wrapper devuelve URL search sin datos
- Helper `insert-audit-snapshot.sh` inserta snapshots históricos en `gbp_audit_history`

## What Changes

### 5 cron jobs en xiaomi-12

```
*/30 * * * *   feed-leads-v2.sh             refresh leads (cada 30min)
0  3 * * *    audit-clientes-v2.sh        audit clientes (diario 3AM)
0  4 * * 0    audit-competencia.sh        audit competencia (semanal dom 4AM)
0  5 * * 1    search-sector.sh            sector aggregates (semanal lun 5AM)
0  */6 * * *   search-cids-v2.sh          nuevos CIDs (cada 6h)
*/5 * * * *   watchdog.sh                  vigila wrapper (cada 5min, deprecated)
```

### 2 tablas nuevas en VPS

```sql
clientes.competencia          -- comparación vs competidores (semanal)
sector_aggregates             -- agregados por sector y geo (heatmap)
```

### 1 helper

`insert-audit-snapshot.sh` — INSERT a `gbp_audit_history` vía psql stdin

### 1 migration

`gbp_audit_history.audit_source` constraint extendida para aceptar `cron_daily`, `cron_weekly`, `webhook`

## Impact

| Área | Cambio |
|---|---|
| xiaomi-12: 5 cron jobs | operativos, independientes |
| xiaomi-12: cron scripts | patcheados con skip + regex CID |
| xiaomi-12: helper | nuevo, ~50 líneas Python |
| VPS: 2 tablas | nuevas, schemas limpios |
| VPS: 1 constraint | extendida |
| VPS: webhooks | sin cambios (mismo contrato) |
| xiaomi-12: proot+Ubuntu | sin cambios (Plan A sigue funcionando) |
| Frontend | sin cambios |

## Out-of-scope

- ❌ Migrar a "sin cookies" (goscam browser mode con stealth) — guardado para futuro
- ❌ Frontend visualization del heatmap (sprint futuro)
- ❌ Alertas automáticas
- ❌ Refresh automático de cookies (manual cada 2-4 semanas)

## Acceptance criteria

### Block 1 — Refresh continuo ✅
- [x] feed-leads-v2 patched: regex extract CID + skip data vacía
- [x] audit-clientes-v2 patched: regex extract CID + skip data vacía
- [x] E2E test feed-leads: 2 leads scrapeados con rating real + CID limpio
- [x] E2E test audit-clientes: 3 clientes scrapeados (rating 4.9, 4.6, 4.9)
- [x] crontab activado con 4 entradas

### Block 2a — Audit trail ✅
- [x] Helper `insert-audit-snapshot.sh` creado
- [x] Migration: constraint gbp_audit_history extendida
- [x] E2E test: snapshot insertado con audit_source=cron_daily

### Block 2b — Competencia + Heatmap ✅
- [x] Tabla `clientes.competencia` creada
- [x] Tabla `sector_aggregates` creada
- [x] Cron `audit-competencia.sh` (semanal) — scrapes Google Maps para competidores
- [x] Cron `search-sector.sh` (semanal) — agrega sectores para heatmap
- [x] crontab extendido a 5 entradas

## Risks

| Riesgo | Mitigación |
|---|---|
| Cookies expiran cada 2-4 semanas | Procedimiento manual de refresh documentado |
| CIDs sin geo en leads | Skip automático (rating=0 O reviews=0) |
| Wrapper devuelve URL search en lugar de CID puro | Regex extract CID post-hoc |
| Constraint gbp_audit_history.audit_source restrictivo | Migration extendida con 3 valores nuevos |
| query SQL con chars especiales (URL en Google Maps) | Helper usa temp file + cat stdin + psql -f |
| timeout > 10min en cron | Cada script tiene timeout 600s y skip data vacía |

## Architectural decision

**Puppeteer-core wrapper (Plan A original)** vs **gosom browser mode (Option C)**:

| Criterio | Puppeteer-core | gosom browser |
|---|---|---|
| Velocidad | ✅ 5-10s/cliente | ❌ 30s+/lugar |
| Datos completos | ✅ 36 campos | ✅ 36 campos |
| Complejidad | ✅ Bajo (cookies) | ❌ Alto (proot+Ubuntu) |
| Sustainability | ✅ Bajo | ❌ Medio |

**Decisión**: Puppeteer-core para cron. Gosom como backup para casos especiales.

## Owners

- Implementación: agent
- Operación: Rafael (mantenimiento, refresh cookies mensual, monitoring)
- Decisión arquitectónica: Rafael

## Preflight (cached)

- Pace: A2 (Auto)
- Artifacts: B1 (OpenSpec)
- PRs: C1+C3 (Ask + Chained)
- Review budget: D1 (400 lines)

## Referencias

- `design.md` — arquitectura completa
- `tasks.md` — breakdown de implementación
- `README.md` — índice operativo del sprint
- `openspec/changes/2026-08-11-gbp-ficha-enrichment/` — sprint paralelo (frontend)
- `openspec/changes/archive/2026-08-06-gbp-sprint2/` — sprint previo archivado
