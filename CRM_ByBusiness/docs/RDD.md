# CRM ByBusiness — RDD (Requirements & Data Definition)

**Versión:** 1.0  
**Fecha:** 2026-08-01  
**Audiencia:** desarrolladores, arquitectos, auditores, futuros mantenedores  
**Estado:** Borrador vivo — actualizar con cada cambio de schema

---

## 1. Visión y alcance

El CRM ByBusiness gestiona el ciclo completo de un negocio de **captación de clientes locales vía Google Business Profile**, desde la prospección automatizada hasta la venta y el cobro. Reemplaza un pipeline manual basado en hojas de cálculo por un sistema distribuido con:

- **Scrapers** que recolectan fichas de Google Maps
- **Distribuidor** que asigna leads a operadores humanos
- **Workflows n8n** como capa BFF que orquesta toda la lógica
- **Frontend React** con dos modos: Torre de Control (admin) y Modo Túnel (operador)
- **RBAC granular** de 17 permisos sobre 4 roles
- **Comunicaciones** multicanal (email SMTP + WhatsApp vía WAHA)
- **Auditoría** inmutable de cambios administrativos

**Out of scope actual:** multi-tenant (todo es `crm_bybusiness` DB), facturación al cliente final del CRM, integración con ERPs externos, app móvil nativa.

---

## 2. Principios del modelo de datos

1. **Schemas por dominio de negocio** (no por capa técnica). Una tabla está en `operaciones` si modela el proceso de trabajo diario, en `crm_bybusiness` si modela entidades cliente, en `raw` si es zona de staging antes de validación.
2. **`operaciones.leads` es la entidad operativa** — el "lead vivo" con estado y prioridad. `crm_bybusiness.clientes` es el resultado de una conversión (`lead → cliente → venta → pago`). No son la misma cosa.
3. **`soft delete` por convención**: campos `estado`, `fecha_baja`, `freeze_hasta`/`freeze_razon`. NO se borran filas (excepto PII bajo derecho al olvido — ver §6).
4. **Auditoría append-only**: `sistema.eventos_sistema` (en DB fabrica, no en `crm_bybusiness`) guarda cada acción admin/operador. Tabla inmutable — solo INSERT.
5. **Timestamps `created_at` / `updated_at` en toda tabla** con default `now()`. Para consistencia operativa, **todos los timestamps son `timestamp without time zone`** en `operaciones.*` y `crm_bybusiness.*`; `timestamp with time zone` solo en tablas que cruzan zona horaria (gbp_*).
6. **Sin magic strings** — los valores de `estado`, `rol`, `prioridad`, `tipo` se documentan en el RDD (ver §4). Cambios requieren migración explícita.
7. **Foreign keys nombradas con prefijo `fk_`** (estándar La Fábrica). `idx_tabla_campo` para índices.

---

## 3. Inventario de schemas

DB: `crm_bybusiness` en `localhost:5432` (local) y `VPS 72.60.191.179` (producción). Misma estructura en ambos.

| Schema | Propósito | Tablas |
|---|---|---|
| `auth` | Usuarios CRM, login, 2FA, sesión | `usuarios` |
| `crm_bybusiness` | Entidades cliente finales, GBP data, operadores | 14 tablas (clientes, ventas, pagos, operadores, gbp_*, etc.) |
| `marketing` | Datos de marketing y categorización | `categorias_maestras`, `leads_entrantes` |
| `operaciones` | Estado vivo del pipeline diario | 19 tablas (leads, llamadas, campanas, etc.) |
| `raw` | Staging antes de validación | `almacen_masivo`, `barrido_empresas`, `lista_negra_categorias` |
| `rrhh` | Operadores humanos (RRHH) | `candidatos`, `horarios_trabajo` |
| `social` | Automatización de redes sociales | `dm_conversaciones`, `posts_cola` |

**Eventos del sistema** (auditoría) viven en DB `fabrica` schema `sistema.eventos_sistema` — **separado físicamente** del CRM. Esto aísla la auditoría del rendimiento del CRM y permite análisis independiente.

---

