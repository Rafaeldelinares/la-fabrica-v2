# Ciclo Facturación — 2026-08-17-ciclo-facturacion-nuevo

## Purpose

The `billing-cycle` capability governs the `contrato → proforma → factura` lifecycle with explicit gestor-validated send operations, manual proforma creation, signature state markers, and a two-layer guard that prevents generating invoices from unsigned contracts.

## Key Definitions

| Term | Meaning |
|------|---------|
| `borrador` (proforma) | Empty; operator just created it |
| `rellenada` (proforma) | Gestor finished filling line items |
| `enviada` (proforma) | PDF emailed to gestor |
| `pendiente_envio` (factura) | Factura created, not yet emailed |
| `enviada` (factura) | PDF emailed to gestor |
| `pre_firmado` | Contract marked as pre-signed by operator |
| `firmado` | Contract marked as signed by operator (terminal) |

All communications go through the **gestor** via **email only** — no direct client portal, no WhatsApp.

> **Note on `'generada'` (factura)**: the conceptual intermediate state where the PDF has been rendered and the email queued is **transient within the `CRM_FACTURA_ENVIAR` workflow** and is **NOT persisted to the DB**. The persisted lifecycle is `pendiente_envio → enviada`. If a future need arises to persist this state (e.g., to retry failed sends), the DB CHECK must be extended at that time.

---

## Schema Requirements

---

### Requirement: REQ-001 — Proforma ↔ Contract Link

The system MUST support proformas that exist independently of contracts (legacy imports, manual creation). The link from proforma to its originating contract is nullable.

The system SHALL add to `clientes.proformas`:
- `contrato_id integer REFERENCES clientes.contratos(id)` — nullable, indexed

#### Scenario: Proforma without contract (legacy / manual)

- GIVEN a proforma created with `origen = 'legacy'` or via manual operator creation
- WHEN no contract is associated
- THEN `contrato_id` remains NULL
- AND the proforma is queryable via `SELECT * FROM proformas WHERE contrato_id IS NULL`

#### Scenario: Proforma linked to contract

- GIVEN an operator creates a proforma linked to a contract
- WHEN the proforma row is inserted with `contrato_id = X`
- THEN the FK constraint is satisfied
- AND queries can JOIN proformas to contratos on `contrato_id`

---

### Requirement: REQ-002 — Signature State on Contracts

Contract lifecycle `estado` (`pendiente`, `enviado`, `aceptado`, etc.) is **orthogonal** to signature state. The two axes MUST NOT be conflated in the CHECK constraint.

The system SHALL add to `clientes.contratos`:
- `pre_firmado boolean DEFAULT false`
- `pre_firmado_at timestamp without time zone`
- `firmado boolean DEFAULT false`
- `firmado_at timestamp without time zone`

#### Scenario: New contract starts unsigned

- GIVEN a contract created via `CRM_70_POST_CONTRATO_DIGITAL`
- WHEN it is first saved
- THEN `pre_firmado = false`, `firmado = false`
- AND `pre_firmado_at = NULL`, `firmado_at = NULL`

#### Scenario: Prefirmar updates signature state idempotently

- GIVEN a contract with `pre_firmado = false`
- WHEN `CRM_CONTRATO_PREFIRMAR` is invoked with `{ contrato_id }`
- THEN `pre_firmado` is set to `true`
- AND `pre_firmado_at` is set to `NOW()`
- AND `estado` is **unchanged**
- AND re-calling is idempotent (no duplicate timestamp update)

#### Scenario: Firmar updates signature state idempotently

- GIVEN a contract with `firmado = false`
- WHEN `CRM_CONTRATO_FIRMAR` is invoked with `{ contrato_id }`
- THEN `firmado` is set to `true`
- AND `firmado_at` is set to `NOW()`
- AND `estado` is **unchanged**
- AND re-calling is idempotent (no duplicate timestamp update)

---

### Requirement: REQ-003 — Proforma Lifecycle Extension

The system MUST distinguish three states of a proforma: empty (`borrador`), filled by gestor (`rellenada`), and emailed to gestor (`enviada`).

The system SHALL extend the `clientes.proformas.estado` CHECK constraint to add `'rellenada'` and `'enviada'`.

#### Scenario: Proforma starts as borrador

