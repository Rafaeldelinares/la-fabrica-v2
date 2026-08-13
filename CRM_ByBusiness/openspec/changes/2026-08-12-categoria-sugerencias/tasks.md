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

## Phase 3 — Frontend admin-only (CRM) ✅

### T3.1 — Componente `GbpInformeCompetencia.jsx` ✅
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

### T3.2 — Hook `useInformeCompetencia.js` ✅
- **Owner**: dev frontend
- **Effort**: 1h
- **Files**: `src/modules/admin/cartera/tabs/gbp/useInformeCompetencia.js`
- **Spec**: 
  - `useN8nQuery` para fetch último informe (`crm-informe-competencia-get`)
  - `useN8nMutation` para generar nuevo (`crm-informe-competencia-generate`)
  - Estados: `data`, `isLoading`, `isGenerating`, `error`

### T3.3 — Tests del componente ✅
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

### T4.2 — Webhooks n8n ✅ (V7 — crm-informe-pdf)
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

## Phase 7 — Generación On-Demand (2026-08-13) ✅

### T7.1 — Backend: trigger scraping desde PDF server ✅
- **Owner**: dev backend
- **Files**: `infra/scripts/pdf_http_server.py`
- **Spec**:
  - Si `fetch_ultimo_informe(cliente_id)` retorna None:
    - SSH a Xiaomi (`ssh -p 8022 root@100.75.94.18`)
    - Ejecutar `generar-informe-competencia.sh {cliente_id}` con timeout 180s
    - Verificar que el informe se insertó en la DB
    - Si OK → generar PDF; si falla → devolver error 500 con detalle
  - Lock anti-duplicados con `fcntl.flock`
  - Timeout scraping: 180s (script tarda 30-90s)
- **Errores manejados**:
  - Cookies Google expiradas → mensaje claro para renovar
  - Script timeout → error 500
  - Sin resultados (no competitors) → mensaje descriptivo
- **Estado**: ✅ COMPLETADO

### T7.2 — Frontend: timeout 180s + mensajes contextuales ✅
- **Owner**: dev frontend
- **Files**: `useInformeCompetencia.js`, `GbpInformeCompetencia.jsx`
- **Spec**:
  - Hook: timeout fetch 180s (era 30s), mensaje timeout específico
  - Skeleton: differentiate "cargando PDF existente" vs "generando nuevo"
  - isGenerating: computed via elapsed time > 5s threshold
- **Estado**: ✅ COMPLETADO

### T7.3 — Tests actualizados ✅
- **Owner**: dev frontend
- **Files**: `GbpInformeCompetencia.test.jsx`
- **Spec**: 9 tests原有 + 1 nuevo = 10 tests total
  - Test 10: mensaje de timeout tras 180s
- **Estado**: ✅ COMPLETADO (10/10 pasan)

### T7.4 — Documentación actualizada ✅
- **Files**: `infra/scripts/pdf_http_server.py`, `infra/xiaomi/README.md`, `tasks.md`
- **Estado**: ✅ COMPLETADO

---

## Phase 6 — Integración recursos externos (T1.14) ✅

### T1.14a — gbp-industry-categories import ✅
- **Owner**: dev backend
- **Effort**: 1.5h
- **Files**: nueva tabla VPS + `lib/categorias_curadas.py` actualizado
- **Spec**:
  - Clonar `https://github.com/carbondigitalus/gbp-industry-categories`
  - Crear tabla `infraestructura.gbp_industry_categories` en VPS
  - Importar las 4045 categorías oficiales GBP
  - Integrar como **Source 1** (oficial) en `categorias_curadas.validate()`
  - Cache de industria para evitar query SQL por cada validación
- **Estado**: ✅ COMPLETADO
  - 4045 categorías importadas (faltan ~50 por duplicados/normalización)
  - Lista curada crece: 13 → 22+ después de tests E2E
  - validate() ahora retorna nivel 1/2/3 con 2 fuentes

### T1.14b — NAP consistency check ✅
- **Owner**: dev backend
- **Effort**: 1h
- **Files**: `lib/analisis_competencia.py`
- **Spec**:
  - `analyze_nap_consistency()` compara nombre/dirección/teléfono del cliente vs competidores
  - `normalize_name/address/phone()` con regex + SequenceMatcher
  - Score ponderado: name 40%, address 30%, phone 30%
  - Integrar como factor Plus SEO (peso 5%)
  - Recomendación automática si NAP score < 50%
- **Estado**: ✅ COMPLETADO
  - Tests: cliente 368 score=rojo (NAP score bajo)
  - Cliente 105 score=amarillo (NAP score medio)
  - Issues list detectados correctamente

### T1.14c — Documentación local-seo-best-practices ✅
- **Owner**: dev docs
- **Effort**: 30min
- **Files**: `docs/local-seo-best-practices.md`
- **Spec**:
  - Tabla top 15 BrightLocal 2026 con pesos y si scrapeamos
  - Lista de repos externos utilizados
  - Flujo del informe
  - Cómo funciona la lista curada
  - Lo que NO impacta ranking
  - Glosario + Roadmap
