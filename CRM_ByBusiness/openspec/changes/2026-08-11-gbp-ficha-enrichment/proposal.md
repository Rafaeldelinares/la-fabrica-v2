# 2026-08-11-gbp-ficha-enrichment

## Why

El scraper `crm-gb-scap` (en xiaomi-12) captura **30+ campos** por sitio Google (rating, reviews, dirección, teléfono, web, `categoria_principal`, `owner` claimed/unclaimed, `popular_times`, `reviews_per_rating`, `atributos_total/_seteados`, `fotos_count`, `qa_count`, `posts_count`, `descripcion`, `user_reviews[]`, imágenes, etc.). El workflow `CRM_GB_SCAPE_SAVE_CLIENTE` (id: `fJy7pfNYVZqj6LXY`) **solo persiste 7** en `clientes.gmaps_fichas`. El resto se descarta.

Resultado: la ficha del cliente en el frontend está incompleta. Análisis como heatmaps de demanda, distribución por sector, benchmarking por actividad, detección de fichas flojas (atributos < 50%), targeting por `owner=unclaimed` (ventas) — **todo es imposible** con los datos actuales.

Adicionalmente, la UI actual de la ficha (`GbpIndex.jsx`) apila **7 collapsibles verticales** que relentizan la visualización. La pantalla principal se reduce a un scroll vertical infinito. El usuario quiere una ficha densa, sin scrollbars, con menú lateral — más visualmente presentable.

## What changes

### Fase 1 — Quick wins (esta/ próxima sesión, 1-2h)
- **T1**: Persistir `audit_data` JSONB completo en nueva columna `clientes.gmaps_fichas.audit_data jsonb`
- **T2**: Agregar columnas derivables a `clientes.gmaps_fichas`:
  - `categoria_principal text`
  - `gmaps_owner text` (claimed/unclaimed)
  - `gmaps_fotos_count int`, `gmaps_qa_count int`, `gmaps_posts_count int`
  - `gmaps_atributos_total int`, `gmaps_atributos_seteados int`
  - `gmaps_price_range text`
  - `gmaps_popular_times jsonb`
  - `gmaps_reviews_per_rating jsonb`
  - `gmaps_reviews_respondidas_count int`, `gmaps_reviews_respondidas_pct numeric`
  - `gmaps_limited_view bool`
  - `gmaps_lat numeric`, `gmaps_lng numeric` (geocoding)
- **T3**: Update workflow `CRM_GB_SCAPE_SAVE_CLIENTE` (Save Cliente Base + Upsert Ficha) para incluir TODOS los campos del scraper
- **T4**: Geocoding endpoint para `address → lat/lng` (reutilizar scraper output si tiene coords, o agregar geocode call)
- **T5**: Test end-to-end con clientes 962, 980, 981 — verificar todos los campos poblados

### Fase 2 — Visualizaciones (sprint próximo, 1-2 días)
- **T6**: Endpoint `CRM_GBP_HEATMAP_POPULAR_TIMES` — agrega `popular_times` por sector
- **T7**: Endpoint `CRM_GBP_SECTORES_DISTRIBUCION` — distrib clientes por `categoria_principal`
- **T8**: Endpoint `CRM_GBP_TENDENCIAS_CLIENTE` — time-series score/rating/reviews
- **T9**: Frontend `GbpHeatmap.jsx`, `GbpSectores.jsx`, `GbpTendencias.jsx`

### Fase 3 — Rediseño visual de la ficha (sprint visual, 2-3 días)
- **T10**: `GbpFichaLayout.jsx` — wrapper sidebar + main panel (responsive: colapsa en <md)
- **T11**: Sidebar menu items con badges (alertas, estado)
- **T12**: `GbpFichaActual` rediseñado — grid de cards densas, sin scroll si ≤768px alto
- **T13**: Heatmap `popular_times` 24×7 inline en `GbpFichaActual`
- **T14**: Gauge completeness (`atributos_seteados / atributos_total`)
- **T15**: Distribución ratings como mini-barras horizontales
- **T16**: Migrar `FacturacionTab` (cartera) al mismo patrón lateral
- **T17**: Snapshot test visual (desktop + mobile)
- **T18**: WCAG keyboard navigation

## Scope

