# 2026-08-17-ciclo-facturacion-nuevo

## Why

The `contrato → proforma → factura` cycle has no explicit guardrails for the **gestor de la ficha** (the email point of contact per cliente). Every send operation (contrato, proforma, factura) needs a gestor assigned — without one, sending silently fails or hits a wrong address. There is no lifecycle state on `proformas` to distinguish `borrador` (empty) from `rellenada` (gestor finished) from `enviada` (PDF emailed). No log of when a cliente asks for an invoice. `CRM_FACTURA_GENERAR` ignores whether the source contract was signed. The WhatsApp send button (`ProformasSection.jsx:300-305`) is orphaned — the WhatsApp channel no longer exists.

All communications go through the gestor via **email only** — no direct client portal, no WhatsApp. The ciclo is:

1. Cliente created with `gestor_id` assigned.
2. Contrato digital created → sent to GESTOR.
3. Cliente firma off-system (email reply, DocuSign, etc.).
4. Operator marks contrato as `firmado` in the system.
5. Proforma(s) created manually (operator) — empty initially.
6. Gestor fills proforma line by line (products, may include discounts).
7. Proforma marked `rellenada` → sent to GESTOR (PDF email).
8. Cliente contacts admin asking for invoice.
9. Admin marks `solicitud_factura_at` → generates factura from proforma.
10. Factura sent to GESTOR.

If `clientes.gestor_id IS NULL` at any send step, a reusable `<FaltaGestorModal />` blocks the action and CTAs the operator to assign one.

## What Changes

### Schema (PostgreSQL on VPS)

**`clientes.proformas`** — additions:
- `contrato_id integer REFERENCES clientes.contratos(id)` — nullable, indexed (proforma may exist without contract; needed for firma guard)
- `solicitud_factura_at timestamp without time zone` — when cliente asked for invoice
- `solicitada_por_user_id integer REFERENCES auth.users(id)` — admin who logged the request
- Extend `estado` CHECK to add `'rellenada'` and `'enviada'`

**`clientes.contratos`** — additions (signature state, orthogonal to lifecycle estado):
- `pre_firmado boolean DEFAULT false`
- `firmado boolean DEFAULT false`
- `pre_firmado_at timestamp without time zone`
- `firmado_at timestamp without time zone`

**`clientes.facturas`** — extend `estado` CHECK:
- Add `'pendiente_envio'` (factura created, not yet emailed)
- Add `'enviada'` (PDF emailed to gestor)

**`clientes.gestor_id`** — **NO schema change**. Column already exists (`integer`); 18 frontend files already reference the concept. The work is to *enforce* presence at the 3 send points, not to add the column.

### Workflows (n8n VPS)

| Action | Workflow | Notes |
|---|---|---|
| NEW | `CRM_CONTRATO_PREFIRMAR` | Sets `pre_firmado=true`, `pre_firmado_at=now` |
| NEW | `CRM_CONTRATO_FIRMAR` | Sets `firmado=true`, `firmado_at=now`; idempotent (re-fire = no-op) |
| MODIFY | `CRM_72_POST_CONTRATO_ENVIAR` | Add pre-check `clientes.gestor_id IS NOT NULL`; respond 409 `GESTOR_MISSING` if null |
| MODIFY | `CRM_FACTURA_GENERAR` | Add firma guard: if proforma has `contrato_id` AND `contratos.firmado=false`, respond 409 `CONTRATO_NO_FIRMADO` (defense in depth, bypass for `origen='legacy'`) |
| NEW | `CRM_PROFORMA_ENVIAR` | Pre-check gestor_id; generates PDF; emails to gestor; sets `proforma.estado='enviada'` |
| NEW | `CRM_FACTURA_ENVIAR` | Pre-check gestor_id; generates PDF; emails to gestor; sets `factura.estado='enviada'` |
| EXISTING (no change) | `CRM_19_POST_PROFORMA`, `CRM_PROFORMA_CONSOLIDAR`, `CRM_70_POST_CONTRATO_DIGITAL` | Reused as-is |

**Out of scope for this change**: `CRM_AUTO_CREATE_PROFORMA_FROM_CONTRATO` is **NOT** created. The user explicitly wants proforma creation to be manual, not auto-triggered by firma.

### Frontend (React 19 + Vite + Tailwind v4)

**REMOVE**:
- WhatsApp button at `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx:300-305` (channel gone)