- **Estado**: ✅ COMPLETADO (168 líneas)
- **Repos referenciados**:
  - gbp-industry-categories (clonado + integrado)
  - tribu-seo-local (referencia ES)
  - google-business-profile-skill (referencia bilingüe)
  - gbp-reviews-insights (roadmap)
  - napdetector (adaptado)

---

## Estado

Phase 1 ampliada + Phase 6 (T1.14) + Phase 3 (T3.1-T3.3) + Phase 4 (T4.2 V7 workflow) ✅ completas.
Phase 2 (DB ya hecha). Phase 4 T4.1 (cron trigger script) pendiente.
Phase 5 (docs) pendiente.

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

**SPRINT COMPLETO END-TO-END** (Phase 1, 1b, 2, 3, 4, 6 todas completas).

### Phase 3 ✅ (UI admin-only con modal PDF)
- T3.1 Componente `GbpInformeCompetencia.jsx` (~230 lineas)
  - Botón "Ver informe competitivo" con icono FileText
  - Modal full-screen con iframe embebido del PDF
  - Skeleton bars mientras carga (Navy Industrial, sin spinners)
  - Error state con botón retry
  - Footer con "Descargar PDF" + "Cerrar"
  - RBAC: solo admin (`admin.system.config`)
- T3.2 Hook `useInformeCompetencia.js` (~120 lineas)
  - POST a webhook n8n V8 `crm-informe-pdf-v8` con `{cliente_id: N}`
  - Convierte PDF binario a Blob URL
  - Cleanup con `URL.revokeObjectURL` en unmount
- T3.3 Tests (9/9 pasaron): render, click, RBAC, modal, disabled, descarga
- Backend n8n V8: webhook POST devuelve PDF binario
- VPS: servicio systemd `pdf-server.service` (puerto 8093) sirve PDFs al vuelo

### Phase 4 ✅ (trigger automático)
- Cron job: `0 7 1,29 * *` (lunes cada ~2 semanas)
- Check de periodo: skip si último informe < 28 días
- Flag `--force` para saltarse el check
- Log: `/var/log/informe-competitivo.log`

---

## Phase 8 — Modal CID Manual (2026-08-13) ✅

### T8.1 — Backend: endpoint `/cid-manual` en pdf_http_server.py ✅
- **Files**: `infra/scripts/pdf_http_server.py`
- **Spec**:
  - POST `/cid-manual` recibe `{cliente_id, google_cid}`
  - Validación regex: `^0x[a-f0-9]+:0x[a-f0-9]+$` (case-insensitive)
  - UPDATE DB con el CID
  - Trigger scraping Xiaomi
  - Genera PDF y retorna
- **Estado**: ✅ COMPLETADO

### T8.2 — Backend: `needs_cid` cuando Xiaomi no encuentra CID ✅
- **Files**: `infra/scripts/pdf_http_server.py`
- **Spec**:
  - Cuando Xiaomi devuelve `NO_CID_FOUND`, intentar Google search fallback
  - Google search: curl a `google.com/search?q=CLIENTE+Google+Maps`, parsear HTML buscando `0xHASH:0xHASH`
  - Si Google encuentra CID → usar directamente y reintentar scraping
  - Si Google tampoco → retorna JSON con status `needs_cid` (HTTP 200)
- **Respuesta needs_cid**:
  ```json
  {
    "status": "needs_cid",
    "message": "No se pudo encontrar el CID automáticamente",
    "instructions": [...],
    "cliente_id": N,
    "cliente_nombre": "..."
  }
  ```
- **Estado**: ✅ COMPLETADO

### T8.3 — Frontend: `ManualCIDModal.jsx` ✅
- **Files**: `src/modules/admin/cartera/tabs/gbp/ManualCIDModal.jsx`
- **Spec**:
  - Modal con input CID manual, validación visual regex en tiempo real
  - Estados: verde si válido, rojo si inválido, disabled si vacío
  - Instrucciones de cómo obtener el CID
  - Navy Industrial: `bg-slate-900`, `rounded-sm`, `JetBrains Mono`
  - PropTypes completos
- **Tests**: 10 tests (ManualCIDModal.test.jsx)
- **Estado**: ✅ COMPLETADO

### T8.4 — Frontend: `useInformeCompetencia.js` actualizado ✅
- **Files**: `src/modules/admin/cartera/tabs/gbp/useInformeCompetencia.js`
- **Spec**:
  - Nuevo estado `needsCid` (object | null)
  - `fetchInformePDF`: detecta `status: needs_cid` y configura needsCid
  - Nueva función `submitCid(clienteId, googleCid)`: POST al endpoint manual
  - Retorna: `{ pdfUrl, isLoading, error, needsCid, submitCid, fetchInformePDF, descargarPDF }`
- **Tests**: 7 tests (useInformeCompetencia.test.jsx)
- **Estado**: ✅ COMPLETADO

