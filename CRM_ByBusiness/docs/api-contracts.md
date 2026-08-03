# API Contracts: CRM_ByBusiness ↔ n8n

> Last updated: 2026-08-03
> Source of truth: `infraestructura.workflows_n8n` (VPS n8n sync, 64 active webhook workflows) + frontend callers in `src/`
> Base URL: `https://n8n.ia-bybusiness.online/webhook`
> Auth: none on all webhooks (rate limiting at n8n layer)
> All calls are POST unless method noted; JSON bodies throughout

---

## How to use this doc

**Webhook path convention:** `'crm-foo-bar'` in client code → `POST https://n8n.ia-bybusiness.online/webhook/crm-foo-bar`.
The `useN8nQuery`/`useN8nMutation` hooks in `src/shared/hooks/useN8n.js` append the path to `VITE_N8N_URL`.

**Schema sources:**
- Registered webhooks: confirmed in `infraestructura.workflows_n8n`
- Unregistered webhooks: inferred from frontend usage (marked `⚠️ NOT IN REGISTRY`)
- Request/response shapes: inferred from `n8nPost`/`n8nGet` call sites

**When integrating a new endpoint:**
1. Find or create the workflow in n8n (VPS)
2. Add it to `infraestructura.workflows_n8n` (sync mechanism: manual INSERT or automated — verify with infra team)
3. Document the contract here following the template
4. Implement the client call with the documented payload shape

**When changing an existing endpoint:**
1. Update the workflow in n8n first
2. Update this doc to match
3. Update the client code last

---

## Auth

### CRM_LOGIN

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-login` |
| Auth | none |
| Used in | `src/modules/auth/Login.jsx` |

**Request body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response body:** `{ ok: true, user: {...} }` (shape confirmed in Login.jsx caller)

---

### CRM_USUARIOS_ACTIVAR_2FA

| Field | Value |
|---|---|
| Workflow ID | `f9mbHdiyTQssBHUb` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-activar-2fa` |
| Auth | none |
| Used in | `src/modules/auth/SetupObligatorio2FAScreen.jsx`, `src/modules/auth/Verify2FAScreen.jsx` |

**Request body:**
```json
{ "id": "number" }
```

---

### CRM_USUARIOS_DESACTIVAR_2FA

| Field | Value |
|---|---|
| Workflow ID | `i42H9X5kniYvewyZ` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-desactivar-2fa` |
| Auth | none |
| Used in | `src/modules/auth/Verify2FAScreen.jsx` |

**Request body:**
```json
{ "id": "number" }
```

---

### CRM_VERIFICAR_2FA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-verificar-2fa` |
| Auth | none |
| Used in | `src/modules/auth/Setup2FAScreen.jsx`, `src/modules/auth/SetupObligatorio2FAScreen.jsx`, `src/modules/auth/Verify2FAScreen.jsx` |

**Request body:**
```json
{
  "usuario_id": "number",
  "codigo": "string",
  "is_setup": "boolean"
}
```

---

## Agenda

### CRM_AGENDA_UNIFICADA

| Field | Value |
|---|---|
| Workflow ID | `dqj7YNrXBLZvyt86` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-agenda-unificada` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/AgendaPersonal.jsx`, `src/modules/admin/agenda/AgendaGlobalPanel.jsx` |

**Request params (GET query string):**
```
fecha_inicio=YYYY-MM-DD&fecha_fin=YYYY-MM-DD&operador_id=N (optional)
```

**Response body:** calendar/agenda events array — exact shape not confirmed

---

### CRM_HORARIOS_GET

| Field | Value |
|---|---|
| Workflow ID | `MI51xgA6bNTlCYo8` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-horarios` |
| Auth | none |
| Used in | `src/modules/admin/agenda/AgendaGlobalPanel.jsx` |

**Request params:** `usuario_id=N` (GET)

---

### CRM_HORARIOS_GUARDAR

| Field | Value |
|---|---|
| Workflow ID | `taqZiJWg9KrfKj8D` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-horarios-guardar` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/HorarioModal.jsx` |

**Request body:**
```json
{
  "usuario_id": "number",
  "bloques": [{ ... }]
}
```

---

### CRM_CREAR_CITA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-crear-cita` |
| Auth | none |
| Used in | `src/modules/admin/agenda/AgendaGlobalPanel.jsx` |

**Request body:**
```json
{ "gestor_id": "number", ...formFields }
```

---

## Campañas

### CRM_CAMPANAS

| Field | Value |
|---|---|
| Workflow ID | `zQ50bbiT93UuQRfJ` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campanas` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/OperatorDashboard.jsx`, `src/modules/admin/campanas/CampanasPanel.jsx` |

**Request params:** `es_simulacion=true|false` (optional)

**Response body:** campaigns array with `id`, `nombre`, `estado`, etc.

---

### CRM_CAMPANA_CREAR

| Field | Value |
|---|---|
| Workflow ID | `q02RHiexlcTN1DdW` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-campana-crear` |
| Auth | none |
| Used in | `src/modules/admin/campanas/GeneradorCampanasPanel.jsx` |

**Request body:** campaign creation fields

---

### CRM_CAMPANAS_ELIMINAR

| Field | Value |
|---|---|
| Workflow ID | `GbIIzBAzgpG6ug8J` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-campanas-eliminar` |
| Auth | none |
| Used in | `src/modules/admin/campanas/CampanasPanel.jsx` |

**Request body:**
```json
{ "id": "number" }
```

---

### CRM_CAMPANA_ASIGNAR_OPERADORES

| Field | Value |
|---|---|
| Workflow ID | `qMJXTfnWAELjUKzH` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-campana-asignar-operadores` |
| Auth | none |
| Used in | `src/modules/admin/campanas/AsignarOperadoresModal.jsx` |

**Request body:** `{ campana_id, operadores: [...] }`

---

### CRM_CAMPANA_UPDATE_FIX

| Field | Value |
|---|---|
| Workflow ID | `4wdrmem0wHWcvbzT` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-campana-update-fix` |
| Auth | none |
| Used in | `src/modules/admin/campanas/CampanasPanel.jsx` |

---

### CRM_CAMPANA_CREAR_DESDE_BUSQUEDA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-campana-crear-desde-busqueda` |
| Auth | none |
| Used in | `src/modules/admin/campanas/CrearDesdeBusquedaModal.jsx` |