**ADD atoms/organisms**:
- `<FaltaGestorModal />` — reusable across 3 send operations. CTA: "Asignar gestor ahora" → opens cliente edit drawer.
- `PrefirmarButton`, `FirmarButton` — for ContratosSection / ClienteDrawer (mark firma state)
- `SendContratoButton`, `SendProformaButton`, `SendFacturaButton` — pre-check gestor_id, open modal if missing
- `ConsolidarButton` — UI for existing `CRM_PROFORMA_CONSOLIDAR`
- `SolicitarFacturaButton` — admin-only, marks `proforma.solicitud_factura_at` when cliente calls
- Lifecycle badges for proforma (`borrador | rellenada | enviada`) and factura (`pendiente_envio | enviada`)

**MODIFY**:
- `ProformasSection.jsx`, `ProformasPanel.jsx`, `FacturaViewer.jsx`, `ClienteDrawer.jsx` — wire new buttons, badges, modals

### Operational model

Per-client import: user provides cliente data + proformas + facturas via chat; executor loads each one into the system via API/SQL. Each client is its own micro-task (no formal SDD per-client ceremony).

## Impact

- **Operators**: clearer lifecycle (no more "what state is this proforma in?"), guard rails prevent silent failures, fewer manual checks
- **Admin**: new controls (Prefirmar/Firmar, Solicitar factura, explicit Send actions)
- **Clientes**: no direct system access; all comms via email to gestor
- **Data**: 2 new timestamps on proforma, 2 lifecycle extensions on proforma/factura estados, 4 new columns on contratos
- **Email infrastructure**: existing `CRM_72_POST_CONTRATO_ENVIAR` already sends emails; `CRM_PROFORMA_ENVIAR` and `CRM_FACTURA_ENVIAR` follow the same pattern

## Out of Scope

- **VeriFactu/AEAT** (`2026-08-13-verifactu-mock-mode` — separate change, STANDBY)
- **Legacy migration** (`2026-08-13-legacy-facturacion-migration` — separate change, parked)
- **Cliente drawer redesign** (`2026-08-14-cliente-drawer-redesign` — separate change)
- **Auto-creating proforma from firma** (user explicitly wants manual; not in cycle)
- **DocuSign integration** for firma detection (manual workflow via Prefirmar/Firmar buttons is OK for v1)
- **WhatsApp channel** itself (already gone; only button removal in this change)
- **Email infrastructure work** (assumed to work; investigation needed in sdd-spec)

## Open Questions

- **Q1**: How does `CRM_72_POST_CONTRATO_ENVIAR` send email today? SMTP creds, webhook, or other? Need to replicate for proforma/factura.
- **Q2**: Where does PDF generation happen for proforma/factura? Existing infra or new? (Already exists for some facturacion PDFs per the legacy change.)
- **Q3**: Should `CRM_CONTRATO_FIRMAR` accept a firma PDF upload as proof, or just be a state marker?
- **Q4**: Should "Solicitar factura" button auto-transition proforma to `rellenada`, or only log the timestamp?
- **Q5**: When contrato is re-firmado (rare), should `proforma.solicitud_factura_at` be reset? Probably no (idempotent).

## Architecture Decisions

- **AD-1**: Validation lives in BOTH frontend (modal UX) AND backend (409 guard). Two-layer, defense in depth. UX guides the operator; backend is the legal safety net.
- **AD-2**: `<FaltaGestorModal />` is a SHARED organism used by all 3 send buttons. Pattern: each send button invokes workflow → if response is 409 `GESTOR_MISSING` → open modal with CTA "Asignar gestor ahora".
- **AD-3**: Send workflows are SEPARATE (not extending existing CRUD). `CRM_CONTRATO_ENVIAR` is already separate as `CRM_72_POST_CONTRATO_ENVIAR`; `CRM_PROFORMA_ENVIAR` and `CRM_FACTURA_ENVIAR` follow the same pattern. Keeps send concerns decoupled.
- **AD-4**: Firma state on contrato is ORTHOGONAL to lifecycle estado. New boolean columns, not extending the lifecycle CHECK constraint. A contract can be `aceptado` AND `firmado` simultaneously.
- **AD-5**: Proforma is created MANUALLY (not auto from firma). Operator creates empty proforma after contrato is sent. Proforma is filled by gestor. User explicitly chose this over automation.
- **AD-6**: Per-client import is OPERATIONAL (no SDD ceremony per client). After this change ships, user provides each cliente + proformas + facturas via chat, executor loads via API.