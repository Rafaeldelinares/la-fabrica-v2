# [PRJ ESCAPARATE_ES] INFORME TÉCNICO FRONTEND & ENLACE

## 1. Stack Tecnológico
- **Core**: React 18+
- **Build Tool**: Vite
- **Styling**: Tailwind CSS v4 (Engine nativo)
- **Animations**: Framer Motion (Transiciones de estado y Kiosk Mode)
- **Icons**: Lucide React + SVGs oficiales integrados.

## 2. Estructura de Datos (Formulario de Ataque)
El sistema está preparado para enviar un objeto JSON a través de un `fetch` POST con la siguiente estructura:
```json
{
  "nombre": "string",
  "email": "string",
  "telefono": "string",
  "tipo_solicitud": "CONTACTO | CANDIDATO",
  "timestamp": "ISO8601",
  "agente": "Escaparate_ES_v1"
}
```

## 3. Webhooks & Integración (Router Inteligente)
- **URL Leads Form**: `https://n8n.ia-bybusiness.online/webhook/lead-captura`
- **URL WhatsApp Chat (Widget)**: `https://n8n.ia-bybusiness.online/webhook/chat-web-v1`
- **Silos de Datos**:
  - `marketing.leads_entrantes`: Segmento de ventas.
  - `rrhh.candidatos`: Segmento de recursos humanos.
- **Waha Bot Responses**:
  - Sofía (Ventas): Notificación personalizada para leads.
  - Carlos (RRHH): Notificación militarizada para candidatos.
- **Seguridad**: Sistema de CAPTCHA matemático integrado + Validación dinámica de número.

## 4. Canales de Conversión
- **Canal A (Static)**: Formulario de aterrizaje.
- **Canal B (Dynamic)**: `WhatsAppWidget.jsx` interactivo.
  - **Mimetismo Visual**: Interfaz nativa WhatsApp UI (#00a884).
  - **Lógica de 3 Vías**: Ventas (Sofía), Soporte (Cliente), RRHH (Carlos).
  - **Validación**: Protocolo de blindaje con verificación de estado en tiempo real.

---
**ESTADO DEL CANAL WHATSAPP**: WIDGET INTERACTIVO DESPLEGADO Y CONECTADO.
**PRÓXIMA FASE**: DESPLIEGE EN PRODUCCIÓN (VPS) Y MONITOREO DE SILOS.