---

### CRM_ANALISIS_CAMPANAS

| Field | Value |
|---|---|
| Workflow ID | `HBSBigu7zJhayi4c` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-analisis-campanas` |
| Auth | none |
| Used in | `src/modules/admin/campanas/GeneradorCampanasPanel.jsx` |

**Request body:**
```json
{
  "es_simulacion": "boolean",
  "max_leads": "number"
}
```

---

### CRM_ANALISIS_INTELIGENTE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-analisis-inteligente` |
| Auth | none |
| Used in | `src/modules/admin/campanas/AnalisisInteligentePanel.jsx` |

---

### CRM_CREAR_CAMPANA_CON_LEADS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-crear-campana-con-leads` |
| Auth | none |
| Used in | `src/modules/admin/campanas/AnalisisInteligentePanel.jsx` |

---

### CRM_ESTADISTICAS_CAMPANAS

| Field | Value |
|---|---|
| Workflow ID | `SbQE9iUqDXmGYcWh` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-estadisticas-campanas` |
| Auth | none |
| Used in | `src/modules/admin/campanas/CampanasPanel.jsx` |

---

### CRM_CAMPANAS_DASHBOARD

| Field | Value |
|---|---|
| Workflow ID | `353XKjOg0BvMrWfR` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campanas-dashboard` |
| Auth | none |
| Used in | `src/modules/admin/campanas/CampanasPanel.jsx` (inferred) |

---

### CRM_CAMPANAS_EXISTENTES

| Field | Value |
|---|---|
| Workflow ID | `hKgTVtEXn5m2wm4S` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campanas-activas` |
| Auth | none |
| Used in | (inferred from registry entry — verify caller) |

---

### CRM_CAMPANA_OPERADORES

| Field | Value |
|---|---|
| Workflow ID | `wpkcKuaw4ipZfAm9` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campana-operadores` |
| Auth | none |
| Used in | (inferred from registry — verify caller) |

---

### CRM_CAMPANAS_VISTA_CATEGORIA

| Field | Value |
|---|---|
| Workflow ID | `yiDrywzOPlvoRFBE` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campanas-vista-categoria` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_CAMPANAS_VISTA_LOCALIDAD

| Field | Value |
|---|---|
| Workflow ID | `D0wNCQbJE597YeYC` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-campanas-vista-localidad` |
| Auth | none |
| Used in | (inferred from registry) |

---

## Callbacks

### CRM_CALLBACKS_OPERADOR

| Field | Value |
|---|---|
| Workflow ID | `BSJYrid3xAIVQat3` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-callbacks-operador` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/useCallbacksLogic.js`, `src/components/dashboard/AgendaPersonal.jsx`, `src/components/dashboard/OperatorDashboard.jsx` |

**Request params (GET query string):**
```
operador_id=N&es_simulacion=true|false
```

**Response body:** `{ callbacks_hoy: [...], ... }`

---

### CRM_CALLBACKS_HOY

| Field | Value |
|---|---|
| Workflow ID | `W8AbGdU5o6tt7tYz` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-callbacks-hoy` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_CALLBACKS_GESTIONAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-callbacks-gestionar` |
| Auth | none |
| Used in | `src/components/dashboard/useCallbacksLogic.js` |

**Request body:**
```json
{ "callback_id": "number", "accion": "reschedule|cancel", ... }
```
Mutation: used for rescheduling and cancelling callbacks.

---

## Cartera / Clientes

### CRM_CARTERA_GET_V4

| Field | Value |
|---|---|
| Workflow ID | `EWmFKMHx3slciElA` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-cartera-get` |
| Auth | none |
| Used in | `src/modules/admin/cartera/CarteraPanel.jsx`, `src/modules/admin/agenda/AgendaGlobalPanel.jsx`, `src/modules/admin/facturacion/FacturacionPanel.jsx` |

**Request params:** `cliente_id=N` (optional, GET)

---

### CRM_CLIENTES_FIX

| Field | Value |
|---|---|
| Workflow ID | `vWm3pzbwQBozwaHY` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-clientes` |
| Auth | none |
| Used in | `src/modules/admin/agenda/AgendaGlobalPanel.jsx` |

---

### CRM_CLIENTE_CREAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-cliente-crear` |
| Auth | none |
| Used in | `src/modules/admin/cartera/NuevoClienteDrawer.jsx` |

---

### CRM_INTERACCIONES_CLIENTE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-interacciones-cliente` |
| Auth | none |
| Used in | `src/modules/admin/cartera/ClienteDrawer.jsx` |

**Request params:** `cliente_id=N`

---

### CRM_REGISTRAR_INTERACCION

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-registrar-interaccion` |
| Auth | none |
| Used in | `src/modules/admin/cartera/RegistrarInteraccionModal.jsx` |

---

### CRM_INTERACCION_EDITAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-interaccion-editar` |
| Auth | none |
| Used in | `src/modules/admin/cartera/RegistrarInteraccionModal.jsx` |

---

### CRM_INTERACCION_BORRAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-interaccion-borrar` |
| Auth | none |
| Used in | `src/modules/admin/cartera/ClienteDrawer.jsx` |

**Request body:**
```json
{ "interaccion_id": "number" }
```

---

### CRM_CLIENTE_BAJA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-cliente-baja` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabFicha.jsx` |

**Request body:**
```json
{ "cliente_id": "number", "tipo": "string" }
```

---

### CRM_CLIENTE_PROXIMA_ACCION

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-cliente-proxima-accion` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabFicha.jsx` |

**Request body:**
```json
{ "cliente_id": "number", "fecha": "YYYY-MM-DD|null", "nota": "string|null" }
```

---

### CRM_GBPS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URLs | Multiple GBP-related endpoints not in registry: `crm-gbp-kpis`, `crm-gbp-refresh`, `crm-gbp-confirmar`, `crm-gbp-validar`, `crm-gbp-rescrape` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabGbp.jsx`, `src/modules/admin/gbp/GbpDashboardPanel.jsx` |

---

### CRM_CONTRATOS_DIGITALES_ALL

| Field | Value |
|---|---|
| Workflow ID | `Gxx7Z40zuWOBYjTE` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-contratos-digitales-all` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx` |

---

### CRM_CONTRATOS_CLIENTE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-contratos-cliente` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabContratos.jsx` |

**Request params:** `cliente_id=N`

---

