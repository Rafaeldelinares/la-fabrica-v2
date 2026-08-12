# 2026-08-12-categoria-sugerencias

## Why

El usuario quiere **inteligencia competitiva accionable**: si los competidores de un cliente rankean mejor en Google Maps porque usan una categoría más específica, deberíamos **sugerir al cliente** cambiar su categoría GBP a esa más específica.

**Insight clave** (validado en documentación oficial de Google support.google.com/business/answer/3038177, sección "Categories"):

> "Focus primarily on adding the most specific categories for your business; we'll do the rest behind the scenes. For instance, when you select a specific category like 'Golf Resort', Google implicitly includes more general categories like 'Resort Hotel', 'Hotel', and 'Golf Course.'"

> "Categories help your customers find accurate, specific results for services they're interested in."

**Las categorías GBP SON editables por el dueño**, y Google explícitamente recomienda categorías **específicas** sobre genéricas para SEO local.

## What Changes

### Nueva feature: "Sugerencias de categoría desde competencia"

Para cada cliente activo con auditoría:

1. **Detectar competidores mejores posicionados**:
   - Filtra competidores con `rating > cliente_rating + 0.5` AND `reviews_count > cliente_reviews * 2`
   - Estos son los que rankean visiblemente mejor

2. **Extraer categorías de competidores**:
   - Wrapper scrapea `categoria_principal` de cada competidor (ya lo hace, falta capturar array)

3. **Generar sugerencias**:
   - Si competidores usan categorías **más específicas** que la del cliente → crear sugerencia
   - Específicidad heurística: longitud de texto + contiene palabras como "24h", "emergencia", "express", etc.

4. **Mostrar en UI**:
   - Componente nuevo `GbpCategoriaSugerencia.jsx` en `cartera/tabs/gbp/`
   - Visible en la ficha del cliente con: cat actual vs sugerida + competitors根拠
   - Botón "Marcar como implementado" (admin confirma tras cambio manual)

5. **Tracking**:
   - Re-scrapear cliente cada N días
   - Si su categoria cambió → marcar sugerencia como `implemented_at`
   - Histórico en `clientes.categoria_sugerencias_history`

## Scope

### Out of scope

- ❌ Auto-aplicar cambios al GBP del cliente (requiere OAuth + ownership verification del usuario)
- ❌ Inventar categorías fuera de la lista oficial de Google
- ❌ Sugerir categorías irrelevantes para el rubro del cliente

### In scope

- ✅ Wrapper scrapea top 10 resultados (con categoria_principal de cada uno)
- ✅ Script cron `categoria-sugerencias.sh` que detecta oportunidades
- ✅ Tabla DB nueva `clientes.categoria_sugerencias`
- ✅ UI en la ficha del cliente con la sugerencia + boton de implementación
- ✅ Tracking de implementación (manual + automático via re-scrape)
- ✅ Tests unitarios del detector + componente

## Acceptance Criteria

- [ ] Wrapper `crm-gb-scap.js` `/search-by-name` devuelve array de hasta 10 resultados
- [ ] Cada resultado trae `categoria_principal` poblada
- [ ] Script `categoria-sugerencias.sh` corre semanalmente (lunes 6AM, después de `search-sector.sh`)
- [ ] Detecta correctamente al menos 1 sugerencia real (ej: "Fontanería" → "Servicio de fontanería de emergencia 24h")
- [ ] Componente UI renderiza la sugerencia con contexto
- [ ] Botón "Marcar como implementado" actualiza DB
- [ ] Re-scrape detecta cambio real (ej: después de que admin cambia manualmente en GBP)
- [ ] Tests del detector: 5 casos (match, no-match, edge cases)
- [ ] Tests del componente UI: render + RBAC + acción de implementar

## Archivos a crear/modificar

### Nuevos
- `openspec/changes/2026-08-12-categoria-sugerencias/proposal.md` (este)
- `openspec/changes/2026-08-12-categoria-sugerencias/tasks.md`
- `lib/db_query.py` (modificado por sesión anterior)
- `cron/categoria-sugerencias.sh` (nuevo)
- `cron/detect_sugerencias.py` (nuevo helper)
- `src/modules/admin/cartera/tabs/gbp/GbpCategoriaSugerencia.jsx` (nuevo)
- `src/modules/admin/cartera/tabs/gbp/GbpCategoriaSugerencia.test.jsx` (nuevo)

### Modificados
- `lib/crm-gb-scap.js` — endpoint `/search-by-name` devuelve array (no 1)
- `infra/xiaomi/scripts/backfill-categoria.sql` — agregar vista materializada de sugerencias
- `CHANGELOG.md` — nueva sección

## Effort

~10-12 horas distribuidas en 3-4 sesiones:

| Fase | Horas |
|------|-------|
| Wrapper top 10 + categoria por competidor | 2-3 |
| Detector SQL/Python | 1-2 |
| UI componente ficha cliente | 3-4 |
| Tracking re-scrape | 1 |
| Tests | 2 |
| Docs | 1 |

## Risks

1. **Cambios en Google Maps HTML**: el selector actual ya estaba roto antes; cualquier fix puede romperse de nuevo. Mitigación: tests con snapshots de HTML de Google Maps.

2. **Falsos positivos en sugerencias**: una categoría más larga NO siempre es más específica. Mitigación: heurística + whitelist de keywords + revisión manual de admin.

3. **Cambio de categoría manual**: no podemos automatizar el cambio en GBP (requiere OAuth del dueño). Mitigación: mostrar instrucciones claras + tracking del cambio manual.

## Related

- Sprint activo: `2026-08-11-gbp-ficha-enrichment/` (Stage 2 — incluye GbpSectorCard que muestra contexto)
- Memoria #1687: sprint xiaomi-audits-and-heatmaps (5 crons activos, base del scraper)
- Documentación oficial Google: support.google.com/business/answer/3038177 sección "Categories"
