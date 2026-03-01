# [SYS] ÍNDICE MAESTRO DE PROYECTOS

**Clasificación:** Sistema / Control de Estado
**Última actualización:** 2026-03-01

---

## MAPA DE PROYECTOS ACTIVOS

| Proyecto | Dominio | Estado Backend | Estado Frontend | Prioridad |
|---|---|---|---|---|
| [CRM ByBusiness](#1-crm-bybusiness) | Interno | ✅ Funcional | 🔨 En desarrollo | ALTA |
| [Monitor Reputación V2](#2-monitor-reputacion-v2) | Interno | ✅ PRODUCCIÓN COMPLETA | 🔨 En desarrollo | ALTA |
| [Escaparate ES](#3-escaparate-es-ia-bybusiness-es) | ia-bybusiness.es | ✅ Funcional | ✅ Funcional | MEDIA |
| [Escaparate COM](#4-escaparate-com-ia-bybusiness-com) | ia-bybusiness.com | ✅ Demo funcional | 🔜 Integración pendiente | MEDIA |

---

## 1. CRM BYBUSINESS

**Ruta:** `/opt/fabrica/CRM_ByBusiness/`
**Docs:** `02_proyectos/CRM_ByBusiness/`

| Capa | Estado | Notas |
|---|---|---|
| Backend PHP API | ✅ Funcional | |
| PostgreSQL (`crm_bybusiness`) | ✅ Activo | Schemas: crm, marketing, rrhh, social, operaciones |
| n8n Distribuidor de Leads | ✅ Operativo | Ciclo 30s, 3 prioridades |
| Frontend Admin (Torre de Control) | 🔨 En desarrollo | 6 módulos ejecutivos |
| Frontend Operador (Modo Túnel) | 🔨 En desarrollo | 4 módulos de alta productividad |

**Tools n8n disponibles:** —
**Próximos pasos:** Completar frontend React + conectar con n8n distribuidor.

---

## 2. MONITOR REPUTACION V2

**Ruta:** `/opt/fabrica/monitor-go/` + `/opt/fabrica/monitor-go-frontend/`
**Docs:** `02_proyectos/Monitor_Reputacion/`

| Capa | Estado | Notas |
|---|---|---|
| Motor Go (:8092) | ✅ PRODUCCIÓN | systemd auto-arranque |
| Scraper NANO (:8090) | ✅ PRODUCCIÓN | Docker restart=always |
| Scraper HEAVY (:8091) | ✅ PRODUCCIÓN | Docker restart=always |
| Postgres caché (:5435) | ✅ PRODUCCIÓN | Docker restart=always |
| Túnel SSH → VPS | ✅ PRODUCCIÓN | systemd watchdog robusto |
| Bugs corregidos | ✅ 2026-03-01 | opositare, is_simulated, listas vs detalles |
| Frontend React (Recharts + Lucide) | 🔨 En desarrollo | Antigravity ejecutándolo |

**Tools n8n disponibles:**
- `monitor_reputacion` — Docs: `05_skills_y_mcp/tools/monitor_reputacion_tool.md`

---

## 3. ESCAPARATE ES (ia-bybusiness.es)

**Ruta:** `/opt/fabrica/escaparate-es/`
**Docs:** `02_proyectos/Escaparate_ES/`

| Capa | Estado | Notas |
|---|---|---|
| Frontend React + Framer Motion | ✅ Funcional | Kiosk Mode 8 pasos operativo |
| Formulario contacto → n8n | ✅ Conectado | Webhook lead-captura + Waha portero |
| WhatsApp Widget (Sofía/Carlos) | ✅ Funcional | 3 flujos: ventas, soporte, RRHH |
| Backend PHP API | ⏳ Integración pendiente | |

**Estándar visual:** Light Mode / Azul Brillante (Zona Pública)
**Tools n8n disponibles:** —

---

## 4. ESCAPARATE COM (ia-bybusiness.com)

**Ruta:** `/opt/fabrica/escaparate-com/`
**Docs:** `02_proyectos/Escaparate_COM/` *(pendiente crear)*

| Capa | Estado | Notas |
|---|---|---|
| Frontend React + Framer Motion | ✅ Demo funcional | WhatsApp Assistant Demo operativo |
| WhatsApp Widget (Sofía/Carlos/Soporte) | ✅ Funcional | Webhook `http://localhost:5678/webhook/whatsapp-demo` |
| n8n Flujos de conversación | ✅ Exportados | `/escaparate-com/n8n-workflows/` |
| Integración monitor_reputacion | 🔜 **LISTA PARA INTEGRAR** | Ver sección siguiente |

**Estándar visual:** Institucional Global (marca paraguas multinacional)

### Tool monitor_reputacion — Pendiente integrar

El Agente Sofía en el flujo de captación debe activar `monitor_reputacion`
cuando el usuario mencione su negocio y ciudad, generando el **"Efecto WOW"**
en tiempo real durante la conversación de WhatsApp.

**Configuración:** `05_skills_y_mcp/tools/monitor_reputacion_tool.md`

**Flujo de integración:**
```
Usuario: "tengo una ferretería en Málaga"
        |
        v
Agente Sofía detecta negocio + ciudad
        |
        v
[Tool: monitor_reputacion] → Motor Go :8092
        |
        v
Sofía: "He encontrado tu negocio: 4.2 estrellas con 87 reseñas.
        Hay margen de mejora en tu reputación online..."
        |
        v
Lead cualificado con datos reales → CRM ByBusiness
```

**Pasos para activar:**
1. Añadir nodo HTTP Request en el flujo n8n `whatsapp-demo`
2. Pegar configuración JSON de la tool (ver doc)
3. Conectar output al contexto del AI Agent Sofía
4. Test: enviar "tengo un bar en Madrid" por el chat demo

---

## ARCHIVO I+D (Congelados)

| Proyecto | Descripción | Estado |
|---|---|---|
| Radio Fábrica (TTS) | Prototipo Flask + Piper para alertas de voz | Congelado, documentado |

---

## REGISTRO DE CAMBIOS

| Fecha | Proyecto | Cambio |
|---|---|---|
| 2026-03-01 | Monitor Reputación V2 | Backend a producción completa. Bugs corregidos. systemd. |
| 2026-03-01 | Monitor Frontend V2 | Iniciado desarrollo con Antigravity |
| 2026-03-01 | Escaparate COM | Tool monitor_reputacion lista para integrar |