## 4. Modelo por dominio

### 4.1 Captación (Google Maps + scrapers)

**Tablas principales:**

```
raw.barrido_empresas              — productos crudos de scrapers (NANO/HEAVY/maps)
raw.almacen_masivo               — staging masivo (batch inserts)
raw.lista_negra_categorias       — categorías a descartar (ej: "cerrajero 24h")
   ↓ validador + dedup
operaciones.leads                — entidad operativa del lead (estado: pendiente, asignado, en_llamada, resultado, vendido, descartado)
operaciones.leads_rating_history — histórico de cambios de scoring/freshness
marketing.categorias_maestras    — taxonomía de nichos (ej: "dentista", "abogado")
marketing.leads_entrantes        — leads que vienen de fuentes externas (formularios web, referidos)
crm_bybusiness.gbp_fichas        — ficha consolidada del Google Business Profile (cache local del scraper)
crm_bybusiness.gbp_resenas       — reseñas scrapeadas
crm_bybusiness.gbp_posts         — posts publicados en GBP
crm_bybusiness.gbp_snapshots     — snapshots históricos para auditoría
operaciones.lead_campana         — N:M entre leads y campañas
```

**Estados de `operaciones.leads.estado`** (valores válidos):
- `pendiente` → en cola del distribuidor
- `asignado` → ya tiene `operador_id`, esperando acción
- `en_llamada` → operador llamó, `historial_llamadas` registrando
- `resultado` → operador cerró la llamada con `CRM_REGISTRAR_RESULTADO`
- `vendido` → conversión a cliente (crea `crm_bybusiness.clientes` + `ventas`)
- `descartado` → operador lo bajó (duplicado, no contesta, etc.) — va a `crm_bybusiness.leads_descartados`
- `freeze` → `freeze_hasta`/`freeze_razon` activo (back-off temporal)

**Scoring:** `operaciones.leads.scoring` (numeric 0-5, default 0.0), `rating` (numeric 0-5), `num_reseñas` (int). **Freshness:** no hay columna `reputacion_at` explícita — se calcula desde `leads_rating_history` (`MAX(updated_at) WHERE campo='rating'`). Esto es frágil y debería normalizarse.

**Reglas:**
- `google_cid` es la deduplicación key (estable por ficha GBP)
- `origen` indica fuente: `almacen_masivo` (scraper batch), `leads_entrantes` (formulario web), `manual`, etc.
- `prioridad` ∈ {`alta`, `normal`, `baja`} — define orden de distribución

### 4.2 Distribución y llamadas (operador)

```
operaciones.llamadas_activas         — llamadas en curso (estado, operador, lead)
operaciones.llamadas_programadas     — calls agendadas para futuro
operaciones.historial_llamadas       — log completo de cada intento
operaciones.operador_ausencias       — bloqueos temporales (vacaciones, enfermedad)
operaciones.operador_preferencias    — qué nichos/localidades prefiere cada operador
operaciones.respuestas_tags          — tags reutilizables para resultado de llamada
operaciones.lead_campana             — campañas a las que pertenece el lead
```

**Estados de `operaciones.llamadas_activas.estado`:**
- `ringing`, `connected`, `voicemail`, `no_answer`, `busy`, `failed`
- `connected` → operador debe ir a `CRM_REGISTRAR_RESULTADO` que crea `historial_llamadas`

**Algoritmo de distribución** (en workflow `CRM_DISTRIBUIDOR`):
- Cada 30s corre `SELECT ... FOR UPDATE SKIP LOCKED` sobre leads `pendiente`
- Asignación por prioridad + nicho + disponibilidad del operador (no ausente, sin llamada activa)
- Lead queda `freeze_hasta = NOW() + interval '30 min'` para evitar re-asignación inmediata

### 4.3 Conversión (lead → cliente → venta)

```
operaciones.leads (estado='vendido')
   ↓ trigger automático al registrar resultado
crm_bybusiness.clientes              — cliente creado, hereda google_location_id
   ↓ venta confirmada
crm_bybusiness.ventas                — total, contrato_voz_link
   ↓ pago recibido
crm_bybusiness.pagos                 — monto, metodo_pago, referencia
```