### CRM_CONTRATO_ACTUALIZAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-contrato-actualizar` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabContratos.jsx` |

**Request body:**
```json
{ "contrato_id": "number", "estado": "string" }
```

---

### CRM_CONTRATO_CREAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-contrato-crear` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabContratos.jsx` |

---

### CRM_70_POST_CONTRATO_DIGITAL

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-70-post-contrato-digital` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx` |

---

### CRM_72_POST_CONTRATO_ENVIAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-72-post-contrato-enviar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx` |

**Request body:**
```json
{ "contrato_id": "number" }
```

---

### CRM_75_POST_CONTRATO_EMAIL

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-75-post-contrato-email` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx` |

**Request body:**
```json
{ "contrato_id": "number" }
```

---

### CRM_TARJETA_GET

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-tarjeta-get` |
| Auth | none |
| Used in | `src/modules/admin/cartera/tabs/TabTarjetaDigital.jsx` |

**Request params:** `cliente_id=N`

---

## Distribución / Leads

### CRM_LEADS_ADMIN_V2

| Field | Value |
|---|---|
| Workflow ID | `n7Whp4x4jxLFbmL3` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-leads-admin` |
| Auth | none |
| Used in | `src/modules/admin/leads/LeadsPanel.jsx` |

**Request params (GET query string):**
```
es_simulacion=string&limit=20000
```

**Response body:** `{ leads: [...], total: N }`

---

### CRM_LEADS_DISPONIBLES

| Field | Value |
|---|---|
| Workflow ID | `qEWuqH9IkzcSOc42` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-leads-disponibles` |
| Auth | none |
| Used in | `src/components/dashboard/OperatorDashboard.jsx` |

**Request body:**
```json
{
  "es_simulacion": "boolean",
  "campana_id": "number|null"
}
```

**Response body:**
```json
{
  "ok": true,
  "total": "number",
  "total_disponibles": "number"
}
```

---

### CRM_LEAD_DETAIL

| Field | Value |
|---|---|
| Workflow ID | `2QlZ84RxfFtmyH5w` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-lead-detail` |
| Auth | none |
| Used in | `src/components/dashboard/OperatorDashboard.jsx` |

**Request params:** `lead_id=N&operador_id=N` (GET)

---

### CRM_UPDATE_LEAD

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-update-lead` |
| Auth | none |
| Used in | `src/modules/admin/leads/LeadRow.jsx`, `src/modules/admin/leads/LeadLandingRow.jsx` |

**Request body:**
```json
{
  "lead_id": "number",
  "nota": "string (optional)",
  ...otherLeadFields
}
```

---

### CRM_LEAD_NOTA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-lead-nota` |
| Auth | none |
| Used in | `src/modules/admin/leads/LeadRow.jsx` |

**Request body:**
```json
{ "lead_id": "number", "nota": "string" }
```

---

### CRM_LEADS_ENTRENAMIENTO_FIX

| Field | Value |
|---|---|
| Workflow ID | `aslegB3zWob1Xkmb` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-leads-entrenamiento` |
| Auth | none |
| Used in | `src/components/dashboard/TrainingModeWrapper.jsx`, `src/modules/entrenamiento/EntrenamientoPanel.jsx`, `src/modules/entrenamiento/SupervisorPanel.jsx` |

**Request params:** `operador_id=N` (GET)

---

### CRM_LEADS_LANDING_FINAL

| Field | Value |
|---|---|
| Workflow ID | `yAtQ6wt8YtFwQLvr` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-leads-landing` |
| Auth | none |
| Used in | `src/modules/admin/leads/LeadsLandingPanel.jsx` |

---

### CRM_LEADS_HUERFANOS

| Field | Value |
|---|---|
| Workflow ID | `12GFhbv1d3Y8do1X` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-leads-huerfanos` |
| Auth | none |
| Used in | `src/modules/admin/leads/AsignameUnLead.jsx` |

---

### CRM_LEADS_FREEZED_LIST

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-leads-freezed-list` |
| Auth | none |
| Used in | `src/components/dashboard/MisFreezeList.jsx` |

**Request params:** `operador_id=N&action=list|unfreeze`

**Response body:** `[{ frozen_leads: [...] }]` (n8n wraps in array)

---

### CRM_DISTRIBUIDOR_CAMPANAS

| Field | Value |
|---|---|
| Workflow ID | `LjcIjmCBKuWUxOSZ` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-distribuidor-campanas` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/modules/admin/leads/AsignameUnLead.jsx` |

**Request body:**
```json
{
  "operador_id": "number",
  "mode": "one",
  "campana_id": "number|null"
}
```

**Response body:** `{ lead: {...} }` or array of leads

---

### CRM_DISTRIBUIDOR_HUERFANOS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-distribuidor-huerfanos` |
| Auth | none |
| Used in | `src/modules/admin/leads/AsignameUnLead.jsx` |

---

### CRM_REPUTACION_LEAD

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-reputacion-lead` |
| Auth | none |
| Used in | `src/components/dashboard/zones/ReputacionTab.jsx` |

---

## Entrenamiento

### CRM_INICIAR_SESION_ENTRENAMIENTO_FIX

| Field | Value |
|---|---|
| Workflow ID | `mvdE5eUeg0Jq0qLE` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-iniciar-sesion-entrenamiento` |
| Auth | none |
| Used in | `src/components/dashboard/TrainingModeWrapper.jsx`, `src/modules/entrenamiento/EntrenamientoPanel.jsx` |

**Request body:**
```json
{ "operador_id": "number" }
```

---

### CRM_RESULTADO_ENTRENAMIENTO

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-resultado-entrenamiento` |
| Auth | none |
| Used in | `src/components/dashboard/OperatorDashboard.jsx`, `src/modules/entrenamiento/EntrenamientoPanel.jsx` |

---

### CRM_PANEL_SUPERVISOR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-panel-supervisor` |
| Auth | none |
| Used in | `src/modules/entrenamiento/SupervisorPanel.jsx` |

---

### CRM_EVALUAR_SESION

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-evaluar-sesion` |
| Auth | none |
| Used in | `src/modules/entrenamiento/SupervisorPanel.jsx` |

---

### CRM_RESET_ENTRENAMIENTO

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-reset-entrenamiento` |
| Auth | none |
| Used in | `src/modules/entrenamiento/SupervisorPanel.jsx` |