- GIVEN an operator creates a new proforma via `ModalNuevaProforma`
- WHEN it is saved empty
- THEN `estado = 'borrador'`
- AND `solicitud_factura_at = NULL`

#### Scenario: Proforma transitions to rellenada after gestor edits

- GIVEN a proforma with `estado = 'borrador'`
- WHEN gestor finishes filling line items and saves
- THEN `estado` is set to `'rellenada'`
- AND no email is sent at this step

#### Scenario: Proforma transitions to enviada after email send

- GIVEN a proforma with `estado = 'rellenada'`
- WHEN `CRM_PROFORMA_ENVIAR` succeeds
- THEN `estado` is set to `'enviada'`
- AND the PDF is emailed to the gestor

---

### Requirement: REQ-004 — Factura Lifecycle Extension

The system MUST distinguish invoice states: created but not emailed (`pendiente_envio`), and emailed to gestor (`enviada`).

The system SHALL extend the `clientes.facturas.estado` CHECK constraint to add `'pendiente_envio'` and `'enviada'`.

#### Scenario: Factura starts as pendiente_envio

- GIVEN `CRM_FACTURA_GENERAR` creates a factura from a proforma
- WHEN the factura row is inserted
- THEN `estado = 'pendiente_envio'`
- AND `enviada_at = NULL`

#### Scenario: Factura transitions to enviada after email send

- GIVEN a factura with `estado = 'pendiente_envio'`
- WHEN `CRM_FACTURA_ENVIAR` succeeds
- THEN `estado` is set to `'enviada'`
- AND `enviada_at` is set to `NOW()`
- AND the PDF is emailed to the gestor

---

### Requirement: REQ-005 — Solicitud Factura Logging

The system MUST log when a cliente asks for an invoice, and which admin logged the request. This is **not** a state transition.

The system SHALL add to `clientes.proformas`:
- `solicitud_factura_at timestamp without time zone`
- `solicitada_por_user_id integer REFERENCES auth.usuarios(id)` — CRM users table uses Spanish naming; filter `WHERE rol='admin' AND estado='activo'` for gestores

#### Scenario: Admin logs solicitud_factura_at on cliente request

- GIVEN an admin receives a phone call from a cliente asking for an invoice
- WHEN the admin clicks `SolicitarFacturaButton` on the proforma
- THEN `solicitud_factura_at = NOW()`
- AND `solicitada_por_user_id = current_user.id`
- AND `estado` is **unchanged** (NOT set to `rellenada`)

#### Scenario: SolicitarFacturaButton is idempotent

- GIVEN a proforma with `solicitud_factura_at = '2026-08-10 14:00'`
- WHEN `SolicitarFacturaButton` is clicked again
- THEN `solicitud_factura_at` is **not** overwritten (unchanged)

---

## Workflow Requirements

---

### Requirement: REQ-006 — CRM_CONTRATO_PREFIRMAR

The system MUST provide a dedicated workflow to mark a contract as pre-signed.

`CRM_CONTRATO_PREFIRMAR` (NEW) SHALL:
1. Accept `{ contrato_id }` as input
2. Validate `contrato_id` is a positive integer
3. Set `pre_firmado = true`, `pre_firmado_at = NOW()` (idempotent)
4. Return `{ ok: true, contrato }`

#### Scenario: Happy path — pre-firmar succeeds

- GIVEN a contract with `pre_firmado = false`
- WHEN `CRM_CONTRATO_PREFIRMAR` is called with `{ contrato_id: X }`
- THEN `pre_firmado` becomes `true`
- AND `pre_firmado_at` is set to the current timestamp
- AND response is `{ ok: true, contrato: { id, pre_firmado, pre_firmado_at } }`

#### Scenario: Invalid contrato_id

- GIVEN an invalid `contrato_id` (non-numeric, negative, zero)
- WHEN `CRM_CONTRATO_PREFIRMAR` is called
- THEN response is HTTP 400 `{ ok: false, error: 'invalid_contrato_id' }`

---

### Requirement: REQ-007 — CRM_CONTRATO_FIRMAR

The system MUST provide a dedicated workflow to mark a contract as signed. This is **NOT** auto-proforma creation.

`CRM_CONTRATO_FIRMAR` (NEW) SHALL:
1. Accept `{ contrato_id }` as input
2. Validate `contrato_id`
3. Set `firmado = true`, `firmado_at = NOW()` (idempotent)
4. Return `{ ok: true, contrato }`