**Relación:** `crm_bybusiness.clientes` tiene `google_location_id` (link estable a GBP). `ventas.cliente_id → clientes.id`. `pagos.venta_id → ventas.id`.

**Productos** (`crm_bybusiness.productos`): catálogo de servicios que se venden. Línea de venta no está modelada explícitamente — actualmente `ventas.total` es monto fijo. **GAP conocido** (Línea 3 refactor).

### 4.4 Administración (usuarios, RBAC, auditoría)

**Auth:**
```
auth.usuarios                       — id, nombre, email, password_hash, totp_*, rol, estado
crm_bybusiness.delegaciones          — admin delega permisos temporalmente a otro admin
crm_bybusiness.ausencias             — bloqueos del operador (vacaciones, etc.)
crm_bybusiness.operadores            — perfil extendido del operador (métricas, etc.)
```

**Roles** (4): `admin`, `supervisor`, `operador`, `viewer`. Permisos granulares (17) en `src/shared/auth/rbac.js`.

**Auditoría:**
- `fabrica.sistema.eventos_sistema` — append-only, eventos con `tipo_evento`, `descripcion` (jsonb), `fecha_evento`
- Eventos críticos: `BACKUP`, `REPAIR_GBP`, `CRON_RUN`, `SNAPSHOT_GBP`, `RENOVACION`, `INCIDENCIA`, `BACKUP_SISTEMA`, `CRON_SISTEMA`
- Cada acción admin genera ≥1 evento aquí

### 4.5 Comunicaciones (email, WhatsApp, proforma)

```
operaciones.mensajes_templates       — plantillas (asunto, cuerpo, variables)
operaciones.canales                  — canales disponibles (email, whatsapp, sms)
operaciones.campanas                 — campaña de envío masivo
operaciones.campanas_envios          — cada envío individual (con resultado: ok/fallo)
operaciones.campanas_control         — control de ritmo (rate limit)
crm_bybusiness.mensajes_chat         — conversaciones WhatsApp persistidas
social.dm_conversaciones             — DMs de Instagram/Twitter (futuro)
social.posts_cola                    — cola de publicación en redes
```

**Canales activos hoy:**
- **Email**: SMTP `informacion@ia-bybusiness.com` vía VPS (credencial `8NbamWrMdRexLNwa`)
- **WhatsApp**: WAHA en `https://waha.ia-bybusiness.online` (solo VPS, sesión WhatsApp persistente)
- **Instagram/Twitter**: schemados pero no implementados (`social.*` vacías)

**Compliance crítico:**
- WhatsApp Business tiene políticas de uso comercial. Templates deben estar pre-aprobados por Meta.
- Email requiere header `List-Unsubscribe` y manejo de bounces.
- **Opt-out**: NO está implementado como tabla. **GAP** (Línea 3 — debe agregarse `comunicaciones.opt_outs`).

---

## 5. Mapa entidad-relación (textual)

```
                                    +-----------------+
                                    | raw.barrido_    |
                                    | empresas        |
                                    +--------+--------+
                                             | dedup + validate
                                             v
+-------------+        +---------------------+        +------------------+
| marketing.  |        | operaciones.leads   |<------>| auth.usuarios    |
| leads_      |------->| (estado, prioridad, |        | (rol, operador?) |
| entrantes   |        |  scoring, freeze)   |        +------------------+
+-------------+        +----+----------+-----+                 |
                          |          |                            |
              asignado a  |          |  resultado registra        |
                          v          v                            |
              +-----------+          +-------------+              |
              | operaciones.          | operaciones.|              |
              | llamadas_activas      | historial_  |              |
              | (estado, operador)    | llamadas    |              |
              +-----------+          +-------------+              |
                          |                                      |
                          | resultado = vendido                  |
                          v                                      |
              +----------------------+                          |
              | crm_bybusiness.       |                          |
              | clientes              |                          |
              +----+--------------+---+                          |
                   |              |                              |
                   v              v                              |
              +---------+   +-----------+                        |
              | ventas  |   | leads_    |                        |
              +----+----+   | descartados|                        |
                   |        +-----------+                        |
                   v                                              |
              +---------+                                        |
              | pagos   |                                        |
              +---------+                                        |
                                                                 |
+-----------------------+        +----------------------+      |
| operaciones.          |        | operaciones.         |      |
| campanas              |<------>| campanas_envios      |      |
+-----------------------+        +----------------------+      |
                                                              |
+-----------------------+        +----------------------+      |
| operaciones.          |        | operaciones.         |<-----+
| canales               |        | mensajes_templates   |
+-----------------------+        +----------------------+

FABRICA DB (separada):
   fabrica.sistema.eventos_sistema  <-- append-only, auditoría
```

