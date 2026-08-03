# CRM ByBusiness — PRD (Product Requirements Document)

**Versión:** 1.0  
**Fecha:** 2026-08-01  
**Estado:** Borrador vivo — revisar trimestralmente  
**Complementa:** [`RDD.md`](./RDD.md) para modelo de datos completo · [`RUNBOOK.md`](./RUNBOOK.md) para operación diaria

---

## 1. Visión

CRM ByBusiness automatiza el ciclo completo de **captación y conversión de clientes locales** (dentistas, abogados, restaurantes, etc.) en España y LATAM, usando Google Business Profile como fuente primaria de prospección. Reemplaza un pipeline manual basado en hojas de cálculo por un sistema distribuido donde:

- **Scrapers 24/7** recolectan fichas de Google Maps y las normalizan a leads
- **Distribuidor inteligente** asigna leads a operadores humanos según prioridad + nicho + disponibilidad
- **Operadores** llaman a los leads, registran resultados, convierten a clientes
- **Workflows n8n** orquestan toda la lógica como BFF (Backend-For-Frontend)
- **Admin** supervisa, audita, reporta vía Torre de Control

**Foco operativo:** maximizar tasa de conversión lead→venta con coste operativo mínimo, manteniendo compliance GDPR/LOPD.

---

## 2. Objetivos medibles (KPIs Q4 2026)

| KPI | Baseline (hoy) | Target Q4 2026 |
|---|---|---|
| Leads scrapeados/mes | ~3.000 | 10.000 |
| Freshness media del rating | >90 días (scrapers DOWN) | ≤30 días |
| Tasa de contactabilidad efectiva | 35% | 50% |
| Tasa conversión lead→venta | 8% | 15% |
| Tiempo medio lead→primera llamada | 4h | 1h |
| Coste operativo por venta | €45 | €20 |
| Compliance opt-out (email + WAHA) | No implementado | 100% |
| Toggles de Agenda con datos reales | 9/12 | 12/12 |

---

## 3. Alcance por área

### 3.1 Captación (Google Maps + scrapers)

**Qué hace:** Recolecta fichas de Google Business Profile vía 3 scrapers (NANO/HEAVY/maps), normaliza a entidades `operaciones.leads`, deduplica contra base existente, calcula `freshness` del dato de rating.

**Por qué importa:** Sin scrapers funcionando, todo el pipeline downstream se queda sin combustible. Hoy están caídos desde mayo 2026 — es el #1 blocker operacional.

**Métrica de éxito:** Freshness media ≤30 días, cobertura ≥80% de los nichos objetivo en España, deduplicación ≥95%.

**Restricciones:**
- Google limita rate de scraping (respetar ToS — riesgo de IP ban)
- Categorías blacklist en `raw.lista_negra_categorias` (ej: "cerrajero 24h", "grua")
- `reputacion_at` debe calcularse explícitamente (actualmente derivado de `leads_rating_history` — GAP conocido)

### 3.2 Operador (Call management)

**Qué hace:** Asigna leads a operadores humanos vía distribuidor, gestiona llamadas (en curso / programadas / históricas), registra resultados, convierte leads a clientes vía `CRM_REGISTRAR_RESULTADO`.

**Por qué importa:** El operador es el corazón del revenue. Sin buena distribución ni tracking, no hay conversiones.

**Métrica de éxito:** Llamadas/operador/día ≥25, contactabilidad efectiva ≥50%, tiempo medio lead→primera llamada ≤1h.

**Restricciones:**
- Máximo 1 llamada activa por operador (`auth.usuarios.llamada_actual`)
- Soft limits: lead no contactado en 30 min → reasignación
- 2FA obligatorio para login (`auth.usuarios.totp_habilitado=true`)
- Operador solo ve SUS leads (`operador_id = self`) — RBAC frontend completo
- `operador_ausencias` para vacaciones/bajas — distribuidor las respeta

### 3.3 Admin (Torre de Control)

**Qué hace:** 6 módulos admin (Cartera, Leads, Agenda, Campañas, Auditoría, Reportes), RBAC granular sobre 17 permisos / 4 roles, auditoría inmutable de todas las acciones críticas vía `crm_bybusiness.sistema.eventos_sistema`.

**Por qué importa:** Visibilidad operacional + cumplimiento + control de accesos para escalar el equipo sin perder governance.

**Métrica de éxito:** 100% acciones admin registradas en eventos del sistema, tiempo de resolución de auditoría <24h, reportes generados mensualmente.

**Restricciones:**
- RBAC frontend completo, backend parcial (2/5 workflows validados)
- Soft delete via `estado='baja'` + `fecha_baja`, nunca DELETE directo
- Backups diarios a las 02:30 (`CRM_BACKUP_AUTOMATICO`), retención 30 días local — sin off-site cifrado (GAP Línea 3)
- 2FA workflows sin RBAC backend (limitación de n8n queryReplacement — pendiente refactor JWT)

