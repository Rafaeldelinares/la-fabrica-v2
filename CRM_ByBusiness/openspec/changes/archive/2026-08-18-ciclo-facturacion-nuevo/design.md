# Design: ciclo-facturacion-nuevo

## Technical Approach

Two-layer guard (frontend modal + n8n 409) around the three send operations (contrato, proforma, factura) and a defense-in-depth firma guard on `CRM_FACTURA_GENERAR`. Schema adds firma state orthogonal to lifecycle estado, plus proforma/factura lifecycle extensions. Email goes through existing n8n SMTP infrastructure — emails land on the per-cliente `gestor` (an `auth.usuarios` row with `rol='admin'`), never on the cliente.

## Critical context corrections

Two discoveries change the design surface from what the spec assumed.

1. **Auth table is `auth.usuarios`, not `auth.users`.** Spanish naming. Columns: `id integer`, `email varchar NOT NULL`, `rol varchar NOT NULL DEFAULT 'operador'`, `estado varchar NOT NULL DEFAULT 'activo'`. Filter for admin: `WHERE rol = 'admin' AND estado = 'activo'`. `clientes.gestor_id` is `integer` referencing this table.
2. **`CRM_72_POST_CONTRATO_ENVIAR` is the WhatsApp send (inactive), not email.** The actual email send is `CRM_75_POST_CONTRATO_EMAIL` (also inactive). All `CRM_7x_POST_CONTRATO_*` workflows are currently inactive. The active gestror infrastructure is `CRM_GESTOR_ENVIOS_FINAL` (batch to third-party gestoría — **different concept** from per-cliente `gestor_id`).

**Naming reconciliation:** Spec says MODIFY `CRM_72_POST_CONTRATO_ENVIAR`. Since that workflow IS the WhatsApp send and the WhatsApp channel is gone (REQ-012), the cleanest path is: **repurpose the webhook `crm-72-post-contrato-enviar` as the new email-based send**, with a renamed workflow body. Alternatively, activate `CRM_75` as the new send. **Pick one — see Open Question 1.**

## Architecture Decisions

| # | Decision | Choice | Tradeoff |
|---|----------|--------|----------|
| AD-1 | Validation layers | Frontend modal + n8n 409 | Two implementations; both required (REQ-020) |
| AD-2 | Gestor email resolution | **PHP API resolves before calling n8n** (one SQL join on `clientes` × `auth.usuarios`), passes `gestor_email` as input | PHP API already controls the request — adds zero new infra. Caching deferred (cold path) |
| AD-3 | PDF generation | **n8n workflow generates the PDF (HTML→PDF via existing node)**, attaches to email | Mirrors existing `crm-factura-generar-pdf` pattern. PHP/frontend stays thin |
| AD-4 | Firma state | New boolean columns, NOT extending `estado` CHECK | Orthogonal axes (REQ-002); no migration of existing estado values |
| AD-5 | `CRM_72` repurposing | **Repurpose to email send** (see Q1) | Single webhook path; aligns with REQ-012 removal of WhatsApp button |
| AD-6 | `CRM_72` legacy invokers | **`ProformasSection.jsx:300-305` is the only live caller**; `ContratoDigitalSection.jsx:49` also calls but WhatsApp button is in the same component | After removal, `CRM_72` is orphaned — safe to repurpose |
| AD-7 | Frontend pre-check | Disabled-button state by `cliente.gestor_id` from the cliente query; do not block 409 race (server is authoritative) | Cheap UX, server-side guard remains |

## Data Flow (per-cliente send)

```
Operator clicks SendContratoButton
        │
        ▼
Frontend checks cliente.gestor_id
   ├─ NULL  → open <FaltaGestorModal />, abort
   └─ SET   → n8nPost('crm-72-post-contrato-enviar', { contrato_id })
                  │
                  ▼
              PHP API (or direct n8n webhook if no PHP layer):
                1. SELECT gestor.email FROM clientes JOIN auth.usuarios
                2. If NULL → 409 { ok: false, error: 'GESTOR_MISSING' }
                3. Generate PDF (HTML→PDF node)
                4. Send email via SMTP
                5. UPDATE contrato.estado='enviado'
                6. Respond { ok: true, contrato }
                  │
                  ▼
              Frontend updates UI (badge to 'enviado')
```