---

## 6. PII y cumplimiento (LOPD / GDPR)

**Datos personales identificados:**

| Campo | Tabla | Sensibilidad |
|---|---|---|
| `email` | operaciones.leads, auth.usuarios, crm_bybusiness.clientes | Media |
| `telefono` | operaciones.leads, auth.usuarios | Alta (DNI implícito en WhatsApp) |
| `nombre` | auth.usuarios, crm_bybusiness.clientes, crm_bybusiness.operadores | Baja |
| `direccion` | operaciones.leads | Media |
| `password_hash` | auth.usuarios | Crítica (nunca plaintext) |
| `totp_secret` | auth.usuarios | Crítica (2FA secret) |

**Derechos del titular (GDPR Art. 17):**
- Implementar `DELETE FROM operaciones.leads WHERE id=?` con **anonymización previa** (reemplazar email/telefono/nombre por hash irreversible)
- Tabla `crm_bybusiness.leads_descartados` ya existe como receptor natural
- **NO hacer DELETE directo** sin anonymizar — rompe `historial_llamadas`

**Acceso a PII:**
- `auth.usuarios.rol='admin'` ve todo
- `auth.usuarios.rol='operador'` solo ve leads asignados (`operador_id = self`)
- `auth.usuarios.rol='viewer'` (read-only, sin acceso a PII financiera — RBAC pendiente en backend)

**Backups:**
- `CRM_BACKUP_AUTOMATICO` corre diario 02:30, dump `pg_dump` → webhook n8n → `/opt/fabrica/backups/`
- Retención backups: 30 días local, sin off-site (gap conocido)
- **Sin encryption at rest** en backups locales (gap)

---

## 7. Retención y archivado

| Tabla | Retención activa | Retención archivada | Acción |
|---|---|---|---|
| `operaciones.leads` | Indefinida (soft delete via `estado='descartado'`) | — | `leads_descartados` después de 90 días |
| `operaciones.historial_llamadas` | 2 años | 5 años | Archive a cold storage |
| `crm_bybusiness.clientes` | Indefinida (cliente activo) | — | Anonymize tras 5 años sin interacción |
| `crm_bybusiness.pagos` | **10 años** (legal/fiscal España) | — | Obligatorio por ley |
| `auth.usuarios` | Mientras esté activo | — | Anonymize tras baja |
| `fabrica.sistema.eventos_sistema` | 5 años | Indefinido | Cumplimiento auditoría |
| `social.dm_conversaciones` | 1 año activo | 3 años | — |

**GAP:** no hay job automático de archivado/anonymización. Está en roadmap Línea 3.

---

## 8. Calidad y observabilidad

**Métricas de calidad del dato:**
- **Leads con `reputacion_at` IS NULL > 30 días**: indica scraper caído. Workflow `CRM_BACKFILL_LEAD_QUALITY` los marca como `sin_dato` (idempotente).
- **Leads con `scoring = 0` y `rating IS NULL`**: indica lead sin scrape exitoso.
- **Contactabilidad threshold**: 90 días (temporal, vuelve a 30 cuando scrapers estén OK).

**Observabilidad:**
- `CRM_LEAD_FRESHNESS_METRICS` cron diario a las 06:00 → guarda métricas en `fabrica_core.metricas_*`
- `alimentador_reputacion.py` corre cada 6h → repara `gbp_fichas` rotas
- Logs del CRM: `/var/log/fabrica/alimentador.log` con logrotate diario