#### Scenario: Happy path — firmar succeeds

- GIVEN a contract with `firmado = false`
- WHEN `CRM_CONTRATO_FIRMAR` is called with `{ contrato_id: X }`
- THEN `firmado` becomes `true`
- AND `firmado_at` is set to the current timestamp
- AND response is `{ ok: true, contrato: { id, firmado, firmado_at } }`

#### Scenario: Re-firmar is idempotent

- GIVEN a contract with `firmado = true`, `firmado_at = '2026-08-01 10:00'`
- WHEN `CRM_CONTRATO_FIRMAR` is called again
- THEN `firmado_at` is **not** updated (remains the original timestamp)
- AND response is still `{ ok: true }`

---

### Requirement: REQ-008 — CRM_72_POST_CONTRATO_ENVIAR Gestor Guard

`CRM_72_POST_CONTRATO_ENVIAR` (MODIFIED) SHALL add a pre-check for `gestor_id` presence before recording the send.

The MODIFIED workflow SHALL:
1. Accept `{ contrato_id }` as input
2. Query `clientes` to find the `gestor_id` for the contrato's `cliente_id`
3. If `gestor_id IS NULL`, respond HTTP 409 `{ ok: false, error: 'GESTOR_MISSING', message: '...' }`
4. Otherwise proceed with existing behavior (mark contrato as `enviado`)

#### Scenario: Send blocked — no gestor assigned

- GIVEN a contrato whose `cliente.gestor_id IS NULL`
- WHEN `CRM_72_POST_CONTRATO_ENVIAR` is called with `{ contrato_id: X }`
- THEN response is HTTP 409
- AND `error = 'GESTOR_MISSING'`
- AND no `estado` change occurs

#### Scenario: Send proceeds — gestor is assigned

- GIVEN a contrato whose `cliente.gestor_id = 5`
- WHEN `CRM_72_POST_CONTRATO_ENVIAR` is called
- THEN existing behavior proceeds (estado → `enviado`)

---

### Requirement: REQ-009 — CRM_PROFORMA_ENVIAR

The system MUST provide a workflow to email a proforma PDF to the gestor.

`CRM_PROFORMA_ENVIAR` (NEW) SHALL:
1. Accept `{ proforma_id }` as input
2. Validate `proforma_id`
3. Query the proforma and resolve its `cliente.gestor_id`
4. If `gestor_id IS NULL`, respond HTTP 409 `{ ok: false, error: 'GESTOR_MISSING' }`
5. Generate PDF (same pattern as existing factura PDF generation)
6. Email PDF to the gestor's email address
7. Set `proforma.estado = 'enviada'`
8. Return `{ ok: true, proforma: { id, estado } }`

#### Scenario: Happy path — proforma sent to gestor

- GIVEN a proforma with `estado = 'rellenada'` and `cliente.gestor_id = 7`
- WHEN `CRM_PROFORMA_ENVIAR` is called with `{ proforma_id }`
- THEN PDF is generated and emailed to gestor
- AND `estado` becomes `'enviada'`

#### Scenario: Send blocked — gestor missing

- GIVEN a proforma with `cliente.gestor_id IS NULL`
- WHEN `CRM_PROFORMA_ENVIAR` is called
- THEN HTTP 409 `{ error: 'GESTOR_MISSING' }`
- AND `estado` is **unchanged**

---

### Requirement: REQ-010 — CRM_FACTURA_ENVIAR

The system MUST provide a workflow to email a factura PDF to the gestor.

`CRM_FACTURA_ENVIAR` (NEW) SHALL:
1. Accept `{ factura_id }` as input
2. Validate `factura_id`
3. Resolve `factura.cliente.gestor_id`
4. If `gestor_id IS NULL`, respond HTTP 409 `{ ok: false, error: 'GESTOR_MISSING' }`
5. Generate PDF (reuse existing factura PDF generation infrastructure)
6. Email PDF to the gestor's email address
7. Set `factura.estado = 'enviada'`
8. Return `{ ok: true, factura: { id, estado } }`

#### Scenario: Happy path — factura sent to gestor

