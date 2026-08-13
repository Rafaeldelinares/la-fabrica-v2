# 2026-08-12-categoria-sugerencias

## Why

El usuario quiere **inteligencia competitiva accionable completa** sobre los clientes:

1. Tomar un cliente X
2. Mirar su actividad (categoria_principal)
3. Buscar competidores en Google Maps (misma actividad + localidad + provincia)
4. Capturar métricas de cada competidor: rating, reviews, categorías, horarios, fotos, respuestas, posts, antigüedad
5. Análisis comparativo: cómo rankea el cliente vs los competidores, brechas
6. Generar informe con recomendaciones accionables para mejorar el rankeo del cliente

**Insight clave** (validado en documentación oficial de Google support.google.com/business/answer/3038177):

> "Focus primarily on adding the most specific categories for your business; we'll do the rest behind the scenes."

> "Categories help your customers find accurate, specific results for services they're interested in."

Las categorías GBP son **editables** y Google recomienda **específicas** sobre genéricas para SEO local. Pero el informe cubre mucho más que categorías — cubre el ecosistema completo de rankeo local.

## What Changes

### Feature: "Informe competitivo completo de un cliente"

Para cada cliente activo:

1. **Scraping profundo** de competidores en zona (top 10)
   - rating, reviews_count, categoria_principal + adicionales
   - horarios publicados
   - cantidad de fotos
   - tasa de respuesta a reseñas
   - posts recientes
   - antigüedad del perfil

2. **Análisis comparativo**
   - Promedio de competidores
   - Brechas del cliente (gaps en cada dimensión)
   - Posición relativa (percentil vs competidores)

3. **Generación de recomendaciones accionables**
   - Reglas determinísticas por gap (ej: "rating < -0.5 → pedir reseñas")
   - Output priorizado por impacto esperado
   - Cada recomendación con métrica objetivo concreto

4. **Storage histórico completo** (un informe por cliente cada X semanas)
   - Ver evolución del cliente vs competencia a lo largo del tiempo

5. **UI admin-only** (operadores NO lo ven, se dedican a llamar leads)
   - Componente `GbpInformeCompetencia.jsx` en ficha del cliente
   - Score visual (verde/amarillo/rojo)
   - Tabla comparativa cliente vs promedio
   - Lista priorizada de acciones recomendadas
   - Histórico de informes (evolución)

6. **Trigger automático cada 4 semanas** (ahora)
   - Genera informe automático para todos los clientes activos
   - Sin spam (cada cliente cada 4 semanas, no más seguido)

## Decisiones de scope (confirmadas 2026-08-12)

| Decisión | Valor |
|----------|-------|
| Alcance | **B**: análisis completo con informe (no solo categorías) |
| Storage | **B**: histórico completo (evolución) |
| Consumidores | **Solo administradores** (operadores NO lo ven) |
| Trigger | **B**: automático cada 4 semanas |

## Scope

### Out of scope

- ❌ Operadores no ven el informe (mantener foco en captura de leads)
- ❌ Auto-aplicar cambios al GBP del cliente (requiere OAuth + ownership verification del usuario)
- ❌ Categorías inventadas fuera de la lista oficial de Google
- ❌ Sugerir categorías irrelevantes para el rubro
- ❌ Envío automático de informe al cliente por email (futuro)
- ❌ Análisis de sentimiento de reseñas (futuro)

### In scope

- ✅ Wrapper scrapea top 10 con campos completos (rating, reviews, categorias, horarios, fotos, posts, antigüedad)
- ✅ Script `generar-informe-competencia.sh` orquesta el flujo
- ✅ Helper Python `analisis_competencia.py` con reglas de gap detection
- ✅ Tabla `clientes.informes_competencia` con JSONB de recomendaciones + raw_data
- ✅ UI admin-only con score visual + tabla comparativa + recomendaciones
- ✅ Trigger automático cada 4 semanas (sin spam)
- ✅ RBAC: solo `admin.system.config` ve el informe
- ✅ Tests unitarios del analizador + componente UI

