# Operador delinesrafa — Flujo end-to-end

**Operador**: `delinaresrafa@gmail.com` (id 48 en `auth.usuarios`, role `operador`)
**2FA password**: `[REDACTED — gestionada fuera del repo]`
**Frontend**: https://crm.ia-bybusiness.com
**Última actualización**: 2026-06-28

## 1. Login

1. Ir a https://crm.ia-bybusiness.com
2. Email: `delinaresrafa@gmail.com`
3. Contraseña: (la del operador — gestionada fuera de este doc)
4. 2FA: `[REDACTED — ver 1Password o equivalente]` (ver [Setup 2FA](#setup-2fa))

## 2. Modo Túnel

Al loguearse como operador, la app entra en **Modo Túnel** (`activeTab = 'NEXT_CALL'`). El sidebar desaparece y se muestran 3 zonas:

- **Zona 1 — Botón "Tomar Lead"**: pull desde el pool general o desde una campaña específica
- **Zona 2 — Datos del lead + botones de resultado**
- **Zona 3 — Agenda del operador**

## 3. Tomar un lead

`operatorData.obtenerSiguienteLead()` → `POST /webhook/crm-distribuidor-campanas`

Body:
```json
{
  "operator_id": 48,
  "mode": "next",
  "campana_id": null   // null = pool general, número = campaña específica
}
```

Response normalizado en `useOperatorData.js`:
```js
const data = await n8nPost('crm-distribuidor-campanas', body);
const lead = Array.isArray(data) ? data[0] : data.lead || data;
```

## 4. Durante la llamada

- El `OperatorDashboard.jsx` muestra el lead en Zona 2
- El botón "Iniciar llamada" crea una `llamadas_activas` vía `CRM_LLAMADA_INICIAR`
- El temporizador corre en `duracion_seg`

## 5. Resultado — 7 botones

| Botón | Endpoint | Acción |
|-------|----------|--------|
| **VENTA** | `crm-registrar-resultado` (rama VENTA) | Inserta historial_llamadas, update lead a vendido, trigger crea cliente + venta + timeline |
| **CALLBACK** | `crm-registrar-resultado` (rama CALLBACK) | Inserta historial + inserta llamada_programada |
| **NO INTERESA** | `crm-registrar-resultado` (rama NO_INTERESA) | Inserta historial, marca lead como descartado |
| **RESPONSABLE** | `crm-registrar-resultado` (rama RESPONSABLE) | Inserta historial, actualiza contacto_nombre/email |
| **ENVIAR INFO** | `crm-registrar-resultado` (rama ENVIAR_INFO) + `crm-enviar-info-lead` | Inserta historial + envía email SMTP |
| **NO CONTESTA** | `crm-registrar-resultado` (rama NO_CONTESTA) | Inserta historial, incrementa `intentos_no_contesta`, si llega a 3 marca `freeze_hasta` |
| **ERROR** | `crm-registrar-resultado` (rama ERROR) | Inserta historial con detalles del error técnico |

Payload común (POST `crm-registrar-resultado`):
```json
{
  "lead_id": 4335,
  "operador_id": 48,
  "llamada_activa_id": 1234,
  "resultado": "venta",
  "notas": "...",
  "duracion_seg": 245,
  "es_simulacion": false,
  "detalles": { /* libre */ }
}
```

## 6. Venta → trigger → admin ve en LEADS LANDING

Cuando el operador hace click en **VENTA**:

1. `CRM_REGISTRAR_RESULTADO` (workflow `6x0x8DCOBzZf62K6`) ejecuta la rama VENTA
2. `Insert Historial` → `operaciones.historial_llamadas` (resultado='venta', detalles={...})
3. `Update Lead Vendido` → `operaciones.leads.estado='vendido'`
4. `Insert Cliente` → `clientes.clientes` con datos del lead
5. **Trigger `operaciones.fn_lead_vendido_to_cliente`** se dispara:
   - Si el cliente no existe, lo inserta
   - Inserta `crm_bybusiness.ventas` (id, lead_id, operador_id, tipo, estado_pago, total)
   - Inserta `public.timeline_global` (evento='venta', subtipo_resultado='venta')
6. El admin refresca LEADS LANDING y ve el lead con `cliente_id` no nulo

## 7. Setup 2FA — Opción B (obligatorio)

El admin marca al operador como `totp_obligatorio=true` desde el panel de usuarios.
En el próximo login, el operador es redirigido a `SetupObligatorio2FAScreen` que:

1. Llama a `crm-activar-2fa` → genera `totp_secret` y setea `totp_habilitado=true`
2. Muestra el QR para que el operador lo escanee con Google Authenticator / Authy
3. El operador ingresa el código de 6 dígitos
4. `crm-verificar-2fa` (is_setup=true) marca `totp_configurado=true` y `totp_habilitado=true`

El admin **nunca ve el secret** del operador.

Para obligar / desobligar 2FA a un usuario desde la DB:

```bash
# Obligar
ssh root@72.60.191.179 'curl -sS -X POST -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: <KEY>" \
  -d "{\"id\": 48}" \
  "https://n8n.ia-bybusiness.online/webhook/crm-obligar-2fa"'

# Desobligar
ssh root@72.60.191.179 'curl -sS -X POST -H "Content-Type: application/json" \
  -H "X-N8N-API-KEY: <KEY>" \
  -d "{\"id\": 48}" \
  "https://n8n.ia-bybusiness.online/webhook/crm-desobligar-2fa"'
```

## Workflows clave

| Workflow | ID | Uso |
|----------|-----|-----|
| `CRM_REGISTRAR_RESULTADO` | `6x0x8DCOBzZf62K6` | Recibe el resultado de los 7 botones |
| `CRM_AGENDA_V2` | `dqj7YNrXBLZvyt86` | Agenda unificada (admin) |
| `CRM_LEADS_LANDING_FINAL` | `yAtQ6wt8YtFwQLvr` | Admin ve ventas recientes |
| `CRM_DISTRIBUIDOR_CAMPANAS` | `LjcIjmCBKuWUxOSZ` | Asignar lead al operador |
| `CRM_80_ENVIAR_INFO_LEAD` | `HZUqJD2I5WMt0k67` | SMTP via Postfix |
| `CRM_USUARIOS_OBLIGAR_2FA` | `TVTaOj30rO2uP8Ga` | Marca `totp_obligatorio=true` |
| `CRM_USUARIOS_DESOBLIGAR_2FA` | `300t0LVfPMSDcGai` | Marca `totp_obligatorio=false` |
| `CRM_USUARIOS_VERIFICAR_2FA` | `d6Mpx3Vm1QPEdkwq` | Verifica código TOTP + marca `totp_configurado=true` |

## Componentes frontend

- `src/modules/dashboard/OperatorDashboard.jsx` — dashboard principal del operador
- `src/modules/dashboard/CampanasPanel.jsx` — drawer de campañas (pool + tomar)
- `src/shared/hooks/useOperatorData.js` — estado del operador + `obtenerSiguienteLead()`
- `src/shared/hooks/useN8n.js` — fetch helpers con manejo de body vacío
- `src/modules/auth/SetupObligatorio2FAScreen.jsx` — pantalla de configuración obligatoria de 2FA (Opción B)
- `src/modules/admin/usuarios/UsuariosList.jsx` — panel de usuarios con botón de 2FA obligatorio (ícono único 3 estados)