**Request body:**
```json
{ "accion": "reset_historial|borrar_lead|restaurar_lead", "lead_id": "number (optional)" }
```

---

## Facturación

### CRM_PRODUCTOS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-productos` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformaModal.jsx` |

---

### CRM_PROFORMA_CREAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-crear` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformaModal.jsx` |

**Request body:**
```json
{
  "cliente_id": "number",
  "operador_id": "number",
  "fraccionado": "boolean",
  "num_fracciones": "number",
  "requiere_factura": "boolean",
  "notas": "string"
}
```

---

### CRM_PROFORMA_LINEA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-linea` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformaModal.jsx` |

**Request body:**
```json
{
  "proforma_id": "number",
  "producto_id": "number|null",
  "descripcion": "string",
  "cantidad": "number",
  "precio_unitario": "number",
  "dto_pct": "number"
}
```

---

### CRM_PROFORMA_BORRAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-borrar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformaModal.jsx` |

**Request body:**
```json
{ "proforma_id": "number" }
```

---

### CRM_PAGOS_GENERAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-pagos-generar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformaModal.jsx` |

**Request body:**
```json
{ "proforma_id": "number" }
```

---

### CRM_PROFORMA_VERIFICAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-verificar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx`, `src/modules/admin/facturacion/ClientesPanel.jsx` |

**Request body:**
```json
{ "proforma_id": "number" }
```

---

### CRM_PROFORMA_REABRIR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-reabrir` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx`, `src/modules/admin/facturacion/ClientesPanel.jsx` |

**Request body:**
```json
{ "proforma_id": "number" }
```

---

### CRM_FACTURAS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-facturas` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/FacturasPanel.jsx` |

---

### CRM_FACTURAS_GET

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-facturas-get` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ClientesPanel.jsx`, `src/modules/admin/cartera/tabs/facturacion/FacturasSection.jsx` |

**Request params:** `cliente_id=N`

---

### CRM_FACTURA_GENERAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-factura-generar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/ProformasPanel.jsx`, `src/modules/admin/facturacion/ClientesPanel.jsx` |

**Request body:**
```json
{ "proforma_id": "number" }
```

---

### CRM_FACTURA_GENERAR_PDF

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-factura-generar-pdf` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/FacturasPanel.jsx` |

---

### CRM_FACTURA_ENVIAR_WA

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-factura-enviar-wa` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/FacturasPanel.jsx` |

**Request body:**
```json
{ "factura_id": "number" }
```

---

### CRM_FACTURA_ENVIAR_EMAIL

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-factura-enviar-email` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/FacturasPanel.jsx` |

**Request body:**
```json
{ "factura_id": "number" }
```

---

### CRM_PAGO_COBRAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-pago-cobrar` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/FacturasPanel.jsx`, `src/modules/admin/cartera/tabs/facturacion/FacturasSection.jsx` |

**Request body:**
```json
{ "pago_id": "number", "metodo": "string" }
```

---

### CRM_RENOVACIONES

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-renovaciones` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/RenovacionesPanel.jsx` |

**Request params:** `meses=N`

---

## Gestoría

### CRM_GESTOR_CONFIG_FIXED

| Field | Value |
|---|---|
| Workflow ID | `DzEwVJ2cXnhg9rtI` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-gestor-config` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/GestoriaPanel.jsx` |

---

### CRM_GESTOR_CONFIG_UPDATE

| Field | Value |
|---|---|
| Workflow ID | `S6AD2MZCBFusMrF4` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-gestor-config-update` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/GestoriaPanel.jsx` |

---

### CRM_GESTOR_ENVIOS_FINAL

| Field | Value |
|---|---|
| Workflow ID | `mx0KjyyM7PGcPo9O` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-gestor-envios` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/GestoriaPanel.jsx` |

---

### CRM_GESTOR_PENDIENTES_V2

| Field | Value |
|---|---|
| Workflow ID | `4IAVewentNuEf7SR` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-gestor-pendientes` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/GestoriaPanel.jsx` |

**Request params:** `desde=YYYY-MM-DD&hasta=YYYY-MM-DD`

---

### CRM_GESTOR_ENVIAR_LOTE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-gestor-enviar-lote` |
| Auth | none |
| Used in | `src/modules/admin/facturacion/GestoriaPanel.jsx` |

---

## Leads — KPIs / Live

### CRM_OPERADOR_KPI_LIVE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-operador-kpi-live` |
| Auth | none |
| Used in | `src/components/dashboard/useKpiStripLogic.js` |

**Request params:** `operador_id=N`

---

## Llamadas

### CRM_LLAMADA_ACTIVA_FIX

| Field | Value |
|---|---|
| Workflow ID | `DU4BwjV9lf4Bk2DU` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-llamada-activa` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/OperatorDashboard.jsx` |

**Request body:** `{ ...leadData }` — exact shape inferred from usage

---

### CRM_REGISTRAR_RESULTADO

| Field | Value |
|---|---|
| Workflow ID | `6x0x8DCOBzZf62K6` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-registrar-resultado` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/OperatorDashboard.jsx` |

**Request body:** `{ lead_id, resultado, ... }` — exact shape in `operatorData.js` and `OperatorDashboard.jsx`

---

### CRM_RESULTADOS_OPERADOR_SIM

| Field | Value |
|---|---|
| Workflow ID | `pg2vxy6kgzgtRey2` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-resultados-operador` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/MisResultados.jsx` |

**Request params:** `operador_id=N`

---

### CRM_AUDITORIA_LLAMADAS_FIX

| Field | Value |
|---|---|
| Workflow ID | `w42nkduVrm5wLh7p` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-auditoria-llamadas` |
| Auth | none |
| Used in | `src/modules/admin/auditoria/AuditoriaPanel.jsx` |

---

### CRM_AUDITORIA_LLAMADAS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY — same name as `CRM_AUDITORIA_LLAMADAS_FIX`) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-auditoria-llamadas` |
| Auth | none |
| Used in | `src/modules/admin/auditoria/AuditoriaPanel.jsx` |

---

### CRM_HISTORIAL_OPERADOR