**Email is sent by the n8n workflow itself** (not by a separate PHP call) — pattern already proven by `crm-factura-enviar-email`. The "PHP API resolves email" step in the original prompt refers to n8n's built-in Code/SQL node doing the lookup, not an external PHP service.

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `openspec/changes/2026-08-17-ciclo-facturacion-nuevo/migrations/001_ciclo_facturacion.sql` | Create | 8 schema additions (see Migration) |
| n8n VPS: `CRM_CONTRATO_PREFIRMAR` (NEW) | Create | Webhook → Validate `contrato_id` → SQL `UPDATE … SET pre_firmado=true, pre_firmado_at=NOW() WHERE pre_firmado=false` → Respond |
| n8n VPS: `CRM_CONTRATO_FIRMAR` (NEW) | Create | Same pattern for `firmado`. Idempotent: only update if `firmado=false` |
| n8n VPS: `CRM_72_POST_CONTRATO_ENVIAR` (MODIFY) | Repurpose | Add gestor pre-check, PDF gen, email send, then existing estado update. If webhook reuse rejected (Q1): also activate `CRM_75` instead |
| n8n VPS: `CRM_PROFORMA_ENVIAR` (NEW) | Create | Validate `proforma_id` → gestor pre-check → PDF → email → `UPDATE estado='enviada'` |
| n8n VPS: `CRM_FACTURA_ENVIAR` (NEW) | Create | Same pattern for facturas, sets `estado='enviada'` + `enviada_at=NOW()` |
| n8n VPS: `CRM_FACTURA_GENERAR` (MODIFY) | Add guard | Before INSERT: if `proforma.contrato_id IS NOT NULL AND proforma.origen != 'legacy' AND contratos.firmado=false` → 409 `CONTRATO_NO_FIRMADO` |
| n8n VPS: `CRM_PROFORMA_SOLICITAR` (NEW, small) | Create | `UPDATE proformas SET solicitud_factura_at=NOW(), solicitada_por_user_id=$current_user_id WHERE id=$1 AND solicitud_factura_at IS NULL` (idempotent) |
| `src/shared/components/FaltaGestorModal.jsx` | Create | Reusable organism; props: `open, cliente, onAsignar, onClose` |
| `src/shared/components/sends/PrefirmarButton.jsx` | Create | Atom; calls `CRM_CONTRATO_PREFIRMAR` |
| `src/shared/components/sends/FirmarButton.jsx` | Create | Atom; calls `CRM_CONTRATO_FIRMAR` |
| `src/shared/components/sends/SendContratoButton.jsx` | Create | Atom; pre-check gestor_id; 409 → opens `FaltaGestorModal` |
| `src/shared/components/sends/SendProformaButton.jsx` | Create | Atom; same pattern, calls `CRM_PROFORMA_ENVIAR` |
| `src/shared/components/sends/SendFacturaButton.jsx` | Create | Atom; same pattern, calls `CRM_FACTURA_ENVIAR` |
| `src/shared/components/sends/ConsolidarButton.jsx` | Create | UI wrapper for `CRM_PROFORMA_CONSOLIDAR` (workflow exists) |
| `src/shared/components/sends/SolicitarFacturaButton.jsx` | Create | Admin-only; calls `CRM_PROFORMA_SOLICITAR` |
| `src/shared/components/badges/ProformaEstadoBadge.jsx` | Create | Maps `borrador` (slate) / `rellenada` (amber) / `enviada` (emerald) / `pendiente_cliente` / `verificada` / `aceptada` (existing) |
| `src/shared/components/badges/FacturaEstadoBadge.jsx` | Create | Maps `pendiente_envio` (slate) / `enviada` (emerald) |
| `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx` | Modify | Remove `MessageCircle` ActionIcon (lines 300-305); replace inline buttons with new atoms; add `ProformaEstadoBadge` |
| `src/modules/admin/cartera/tabs/facturacion/FacturasSection.jsx` | Modify | Replace WhatsApp `crm-factura-enviar-wa` button with `SendFacturaButton`; add `FacturaEstadoBadge` |
| `src/modules/admin/cartera/tabs/facturacion/ClientesPanel.jsx` | Modify | Wire new buttons/badges in proforma + factura sub-rows |
| `src/modules/admin/facturacion/ClientesPanel.jsx` | Modify | Same — duplicates of cartera tabs |
| `src/modules/admin/facturacion/FacturasPanel.jsx` | Modify | Same WhatsApp removal + new button |
| `src/modules/admin/facturacion/ProformasPanel.jsx` | Modify | Same |
| `src/modules/admin/cartera/tabs/ContratoDigitalSection.jsx` | Modify | Add `PrefirmarButton` + `FirmarButton`; signature state badge |
| `src/modules/admin/cartera/tabs/ClienteDrawer.jsx` | Modify | Mount `FaltaGestorModal`; CTA "Asignar gestor ahora" opens edit drawer |

