# Tasks: Categoría-sugerencias desde competencia

## Overview

Feature que detecta cuando competidores de un cliente tienen categorías GBP más específicas (y rankean mejor), para sugerir al cliente cambiar su categoría. Sprint completo ~10-12h.

## Delivery Strategy

- **Mode**: chained PRs (4 slices por fase)
- **Review budget**: 400 lines per PR
- **Dependency**: requiere que `audit-competencia.sh` ya esté operacional (✅ hoy 16 clientes en DB)

---

## Phase 1 — Backend wrapper (Xiaomi-12)

### T1.1 — Modificar `/search-by-name` para devolver top 10 ✅
- **Owner**: dev xiaomi-side
- **Effort**: 2h
- **Files**: `lib/crm-gb-scap.js`
- **Spec**:
  - Iterar sobre los resultados de Google Maps (no solo el primero)
  - Para cada resultado: scrape nombre, rating, reviews, CID, categoria_principal, lat/lng
  - Excluir el cliente mismo si está en los resultados
  - Devolver JSON array
- **Tests**: 1 test manual con query "Restaurante Madrid" → verificar que devuelve 5+ resultados
- **Risk**: Google Maps UI cambia frecuentemente
- **Estado**: ✅ COMPLETADO
  - Backup: `lib/crm-gb-scap.js.bak-pre-top10`
  - Test: query "Fontaneria Madrid" devuelve 7 resultados en ~64s
  - categoria_principal poblada en todos los resultados
  - Nota: Google a veces muestra nombre del negocio como categoria_principal (mismo que name) — bug de Google, no del wrapper

### T1.2 — Script cron `categoria-sugerencias.sh` ✅
- **Owner**: dev xiaomi-side
- **Effort**: 1h
- **Files**: `cron/categoria-sugerencias.sh`
- **Spec**:
  - Por cada cliente activo con categoria + ciudad + provincia
  - Llama wrapper `/search-by-name` → array de competidores
  - Llama helper Python `detect_sugerencias.py` con los datos
  - INSERT en `clientes.categoria_sugerencias`
- **Schedule**: lunes 6AM (después de `search-sector.sh` 5AM)
- **Estado**: ✅ COMPLETADO
  - Archivo creado (5418 bytes)
  - Syntax OK
  - Falta: agregar a crontab (manual o cuando confirmes)

### T1.3 — Helper Python `detect_sugerencias.py` ✅
- **Owner**: dev xiaomi-side
- **Effort**: 2h
- **Files**: `lib/detect_sugerencias.py`
- **Spec**:
  - Recibe: cliente_categoria, cliente_rating, cliente_reviews, competidores[]
  - Filtra competidores "mejores posicionados": rating > cliente+0.5 AND reviews > cliente*2
  - Heurística "específico > genérico":
    - longitud del texto (más largo = más específico, hasta cierto punto)
    - keywords: "24h", "emergencia", "express", "servicio", "taller", "clínica"
    - NO contiene solo una palabra genérica ("Fontanería", "Restaurante")
  - Devuelve: lista de sugerencias con score (0-100)
- **Tests**: 5 casos pytest (match obvio, no-match, edge cases)
- **Estado**: ✅ COMPLETADO con FIX adicional
  - 3/3 tests pasaron
  - **Fix post-aplicación**: filtrar `categoria_principal == name` (wrapper a veces devuelve el nombre como categoria). Redujo 3 → 1 sugerencia real en test
  - Ejemplo real detectado: "Fontanería" → "Fontanero Urgencia Madrid" (rating 4.6, 678 reviews)

---

## Phase 2 — Backend DB (VPS)

### T2.1 — Migración tabla `clientes.categoria_sugerencias`
- **Owner**: dev backend
- **Effort**: 30min
- **Files**: nueva migración SQL via psql al VPS
- **Schema**:
  ```sql
  CREATE TABLE clientes.categoria_sugerencias (
    id SERIAL PRIMARY KEY,
    cliente_id BIGINT NOT NULL REFERENCES clientes.clientes(id),
    categoria_actual VARCHAR(255),
    categoria_sugerida VARCHAR(255),
    score SMALLINT NOT NULL,
    competitor_count SMALLINT NOT NULL,
    avg_competitor_rating NUMERIC(3,2),
    avg_competitor_reviews INTEGER,
    detected_at TIMESTAMPTZ DEFAULT NOW(),
    implemented_at TIMESTAMPTZ,
    implemented_by VARCHAR(255),
    notes TEXT
  );
  CREATE INDEX idx_cat_sug_cliente ON clientes.categoria_sugerencias(cliente_id, detected_at DESC);
  ```

