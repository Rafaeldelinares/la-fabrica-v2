# [SYS] TAREAS PENDIENTES — LA FÁBRICA

**Clasificación:** Sistema / Control Operativo
**Última actualización:** 2026-03-02

---

## COMPLETADAS ✅

| Fecha | Tarea | Proyecto |
|---|---|---|
| 2026-03-01 | Backend Monitor Reputación V2 a producción completa | Monitor Reputación V2 |
| 2026-03-01 | Bugs corregidos: opositare, is_simulated, listas vs detalles | Monitor Reputación V2 |
| 2026-03-01 | Servicios systemd: monitor-engine + tunnel-monitor (watchdog SSH) | Monitor Reputación V2 |
| 2026-03-01 | Docker restart=always en todo el stack monitor | Monitor Reputación V2 |
| 2026-03-01 | Test producción validado: 19 ferreterías reales de Málaga | Monitor Reputación V2 |
| 2026-03-01 | Tool `monitor_reputacion` configurada y documentada para n8n | Tools / Escaparate COM |
| 2026-03-01 | **Crear frontend Monitor Reputación V2 con Antigravity** | Monitor Reputación V2 |
| 2026-03-01 | **Instalar Engram y configurar memoria persistente** | Infraestructura / Tools |
| 2026-03-01 | **Instalar GGA y proteger calidad de código (pre-commit hook)** | Infraestructura / Tools |
| 2026-03-01 | **Instalar Agent Teams Lite para desarrollo multi-agente** | Infraestructura / Tools |
| 2026-03-02 | Tool `monitor_reputacion` integrada en AI Agent Sofia via SDD (sofia-monitor-reputacion) | Escaparate COM |
| 2026-03-02 | Flujo V3_COMPLETO (XcXJL3qqsIWFu4KZ) activo: 13 nodos, "Efecto WOW" operativo | Escaparate COM |
| 2026-03-02 | Backup JSON exportado: `/opt/fabrica/escaparate-com/n8n-workflows/ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO.json` | Escaparate COM |

---

## PENDIENTES GENERALES

| Prioridad | Tarea | Proyecto | Notas |
|---|---|---|---|
| ✅ HECHA | Integrar tool `monitor_reputacion` en Agente Sofia (n8n) | Escaparate COM | Completada 2026-03-02. Flujo V3_COMPLETO activo. |
| ✅ HECHA | Conectar formularios modales a n8n (ContactModal + ATSModal) | Monitor Frontend | Webhooks → CRM ByBusiness |
| 🟡 MEDIA | Completar frontend CRM ByBusiness (Torre de Control + Modo Túnel) | CRM ByBusiness | React 19 + Vite. 6 módulos admin, 4 módulos operador |
| 🟡 MEDIA | Integrar backend PHP con frontend Escaparate ES | Escaparate ES | Frontend funcional, API PHP pendiente de conectar |
| 🟡 MEDIA | Crear docs `Escaparate_COM/arquitectura.md` | Escaparate COM | Solo hay demos, falta arquitectura formal |

---

## FRONTEND MONITOR — AJUSTES FINALES

*Identificados por Antigravity tras entregar el frontend (2026-03-01)*

| Prioridad | Ajuste | Descripción | Archivo |
|---|---|---|---|
| 🟡 MEDIA | **Exportar PDF** | El botón "Exportar PDF Pro" en `AuditReport` no tiene lógica. Integrar `jspdf` + `html2canvas`, o endpoint Go que devuelva PDF | `src/components/business/AuditReport.jsx` |
| ✅ HECHA | **Formularios → n8n** | `ContactModal.jsx` y `ATSModal.jsx` son estáticos. Conectar via webhook n8n | `src/components/modals/` |
| 🟡 MEDIA | **Webhooks n8n para scrapings lentos** | Si hay interrupciones del scraper, valorar WebSocket o SSE en lugar de polling puro | `src/services/api.js` |
| 🟢 BAJA | **Tiempo de respuesta en caché** | El indicador "Tiempo IA: XXs" muestra <0.5s con caché, puede parecer un fallo. Si `cached=true`, mostrar "CACHÉ" en lugar del tiempo numérico | `src/App.jsx` |
| 🟢 BAJA | **React Router DOM** | Toda la navegación es condicional en `App.jsx`. Para URLs absolutas como `/auditoria/ferreteria-malaga`, integrar React Router | `src/App.jsx` |

**Docs completos del frontend:** `02_proyectos/monitor-reputacion-frontend-v2.md`

---

## AGENT TEAMS LITE — PRIMER USO

| Prioridad | Tarea | Notas |
|---|---|---|
| ✅ HECHA | **Usar SDD para integrar tool monitor_reputacion en Agente Sofia** | Completado 2026-03-02. Change: `sofia-monitor-reputacion`. Primer uso exitoso de Agent Teams Lite + SDD. |
| 🟡 MEDIA | Usar Agent Teams Lite en próximo proyecto grande (>10 archivos) | Trigger: `/sdd-new nombre-del-cambio` |
| 🟢 BAJA | Evaluar si SDD mejora calidad vs desarrollo directo tras 1 mes | Comparar: tiempo, bugs post-entrega, documentación generada |

---

## GGA — SEGUIMIENTO POST-INSTALACIÓN

| Prioridad | Tarea | Notas |
|---|---|---|
| 🟡 MEDIA | **Revisar violaciones de GGA semanalmente y actualizar AGENTS.md** | Si un commit legítimo queda bloqueado, ajustar la regla en `/opt/fabrica/AGENTS.md` |
| 🟡 MEDIA | Probar GGA desde terminal (fuera de Claude Code) | `cd /opt/fabrica && git add <archivo> && git commit` |
| 🟢 BAJA | Evaluar añadir reglas específicas por proyecto (Go vs React vs PHP) | Actualmente AGENTS.md es global para todo el monorepo |

---

## ENGRAM — SEGUIMIENTO POST-INSTALACIÓN

| Prioridad | Tarea | Notas |
|---|---|---|
| 🟡 MEDIA | **Probar Engram durante 1 semana y documentar mejoras** | Evaluar si `mem_context` al inicio de sesión aporta valor real. Actualizar `engram.md` con hallazgos |
| 🟡 MEDIA | Guardar primera memoria CRM ByBusiness en Engram | `engram save "CRM ByBusiness - Arquitectura" "..." --project crm-bybusiness` |
| 🟡 MEDIA | Guardar primera memoria Escaparate COM en Engram | `engram save "Escaparate COM - Agente Sofía" "..." --project escaparate-com` |
| 🟢 BAJA | Evaluar sync de `.engram/` en Git para compartir entre máquinas | `engram sync --project fabrica-core` |

---

## I+D / BACKLOG

| Tarea | Descripción |
|---|---|
| Agente Carlos (Instagram) | Automatización DMs Instagram con protocolo EXPRESS (máx 2-3 interacciones → evacuar a WhatsApp) |
| Monitor Reputación → Nivel 4 | Extracción semántica de reseñas para auditorías de pago |
| Radio Fábrica (TTS) | Prototipo Piper/Flask congelado. Reactivar si se necesitan alertas de voz |
