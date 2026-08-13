# Tasks: Informe competitivo completo

## Overview

Feature que genera un **informe competitivo completo** para cada cliente: análisis de competidores en Google Maps (misma actividad + zona) con métricas extendidas, detección de brechas, recomendaciones priorizadas, almacenamiento histórico y UI admin-only.

## Delivery Strategy

- **Mode**: chained PRs (5 slices por fase)
- **Review budget**: 400 lines per PR
- **Dependency**: Phase 1 (categorías) del sprint original ya está implementada parcialmente

---

## Estado actual (2026-08-12)

### ✅ Phase 1 (sprint original, categorías) — Parcial

- T1.1: Wrapper `/search-by-name` top 10 con `categoria_principal` ✅
- T1.2: Script `cron/categoria-sugerencias.sh` ✅
- T1.3: Helper `lib/detect_sugerencias.py` con heurística ✅
- Tabla `clientes.categoria_sugerencias` creada ✅
- **Validación**: 0/30 sugerencias reales (wrapper devuelve categoria == nombre para muchos casos)

### 🔧 Ampliación necesaria

- Wrapper necesita capturar: categorias_adicionales, horarios, fotos_count, posts_count, antiguedad_dias, tasa_respuesta_reseñas
- Detector + analizador de gaps completo
- Script generador de informe
- Trigger automático cada 4 semanas
- UI admin-only

---

## Phase 1 ampliada — Backend wrapper extendido (Xiaomi-12)

### T1.4 — Wrapper extendido con campos adicionales
- **Owner**: dev xiaomi-side
- **Effort**: 3h
- **Files**: `lib/crm-gb-scap.js`
- **Spec**: Para cada resultado scrapeado, capturar campos adicionales:
  - `categorias_adicionales`: array de strings (ej: ["Plumber", "Emergency plumber"])
  - `horarios`: dict {dia: "9:00-18:00"} (7 días)
  - `fotos_count`: integer
  - `posts_count`: integer (Google Posts)
  - `antiguedad_dias`: integer (días desde creación)
  - `tasa_respuesta_reseñas_pct`: 0-100 (% reseñas con respuesta del dueño)
  - `qa_count`: integer (preguntas respondidas)
- **Tests**: query "Restaurante Madrid" → verificar todos los campos poblados

### T1.5 — Helper `analisis_competencia.py` con reglas de gap detection
- **Owner**: dev xiaomi-side
- **Effort**: 3h
- **Files**: `lib/analisis_competencia.py` (nuevo)
- **Spec**: Recibe JSON de competidores + datos del cliente. Calcula:
  - Promedio y mediana por dimensión
  - Gap = cliente - promedio_competencia (en cada dimensión)
  - Aplica reglas determinísticas:
    - rating_gap < -0.5 → "Pedir reseñas a clientes satisfechos"
    - reviews_gap < cliente_reviews * 0.3 → "Campaña activa de reseñas"
    - categoria_score < competidores_avg * 0.8 → "Considerar cambiar categoría a X"
    - fotos_count < 10 → "Subir más fotos profesionales"
    - fotos_count < competidores_avg * 0.5 → "Mínimo N fotos para competir"
    - tasa_respuesta < 20% → "Responder TODAS las reseñas pendientes"
    - posts_count < 5 → "Publicar posts regularmente (mínimo 1/mes)"
    - antiguedad_dias < competidores_avg * 0.5 → "Perfil nuevo — enfocarse en fundación"
  - Cada regla devuelve: `{tipo, mensaje, accion, metric_objetivo, prioridad}`
  - Priorización: rating_gap > reviews_gap > categoria > fotos > respuesta > posts > antiguedad
- **Output**: JSON con `gaps`, `promedios`, `recomendaciones[]`
- **Tests**: pytest con 5+ casos

### T1.6 — Script `cron/generar-informe-competencia.sh`
- **Owner**: dev xiaomi-side
- **Effort**: 2h
- **Files**: `cron/generar-informe-competencia.sh` (nuevo)
- **Spec**:
  - Recibe cliente_id como parámetro (o procesa todos si no se pasa)
  - Para cada cliente: scrape competidores (wrapper), ejecutar analizador, INSERT informe
  - Skip si ya hay informe reciente (< 4 semanas para auto-trigger)
  - Log de progreso
  - Return JSON con resultado
- **Schedule**: 
  - Manual: cuando se llama via webhook n8n con cliente_id
  - Auto: lunes cada 4 semanas via `cron/trigger-informes.sh`

---

## Phase 2 — Backend DB (VPS)

### T2.1 — Tabla `clientes.informes_competencia`
- **Owner**: dev backend
- **Effort**: 30min
- **Files**: migración SQL al VPS
- **Schema**:
  ```sql
  CREATE TABLE clientes.informes_competencia (
    id SERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes.clientes(id),
    generated_at TIMESTAMPTZ DEFAULT NOW(),
    competitors_count SMALLINT NOT NULL,
    avg_competitor_rating NUMERIC(3,2),
    avg_competitor_reviews INTEGER,
    client_rating NUMERIC(3,2),
    client_reviews INTEGER,
    rating_gap NUMERIC(3,2),
    reviews_gap INTEGER,
    client_position_pct SMALLINT,
    recomendaciones JSONB NOT NULL,
    raw_competitors JSONB,
    status VARCHAR(20) DEFAULT 'generated',
    notes TEXT
  );
  CREATE INDEX idx_inf_comp_cliente ON clientes.informes_competencia(cliente_id, generated_at DESC);
  ```