### T8.5 — Frontend: `GbpInformeCompetencia.jsx` actualizado ✅
- **Files**: `src/modules/admin/cartera/tabs/gbp/GbpInformeCompetencia.jsx`
- **Spec**:
  - Detecta `needsCid` del hook y abre `ManualCIDModal` en lugar del PDF
  - `useEffect` que sincroniza needsCid → modal abierto
  - `handleManualCidSubmit` llama `submitCid` y cierra modal al éxito
  - PdfModal se cierra cuando needsCid está activo
- **Estado**: ✅ COMPLETADO

### T8.6 — Tests E2E ✅
- **Files**: `ManualCIDModal.test.jsx`, `useInformeCompetencia.test.jsx`
- **ManualCIDModal**: 10 tests (render, validation, submit, cancel)
- **useInformeCompetencia**: 7 tests (needsCid, pdfUrl, error, submitCid, loading)
- **GbpInformeCompetencia**: tests existentes siguen pasando (mock del hook)
- **Estado**: ✅ COMPLETADO

### T8.7 — Documentación ✅
- **Files**: tasks.md (este archivo)
- CHANGELOG actualizado
- **Estado**: ✅ COMPLETADO

---

## Estado Final

**Phase 8 ✅ COMPLETA — Modal CID Manual**
- Backend: endpoint `/cid-manual` + Google search fallback + `needs_cid` response
- Frontend: `ManualCIDModal` + hook actualizado con `needsCid` + `submitCid`
- Tests: 17 tests nuevos/add+ (ManualCIDModal 10 + useInformeCompetencia 7)
- Documentación: tasks.md actualizado

---

## Phase 9 — Drive-by Auditing (2026-08-13) 🔧

### T9.1 — VPS: función `insert_audit_history()` ✅
- **Files**: `infra/scripts/pdf_http_server.py`
- **Spec**:
  - Función `_insert_audit_history(cliente_id, source, audit_data)` con UPSERT via CTE
  - Tabla destino: `clientes.gbp_audit_history`
  - Usa DELETE + INSERT para evitar requirement de unique constraint
  - `audit_source` = 'webhook' (compatible con CHECK constraint existente)
  - Conexión directa a postgres (172.19.0.4:5432) dado que pdf_http_server corre en el host VPS
- **Estado**: ✅ COMPLETADO

### T9.2 — VPS: `_trigger_xiaomi_scrape()` captura AUDIT_JSON ✅
- **Files**: `infra/scripts/pdf_http_server.py`
- **Spec**:
  - SSH ya no usa `| tail -20` (capture output completo)
  - Nueva función `_extract_audit_json()` parsea markers `===AUDIT_JSON_START=== ... ===AUDIT_JSON_END===`
  - Después de scrape exitoso: llama `_insert_audit_history()` con datos de auditoría
  - Si no hay AUDIT_JSON en output: log warning pero no falla el flujo
- **Estado**: ✅ COMPLETADO

### T9.3 — Xiaomi: modificar `generar-informe-competencia.sh` ⏳
- **Files**: `/data/data/com.termux/files/home/xiaomi-gb-scape/cron/generar-informe-competencia.sh`
- **Spec**:
  - Después de scraping exitoso del cliente (wrapper `scrape <cid>`), capturar el JSON de auditoría completo
  - Imprimir markers + JSON al final del output:
    ```
    ===AUDIT_JSON_START===
    {"place_id":"...","rating_promedio":4.5,"reviews_count":10,...}
    ===AUDIT_JSON_END===
    ```
  - El wrapper `crm-gb-scap.js` ya devuelve todos los campos necesarios
  - Solo se necesita: capturar stdout del wrapper y re-imprimirlo con markers
- **Implementar en xiaomi**:
  ```bash
  # Después de SCRAPE_RESULT=$(node bin/crm-gb-scap.js scrape "$CID")
  echo "===AUDIT_JSON_START==="
  echo "$SCRAPE_RESULT"
  echo "===AUDIT_JSON_END==="
  ```
- **Estado**: ⏳ PENDIENTE — requiere acceso al xiaomi (SSH)

### T9.4 — Tests E2E ⏳
- **Test 1**: Cliente 496 (ACADEMIA ALBAYDA, sin auditoría)
  - Llamar webhook V8 con cliente_id=496
  - Verificar que `clientes.gbp_audit_history` tiene nuevo registro con `place_id` y `audit_data` fresco
- **Test 2**: Cliente 107 (ya tiene auditoría)
  - Llamar webhook V8 con cliente_id=107
  - Verificar que el registro se ACTUALIZÓ (no duplicado, mismo place_id)
- **Test 3**: Cliente 58 (Alquiler Salamanca, con auditoría)
  - Mismo que Test 2
- **Estado**: ⏳ PENDIENTE

### T9.5 — Documentación ⏳
- Actualizar `infra/xiaomi/README.md` con nota sobre drive-by auditing
- CHANGELOG.md con entrada Phase 9
- **Estado**: ⏳ PENDIENTE

---

## Estado Phase 9

**VPS-side**: T9.1 ✅ T9.2 ✅ (implementado en CRM_ByBusiness repo)
**Xiaomi-side**: T9.3 ⏳ (requires SSH to xiaomi)
**Tests**: T9.4 ⏳
**Docs**: T9.5 ⏳
