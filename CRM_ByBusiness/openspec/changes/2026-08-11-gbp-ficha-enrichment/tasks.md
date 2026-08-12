# Tasks — 2026-08-11-gbp-ficha-enrichment

> Source: `proposal.md` in this directory. Backlog living en engram: `task/backlog-enriquecer-ficha-gbp-heatmaps-sectores-tendencias-redise-o-visual`.

## Fase 1 — Quick wins (DB + workflow)

### T1. Migration: agregar `audit_data jsonb` a `clientes.gmaps_fichas`
- **Owner**: backend
- **Esfuerzo**: 30 min
- **Criterio**: `ALTER TABLE clientes.gmaps_fichas ADD COLUMN audit_data jsonb;`
- **Verificación**: `\d clientes.gmaps_fichas` muestra la columna
- **Bloquea**: T3, T6-T8

### T2. Migration: columnas derivables
- **Owner**: backend
- **Esfuerzo**: 30 min
- **Criterio**:
  ```sql
  ALTER TABLE clientes.gmaps_fichas
    ADD COLUMN IF NOT EXISTS categoria_principal text,
    ADD COLUMN IF NOT EXISTS gmaps_owner text,
    ADD COLUMN IF NOT EXISTS gmaps_fotos_count int,
    ADD COLUMN IF NOT EXISTS gmaps_qa_count int,
    ADD COLUMN IF NOT EXISTS gmaps_posts_count int,
    ADD COLUMN IF NOT EXISTS gmaps_atributos_total int,
    ADD COLUMN IF NOT EXISTS gmaps_atributos_seteados int,
    ADD COLUMN IF NOT EXISTS gmaps_price_range text,
    ADD COLUMN IF NOT EXISTS gmaps_popular_times jsonb,
    ADD COLUMN IF NOT EXISTS gmaps_reviews_per_rating jsonb,
    ADD COLUMN IF NOT EXISTS gmaps_reviews_respondidas_count int,
    ADD COLUMN IF NOT EXISTS gmaps_reviews_respondidas_pct numeric,
    ADD COLUMN IF NOT EXISTS gmaps_limited_view bool,
    ADD COLUMN IF NOT EXISTS gmaps_lat numeric,
    ADD COLUMN IF NOT EXISTS gmaps_lng numeric;
  ```
- **Verificación**: `\d clientes.gmaps_fichas` lista todas las columnas
- **Bloquea**: T3, T6-T8

### T3. Update workflow `CRM_GB_SCAPE_SAVE_CLIENTE`
- **Owner**: backend+n8n
- **Esfuerzo**: 1 hr
- **Criterio**:
  - Save Cliente Base: incluye UPDATE con `gmaps_nombre, gmaps_rating, gmaps_reseñas, reputacion_at` (ya está) + nuevos campos
  - Upsert Ficha: incluye INSERT/UPDATE con todos los campos del scraper en `gmaps_fichas` + `audit_data` JSONB
- **Trigger**: ejecución manual vía curl con payload de prueba
- **Verificación**: `SELECT * FROM clientes.gmaps_fichas WHERE cliente_id = 962` muestra campos poblados

### T4. Geocoding para lat/lng
- **Owner**: backend
- **Esfuerzo**: 1 hr
- **Criterio**:
  - Opción A: scraper devuelve coords (ya está en `geometry.location.lat/lng`), agregarlas a columns
  - Opción B: geocoding endpoint separado basado en `gmaps_address`
- **Recomendación**: A (scraper ya tiene coords)
- **Verificación**: `gmaps_lat`/`gmaps_lng` poblados para clientes 962, 980, 981

### T5. Test end-to-end
- **Owner**: backend
- **Esfuerzo**: 30 min
- **Criterio**:
  - SSH xiaomi-12: `LIMIT=3 bash ~/xiaomi-gb-scape/cron/audit-clientes-v2.sh`
  - Verificar clientes 962, 980, 981 en DB con todos los campos
  - Status final exit 0