**READ-ONLY files (do NOT touch in this change, per preflight):**
- 4 uncommitted files: `CarteraPanel.jsx`, `ClienteDrawer.jsx` (cartera version), `FacturasSection.jsx` (cartera version — wait, this is in scope; will be in PR4 only after rebase), `FacturacionPanel.jsx`

## Schema Migration (001_ciclo_facturacion.sql)

```sql
-- 1. clientes.proformas additions
ALTER TABLE clientes.proformas
  ADD COLUMN IF NOT EXISTS contrato_id integer REFERENCES clientes.contratos(id),
  ADD COLUMN IF NOT EXISTS solicitud_factura_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS solicitada_por_user_id integer REFERENCES auth.usuarios(id);

CREATE INDEX IF NOT EXISTS idx_proformas_contrato_id ON clientes.proformas(contrato_id);

-- 2. clientes.contratos firma state (orthogonal to estado)
ALTER TABLE clientes.contratos
  ADD COLUMN IF NOT EXISTS pre_firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_firmado_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS firmado_at timestamp without time zone;

-- 3. proforma estado CHECK extension
ALTER TABLE clientes.proformas DROP CONSTRAINT IF EXISTS proformas_estado_check;
ALTER TABLE clientes.proformas ADD CONSTRAINT proformas_estado_check
  CHECK (estado IN ('borrador','rellenada','enviada','pendiente_cliente','verificada','aceptada','rechazada','vencida'));
-- ^ preserve existing values, add 'rellenada','enviada'

-- 4. factura estado CHECK extension
ALTER TABLE clientes.facturas DROP CONSTRAINT IF EXISTS facturas_estado_check;
ALTER TABLE clientes.facturas ADD CONSTRAINT facturas_estado_check
  CHECK (estado IN ('pendiente_envio','enviada','emitida','pagada','anulada'));
-- ^ preserve existing values, add 'pendiente_envio','enviada'
```

**Risk:** existing CHECK constraint names may differ. Verify via `pg_constraint` before running. Use `IF EXISTS` defensively.

## Workflow Designs

All 6 follow the pattern: `Webhook → Validate input → Pre-check (gestor / firma) → Generate PDF → Send email (SMTP) → DB UPDATE → Respond { ok: true }`. Validate failures → 400; pre-check failures → 409.