**In-scope**:
- `clientes.gmaps_fichas` schema extension
- Workflow `CRM_GB_SCAPE_SAVE_CLIENTE` extension
- `GbpIndex.jsx` y sub-componentes del tab GBP
- Tab facturación (paridad visual)
- 3 endpoints n8n nuevos para visualizaciones

**Out-of-scope** (separar):
- Migración a Places API (New) oficial — save para futuro sprint con presupuesto
- Backfill masivo CIDs leads (17,589) — ya cubierto por cron `search-cids-v2.sh` 0 */6 * * *
- Análisis competitivo heatmap geo (depende de Fase 2 + geocoding)

## Impact

| Área | Impacto |
|---|---|
| **xiaomi-12** | Sin cambios (scraper ya captura todo) |
| **VPS n8n** | 1 workflow modificado, 3 nuevos |
| **DB** | 1 migration SQL (`ALTER TABLE clientes.gmaps_fichas`) |
| **Backend** | 3 endpoints nuevos |
| **Frontend** | 1 layout nuevo, 1 rediseño de ficha, 1 migración de facturación, 3 vistas de visualización |
| **Riesgo bajo** | Migration es aditiva (solo ADD COLUMN, no breaking) |
| **Compatibilidad** | Mantener campos viejos durante transición |

## Rollback plan

- Migration `ALTER TABLE ... ADD COLUMN` es 100% reversible (DROP COLUMN)
- Nuevas columnas nullable con default NULL → no rompe nada existente
- Workflow update es vía API PUT — versionable, se puede revertir
- Frontend cambios en componentes nuevos — se puede rollback al import actual

## Acceptance criteria

### Fase 1
- [ ] `SELECT audit_data FROM clientes.gmaps_fichas WHERE cliente_id = 962` retorna JSON con 30+ keys
- [ ] `SELECT categoria_principal, gmaps_owner FROM clientes.gmaps_fichas WHERE cliente_id = 962` retorna valores no-null
- [ ] Workflow executions return `status: success` con persist a `gmaps_fichas` Y `gmaps_audit_history`
- [ ] Cron `audit-clientes-v2.sh` ejecuta cada 24h, persiste a DB, exit 0

### Fase 2
- [ ] 3 endpoints n8n retornan JSON con shape documentado
- [ ] Frontend renderiza heatmap, sectores, tendencias sin errores

### Fase 3
- [ ] Ficha sin scrollbars verticales en viewport 1920×1080 con sidebar 200px
- [ ] Tab facturación con el mismo layout lateral
- [ ] Lighthouse a11y score ≥ 90
- [ ] Snapshot tests pasan en CI

## Why this matters

Hoy ByBusiness vende "monitorización de ficha Google" a clientes. La **diferencia competitiva** es ¿qué tan denso y visual es el reporte? Si la ficha del cliente muestra 7 campos planos, no vale más que la competencia. Si muestra:
- Heatmap de cuándo está lleno
- Distribución de ratings con sentiment
- Comparativa con su sector
- Score de completitud con qué falta
- Tendencias trimestre a trimestre

**Eso es un producto que cobra 5x más.** Estas fases son el camino.

## Owners

- Fase 1: Backend (DB migration + workflow update) — 1 sesión
- Fase 2: Backend + Frontend — 1 sprint
- Fase 3: Frontend visual — 1 sprint
- Decisor: Rafael (querystate, prioridad comercial)

## Open questions

- ¿La ficha necesita ser responsive mobile o es solo desktop? (la app actual parece desktop-first)
- ¿Hay límite de columnas por tabla que bloquee `ADD COLUMN` masivo? (no debería, pero verificar)
- ¿Geocoding usar Google API o servicio open-source (Nominatim)? Nomatim es gratis pero tiene rate limits
- ¿Migración a Places API New es prioritaria ahora o se aplaza? (recomendamos aplazar hasta tener feedback de clientes)

## Referencias

- Sprint 2 archivado: `openspec/changes/archive/2026-08-06-gbp-sprint2/` (proposal.md, spec.md, design.md, tasks.md)
- Backlog completo en engram: `task/backlog-enriquecer-ficha-gbp-heatmaps-sectores-tendencias-redise-o-visual`
- Wrapper scraper: `bin/crm-gb-scap` en xiaomi-12
- Workflow mod: `CRM_GB_SCAPE_SAVE_CLIENTE` (id: `fJy7pfNYVZqj6LXY`)
- Frontend ficha: `src/modules/admin/cartera/tabs/gbp/index.jsx`