## Fase 2 — Endpoints de visualización (sprint 2)

### T6. `CRM_GBP_HEATMAP_POPULAR_TIMES`
- **Owner**: backend
- **Esfuerzo**: 4 hr
- **Endpoint**: `GET /webhook/crm-gbp-heatmap-popular-times?sector=<categoria>&days=7`
- **Response**: heatmap 24×7 promedio del sector
- **Verificación**: JSON con 168 valores (24h × 7d)

### T7. `CRM_GBP_SECTORES_DISTRIBUCION`
- **Owner**: backend
- **Esfuerzo**: 3 hr
- **Endpoint**: `GET /webhook/crm-gbp-sectores-distribucion`
- **Response**: `[{categoria_principal, count, avg_rating, avg_reviews}, ...]`
- **Verificación**: GROUP BY en SQL

### T8. `CRM_GBP_TENDENCIAS_CLIENTE`
- **Owner**: backend
- **Esfuerzo**: 4 hr
- **Endpoint**: `GET /webhook/crm-gbp-tendencias-cliente?cliente_id=X&days=90`
- **Response**: time-series de score / rating / reviews_count
- **Verificación**: query sobre `clientes.gbp_audit_history`

### T9. Frontend visualizations
- **Owner**: frontend
- **Esfuerzo**: 1 sprint
- **Componentes**:
  - `src/modules/admin/cartera/tabs/gbp/visualizations/GbpHeatmap.jsx`
  - `src/modules/admin/cartera/tabs/gbp/visualizations/GbpSectores.jsx`
  - `src/modules/admin/cartera/tabs/gbp/visualizations/GbpTendencias.jsx`
- **Librerías**: recharts para charts, react-heatmap-grid para heatmap

## Fase 3 — Rediseño visual ficha (sprint visual)

### T19. Fix import path GbpSectorCard.jsx
- **Owner**: frontend
- **Esfuerzo**: 5 min
- **Bug**: import path tenía 6 niveles de `../` en lugar de 5
- **Criterio**: `npm run build` no falla por este import
- **Status**: ✅ Completado 2026-08-12

### T20. GbpAutomation.jsx con health check + manual refresh
- **Owner**: frontend
- **Esfuerzo**: 2 hr
- **Archivo**: `src/modules/admin/cartera/tabs/gbp/GbpAutomation.jsx`
- **Comportamiento**:
  - Health check panel: fetch `crm-health` al montar, muestra estado vivo/muerto con timestamp
  - Botón Reintentar para refetch manual
  - Manual refresh panel: botón "Ejecutar análisis ahora" → POST `crm-gbp-ficha-audit` con `{cliente_id, refresh: true}`
  - Skeleton/loading state durante ejecución, disabled mientras corre
- **Integración**: sidebar item con icono Zap, mount en index.jsx
- **Criterio**: renderiza sin errores, health check se llama al montar, mutation se dispara con cliente_id
- **Status**: ✅ Completado 2026-08-12

### T21. Tests unitarios para GbpAutomation.jsx
- **Owner**: frontend
- **Esfuerzo**: 1 hr
- **Archivo**: `src/modules/admin/cartera/tabs/gbp/GbpAutomation.test.jsx`
- **Tests**: renderiza sin errores, llama health check al montar, muestra estado operativo/caído, botón Reintentar dispara refetch, click en Ejecutar análisis ahora llama webhook con cliente_id, botón deshabilitado durante ejecución
- **Criterio**: `npx vitest run` pasa 7/7 tests
- **Status**: ✅ Completado 2026-08-12

### T10. `GbpFichaLayout.jsx` — sidebar + main panel
- **Owner**: frontend
- **Esfuerzo**: 4 hr
- **Componente**: wrapper con sidebar fijo + main scroll interno
- **Responsive**: sidebar colapsa a top-tabs en <md (768px)
- **Criterio**: layout limpio, estilo Navy Industrial