```
CRM_CONTRATO_PREFIRMAR  (4 nodes): Webhook → Validate contrato_id → SQL UPDATE → Respond
CRM_CONTRATO_FIRMAR     (4 nodes): Webhook → Validate contrato_id → SQL UPDATE → Respond
CRM_PROFORMA_ENVIAR     (8 nodes): Webhook → Validate → Gestor pre-check → SQL SELECT proforma+cliente+gestor.email → HTML→PDF → SMTP send → SQL UPDATE estado='enviada' → Respond
CRM_FACTURA_ENVIAR      (8 nodes): Same pattern for facturas + enviada_at
CRM_72_POST_CONTRATO_ENVIAR (modified to 8 nodes): Same pattern as PROFORMA_ENVIAR; sets contrato.estado='enviado'
CRM_FACTURA_GENERAR (modified): Add pre-node: if proforma.contrato_id IS NOT NULL AND proforma.origen != 'legacy' → SELECT contratos.firmado → if false → 409. Otherwise existing flow.
CRM_PROFORMA_SOLICITAR  (3 nodes): Webhook → Validate → SQL UPDATE (idempotent) → Respond
```

**Email lookup SQL (run in n8n Postgres node, before PDF/email):**
```sql
SELECT c.gestor_id, u.email AS gestor_email, c.razon_social
FROM clientes.clientes c
LEFT JOIN auth.usuarios u ON u.id = c.gestor_id AND u.estado = 'activo' AND u.rol = 'admin'
WHERE c.id = $cliente_id;
```
If `gestor_email IS NULL` → respond 409 `GESTOR_MISSING`.

## Frontend Components

| Component | Props | Mount point |
|-----------|-------|-------------|
| `<FaltaGestorModal />` | `{ open, cliente, onAsignar, onClose }` | Top-level in `CarteraPanel` + `FacturacionPanel` (single instance, opened by any Send* button) |
| `<PrefirmarButton />` | `{ contrato, onSuccess }` | `ContratoDigitalSection`, `ClienteDrawer` contratos tab |
| `<FirmarButton />` | `{ contrato, onSuccess }` | Same |
| `<SendContratoButton />` | `{ contrato, cliente, onSuccess }` | `ContratoDigitalSection` (replaces inline `<Send>` button at line 92) |
| `<SendProformaButton />` | `{ proforma, cliente, onSuccess }` | `ProformasSection`, `ProformasPanel` (replaces `crm-75-post-contrato-email` action) |
| `<SendFacturaButton />` | `{ factura, cliente, onSuccess }` | `FacturasSection`, `FacturasPanel` (replaces `crm-factura-enviar-email` action) |
| `<ConsolidarButton />` | `{ proformaIds, onSuccess }` | `ProformasSection` (multi-select toolbar) |
| `<SolicitarFacturaButton />` | `{ proforma, onSuccess }` | `ProformasSection` row (admin role-gated) |
| `<ProformaEstadoBadge />` | `{ estado }` | Every proforma row |
| `<FacturaEstadoBadge />` | `{ estado }` | Every factura row |

**409 handling:** Each Send* button catches response; if `error === 'GESTOR_MISSING'`, dispatches global event `app:open-falta-gestor` with `{ cliente }`. Single `<FaltaGestorModal />` at panel level listens. Avoids prop-drilling.

**Existing button at `ProformasSection.jsx:300-305` (WhatsApp)**: removed per REQ-012.

## PR Strategy (chained, 4 PRs)

| PR | Scope | New files | Modified files | Est. lines | Depends on |
|----|-------|-----------|----------------|-----------:|-----------|
| **PR1 — Foundation** | Migration `001_ciclo_facturacion.sql` applied to VPS Postgres; 8 schema additions; docs note in CHANGELOG | 1 SQL | 0 | ~80 | none |
| **PR2 — n8n Workflows** | 5 NEW workflows (`CRM_CONTRATO_PREFIRMAR`, `CRM_CONTRATO_FIRMAR`, `CRM_PROFORMA_ENVIAR`, `CRM_FACTURA_ENVIAR`, `CRM_PROFORMA_SOLICITAR`) + 2 MODIFIED (`CRM_72_POST_CONTRATO_ENVIAR`, `CRM_FACTURA_GENERAR`) | 5 workflows (~200 lines JSON each = ~1000 lines) | 2 (~50 lines diff) | ~1100 | PR1 |
| **PR3 — Frontend Atoms** | All 8 atoms + 2 badges + `FaltaGestorModal` organism + shared `useGestorGuard` hook | 11 JSX (~80 lines each = ~880) | 0 | ~900 | none (UI-only; can land parallel to PR2 with mock responses) |
| **PR4 — Wire-up** | Remove WhatsApp button; mount atoms in 7 existing components; global event wiring; end-to-end smoke test | 0 | 7 (~150 lines diff each) | ~600 | PR1, PR2, PR3 |