### 3.4 Comunicaciones (Email + WhatsApp)

**Qué hace:** Outreach multicanal vía SMTP (`informacion@ia-bybusiness.com`) y WAHA (`https://waha.ia-bybusiness.online`). Plantillas reutilizables, campañas masivas, tracking de envío individual en `operaciones.campanas_envios`.

**Por qué importa:** El canal WhatsApp tiene 80%+ open rate en España/LATAM. Email cubre los casos donde WAHA no aplica (formales, presupuestos, contratos). Combinados = alcance completo.

**Métrica de éxito:** Tasa apertura email ≥25%, tasa respuesta WhatsApp ≥15%, opt-out <2%, deliverability email >95%.

**Restricciones:**
- WhatsApp Business requiere templates pre-aprobados por Meta antes de envío masivo
- Email debe tener header `List-Unsubscribe` y bounce handling
- **GAP**: tabla `comunicaciones.opt_outs` no existe — agregar (Línea 3 — compliance)
- Rate limit WhatsApp: respetar ventana 24h para mensajes no solicitados (riesgo de ban)
- SMTP credentials en n8n, no hardcoded en código

---

## 4. Out of scope (no en este PRD)

| Feature | Por qué no ahora |
|---|---|
| Multi-tenant (varios clientes SaaS) | Single-tenant por ahora. Requiere refactor mayor (Línea 3.4) |
| App móvil nativa | Web responsive cubre móvil. App = esfuerzo 6+ meses |
| Integración ERPs externos (Sage, Holded) | No prioritario. Cliente actual usa su propio ERP |
| Facturación al cliente final del CRM | Es SaaS interno, no vendemos a terceros todavía |
| Multi-idioma | UI solo en español. Equipos objetivo hispanohablantes |
| ML para scoring automático de leads | Futuro (Línea 4). Hoy scoring = reglas + datos scraper |
| Marketplace de scripts de venta | Producto, no plataforma |

---

## 5. Stakeholders

| Rol | Qué usa | Frecuencia |
|---|---|---|
| Operador | Leads asignados, llamadas, registro de resultados | Diario, 8h/día |
| Admin | Torre de Control, reportes, auditoría, RBAC | Diario |
| Supervisor | Monitoreo operadores, KPIs, escalaciones | Diario |
| Viewer | Solo lectura, sin edición | Esporádico |
| Sistema (cron) | Alimentador, métricas, backups, BACKFILL | Automático 24/7 |
| Auditor externo (futuro) | Eventos del sistema, reportes compliance | Trimestral |

---

## 6. Métricas de éxito del producto (rolling 90 días)

| Métrica | Cálculo | Target |
|---|---|---|
| MRR generado | Σ ventas × producto.precio × 12 | €50k |
| CAC efectivo | Coste operativo / ventas cerradas | €20 |
| LTV (cliente) | Duración media cliente × precio mensual | €1.200 |
| Churn mensual | Clientes baja / clientes inicio mes | <5% |
| NPS operadores | Encuesta trimestral | ≥7/10 |
| Compliance audit | Eventos sistema / acciones admin | 100% |
| MTTR incidentes | Tiempo medio resolución (logs en `/var/log/fabrica/`) | <2h |

---

## 7. Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Scrapers DOWN prolongados | Pipeline sin combustible | Activar partners API como backup; revisar viabilidad scrapers en Q3 |
| Pérdida de datos (DB caída sin backup) | Compliance + operacional | Backups off-site cifrados (gap Línea 3) |
| Cuenta WhatsApp baneada por Meta | Canal principal caído | Templates pre-aprobados + rate limiting + email backup |
| Rotación de operadores alta | Pérdida conocimiento | RUNBOOK actualizado + onboarding documentado |
| Opencode GGA bug (snapshot/index corruption) | Commits bloqueados con `--no-verify` | Migrado a lmstudio:Qwen (RUNBOOK §11). Issue upstream pendiente |
| n8n queryReplacement limita RBAC backend en 2FA | Admin no-op puede activar/desactivar 2FA | Refactor JWT (Línea 3 — pendiente) |
| LOPD/GDPR sin opt-out | Multa + pérdida reputación | Agregar tabla `comunicaciones.opt_outs` (Línea 3) |

---

## Cambios desde PRD v0 (este commit)

- Primera versión.
- KPIs calibrados con datos reales del RDD v1.0 (línea base scraped ~3k/mes, contactabilidad 35%).
- Out-of-scope explícito para evitar scope creep.
- Riesgos top mapeados con mitigación concreta.