- GIVEN a factura with `estado = 'pendiente_envio'` and `cliente.gestor_id = 7`
- WHEN `CRM_FACTURA_ENVIAR` is called with `{ factura_id }`
- THEN PDF is emailed to gestor
- AND `estado` becomes `'enviada'`

#### Scenario: Send blocked — gestor missing

- GIVEN a factura with `cliente.gestor_id IS NULL`
- WHEN `CRM_FACTURA_ENVIAR` is called
- THEN HTTP 409 `{ error: 'GESTOR_MISSING' }`

---

### Requirement: REQ-011 — CRM_FACTURA_GENERAR Firma Guard

`CRM_FACTURA_GENERAR` (MODIFIED) SHALL add a defense-in-depth guard that prevents generating invoices from proformas whose linked contract is not signed.

The MODIFIED workflow SHALL, before inserting the factura:
1. Check if the proforma has `contrato_id IS NOT NULL`
2. If YES, query the linked contract's `firmado` state
3. If `firmado = false` and `origen != 'legacy'`, respond HTTP 409 `{ ok: false, error: 'CONTRATO_NO_FIRMADO', message: '...' }`
4. If `origen = 'legacy'`, bypass the guard (legacy proformas are not bound to this rule)

#### Scenario: Normal proforma — contract not firmado, backend rejects

- GIVEN a proforma with `origen = 'normal'`, `contrato_id = X`
- AND `contratos.firmado = false`
- WHEN `CRM_FACTURA_GENERAR` is invoked
- THEN HTTP 409 `{ error: 'CONTRATO_NO_FIRMADO' }`
- AND no factura row is created

#### Scenario: Normal proforma — contract firmado, proceeds

- GIVEN a proforma with `origen = 'normal'`, `contrato_id = X`
- AND `contratos.firmado = true`
- WHEN `CRM_FACTURA_GENERAR` is invoked
- THEN the factura is created (existing behavior)

#### Scenario: Legacy proforma bypasses guard

- GIVEN a proforma with `origen = 'legacy'`
- AND its linked contract has `firmado = false`
- WHEN `CRM_FACTURA_GENERAR` is invoked
- THEN the factura is created (guard bypassed)

---

## Frontend Requirements

---

### Requirement: REQ-012 — Remove WhatsApp Send Button

The WhatsApp send button (`MessageCircle` icon, `showMsgWa`) at `ProformasSection.jsx:300-305` MUST be removed. The WhatsApp channel is no longer in use.

#### Scenario: WhatsApp button no longer rendered

- GIVEN the current `ProformasSection.jsx` (lines 300-305)
- WHEN this change is deployed
- THEN the `MessageCircle` ActionIcon block is removed
- AND no call to `crm-72-post-contrato-enviar` from the WhatsApp button exists

---

### Requirement: REQ-013 — FaltaGestorModal Component

The system MUST provide a reusable `<FaltaGestorModal />` organism used by all three send buttons (contrato, proforma, factura) to guide the operator when a gestor is missing.

`<FaltaGestorModal />` SHALL:
- Display when a 409 `GESTOR_MISSING` response is received
- Show a clear message that the cliente has no gestor assigned
- Provide CTA "Asignar gestor ahora" that opens the cliente edit drawer
- Be dismissible without taking action

#### Scenario: Operator clicks Send without gestor — modal appears

- GIVEN a cliente with `gestor_id = NULL`
- WHEN the operator clicks `SendContratoButton` (or SendProformaButton, SendFacturaButton)
- AND the workflow returns 409 `GESTOR_MISSING`
- THEN `<FaltaGestorModal />` is displayed
- AND the send action is blocked until modal is dismissed

---

### Requirement: REQ-014 — Prefirmar / Firmar Buttons

The system MUST provide `PrefirmarButton` and `FirmarButton` in ContratosSection and ClienteDrawer.

#### Scenario: PrefirmarButton calls CRM_CONTRATO_PREFIRMAR

- GIVEN a contract with `pre_firmado = false`
- WHEN the operator clicks `PrefirmarButton`
- THEN `CRM_CONTRATO_PREFIRMAR` is called with `{ contrato_id }`
- AND the contract badge updates to show `pre-firmado` state

#### Scenario: FirmarButton calls CRM_CONTRATO_FIRMAR