### T11. Sidebar menu items con badges
- **Owner**: frontend
- **Esfuerzo**: 3 hr
- **Items**: Ficha, Auditar, Histórico, Config, Sector, Place_id, Facturación
- **Badges**: alert ⚠️ si hay alertas GBP, completeness pct, etc.

### T12. `GbpFichaActual` rediseñado — grid denso
- **Owner**: frontend
- **Esfuerzo**: 4 hr
- **Grid**: 2-3 columnas en desktop, 1 col en mobile
- **Cards**: rating, reviews, fotos, atributos, dirección, horarios, owner, etc.
- **Criterio**: todo visible en viewport 1920×1080 sin scroll

### T13. Heatmap `popular_times` inline
- **Owner**: frontend
- **Esfuerzo**: 3 hr
- **Componente**: `<PopularTimesHeatmap data={popular_times} weeks={4} />`
- **Layout**: 24×7 grid con intensidad de color

### T14. Gauge completeness
- **Owner**: frontend
- **Esfuerzo**: 1 hr
- **Visual**: arco SVG con `atributos_seteados / atributos_total`
- **Color**: rojo < 50%, ámbar 50-80%, verde > 80%

### T15. Distribución ratings mini-barras
- **Owner**: frontend
- **Esfuerzo**: 1 hr
- **Visual**: 5 filas (5★..1★) con barras horizontales
- **Datos**: `reviews_per_rating` del scraper

### T16. Migrar `FacturacionTab` (cartera)
- **Owner**: frontend
- **Esfuerzo**: 3 hr
- **Patrón**: mismo menu lateral
- **Criterio**: paridad UX con ficha GBP

### T17. Snapshot tests (visual regression)
- **Owner**: frontend+QA
- **Esfuerzo**: 4 hr
- **Tools**: Playwright + screenshots
- **Casos**: desktop 1920×1080, tablet 1024×768, mobile 375×667

### T18. WCAG keyboard navigation
- **Owner**: frontend
- **Esfuerzo**: 2 hr
- **Criterios**: Tab order lógico, focus visible, ARIA labels, lighthouse a11y ≥ 90

## Deuda técnica (separar)

### DT1. Backfill CIDs leads fake
- **Owner**: backend
- **Esfuerzo**: -
- **Status**: cubierto por cron `search-cids-v2.sh` 0 */6 * * *
- **Acción**: revisar % resuelto mensualmente

### DT2. Data quality CIDs weird format
- **Owner**: backend
- **Esfuerzo**: 1 sesión
- **Status**: 962, 980, 981 detectados en testing con formato `0xd46ebc...`
- **Acción**: query + análisis para decidir reproceso

### DT3. Comparar APIs oficiales vs scraper
- **Owner**: arquitectura
- **Esfuerzo**: 1 sesión de investigación
- **Status**: explorado en sesión 2026-08-11
- **Acción**: evaluar costo/beneficio cuando se justifique

## References

- **Proposal**: `proposal.md`
- **Previous sprints**:
  - `openspec/changes/archive/2026-08-06-gbp-sprint2/` (sprint 2 archivado)
  - `openspec/changes/archive/2026-08-06-gbp-ficha-improvements/` (mejoras S2)
- **Memoria engram**:
  - `task/backlog-enriquecer-ficha-gbp-...`
  - `discovery/exploraci-n-google-apis-...`
  - `bugfix/xiaomi-12-gbm-cron-v2-4-bugs-fixed-crontab-deployed`
  - `bugfix/n8n-save-cliente-fan-out-fix-respond-no-depende-de-rama-paralela`
- **Scripts**:
  - xiaomi-12: `~/xiaomi-gb-scape/cron/audit-clientes-v2.sh`
  - VPS: `CRM_GB_SCAPE_SAVE_CLIENTE` (id: `fJy7pfNYVZqj6LXY`)
- **Frontend**:
  - `src/modules/admin/cartera/tabs/gbp/index.jsx` (192 líneas, 7 collapsibles)
  - `src/modules/admin/cartera/CarteraPanel.jsx` (drawer)