| Field | Value |
|---|---|
| Workflow ID | `1zhx9V2BwwzJLo90` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-historial-operador` |
| Auth | none |
| Used in | `src/hooks/useOperatorData.js`, `src/components/dashboard/TrainingModeWrapper.jsx`, `src/modules/entrenamiento/HistorialProgreso.jsx` |

**Request params:** `operador_id=N`

---

## Operadores

### CRM_OPERADORES_ACTIVOS

| Field | Value |
|---|---|
| Workflow ID | `Er8MUaDXRoymgfJR` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-operadores-activos` |
| Auth | none |
| Used in | `src/modules/admin/leads/LeadsPanel.jsx`, `src/modules/admin/leads/LeadsLandingPanel.jsx` |

---

### CRM_OPERADORES_LISTA

| Field | Value |
|---|---|
| Workflow ID | `SsMTyt12yj5Kgu3g` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-operadores-lista` |
| Auth | none |
| Used in | `src/modules/admin/ventas/VentasPanel.jsx` |

---

### CRM_USUARIOS_LISTA

| Field | Value |
|---|---|
| Workflow ID | `iM6bc2VznYnUQreP` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-usuarios-get` |
| Auth | none |
| Used in | `src/modules/admin/cartera/NuevoClienteDrawer.jsx`, `src/modules/admin/cartera/ClienteDrawer.jsx`, `src/modules/admin/cartera/tabs/TabFicha.jsx`, `src/modules/admin/usuarios/UsuariosList.jsx`, `src/modules/admin/campanas/CampanasPanel.jsx` |

---

### CRM_USUARIOS_CREATE

| Field | Value |
|---|---|
| Workflow ID | `aUdeNVNfyO4AA00E` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-crear-usuario` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/UsuariosList.jsx` |

---

### CRM_USUARIOS_EDITAR

| Field | Value |
|---|---|
| Workflow ID | `vq4MwHGnJ5dJ8adE` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-editar-usuario` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/UsuariosList.jsx` |

---

### CRM_USUARIOS_ELIMINAR

| Field | Value |
|---|---|
| Workflow ID | `H6JkVEyOay7aN7zX` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-eliminar-usuario` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/UsuariosList.jsx` |

**Request body:**
```json
{ "id": "number" }
```

---

### CRM_USUARIOS_REACTIVAR

| Field | Value |
|---|---|
| Workflow ID | `yJFAi4wudXgzcqFh` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-reactivar-usuario` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/UsuariosList.jsx` |

**Request body:**
```json
{ "id": "number" }
```

---

### CRM_AUSENCIA_GESTIONES

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-ausencia-gestiones` |
| Auth | none |
| Used in | `src/modules/admin/usuarios/UsuariosList.jsx` |

**Request body:**
```json
{ "operador_id": "number" }
```
Note: uses `baseUrl: N8N_GESTIONES_URL` override (different n8n instance).

---

## Candidatos

### CRM_CANDIDATOS_V2

| Field | Value |
|---|---|
| Workflow ID | `GMNbgfmxUPWjmsA2` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-candidatos-admin` |
| Auth | none |
| Used in | (inferred from registry — verify caller) |

---

### CRM_CANDIDATO_UPDATE

| Field | Value |
|---|---|
| Workflow ID | `ASKYpnI4vhtFYuL2` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-candidato-update` |
| Auth | none |
| Used in | `src/modules/admin/candidatos/CandidatosPanel.jsx` |

**Request body:**
```json
{ "id": "number", "estado": "string" }
```

---

## Ventas

### CRM_VENTAS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-ventas` |
| Auth | none |
| Used in | `src/modules/admin/ventas/VentasPanel.jsx` |

---

### CRM_VENTA_ACTUALIZAR

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-venta-actualizar` |
| Auth | none |
| Used in | `src/modules/admin/ventas/VentaRow.jsx` |

**Request body:**
```json
{ "venta_id": "number", "estado": "string" }
```

---

## Admin / Sistema

### CRM_BACKUP_STATUS

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-backup-status` |
| Auth | none |
| Used in | `src/modules/admin/backup/useBackupOps.js` |

---

### CRM_BACKUP_RESTORE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-backup-restore` |
| Auth | none |
| Used in | `src/modules/admin/backup/useBackupOps.js` |

---

### CRM_LEAD_FRESHNESS_CONFIG

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-lead-freshness-config` |
| Auth | none |
| Used in | `src/modules/admin/agenda/FreshnessConfigCard.jsx` |

---

### CRM_CHECK_LEADS

| Field | Value |
|---|---|
| Workflow ID | `TTDgJlM7C4EvNN7R` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-check-leads` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_WATCHDOG_CALLBACKS

| Field | Value |
|---|---|
| Workflow ID | `6d5wHd7AwxEeglxn` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-watchdog-callbacks` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_WATCHDOG_HUERFANAS

| Field | Value |
|---|---|
| Workflow ID | `qW0pkkN83LisM7Ze` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-watchdog-huerfanas` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_BONUS_CALCULAR

| Field | Value |
|---|---|
| Workflow ID | `PAQD0hZtSVEQZ7zn` |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-bonus-calcular` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_ADMIN_AUDIT_GET

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-admin-audit-get` |
| Auth | none (RBAC checked client-side) |
| Used in | `src/modules/admin/auditoria/AdminAuditPanel.jsx` |

**Request params (GET query string):**
```
event_type=string&user_id=N&desde=YYYY-MM-DD&hasta=YYYY-MM-DD&page=N&page_size=N
```

**Response body:**
```json
{
  "events": [...],
  "total": "number",
  "warning": "string|null"
}
```

---

### CRM_SCRAPER_HEALTH

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-scraper-health` |
| Auth | none |
| Used in | `src/modules/admin/scraper/ScraperStatusPanel.jsx` |

---

### CRM_SCRAPER_CONFIG_GET

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `GET https://n8n.ia-bybusiness.online/webhook/crm-scraper-config-get` |
| Auth | none |
| Used in | `src/modules/admin/scraper/useScraperConfig.js` |

---

### CRM_SCRAPER_CONFIG_UPDATE

| Field | Value |
|---|---|
| Workflow ID | — (⚠️ NOT IN REGISTRY) |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-scraper-config-update` |
| Auth | none |
| Used in | `src/modules/admin/scraper/useScraperConfig.js` |

---

## Eventos de Sistema

### CRM_60_POST_EVENTO_SISTEMA

| Field | Value |
|---|---|
| Workflow ID | `CRMEventoSistema1` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-evento-sistema` |
| Auth | none |
| Used in | (inferred from registry) |

---