## Acceptance Criteria

- [ ] Wrapper `crm-gb-scap.js` `/search-by-name` devuelve top 10 con: rating, reviews, categorias_adicionales, horarios, fotos_count, posts_count, antiguedad_dias
- [ ] Helper `analisis_competencia.py` detecta gaps y genera ≥3 recomendaciones por cliente
- [ ] Script `generar-informe-competencia.sh` corre end-to-end sin errores
- [ ] Tabla `clientes.informes_competencia` persiste histórico de informes
- [ ] Trigger automático cada 4 semanas (configurable via crontab)
- [ ] Componente `GbpInformeCompetencia.jsx` visible SOLO para admin (RBAC `admin.system.config`)
- [ ] Score visual correcto: verde (rankea mejor), amarillo (en promedio), rojo (rankea peor)
- [ ] Tabla comparativa cliente vs promedio competidores por dimensión
- [ ] Lista priorizada de recomendaciones con métrica objetivo
- [ ] Histórico visible (al menos 3 informes anteriores del mismo cliente)
- [ ] Tests del analizador: 5+ casos (gaps múltiples, sin gaps, cliente top, cliente bottom)
- [ ] Tests del componente UI: render + RBAC + acciones
- [ ] Build + suite completa pasa sin errores

## Effort

~16h distribuidas en 4-5 sesiones:

| Fase | Horas |
|------|-------|
| Phase 1: Wrapper ampliado + cron + analizador | 8 |
| Phase 2: DB tabla + view | 1 |
| Phase 3: UI componente + hook + tests | 5 |
| Phase 4: Trigger automático + RBAC enforcement | 1 |
| Phase 5: Docs | 1 |

## Archivos

### Nuevos (xiaomi-12)
- `lib/analisis_competencia.py` — helper de gap detection + recomendaciones
- `cron/generar-informe-competencia.sh` — orquestador
- `cron/trigger-informes.sh` — auto-trigger cada 4 semanas
- `lib/crm-gb-scap.js` — extendido (modificado)

### Nuevos (CRM)
- `src/modules/admin/cartera/tabs/gbp/GbpInformeCompetencia.jsx`
- `src/modules/admin/cartera/tabs/gbp/GbpInformeCompetencia.test.jsx`
- `src/modules/admin/cartera/tabs/gbp/useInformeCompetencia.js`
- Webhook n8n `crm-informe-competencia-get` (GET status)
- Webhook n8n `crm-informe-competencia-generate` (POST on-demand)

### Modificados (CRM)
- `src/modules/admin/cartera/tabs/gbp/index.jsx` — integrar componente
- `src/shared/layout/WorkBody.jsx` — si aplica acceso directo admin

### Modificados (DB)
- Nueva tabla `clientes.informes_competencia` (VPS via DDL)

## Risks

1. **Cambios en Google Maps HTML**: el selector de cada campo (horarios, fotos, posts) puede romperse. Mitigación: tests con snapshots de HTML + fallback cuando un campo no se puede extraer.

2. **Volumen de scrape**: 10 competidores × 8 campos = muchos requests. Mitigación: rate limiting (1.5s delay entre scrapes ya implementado) + ejecutar en horario nocturno.

3. **Falsos positivos en recomendaciones**: las reglas determinísticas pueden no aplicar al contexto del cliente. Mitigación: el admin puede marcar cada recomendación como "implementada" o "descartada" para que el sistema aprenda qué reglas son útiles.

4. **Inconsistencia en datos scrapeados**: Google Maps a veces devuelve categoria == nombre del negocio. Mitigación: filtros existentes en `detect_sugerencias.py`.

## Related

- Sprint `2026-08-11-gbp-ficha-enrichment/` (GbpFichaLayout base)
- Sprint `2026-08-11-xiaomi-audits-and-heatmaps/` (auditoría base)
- Memoria #1687 (sprint xiaomi base, 5 crons activos)
- Documentación oficial Google: support.google.com/business/answer/3038177
