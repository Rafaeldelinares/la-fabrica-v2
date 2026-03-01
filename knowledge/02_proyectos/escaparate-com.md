# [PRJ] ESCAPARATE COM — FICHA DE ESTADO

**Clasificación:** Proyecto / Captación y Demo Comercial
**Dominio:** ia-bybusiness.com (Institución Global — Marca paraguas multinacional)
**Ruta:** `/opt/fabrica/escaparate-com/`
**Docs internos:** `Escaparate_COM/WhatsAppAssistant_DEMO_V2.md`
**Estado:** ✅ PRODUCCION COMPLETA — Tool monitor_reputacion integrada y activa (V3_COMPLETO)

---

## DESCRIPCIÓN

Escaparate institucional global de ByBusiness. Contiene el **AI Agent Sofía (Protocolo HUNTER)** integrado en un widget de WhatsApp que capta leads en tiempo real durante conversaciones de demo comercial.

El flujo activo es `ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO` (ID: XcXJL3qqsIWFu4KZ) en n8n, que gestiona la conversación con herramienta `monitor_reputacion` integrada, clasifica al usuario y lo deriva a CRM con datos reales de Google Maps (Efecto WOW).

---

## STACK TÉCNICO

| Capa | Tecnología | Estado |
|---|---|---|
| Frontend | React + Vite + Tailwind + Framer Motion | ✅ Funcional |
| Widget WhatsApp | `WhatsAppAssistant.jsx` (UI nativa WA) | ✅ Funcional |
| AI Agent | n8n + modelo LLM (Gemini Flash en VPS) | ✅ Funcional |
| Webhook entrada | `POST http://localhost:5678/webhook/whatsapp-demo` | ✅ Activo |
| Flujo n8n | `ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO` (ID: XcXJL3qqsIWFu4KZ) | ✅ Activo |
| Tool monitor_reputacion | Motor Go :8092 — nodo HTTP Request integrado en AI Agent Sofia | ✅ Activa |

---

## AGENTE SOFÍA — PROTOCOLO HUNTER

**Rol:** Consultora Senior de Automatización IA
**Táctica:** "Dime quién eres y te diré qué te duele"

**Flujo de captación actual:**
```
Usuario inicia chat
    │
    ▼
Sofía pide: nombre + ciudad + tipo de negocio
    │
    ▼
[ACTIVO] Tool monitor_reputacion → datos reales en 15-20s
    │                               "Efecto WOW" FUNCIONANDO
    ▼
Sofía presenta diagnóstico de reputación con datos reales
    │
    ▼
Lead cualificado → CRM ByBusiness (marketing.leads_entrantes)
```

---

## INTEGRACIÓN: TOOL monitor_reputacion

**Estado:** ✅ ACTIVA en produccion (2026-03-02)
**Docs completos de la tool:** `05_skills_y_mcp/tools/monitor_reputacion_tool.md`

### Configuración del nodo HTTP Request en n8n

| Campo | Valor |
|---|---|
| Method | `POST` |
| URL | `http://172.17.0.1:8092/webhook/scraper/go` |
| Body Content-Type | `JSON` |
| Timeout | `30000` ms |

> **Nota de IP:** `172.17.0.1` es la IP del host Docker vista desde el contenedor n8n.
> El Motor Go corre como servicio nativo (no Docker), accesible en esa IP desde dentro de los containers.

**Body:**
```json
{
  "query": {
    "q": "{{ $json.busqueda }}",
    "depth": 3,
    "preload": false
  }
}
```

**JSON de la tool para el AI Agent:**
```json
{
  "name": "monitor_reputacion",
  "description": "Busca negocios en Google Maps. Usa cuando el usuario mencione un tipo de negocio y ciudad (ej: 'ferreterías Málaga', 'talleres Madrid'). Devuelve lista con name, rating, reviews, address de cada negocio encontrado.",
  "schema": {
    "type": "object",
    "properties": {
      "busqueda": {
        "type": "string",
        "description": "Búsqueda en formato 'tipo_negocio ciudad'. Ejemplo: 'ferreterías Málaga'"
      }
    },
    "required": ["busqueda"]
  }
}
```

### Comportamiento esperado tras la integración

```
Usuario: "Tengo una ferretería en Málaga"
    │
    ▼
Sofía detecta: tipo_negocio="ferretería" + ciudad="Málaga"
    │
    ▼
[Tool: monitor_reputacion] → busqueda="ferretería Málaga"
    │
    ▼
Motor Go :8092 → Scraper HEAVY → Google Maps
    │  (15-20s en directo, 0.01s si está en caché)
    ▼
Respuesta: { items: [{name, rating, reviews, address}, ...] }
    │
    ▼
Sofía: "He analizado tu negocio: tienes 4.2 estrellas con 87 reseñas.
        Veo que hay competidores con mejor puntuación en tu zona...
        ¿Quieres que te muestre cómo podemos mejorar eso?"
    │
    ▼
Lead con datos reales → CRM
```

---

## ESTADO FINAL DEL FLUJO (2026-03-02)

**Flujo activo:** `ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO` (ID: XcXJL3qqsIWFu4KZ)

Nodos activos (13):
1. `When chat message received` — Trigger de entrada
2. `AI Agent Sofia` — Orquestador LLM (OpenRouter)
3. `monitor_reputacion` — Tool HTTP Request → Motor Go :8092 (INTEGRADA)
4. `Window Buffer Memory` — Memoria conversacional
5. `OpenRouter Chat Model` — LLM backend
6. `Preparar Datos` — Set de campos para CRM
7. `Detectar Fin Conversacion` — Code node clasificacion
8. `¿Fin Conversacion?` — Bifurcacion IF
9. `Generar Resumen` — Code node resumen lead
10. `Enviar Email` — Notificacion equipo (remitente: `informacion@ia-bybusiness.es`)
11. `Enviar WhatsApp` — Notificacion WAHA
12. `Guardar Parcial` — Postgres CRM
13. `Continue Chat` — Respuesta al widget

**Backup exportado:** `/opt/fabrica/escaparate-com/n8n-workflows/ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO.json`

---

## WEBHOOKS ACTIVOS

| Endpoint | Propósito |
|---|---|
| `POST http://localhost:5678/webhook/whatsapp-demo` | Router principal del widget WhatsApp |
| `POST https://n8n.ia-bybusiness.online/webhook/lead-captura` | Captura leads hacia CRM (VPS) |
| `POST https://n8n.ia-bybusiness.online/webhook/chat-web-v1` | Chat widget público |

---

## FLUJOS n8n EXPORTADOS

Ubicación: `/opt/fabrica/escaparate-com/n8n-workflows/`

```bash
# Reimportar flujos si es necesario
cd /opt/fabrica/escaparate-com
python3 import_workflows.py
```

---

## HISTORIAL DE CAMBIOS

| Fecha | Cambio |
|---|---|
| 2026-02-26 | WhatsApp Assistant Demo V2 creado (Avatar SVG + Thinking Animation) |
| 2026-03-01 | Tool `monitor_reputacion` validada en Motor Go (19 resultados reales). Pendiente integrar en Agente Sofia |
| 2026-03-02 | Tool `monitor_reputacion` integrada en AI Agent Sofia. Flujo V3_COMPLETO (XcXJL3qqsIWFu4KZ) activo con 13 nodos. Backup JSON exportado a disco. |
| 2026-03-02 | Fix SMTP: remitente `📧 Enviar Email` corregido de `leads@escaparate.com` → `informacion@ia-bybusiness.es` (coincide con credenciales SMTP). |