**KPIs operativos (a reportar):**
- Leads/operador/día (productividad)
- Tasa conversión lead→venta
- Tiempo medio lead→primera llamada
- Tasa de contactabilidad efectiva (no solo "llamadas contestadas")
- Freshness media del dato de rating

---

## 9. Migración y evolución

**Reglas para cambios de schema:**
1. Toda migración va en `db/migrations/YYYY-MM-DD_descripcion.sql`
2. Cambios destructivos requieren doble commit: (a) agregar columna nullable, (b) backfill, (c) hacer NOT NULL, (d) drop
3. Backfills >10k filas se hacen en batches de 1000 con `pg_sleep` para no bloquear
4. Rollback documentado en cada migración

**Evolución planeada:**

| Cambio | Línea | Impacto |
|---|---|---|
| Multi-tenant: agregar `tenant_id` a todas las tablas | 3.4 | Alto — afecta todas las queries |
| Renombrar `estado` a `status` (consistencia inglés) | (low pri) | Bajo — refactor masivo de frontend |
| Tabla `comunicaciones.opt_outs` | 3 (compliance) | Medio — agregar a envíos |
| Tabla `operaciones.lead_score_history` separada de `leads_rating_history` | (refactor) | Bajo |
| Tabla `crm_bybusiness.lineas_venta` (carrito de productos en venta) | 3 (refactor) | Medio |

---

## Anexo A: Tabla de tablas (referencia rápida)

| Schema.Tabla | Filas estimadas | Lectura frecuente | Escritura frecuente | Notas |
|---|---|---|---|---|
| auth.usuarios | <100 | Login | Login | Auth + RBAC + 2FA |
| operaciones.leads | 10k-100k | Distribuidor | Distribuidor | Entidad caliente |
| operaciones.llamadas_activas | <50 | Operador UI | Operador | Estado efímero |
| operaciones.historial_llamadas | 100k+ | Reportes | Por cada llamada | Append-only |
| operaciones.campanas | <100 | Admin | Admin | Campañas de envío |
| operaciones.campanas_envios | 1k-100k | Reportes | Cada envío | Append-only |
| marketing.categorias_maestras | <100 | UI filtros | Admin | Casi estática |
| marketing.leads_entrantes | 1k-10k | Admin | Formularios web | Deduplicar contra leads |
| crm_bybusiness.clientes | 1k-10k | Admin + Operador | Workflow conversión | Post-venta |
| crm_bybusiness.ventas | 1k-10k | Admin | Workflow conversión | Vinculada a clientes |
| crm_bybusiness.pagos | 1k-10k | Admin | Workflow pago | 10 años retención |
| crm_bybusiness.gbp_fichas | 10k-100k | Operador | Scraper cada 6h | Cache local |
| crm_bybusiness.operadores | <50 | Admin | Auto | RRHH + métricas |
| rrhh.candidatos | <100 | RRHH | RRHH | Reclutamiento |
| rrhh.horarios_trabajo | <500 | Operador UI | Admin | Disponibilidad |
| raw.almacen_masivo | 100k+ | Scraper | Scraper batch | Zona de staging |
| raw.barrido_empresas | 100k+ | Scraper | Scraper | Inserciones diarias |
| raw.lista_negra_categorias | <50 | Scraper | Admin | Filtro de descartes |
| social.dm_conversaciones | <1000 | Operador social | Bot | Futuro |
| social.posts_cola | <100 | Operador social | Admin | Futuro |
| fabrica.sistema.eventos_sistema | 1M+ | Auditoría | Append-only | 5 años |

---

## Anexo B: Cambios desde RDD v0 (este commit)

- **Nuevo documento** — primera versión.
- Datos validados contra DB real (postgres query 2026-08-01).
- Secciones alineadas con las 4 áreas: captación, operador, admin, comunicaciones.
- Gaps identificados: opt-out, multi-tenant, lineas_venta, freshness column.