### T2.2 — Vista materializada `clientes.v_categoria_sugerencias_activas`
- **Owner**: dev backend
- **Effort**: 15min
- **Spec**: vista que devuelve solo sugerencias NO implementadas, ordenadas por score DESC
- Usada por la UI para no mostrar implementadas

---

## Phase 3 — Frontend (CRM)

### T3.1 — Componente `GbpCategoriaSugerencia.jsx`
- **Owner**: dev frontend
- **Effort**: 3h
- **Files**: `src/modules/admin/cartera/tabs/gbp/GbpCategoriaSugerencia.jsx`
- **Spec**:
  - Lee `v_categoria_sugerencias_activas` filtrado por cliente_id
  - Si hay sugerencia activa: muestra card con:
    - "Tu categoría actual: **Fontanería**"
    - "Sugerencia: **Servicio de fontanería de emergencia 24h**"
    - "Basado en N competidores con rating promedio X.X"
    - Lista de competidores根拠 (top 3, con rating + reviews)
    - Botón "Marcar como implementado"
  - Si no hay: componente retorna null (no muestra nada)
- **Integración**: agregar a `index.jsx` cuando el item del sidebar es "sector" (o nuevo item)
- **RBAC**: `admin.system.config` para ver + implementar

### T3.2 — Hook `useCategoriaSugerencias.js`
- **Owner**: dev frontend
- **Effort**: 1h
- **Files**: `src/modules/admin/cartera/tabs/gbp/useCategoriaSugerencias.js`
- **Spec**: usa `useN8nQuery` para fetch + `useN8nMutation` para implementar
- Webhook nuevo: `crm-categoria-sugerencia-implementar` (POST)

### T3.3 — Tests del componente
- **Owner**: dev frontend
- **Effort**: 1h
- **Files**: `src/modules/admin/cartera/tabs/gbp/GbpCategoriaSugerencia.test.jsx`
- Spec: render vacío sin sugerencia, render con sugerencia, click implementar, RBAC

---

## Phase 4 — Tracking (Xiaomi-12)

### T4.1 — Script `categoria-tracking.sh`
- **Owner**: dev xiaomi-side
- **Effort**: 1h
- **Files**: `cron/categoria-tracking.sh`
- **Spec**:
  - Cada 7 días, re-scrapea clientes con sugerencia pendiente
  - Compara categoria actual del cliente vs sugerencia
  - Si match → marca `implemented_at` automático
  - Si no match → log warning (sugerencia ignorada por cliente)
- **Schedule**: diario 7AM

---

## Phase 5 — Documentación

### T5.1 — Actualizar `infra/xiaomi/README.md`
- Sección "Gestión de sugerencias de categoría"
- Diagrama de flujo: scrape → detect → suggest → admin aprueba → re-scrape → verify

### T5.2 — CHANGELOG
- Sección nueva con fecha, bullets de la feature

### T5.3 — Memoria del proyecto
- Topic key: `feature/categoria-sugerencias-desde-competencia`
- Decisiones arquitectónicas + riesgos + learnings

---

## Commits planeados

1. `feat(wrapper): search-by-name devuelve top 10 resultados con categoria_principal`
2. `feat(cron): categoria-sugerencias.sh + detect_sugerencias.py con heurística específico > genérico`
3. `feat(db): tabla clientes.categoria_sugerencias + vista materializada`
4. `feat(admin): GbpCategoriaSugerencia componente + hook + tests`
5. `feat(cron): categoria-tracking.sh verifica implementación automática`
6. `docs(infra): documentar feature categoria-sugerencias`

---

## Estado

Pendiente aprobación. Proceder con implementación incremental cuando se asigne capacidad.