### CRM_02_REGISTRAR_RESULTADO_V2

| Field | Value |
|---|---|
| Workflow ID | `CRM02RESULTv2vps` |
| Webhook URL | `POST https://n8n.ia-bybusiness.online/webhook/crm-registrar-resultado` |
| Auth | none |
| Used in | (inferred from registry — note: same URL as `CRM_REGISTRAR_RESULTADO`) |

> ⚠️ URL conflict: `crm-registrar-resultado` appears in both `CRM_REGISTRAR_RESULTADO` (ID `6x0x8DCOBzZf62K6`) and `CRM_02_REGISTRAR_RESULTADO_V2` (ID `CRM02RESULTv2vps`). Verify which one is active and whether one is a legacy alias.

---

## Orphan endpoints

Webhooks registered in `infraestructura.workflows_n8n` with **no frontend caller** found. These may be used by external integrations (WAHA, scrapers, other n8n workflows) or be legacy.

| Workflow ID | Nombre | Webhook URL |
|---|---|---|
| `CRM02RESULTv2vps` | `CRM_02_REGISTRAR_RESULTADO_V2` | `crm-registrar-resultado` |
| `CRMEventoSistema1` | `CRM_60_POST_EVENTO_SISTEMA` | `crm-evento-sistema` |
| `hKgTVtEXn5m2wm4S` | `CRM_CAMPANAS_EXISTENTES` | `crm-campanas-activas` |
| `wpkcKuaw4ipZfAm9` | `CRM_CAMPANA_OPERADORES` | `crm-campana-operadores` |
| `yiDrywzOPlvoRFBE` | `CRM_CAMPANAS_VISTA_CATEGORIA` | `crm-campanas-vista-categoria` |
| `D0wNCQbJE597YeYC` | `CRM_CAMPANAS_VISTA_LOCALIDAD` | `crm-campanas-vista-localidad` |
| `353XKjOg0BvMrWfR` | `CRM_CAMPANAS_DASHBOARD` | `crm-campanas-dashboard` |
| `GMNbgfmxUPWjmsA2` | `CRM_CANDIDATOS_V2` | `crm-candidatos-admin` |
| `TTDgJlM7C4EvNN7R` | `CRM_CHECK_LEADS` | `crm-check-leads` |
| `Gxx7Z40zuWOBYjTE` | `CRM_CONTRATOS_DIGITALES_ALL` | `crm-contratos-digitales-all` |
| `6d5wHd7AwxEeglxn` | `CRM_WATCHDOG_CALLBACKS` | `crm-watchdog-callbacks` |
| `qW0pkkN83LisM7Ze` | `CRM_WATCHDOG_HUERFANAS` | `crm-watchdog-huerfanas` |
| `PAQD0hZtSVEQZ7zn` | `CRM_BONUS_CALCULAR` | `crm-bonus-calcular` |
| `W8AbGdU5o6tt7tYz` | `CRM_CALLBACKS_HOY` | `crm-callbacks-hoy` |
| `CRMHealthCheckWF` | `CRM_HEALTH_CHECK` | `crm-health` |
| `vWm3pzbwQBozwaHY` | `CRM_CLIENTES_FIX` | `crm-clientes` |
| `yAtQ6wt8YtFwQLvr` | `CRM_LEADS_LANDING_FINAL` | `crm-leads-landing` |
| `qEWuqH9IkzcSOc42` | `CRM_LEADS_DISPONIBLES` | `crm-leads-disponibles` |
| `12GFhbv1d3Y8do1X` | `CRM_LEADS_HUERFANOS` | `crm-leads-huerfanos` |
| `aslegB3zWob1Xkmb` | `CRM_LEADS_ENTRENAMIENTO_FIX` | `crm-leads-entrenamiento` |
| `MI51xgA6bNTlCYo8` | `CRM_HORARIOS_GET` | `crm-horarios` |
| `taqZiJWg9KrfKj8D` | `CRM_HORARIOS_GUARDAR` | `crm-horarios-guardar` |
| `mvdE5eUeg0Jq0qLE` | `CRM_INICIAR_SESION_ENTRENAMIENTO_FIX` | `crm-iniciar-sesion-entrenamiento` |
| `LH7nUGlnkhNBEtHo` | `CRM_KPI_DASHBOARD_V2` | `crm-kpi-dashboard` |
| `2QlZ84RxfFtmyH5w` | `CRM_LEAD_DETAIL` | `crm-lead-detail` |
| `n7Whp4x4jxLFbmL3` | `CRM_LEADS_ADMIN_V2` | `crm-leads-admin` |
| `1zhx9V2BwwzJLo90` | `CRM_HISTORIAL_OPERADOR` | `crm-historial-operador` |
| `SsMTyt12yj5Kgu3g` | `CRM_OPERADORES_LISTA` | `crm-operadores-lista` |
| `6x0x8DCOBzZf62K6` | `CRM_REGISTRAR_RESULTADO` | `crm-registrar-resultado` |
| `pg2vxy6kgzgtRey2` | `CRM_RESULTADOS_OPERADOR_SIM` | `crm-resultados-operador` |
| `f9mbHdiyTQssBHUb` | `CRM_USUARIOS_ACTIVAR_2FA` | `crm-activar-2fa` |
| `aUdeNVNfyO4AA00E` | `CRM_USUARIOS_CREATE` | `crm-crear-usuario` |
| `i42H9X5kniYvewyZ` | `CRM_USUARIOS_DESACTIVAR_2FA` | `crm-desactivar-2fa` |
| `vq4MwHGnJ5dJ8adE` | `CRM_USUARIOS_EDITAR` | `crm-editar-usuario` |
| `H6JkVEyOay7aN7zX` | `CRM_USUARIOS_ELIMINAR` | `crm-eliminar-usuario` |
| `iM6bc2VznYnUQreP` | `CRM_USUARIOS_LISTA` | `crm-usuarios-get` |
| `yJFAi4wudXgzcqFh` | `CRM_USUARIOS_REACTIVAR` | `crm-reactivar-usuario` |
| `Er8MUaDXRoymgfJR` | `CRM_OPERADORES_ACTIVOS` | `crm-operadores-activos` |
| `DzEwVJ2cXnhg9rtI` | `CRM_GESTOR_CONFIG_FIXED` | `crm-gestor-config` |
| `S6AD2MZCBFusMrF4` | `CRM_GESTOR_CONFIG_UPDATE` | `crm-gestor-config-update` |
| `mx0KjyyM7PGcPo9O` | `CRM_GESTOR_ENVIOS_FINAL` | `crm-gestor-envios` |
| `4IAVewentNuEf7SR` | `CRM_GESTOR_PENDIENTES_V2` | `crm-gestor-pendientes` |
| `dqj7YNrXBLZvyt86` | `CRM_AGENDA_V2` | `crm-agenda-unificada` |
| `HBSBigu7zJhayi4c` | `CRM_ANALISIS_CAMPANAS` | `crm-analisis-campanas` |
| `w42nkduVrm5wLh7p` | `CRM_AUDITORIA_LLAMADAS_FIX` | `crm-auditoria-llamadas` |
| `ASKYpnI4vhtFYuL2` | `CRM_CANDIDATO_UPDATE` | `crm-candidato-update` |
| `LjcIjmCBKuWUxOSZ` | `CRM_DISTRIBUIDOR_CAMPANAS` | `crm-distribuidor-campanas` |
| `SbQE9iUqDXmGYcWh` | `CRM_ESTADISTICAS_CAMPANAS` | `crm-estadisticas-campanas` |
| `q02RHiexlcTN1DdW` | `CRM_CAMPANA_CREAR` | `crm-campana-crear` |
| `GbIIzBAzgpG6ug8J` | `CRM_CAMPANAS_ELIMINAR` | `crm-campanas-eliminar` |
| `qMJXTfnWAELjUKzH` | `CRM_CAMPANA_ASIGNAR_OPERADORES` | `crm-campana-asignar-operadores` |
| `4wdrmem0wHWcvbzT` | `CRM_CAMPANA_UPDATE_FIX` | `crm-campana-update-fix` |
| `zQ50bbiT93UuQRfJ` | `CRM_CAMPANAS_V2` | `crm-campanas` |
| `BSJYrid3xAIVQat3` | `CRM_CALLBACKS_OPERADOR` | `crm-callbacks-operador` |
| `DU4BwjV9lf4Bk2DU` | `CRM_LLAMADA_ACTIVA_FIX` | `crm-llamada-activa` |
| `EWmFKMHx3slciElA` | `CRM_CARTERA_GET_V4` | `crm-cartera-get` |