### T2.2 — View `clientes.v_informes_recientes`
- **Owner**: dev backend
- **Effort**: 15min
- **Spec**: Vista con DISTINCT ON (cliente_id) ORDER BY generated_at DESC — devuelve solo el último informe por cliente

---

## Phase 3 — Frontend admin-only (CRM)

### T3.1 — Componente `GbpInformeCompetencia.jsx`
- **Owner**: dev frontend
- **Effort**: 3h
- **Files**: `src/modules/admin/cartera/tabs/gbp/GbpInformeCompetencia.jsx` (nuevo)
- **Spec**:
  - Lee `v_informes_recientes` filtrado por cliente_id
  - Si no hay informe: muestra "Generar primer informe" con botón
  - Si hay: renderiza:
    - **Score visual**: badge grande (verde/amarillo/rojo) basado en rating_gap + position_pct
    - **Tabla comparativa** (cliente vs promedio competidores):
      - Rating: cliente | promedio | gap (con delta visual)
      - Reviews: cliente | promedio | gap
      - Fotos: cliente | promedio
      - Respuesta reseñas: cliente | promedio
    - **Recomendaciones priorizadas**: lista de cards
      - Cada una con tipo, mensaje, acción sugerida, métrica objetivo
    - **Histórico**: collapsible con últimos 3-5 informes (fecha + score)
  - Botón "Generar nuevo informe ahora"
  - **RBAC**: `admin.system.config` (NO operadores)
  - Estado: skeleton mientras carga, empty state si no hay datos

### T3.2 — Hook `useInformeCompetencia.js`
- **Owner**: dev frontend
- **Effort**: 1h
- **Files**: `src/modules/admin/cartera/tabs/gbp/useInformeCompetencia.js`
- **Spec**: 
  - `useN8nQuery` para fetch último informe (`crm-informe-competencia-get`)
  - `useN8nMutation` para generar nuevo (`crm-informe-competencia-generate`)
  - Estados: `data`, `isLoading`, `isGenerating`, `error`

### T3.3 — Tests del componente
- **Owner**: dev frontend
- **Effort**: 1h
- **Files**: `GbpInformeCompetencia.test.jsx` (nuevo)
- **Spec**: render vacío sin informe, render con informe, click generar, RBAC denegado

---

## Phase 4 — Trigger automático (Xiaomi-12)

### T4.1 — Script `cron/trigger-informes.sh`
- **Owner**: dev xiaomi-side
- **Effort**: 1h
- **Files**: `cron/trigger-informes.sh` (nuevo)
- **Spec**:
  - Recorre clientes activos
  - Para cada uno: verifica si último informe > 4 semanas
  - Si sí: ejecuta `generar-informe-competencia.sh` con cliente_id
  - Log de progreso
- **Schedule**: crontab lunes cada 4 semanas (o configurable)
  - `0 7 1-7,29-31 * 1` (primeras semanas y últimas del mes, lunes)

### T4.2 — Webhooks n8n
- **Owner**: dev backend
- **Effort**: 1h
- **Files**: nuevo workflow n8n en VPS
- **Workflows**:
  - `CRM_INFORME_COMPETENCIA_GET` (GET): lee último informe del cliente
  - `CRM_INFORME_COMPETENCIA_GENERATE` (POST): genera nuevo informe via SSH al xiaomi
- **Spec**: igual a otros workflows del proyecto (patrón ya establecido)

---

## Phase 5 — Documentación

### T5.1 — Actualizar `infra/xiaomi/README.md`
- **Owner**: dev docs
- **Effort**: 30min
- **Spec**: agregar sección "Informes competitivos automáticos"
  - Diagrama de flujo: cron cada 4 sem → wrapper → analizador → DB → UI
  - Tabla de triggers (manual vs auto)

### T5.2 — CHANGELOG
- **Owner**: dev docs
- **Effort**: 15min
- **Spec**: entrada con bullets de las features

### T5.3 — Memoria del proyecto
- **Owner**: dev docs
- **Effort**: 15min
- **Spec**: actualizar topic_key `feature/informe-competencia-completo`

---

## Commits planeados

1. `feat(wrapper): search-by-name captura campos adicionales (horarios, fotos, posts)`
2. `feat(cron): analisis_competencia.py con gap detection + recomendaciones priorizadas`
3. `feat(cron): generar-informe-competencia.sh end-to-end`
4. `feat(db): tabla informes_competencia + vista reciente`
5. `feat(admin): GbpInformeCompetencia componente + hook + tests`
6. `feat(cron): trigger-informes.sh automatico cada 4 semanas`
7. `feat(n8n): workflows CRM_INFORME_COMPETENCIA_GET + _GENERATE`
8. `docs(infra): documentar feature informe-competencia-completo`

---

## Estado

Pendiente aprobación. Proceder con Phase 1 ampliada (T1.4 + T1.5 + T1.6) en próxima sesión cuando se asigne capacidad.