- GIVEN a contract with `firmado = false`
- WHEN the operator clicks `FirmarButton`
- THEN `CRM_CONTRATO_FIRMAR` is called with `{ contrato_id }`
- AND the contract badge updates to show `firmado` state

---

### Requirement: REQ-015 — SendContrato / SendProforma / SendFactura Buttons

Each send button SHALL invoke its respective workflow and handle the 409 `GESTOR_MISSING` response by opening `<FaltaGestorModal />`.

#### Scenario: SendProformaButton succeeds

- GIVEN a proforma with `estado = 'rellenada'` and `cliente.gestor_id IS NOT NULL`
- WHEN the operator clicks `SendProformaButton`
- THEN `CRM_PROFORMA_ENVIAR` is called
- AND `estado` updates to `'enviada'`
- AND a success indicator is shown

---

### Requirement: REQ-016 — ConsolidarButton

The system MUST provide a `ConsolidarButton` as the UI entry point for the existing `CRM_PROFORMA_CONSOLIDAR` workflow.

#### Scenario: Operator consolidates 2+ proformas

- GIVEN 2 or more proformas for the same `cliente_id` with no `proforma_padre_id`
- WHEN the operator selects them and clicks `ConsolidarButton`
- THEN `CRM_PROFORMA_CONSOLIDAR` is called with `{ proforma_ids: [id1, id2] }`

---

### Requirement: REQ-017 — SolicitarFacturaButton

The system MUST provide `SolicitarFacturaButton` (admin-only) that logs the invoice request without changing the proforma state.

#### Scenario: Admin clicks SolicitarFacturaButton

- GIVEN a proforma with `solicitud_factura_at = NULL`
- WHEN an admin clicks `SolicitarFacturaButton`
- THEN `solicitud_factura_at = NOW()`
- AND `solicitada_por_user_id = current_user.id`
- AND `estado` is **not** changed to `'rellenada'`

---

### Requirement: REQ-018 — Lifecycle Badges

The system MUST display lifecycle badges for proforma and factura states in their respective sections.

#### Scenario: Proforma badge reflects estado

- GIVEN a proforma with `estado = 'borrador'`
- WHEN `ProformasSection` renders the proforma row
- THEN a badge shows `borrador` (grey)
- AND when `estado = 'rellenada'`, badge shows `rellenada` (amber)
- AND when `estado = 'enviada'`, badge shows `enviada` (green)

#### Scenario: Factura badge reflects estado

- GIVEN a factura with `estado = 'pendiente_envio'`
- WHEN `FacturasSection` renders the factura row
- THEN a badge shows `pendiente_envio` (grey)
- AND when `estado = 'enviada'`, badge shows `enviada` (green)

---

## Operational Model

---

### Requirement: REQ-019 — Per-Client Import via Chat

The system does not provide a bulk-import UI. Per-client data loading is an operational task performed by the executor via chat.

- User provides cliente data + proformas + facturas via chat
- Executor loads each client via n8n workflows (`CRM_CONTRATO_CREAR`, `CRM_19_POST_PROFORMA`, `CRM_FACTURA_GENERAR`)
- Each client is a micro-task; no formal SDD ceremony per client
- This is out-of-scope as a deliverable; it is documented as the operational model

---

## Architecture Decisions

---

### Requirement: REQ-020 — AD-1: Two-Layer Validation (Defense in Depth)

Validation MUST exist in BOTH the frontend (modal UX) AND the backend (409 guard). The two layers are independent and both MUST be implemented.

- **Layer 1 (Frontend)**: `<FaltaGestorModal />` blocks the operator before sending, guides them to assign a gestor
- **Layer 2 (Backend)**: Workflow returns HTTP 409 `GESTOR_MISSING` if `gestor_id IS NULL` at send time

#### Scenario: Frontend modal shown AND backend guard fires

- GIVEN a cliente with `gestor_id = NULL`
- WHEN the operator clicks send from the frontend
- THEN Layer 1 (modal) appears immediately (pre-check in UI)
- AND if operator bypasses UI pre-check and calls workflow directly
- THEN Layer 2 (backend 409) fires

---

### Requirement: REQ-021 — Reenviar Documento al Gestor (Copy on Demand)

The system MUST allow the gestor of a client to obtain a copy of any document associated with that client (proforma, factura, or contrato) sent to their own email, on demand and outside the ciclo normal de envío.

