# CRM Operator Flow — Result Buttons

**Versión:** 2026-06-13
**Audiencia:** Mantenedores del CRM ByBusiness
**Source of truth en engram:** topic_key `crm-flow-botones-resultado-llamada`

## Overview

Cuando un operador termina una llamada con un lead, debe registrar el resultado pulsando uno de los 7 botones del panel inferior derecho del dashboard. Cada botón dispara un flujo distinto que persiste el resultado, actualiza el estado del lead y — según el caso — desencadena acciones colaterales (crear callback, enviar email, promover a cliente).

```
[Operador] → [Botón] → [Popup?*] → [onResultado()] → [crm-registrar-resultado] → [DB + lead update]
                                                                          ↓
                                                              [crm-80-enviar-info-lead] (solo ENVIAR INFO)
```

*\*NO CONTESTA es el único botón que NO abre popup (acción directa).*

## Tabla maestra de botones

| Botón | enum `resultado` | Popup | Payload `detalles` (jsonb) | Efecto en DB |
|---|---|---|---|---|
| VENTA | `venta` | Sí (email, contacto, notas) | `{email_confirmacion, nombre_contacto, notas}` | Inserta fila en `clientes`. Lead → `estado='cliente'` |
| CALLBACK | `callback` | Sí (fecha, contacto, motivo) | `{motivo, fecha_callback, nombre_contacto}` | Inserta fila en `llamadas_programadas`. Lead → `estado='callback_programado'` |
| RESPONSABLE | `responsable` | Sí (nombre, cargo, tlf, email) | `{nombre_responsable, cargo, telefono_directo, email_directo}` | Actualiza `lead.contacto_*` con datos del responsable real |
| ENVIAR INFO | `enviar_info` | Sí (email, tipo info, nota) | `{email_destino, tipo_info, nota}` | Registra resultado + encadena `crm-80-enviar-info-lead` (envía email) |
| NO INTERESA | `no_interesa` | Sí (razón, días freeze) | `{razon, dias_freeze}` | Lead → `estado='descartado'`. `freeze_hasta = now() + dias_freeze` |
| NO CONTESTA | `no_contesta` | **No** (directo) | `{}` | Incrementa `lead.intentos_no_contesta` |
| ERROR | `error` | Sí (subtipo) | `{tipo_error}` | Lead queda `pending`, marcado para reintento |

## Valores válidos del enum `operaciones.resultado_llamada`

Verificado 2026-06-13 vía `pg_enum`:

```sql
SELECT enumlabel FROM pg_enum
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'resultado_llamada');

-- venta
-- callback
-- responsable
-- enviar_info
-- no_interesa
-- no_contesta
-- error
```

**Cualquier otro string → INSERT falla** con `invalid input value for enum`.

## Campos del popup → jsonb `detalles`

Confirmados contra registros reales en `operaciones.historial_llamadas`:

### VENTA (`PopupVenta`)
```json
{
  "email_confirmacion": "email@negocio.com",
  "nombre_contacto": "Nombre del responsable",
  "notas": "Detalles del cierre..."
}
```

### CALLBACK (`PopupCallback`)
```json
{
  "motivo": "Presentar propuesta de visibilidad digital",
  "fecha_callback": "2026-04-14T10:00:00",
  "nombre_contacto": "Rafael de Linares"
}
```

### RESPONSABLE (`PopupResponsable`)
```json
{
  "nombre_responsable": "Nombre completo",
  "cargo": "Director, Gerente...",
  "telefono_directo": "+34 600...",
  "email_directo": "email@..."
}
```

### ENVIAR INFO (`PopupEnviarInfo`)
```json
{
  "email_destino": "email@negocio.com",
  "tipo_info": "info_general|propuesta|catalogo|caso_exito|otro",
  "nota": "Detalle adicional..."
}
```

### NO INTERESA (`PopupNoInteresa`)
```json
{
  "razon": "precio|tiempo|ya_tiene|otro",
  "dias_freeze": 30
}
```
`dias_freeze` es el tiempo (en días) durante el cual el lead NO re-entra al pool de disponibles.

### ERROR (`PopupError`)
```json
{
  "tipo_error": "numero_equivocado|no_existe|fuera_de_servicio"
}
```

### NO CONTESTA
```json
{}
```
Sin campos extra. Solo incrementa el contador `intentos_no_contesta` en el lead.

## Flujo técnico end-to-end

### 1. Click en botón

`Zone2Content.jsx` define `BOTONES_RESULTADO` (línea 16-24) y mapea cada botón a su handler:

```jsx
const abrirPopup = (resultadoId) => {
  if (resultadoId === 'no_contesta') {
    onResultado('no_contesta', {});
    return;
  }
  setPopupActivo(resultadoId);
};
```

### 2. Popup (excepto NO CONTESTA)

Cada popup (`PopupVenta`, `PopupCallback`, etc.) es un componente controlado que mantiene estado local hasta que el operador confirma. Al confirmar, llama `onConfirm(detalles)` que internamente ejecuta `onResultado(popupActivo, detalles)`.

### 3. `OperatorDashboard.handleResultado`

`OperatorDashboard.jsx` línea 173-228 arma el payload y hace POST:

```js
const payload = {
  operador_id: user?.id,
  lead_id: lead?.id,
  resultado,                          // uno de los 7 enum values
  notas: notas || '',
  duracion: Math.floor((Date.now() - startTime) / 1000),
  ...detalles,                        // jsonb del popup, o {} para no_contesta
};

fetch(`${N8N}/crm-registrar-resultado`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});
```

### 4. Workflow n8n `CRM_REGISTRAR_RESULTADO` (id: `6x0x8DCOBzZf62K6`)

14 nodos, recibe el POST, ejecuta en orden:

```
Webhook
  → Insert Historial         (INSERT en operaciones.historial_llamadas)
  → Insert Timeline          (INSERT en operaciones.interacciones)
  → Cerrar Llamada Activa    (UPDATE operaciones.llamadas_activas SET estado='cerrada')
  → Switch Resultado         (Switch por valor de $json.resultado)
      ├─ [venta]         → Venta Lead Cliente           (INSERT clientes + UPDATE lead)
      ├─ [contactado]    → Update Lead Contactado       (UPDATE lead.estado='contactado')
      ├─ [callback]      → Update Lead Callback         (UPDATE lead.estado='callback_programado')
      ├─ [no_interesa]   → Update Lead No Interesa      (UPDATE lead.estado='descartado')
      ├─ [no_contesta]   → Update Lead No Contesta      (UPDATE lead.intentos_no_contesta++)
      ├─ [responsable]   → Update Lead Responsable      (UPDATE lead.contacto_*)
      ├─ [enviar_info]   → Update Lead Enviar Info      (UPDATE lead.notas)
      └─ [error]         → Update Lead Error            (UPDATE lead.notas_error)
      → Respond to Webhook
```

**Nota:** n8n no distingue entre `contactado` y `venta` en el switch — ambos terminan en `Update Lead Contactado` o `Venta Lead Cliente` respectivamente. En la práctica, `contactado` se usa raramente; el flujo normal es `venta` directo.

### 5. Caso especial: ENVIAR INFO

El botón `ENVIAR INFO` es el único que encadena 2 webhooks:

```js
// OperatorDashboard.handleEnviarInfo (línea 230-267)
fetch(`${N8N}/crm-registrar-resultado`, {...})           // 1. registra resultado
  .then(() => fetch(`${N8N}/enviar-info`, {...}))        // 2. envía email
```

El segundo webhook dispara el workflow `CRM_80_ENVIAR_INFO_LEAD` (id: `HZUqJD2I5WMt0k67`) que selecciona la plantilla de email según `tipo_info` y la envía.

## Modo training

Para usuarios con `role='en_practicas'`, `OperatorDashboard` redirige al workflow `CRM_RESULTADO_ENTRENAMIENTO` (id: `FcASXbDWvI48vstn`):

```
POST /webhook/crm-resultado-entrenamiento
{
  lead_ficticio_id, operador_id, sesion_id, resultado, notas,
  duracion_seg, ...detalles
}
```

El workflow es más simple (7 nodos): solo hace INSERT en `entrenamiento.historial_llamadas`. **No toca el lead, no actualiza nada en `operaciones.*`.** Esto es intencional: el modo training es sandbox.

Diferencia clave del payload:

| Modo | Campo | Origen |
|---|---|---|
| Real | `lead_id` | `lead.id` (de `operaciones.leads`) |
| Training | `lead_ficticio_id` | `lead.id` (de leads ficticios) |

## Tabla DB de destino

`operaciones.historial_llamadas` (10 columnas):

| Columna | Tipo | Nullable | Origen |
|---|---|---|---|
| `id` | uuid | NO | autogenerado |
| `lead_id` | integer | NO | `payload.lead_id` |
| `operador_id` | integer | YES | `payload.operador_id` |
| `resultado` | enum | NO | `payload.resultado` |
| `notas` | text | YES | `payload.notas` |
| `duracion_seg` | integer | YES | `payload.duracion` |
| `llamada_programada_id` | integer | YES | (auto, si viene de un callback) |
| `detalles` | jsonb | YES | `payload.detalles` |
| `created_at` | timestamp | YES | autogenerado |
| `es_simulacion` | boolean | YES | `false` en real, `true` en training |

## Archivos relevantes

- `src/components/dashboard/zones/Zone2Content.jsx` — `BOTONES_RESULTADO` (línea 18-26), popups (línea 64-172), `abrirPopup` (línea 247)
- `src/components/dashboard/OperatorDashboard.jsx` — `handleResultado` (línea 173-228), `handleEnviarInfo` (línea 230-267)
- `src/data/guionRosa.js` — script de venta que se muestra en el tab GUIÓN
- n8n workflow `6x0x8DCOBzZf62K6` (CRM_REGISTRAR_RESULTADO) — 14 nodos
- n8n workflow `FcASXbDWvI48vstn` (CRM_RESULTADO_ENTRENAMIENTO) — 7 nodos, training
- n8n workflow `HZUqJD2I5WMt0k67` (CRM_80_ENVIAR_INFO_LEAD) — encadenado en ENVIAR INFO

## Cambios que requieren actualizar este doc

- Si agregás un nuevo botón → actualizar tabla maestra, enum, jsonb schema, sección de archivos relevantes.
- Si cambia la estructura de `detalles` para un resultado existente → actualizar el bloque de ese popup + el nodo de Update Lead correspondiente.
- Si se modifica el workflow n8n (nuevos nodos, cambios de routing) → actualizar la sección 4.