> Note: many of these "orphans" actually ARE called by the frontend — the grep missed them due to dynamic path construction (e.g. `const path = modo === 'crear' ? 'crm-crear-usuario' : 'crm-editar-usuario'`). See the Missing from Registry section for the truly unregistered ones.

---

## Missing from registry

Webhook calls found in frontend code **that do NOT appear in `infraestructura.workflows_n8n`**. These need investigation: hardcoded URLs bypassing the registry, workflows missing from the sync, or documentation drift.

| Webhook path | Caller file(s) | Notes |
|---|---|---|
| `crm-login` | `src/modules/auth/Login.jsx` | Auth — critical path |
| `crm-verificar-2fa` | `src/modules/auth/Setup2FAScreen.jsx`, `Verify2FAScreen.jsx`, `SetupObligatorio2FAScreen.jsx` | Auth — critical path |
| `crm-callbacks-gestionar` | `src/components/dashboard/useCallbacksLogic.js` | Mutation: reschedule/cancel callbacks |
| `crm-lead-nota` | `src/modules/admin/leads/LeadRow.jsx` | |
| `crm-lead-freeze` / `crm-lead-unfreeze` | `src/components/dashboard/MisFreezeList.jsx` | Freeze/unfreeze actions via `action` param |
| `crm-campana-crear-desde-busqueda` | `src/modules/admin/campanas/CrearDesdeBusquedaModal.jsx` | |
| `crm-analisis-inteligente` | `src/modules/admin/campanas/AnalisisInteligentePanel.jsx` | |
| `crm-crear-campana-con-leads` | `src/modules/admin/campanas/AnalisisInteligentePanel.jsx` | |
| `crm-cliente-crear` | `src/modules/admin/cartera/NuevoClienteDrawer.jsx` | |
| `crm-interacciones-cliente` | `src/modules/admin/cartera/ClienteDrawer.jsx` | |
| `crm-interaccion-borrar` | `src/modules/admin/cartera/ClienteDrawer.jsx` | |
| `crm-interaccion-editar` | `src/modules/admin/cartera/RegistrarInteraccionModal.jsx` | |
| `crm-registrar-interaccion` | `src/modules/admin/cartera/RegistrarInteraccionModal.jsx` | |
| `crm-cliente-baja` | `src/modules/admin/cartera/tabs/TabFicha.jsx` | |
| `crm-cliente-proxima-accion` | `src/modules/admin/cartera/tabs/TabFicha.jsx` | |
| `crm-gbp-kpis` | `src/modules/admin/gbp/GbpDashboardPanel.jsx` | GBP dashboard |
| `crm-gbp-refresh` | `src/modules/admin/cartera/tabs/TabGbp.jsx` | |
| `crm-gbp-confirmar` | `src/modules/admin/cartera/tabs/TabGbp.jsx` | |
| `crm-gbp-validar` | `src/modules/admin/cartera/tabs/TabGbp.jsx` | |
| `crm-gbp-rescrape` | `src/modules/admin/cartera/tabs/TabGbp.jsx` | |
| `crm-contratos-cliente` | `src/modules/admin/cartera/tabs/TabContratos.jsx` | |
| `crm-contrato-actualizar` | `src/modules/admin/cartera/tabs/TabContratos.jsx` | |
| `crm-contrato-crear` | `src/modules/admin/cartera/tabs/TabContratos.jsx` | |
| `crm-70-post-contrato-digital` | `src/modules/admin/facturacion/ProformasPanel.jsx` | |
| `crm-72-post-contrato-enviar` | `src/modules/admin/facturacion/ProformasPanel.jsx` | |
| `crm-75-post-contrato-email` | `src/modules/admin/facturacion/ProformasPanel.jsx` | |
| `crm-tarjeta-get` | `src/modules/admin/cartera/tabs/TabTarjetaDigital.jsx` | |
| `crm-facturas` | `src/modules/admin/facturacion/FacturasPanel.jsx` | |
| `crm-facturas-get` | `src/modules/admin/facturacion/ClientesPanel.jsx`, `cartera/tabs/facturacion/FacturasSection.jsx` | |
| `crm-factura-generar` | `src/modules/admin/facturacion/ProformasPanel.jsx`, `ClientesPanel.jsx` | |
| `crm-factura-generar-pdf` | `src/modules/admin/facturacion/FacturasPanel.jsx` | |
| `crm-factura-enviar-wa` | `src/modules/admin/facturacion/FacturasPanel.jsx` | |
| `crm-factura-enviar-email` | `src/modules/admin/facturacion/FacturasPanel.jsx` | |
| `crm-pago-cobrar` | `src/modules/admin/facturacion/FacturasPanel.jsx`, `cartera/tabs/facturacion/FacturasSection.jsx` | |
| `crm-proforma-crear` | `src/modules/admin/facturacion/ProformaModal.jsx` | |
| `crm-proforma-linea` | `src/modules/admin/facturacion/ProformaModal.jsx` | |
| `crm-proforma-borrar` | `src/modules/admin/facturacion/ProformaModal.jsx` | |
| `crm-pagos-generar` | `src/modules/admin/facturacion/ProformaModal.jsx` | |
| `crm-proforma-verificar` | `src/modules/admin/facturacion/ProformasPanel.jsx`, `ClientesPanel.jsx` | |
| `crm-proforma-reabrir` | `src/modules/admin/facturacion/ProformasPanel.jsx`, `ClientesPanel.jsx` | |
| `crm-renovaciones` | `src/modules/admin/facturacion/RenovacionesPanel.jsx` | |
| `crm-gestor-enviar-lote` | `src/modules/admin/facturacion/GestoriaPanel.jsx` | |
| `crm-operador-kpi-live` | `src/components/dashboard/useKpiStripLogic.js` | |
| `crm-productos` | `src/modules/admin/facturacion/ProformaModal.jsx` | |
| `crm-resultado-entrenamiento` | `src/components/dashboard/OperatorDashboard.jsx`, `EntrenamientoPanel.jsx` | |
| `crm-panel-supervisor` | `src/modules/entrenamiento/SupervisorPanel.jsx` | |
| `crm-evaluar-sesion` | `src/modules/entrenamiento/SupervisorPanel.jsx` | |
| `crm-reset-entrenamiento` | `src/modules/entrenamiento/SupervisorPanel.jsx` | |
| `crm-reputacion-lead` | `src/components/dashboard/zones/ReputacionTab.jsx` | |
| `crm-update-lead` | `src/modules/admin/leads/LeadRow.jsx`, `LeadLandingRow.jsx` | |
| `crm-leads-landing` | `src/modules/admin/leads/LeadsLandingPanel.jsx` | |
| `crm-distribuidor-huerfanos` | `src/modules/admin/leads/AsignameUnLead.jsx` | |
| `crm-ventas` | `src/modules/admin/ventas/VentasPanel.jsx` | |
| `crm-venta-actualizar` | `src/modules/admin/ventas/VentaRow.jsx` | |
| `crm-backup-status` | `src/modules/admin/backup/useBackupOps.js` | |
| `crm-backup-restore` | `src/modules/admin/backup/useBackupOps.js` | |
| `crm-lead-freshness-config` | `src/modules/admin/agenda/FreshnessConfigCard.jsx` | |
| `crm-ausencia-gestiones` | `src/modules/admin/usuarios/UsuariosList.jsx` | Uses `N8N_GESTIONES_URL` base URL override |
| `crm-scraper-health` | `src/modules/admin/scraper/ScraperStatusPanel.jsx` | |
| `crm-scraper-config-get` | `src/modules/admin/scraper/useScraperConfig.js` | |
| `crm-scraper-config-update` | `src/modules/admin/scraper/useScraperConfig.js` | |
| `crm-admin-audit-get` | `src/modules/admin/auditoria/AdminAuditPanel.jsx` | |
| `crm-crear-usuario` / `crm-editar-usuario` | `src/modules/admin/usuarios/UsuariosList.jsx` | Dynamic path: `modo === 'crear' ? 'crm-crear-usuario' : 'crm-editar-usuario'` |
| `crm-auditoria-llamadas` | `src/modules/admin/auditoria/AuditoriaPanel.jsx` | Different from `CRM_AUDITORIA_LLAMADAS_FIX` (different path) |
| `crm-crear-campana-con-leads` | `src/modules/admin/campanas/AnalisisInteligentePanel.jsx` | |
| `crm-crear-campana` | `src/modules/admin/campanas/CampanasPanel.jsx` | Dynamic path (alias for `crm-campanas-crear`) |
| `crm-registrar-interaccion` | `src/modules/admin/cartera/RegistrarInteraccionModal.jsx` | Multiple interaction mutations |