**Context (operational)**: When a client is created during testing, it is initially assigned to the testing admin user. After testing, the client is reassigned to the proper gestor (admin user responsible for the ficha). The gestor must be able to retrieve a copy of any document for any client assigned to them, independently of the ciclo normal (i.e., without re-triggering the original send event).

**Behavior**:
- (a) A button/icon MUST be available for each document row in the proformas / facturas / contratos lists, labeled "Reenviar al gestor" (or equivalent).
- (b) When clicked, the system MUST generate the document PDF (using the same template and workflow logic as the original send) and email it to `clientes.gestor_id` resolved against `auth.usuarios.email`.
- (c) The trigger is **idempotent and independent of the ciclo**: clicking "Reenviar" does NOT modify document state (does not change `proforma.estado`, does not log timeline event, does not affect factura/contrato estado).
- (d) The reenvío MUST be logged in `public.timeline_global` with `tipo_evento='DOCUMENTO_REENVIADO'` and `subtipo_resultado='gestor'` so the gestor can audit their own copy requests.
- (e) A new workflow `CRM_DOCUMENTO_REENVIAR` MUST be created (or the existing `CRM_*_ENVIAR` workflows reused with a `?origen=reenvio` query param) to centralize the reenvío logic.

**Frontend atoms** (new):
- `<ReenviarCopiaButton tipo="proforma" id={id} />`
- `<ReenviarCopiaButton tipo="factura" id={id} />`
- `<ReenviarCopiaButton tipo="contrato" id={id} />`

**Design decisions**:
- Email recipient: `clientes.gestor_id` user email (not current logged-in user), so the system correctly handles the case of a supervisor triggering on behalf of the assigned gestor.
- Authentication: the trigger MUST be done by a user with `rol='admin'` in `auth.usuarios` (gated by the existing auth context).
- Idempotency: multiple reenvíos to the same email are allowed and each is logged separately.

#### Scenario: Gestor requests a copy of an old proforma

- GIVEN a cliente assigned to gestor_id=X
- AND a proforma with id=Y for that cliente
- WHEN the gestor clicks "Reenviar al gestor" on the proforma row
- THEN a new PDF is generated using the same template and data
- AND the PDF is emailed to X's email address
- AND a timeline event is created with `tipo_evento='DOCUMENTO_REENVIADO'`, `subtipo_resultado='proforma'`, `cliente_id=cliente_id`
- AND the original proforma `estado` is NOT changed

#### Scenario: Reenvío to a cliente with no gestor assigned

- GIVEN a cliente with `gestor_id = NULL`
- WHEN the operator (or any user) clicks "Reenviar al gestor"
- THEN the system MUST block the action with a clear error message ("El cliente no tiene gestor asignado; primero asigna uno")
- AND no email is sent

#### Scenario: Reenvío by a non-admin user (e.g., operario)

- GIVEN a user with `rol != 'admin'`
- WHEN the user attempts to reenviar
- THEN the system MUST block the action with a 403 (forbidden) response
- AND no email is sent
- AND the button is hidden in the frontend UI for non-admin roles

---

## Open Questions Resolved

| ID | Question | Resolution |
|----|----------|------------|
| Q3 | Should `CRM_CONTRATO_FIRMAR` accept a firma PDF upload? | **NO for v1** — only state marker. PDF upload deferred to v2 (DocuSign-style integration). |
| Q4 | Should "Solicitar factura" auto-transition proforma to `rellenada`? | **NO** — only logs `solicitud_factura_at`. Transition to `rellenada` happens when gestor finishes filling lines. |
| Q5 | When contrato is re-firmado, reset `solicitud_factura_at`? | **NO** — idempotent. Reset only if user explicitly marks solicitud as cancelled (out of scope for v1). |

---

## Out of Scope

- VeriFactu / AEAT (`2026-08-13-verifactu-mock-mode` — separate)
- Legacy migration UI (`2026-08-13-legacy-facturacion-migration` — separate)
- Cliente drawer redesign (`2026-08-14-cliente-drawer-redesign` — separate)
- Auto-creating proforma from firma (user explicitly wants **manual** creation)
- DocuSign / firma PDF upload for `CRM_CONTRATO_FIRMAR` (v1 is state marker only)
- WhatsApp channel itself (button removal only)