**Total: ~2,680 lines across 4 PRs.** PR2 is the heaviest (most reviewable as n8n JSON diff). PR1 is trivial and unblocks everything.

**Review budget risk:** PR2 alone (~1,100 lines) exceeds the cached 400-line budget. **Reduce budget threshold or split PR2 into PR2a (firmas) + PR2b (envíos).** Recommend ask-always: present both options at apply time.

## Email resolution design

- **Where:** n8n Code/SQL node, inside each send workflow. One query: `cliente → gestor email`.
- **Why here:** the workflow already has DB access and email-sending capability (proven by `crm-factura-enviar-email`). Adding a PHP-API hop would be a new layer for no gain.
- **Caching:** out of scope for v1. `clientes` × `auth.usuarios` is indexed by PK — cold-path latency is sub-ms. If profiling shows it's hot, add a 5-min Redis cache later.
- **No fallback:** if the SQL returns NULL, we 409 — never send to `cliente.email` or any other address. Defense in depth (AD-1).

## PDF generation

- **Where:** n8n, via the same node family used by `crm-factura-generar-pdf` (HTML→PDF, probably `n8n-nodes-base.htmlToPdf` or a Code node calling a library).
- **Template source:** existing `ProformaViewer.jsx` / `FacturaViewer.jsx` React components are print-ready. **Recommendation:** render-to-PDF on the frontend in a hidden iframe is an option, but that requires the operator's browser. For automated send, server-side (n8n) is correct.
- **Concrete plan:** n8n Code node that constructs HTML (mirroring `ProformaViewer` JSX, server-side) → `htmlToPdf` node → binary attached to SMTP email. This is the same pattern already used by `crm-factura-generar-pdf`.

## Open Questions

1. **Q1 (BLOCKING for PR2):** Repurpose `CRM_72_POST_CONTRATO_ENVIAR` (currently WhatsApp) for the new email send, OR activate `CRM_75_POST_CONTRATO_EMAIL` as the send workflow? **Recommendation:** repurpose `CRM_72` (one webhook path, less indirection) and DELETE `CRM_75`. But requires user confirmation since `CRM_75` may be referenced elsewhere.
2. **Q2:** Existing CHECK constraint names (`proformas_estado_check`, `facturas_estado_check`) need verification before DROP. If named differently, the migration fails. **Action item in PR1:** query `pg_constraint` first.
3. **Q3:** Is `CRM_FACTURA_GENERAR`'s firma guard defense-in-depth ENOUGH, or do we also need a frontend check on the `Generar Factura` button? **Recommendation:** server-only is fine (the button is admin-gated already; no UX reason to block).

## Coverage Gaps

- `migration_email.sql` exists at project root — **out of scope** for this change but may collide if applied. Verify no naming conflicts.
- The 4 READ-ONLY uncommitted files (`CarteraPanel.jsx`, `ClienteDrawer.jsx`, `FacturasSection.jsx` cartera, `FacturacionPanel.jsx`) may already contain partial ciclo work. **Read them at the start of PR4** to avoid duplicate edits. The spec prohibits modification here, but PR4 will need them — coordinate rebase BEFORE PR4 opens.
- `migration_email.sql` references `operadores` table (legacy) — may indicate an older `operadores` table still exists. Out of scope; flag for cleanup later.
- The "Per-Client Import via Chat" operational model (REQ-019) has no implementation here. Out of scope per proposal.