---

## External endpoints (not n8n CRM webhooks)

### SCRAPER_GO

| Field | Value |
|---|---|
| Service | Go Monitor Engine (`:8092`), not n8n |
| Webhook URL | `POST http://localhost:8092/webhook/scraper/go` (configured via `VITE_REPUTATION_API_URL`) |
| Auth | none |
| Used in | `src/services/reputationService.js` |

**Request body:**
```json
{
  "q": "string (business name)",
  "depth": 3
}
```

**Response body:** reputation data (Go scraper response, shape varies)

> Note: This bypasses n8n entirely. Used for GBP reputation lookups. The Go monitor runs on port 8092 and is called directly by the frontend.

---

## Notes

- **Dynamic path construction**: some webhooks use ternary logic (`modo === 'crear' ? 'crm-crear-usuario' : 'crm-editar-usuario'`). Grep captures both branches.
- **baseUrl overrides**: `crm-ausencia-gestiones` uses `N8N_GESTIONES_URL` (different n8n instance). `crm-cliente-proxima-accion`, `crm-contratos-cliente`, etc. use `n8nUrl` variable override (likely for a separate n8n install).
- **URL conflict**: `crm-registrar-resultado` resolves to two different workflow IDs (`CRM_REGISTRAR_RESULTADO` = `6x0x8DCOBzZf62K6` and `CRM_02_REGISTRAR_RESULTADO_V2` = `CRM02RESULTv2vps`). One may be a legacy alias.
- **Registry sync**: 64 active webhook workflows in registry; 58+ unique webhook paths called from frontend. Many registry entries that appear as "orphans" are actually used via `useN8nQuery`/`useN8nMutation` hooks but were not captured by the static grep due to dynamic path assembly.
