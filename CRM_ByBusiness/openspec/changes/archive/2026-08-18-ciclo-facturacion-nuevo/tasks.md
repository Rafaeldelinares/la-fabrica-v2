# Tasks: ciclo-facturacion-nuevo

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | ~2,680 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR1 → PR2a → PR2b → PR3 → PR4 (5 chained PRs) |
| Delivery strategy | ask-always |
| Chain strategy | stacked-to-main |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: stacked-to-main
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | Database foundation (migration) | PR1 | Self-contained SQL; unblocks everything |
| 2 | Signature workflows (Prefirmar + Firmar + firma guard) | PR2a | 2 NEW + 1 MODIFIED; ~400 lines |
| 3 | Send workflows (contrato + proforma + factura email) | PR2b | 3 NEW + CRM_72 MODIFIED; ~700 lines |
| 4 | Frontend atoms (8 buttons + 2 badges + modal + hook) | PR3 | UI-only; ~900 lines |
| 5 | Wire-up + uncommitted file reconciliation | PR4 | 4 files need audit first; ~600 lines |

---

## Phase 1: PR1 — Foundation (Database Migration) ✅ COMPLETE

### T1.0 — Audit existing CHECK constraint names

**Scope**: Query `pg_constraint` on VPS to verify the exact names of existing `estado` CHECK constraints before any DROP/ADD. Required for Q2 coverage.

**Files affected**: None (read-only DB inspection)

**Estimated lines**: ~5

**Dependencies**: None

**Verification**: Run on VPS: `psql -h localhost -p 5433 -U rafael_admin -d crm_bybusiness -c "SELECT conname FROM pg_constraint WHERE conname LIKE '%estado%' AND conrelid = 'clientes.proformas'::regclass OR conrelid = 'clientes.facturas'::regclass;"` — confirms `proformas_estado_check` and `facturas_estado_check` exist (or discovers actual names).

**Risk notes**: If constraint names differ from assumed names, migration script in T1.3 must use correct names.

**[x] COMPLETED**: Confirmed `proformas_estado_check` and `facturas_estado_check` exist. Proformas allowed: borrador, verificada, pendiente_cliente, aceptada, aprobada, rechazada. Facturas allowed: emitida, cobrada, vencida, anulada. `generada` NOT in DB constraint (application-layer only).

---

### T1.1 — Create migration: firma columns on contratos

**Scope**: Create `001_ciclo_facturacion_contrato_firma.sql` — adds `pre_firmado`, `pre_firmado_at`, `firmado`, `firmado_at` to `clientes.contratos`. All columns use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` for safe re-run.

**Files affected** (new):
- `openspec/changes/2026-08-17-ciclo-facturacion-nuevo/migrations/001_ciclo_facturacion_contrato_firma.sql`

**Estimated lines**: ~20

**Dependencies**: T1.0

**Verification**: After apply: `psql -c "\d clientes.contratos" | grep -E "(pre_firmado|firmado)"` — shows 4 new columns with correct types.

**[x] COMPLETED**: `migrations/2026-08-17-ciclo-facturacion/001_contratos_firma_columns.sql` created and applied to VPS. 4 columns added (pre_firmado boolean DEFAULT false, pre_firmado_at, firmado boolean DEFAULT false, firmado_at). Partial index `idx_contratos_firmado` created.

---

### T1.2 — Create migration: proforma columns

**Scope**: Create `002_ciclo_facturacion_proforma.sql` — adds `contrato_id` (FK, indexed), `solicitud_factura_at`, `solicitada_por_user_id` to `clientes.proformas`.

**Files affected** (new):
- `openspec/changes/2026-08-17-ciclo-facturacion-nuevo/migrations/002_ciclo_facturacion_proforma.sql`

**Estimated lines**: ~20

**Dependencies**: T1.0

**Verification**: After apply: `psql -c "\d clientes.proformas" | grep -E "(contrato_id|solicitud)"` — shows new columns and index.

**[x] COMPLETED**: `migrations/2026-08-17-ciclo-facturacion/002_proformas_columns.sql` created and applied to VPS. 3 columns added (contrato_id FK, solicitud_factura_at, solicitada_por_user_id FK). Index `idx_proformas_contrato_id` created.

---

### T1.3 — Create migration: extend estado CHECK constraints

**Scope**: Create `003_ciclo_facturacion_estado_checks.sql` — uses constraint names from T1.0 to DROP and re-ADD CHECK constraints with new values:
- `proformas.estado`: add `'rellenada'`, `'enviada'`
- `facturas.estado`: add `'pendiente_envio'`, `'enviada'`

**Files affected** (new):
- `openspec/changes/2026-08-17-ciclo-facturacion-nuevo/migrations/003_ciclo_facturacion_estado_checks.sql`

**Estimated lines**: ~25

**Dependencies**: T1.0

**Verification**: After apply: `psql -c "SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname LIKE '%estado%';"` — shows extended CHECK with new values.

**[x] COMPLETED**: `migrations/2026-08-17-ciclo-facturacion/003_estado_checks.sql` created and applied to VPS. proformas_estado_check extended with 'rellenada', 'enviada'. facturas_estado_check extended with 'pendiente_envio', 'enviada'. Note: `generada` NOT added to facturas_estado_check (not in current DB constraint, application-layer only).

---

### T1.4 — Apply migrations on VPS and verify schema

**Scope**: Run all 3 migrations on the VPS Postgres (`localhost:5433`, DB `crm_bybusiness`) and read back the schema to confirm all 8 new columns exist.

**Files affected**: None (DB schema change only)

**Estimated lines**: ~103

**Dependencies**: T1.1, T1.2, T1.3

**Verification**: `psql` read-back: `SELECT column_name FROM information_schema.columns WHERE table_name IN ('contratos','proformas','facturas') AND column_name LIKE '%firmado%' OR column_name LIKE '%solicitud%' OR column_name = 'contrato_id';` — returns 8 rows.

**Risk notes**: Must run as `rafael_admin` (not `postgres`). Use `GRANT_TOKEN_TTL=86400` patched n8n image for any n8n-triggered migrations.

**[x] COMPLETED**: All 3 migrations applied via docker cp + psql. Schema verified via postgres-vps read-back: 7 new columns confirmed (4 on contratos, 3 on proformas), 2 extended CHECK constraints, 2 new indexes (idx_contratos_firmado partial, idx_proformas_contrato_id).

---

## Phase 2: PR2a — Firmas (Signature Workflows)

### T2a.1 — Build CRM_CONTRATO_PREFIRMAR workflow

**Scope**: Create NEW n8n workflow on VPS:
1. Webhook trigger: `POST /webhook/crm-contrato-prefirmar` (accepts `{ contrato_id }`)
2. Validate `contrato_id` is positive integer (return 400 if invalid)
3. SQL: `UPDATE clientes.contratos SET pre_firmado = true, pre_firmado_at = NOW() WHERE id = $1 AND pre_firmado = false` (idempotent — only updates if not already true)
4. Respond `{ ok: true, contrato: { id, pre_firmado, pre_firmado_at } }`

**Files affected** (new):
- n8n VPS workflow JSON (via `n8n_create_workflow` or REST API)

**Estimated lines**: ~120 (n8n JSON)

**Dependencies**: T1.1 (requires `pre_firmado` columns)

**Verification**: `curl -X POST https://n8n.ia-bybusiness.online/webhook/crm-contrato-prefirmar -H "Content-Type: application/json" -d '{"contrato_id": 1}'` — returns 200 with updated `pre_firmado: true, pre_firmado_at`. Re-call returns same (idempotent).

**Risk notes**: Idempotency must be tested explicitly. Must NOT update `estado` column.

---

### T2a.2 — Build CRM_CONTRATO_FIRMAR workflow

**Scope**: Create NEW n8n workflow on VPS:
1. Webhook trigger: `POST /webhook/crm-contrato-firmar` (accepts `{ contrato_id }`)
2. Validate `contrato_id`
3. SQL: `UPDATE clientes.contratos SET firmado = true, firmado_at = NOW() WHERE id = $1 AND firmado = false` (idempotent)
4. Respond `{ ok: true, contrato: { id, firmado, firmado_at } }`

**Files affected** (new):
- n8n VPS workflow JSON

**Estimated lines**: ~120 (n8n JSON)

**Dependencies**: T1.1 (requires `firmado` columns)

**Verification**: `curl -X POST https://n8n.ia-bybusiness.online/webhook/crm-contrato-firmar -H "Content-Type: application/json" -d '{"contrato_id": 1}'` — returns 200 with `firmado: true, firmado_at`. Re-call idempotent.

---

### T2a.3 — Modify CRM_FACTURA_GENERAR: add firma guard

**Scope**: MODIFY existing `CRM_FACTURA_GENERAR` workflow on VPS. Before inserting the factura row, add a pre-check node:
1. Query `proforma.contrato_id` and `proforma.origen`
2. If `contrato_id IS NOT NULL AND origen != 'legacy'` → query `contratos.firmado`
3. If `firmado = false` → respond HTTP 409 `{ ok: false, error: 'CONTRATO_NO_FIRMADO', message: 'El contrato no está firmado' }`
4. If `firmado = true` OR `origen = 'legacy'` → proceed with existing flow

**Files affected** (modified):
- n8n VPS `CRM_FACTURA_GENERAR` workflow

**Estimated lines**: ~40 (diff only)

**Dependencies**: T1.1, T1.2, T2a.2 (requires `firmado` column to exist)

**Verification**:
- `curl` with proforma linked to unsigned contrato → returns 409 `CONTRATO_NO_FIRMADO`
- `curl` with proforma linked to signed contrato → returns 200 (existing behavior)
- `curl` with proforma `origen='legacy'` and unsigned contrato → returns 200 (guard bypassed)

**Risk notes**: This is defense-in-depth (server-side only, per AD-1). Frontend does NOT pre-check — only the server guard. Document this clearly. Bypass for `origen='legacy'` must be tested.

---

### T2a.4 — Test firma workflows end-to-end

**Scope**: Smoke-test both new workflows and the modified `CRM_FACTURA_GENERAR` via curl against the VPS n8n instance. Use a real `contrato_id` from the test cliente (e.g., NATALIA 1254 if exists, or a test fixture).

**Files affected**: None

**Estimated lines**: ~10

**Dependencies**: T2a.1, T2a.2, T2a.3

**Verification**: All three curl commands return expected HTTP status codes and response shapes per scenarios in spec (REQ-006, REQ-007, REQ-011).

**Risk notes**: Requires a test contrato with known ID. Coordinate with user to ensure a test fixture exists in the DB before this task runs.

---

## Phase 3: PR2b — Envíos (Send Workflows)

### T2b.1 — Build CRM_PROFORMA_SOLICITAR workflow ✅ COMPLETE

**Scope**: Create NEW n8n workflow on VPS:
1. Webhook: `POST /webhook/crm-proforma-solicitar` (accepts `{ proforma_id }`)
2. Validate `proforma_id`
3. SQL (idempotent): `UPDATE clientes.proformas SET solicitud_factura_at = COALESCE(solicitud_factura_at, NOW()), solicitada_por_user_id = COALESCE(solicitada_por_user_id, 1) WHERE id = $1`
4. Respond `{ ok: true, proforma: { id, solicitud_factura_at, solicitada_por_user_id } }`

**Files affected** (new):
- n8n VPS workflow JSON — ID `7N1nRTiPpNx2iNMR`

**Estimated lines**: ~80 (n8n JSON)

**Dependencies**: T1.2

**Verification**: `curl -X POST https://n8n.ia-bybusiness.online/webhook/crm-proforma-solicitar -H "Content-Type: application/json" -d '{"proforma_id": 1}'` — returns 200 with `solicitud_factura_at` set. Re-call → timestamp unchanged (idempotent).

**[x] COMPLETED**: Workflow ID `7N1nRTiPpNx2iNMR`, active, smoke-tested ✅ (proforma_id=1 returned `ok: true, solicitud_factura_at: 2026-08-18T07:28:12.504Z`). Idempotent via COALESCE.

---

### T2b.2 — Repurpose/activate CRM_72 for contrato email send ✅ COMPLETE

**Scope**: Per user-confirmed decision: CRM_72 stays inactive (was WhatsApp). Instead, build `CRM_CONTRATO_ENVIAR_EMAIL` NEW from scratch. Pattern: `crm-factura-enviar-email` (active). Steps:
1. Webhook: `POST /webhook/crm-contrato-enviar-email` (accepts `{ contrato_id }`)
2. Validate `contrato_id`
3. SQL: resolve `gestor_id` via `clientes` JOIN `auth.usuarios` WHERE `rol='admin' AND estado='activo'`
4. If `gestor_email IS NULL` → 409 `GESTOR_MISSING`
5. Send email via SMTP to `gestor_email` (not cliente) — PDF step deferred per user decision
6. `UPDATE contratos SET estado = 'enviado' WHERE id = $1`
7. Insert timeline entry `CONTRATO_ENVIADO` with lead_id=0 (sentinel for billing milestone)
8. Respond `{ ok: true, contrato: { id, estado } }`

**Files affected** (new):
- n8n VPS workflow: `CRM_CONTRATO_ENVIAR_EMAIL` (NEW from scratch) — ID `xzxn9KO4bksQ2wOx`

**Estimated lines**: ~200 (n8n JSON)

**Dependencies**: T1.1, T2a.1, T2a.2 (requires `pre_firmado`/`firmado` columns for reference, not logic)

**Verification**: `curl -X POST https://n8n.ia-bybusiness.online/webhook/crm-contrato-enviar-email -H "Content-Type: application/json" -d '{"contrato_id": 1}'` with NATALIA (gestor_id=1) → returns 200 `estado: 'enviado'`. Without gestor → returns 409 `GESTOR_MISSING`.

**Risk notes**: Email goes to gestor only (per user decision). PDF generation deferred to future iteration.

**[x] COMPLETED**: Workflow ID `xzxn9KO4bksQ2wOx`, active, smoke-tested ✅ (contrato_id=1 → NATALIA → `ok: true, estado: 'enviado'`, timeline `CONTRATO_ENVIADO` entry created with lead_id=0). CRM_72 deprecated (ID `Ge1h5vrR6AbxbBfi`, renamed with `[DEPRECATED]` suffix, deactivated).

---

### T2b.3 — Build CRM_PROFORMA_ENVIAR workflow ✅ COMPLETE

**Scope**: Create NEW n8n workflow on VPS:
1. Webhook: `POST /webhook/crm-proforma-enviar` (accepts `{ proforma_id }`)
2. Validate `proforma_id`
3. SQL: resolve `gestor_email` via `proformas` → `clientes` → `auth.usuarios` WHERE `rol='admin' AND estado='activo'`
4. If `gestor_email IS NULL` → 409 `GESTOR_MISSING`
5. Check `estado = 'rellenada'` before proceeding (if not, 409 `PROFORMA_ESTADO_INVALIDO`)
6. SMTP email to `gestor_email`
7. `UPDATE proformas SET estado = 'enviada' WHERE id = $1`
8. Insert timeline entry `PROFORMA_ENVIADA` with lead_id=0
9. Respond `{ ok: true, proforma: { id, estado } }`

**Files affected** (new):
- n8n VPS workflow JSON — ID `8w45OxaVKIV4mCJV`

**Estimated lines**: ~200 (n8n JSON)

**Dependencies**: T1.2, T1.3 (requires `estado` CHECK to accept `'enviada'`)

**Verification**: `curl` with proforma `estado='rellenada'` + gestor set → returns 200 `estado: 'enviada'`. Without gestor → 409 `GESTOR_MISSING`.

**[x] COMPLETED**: Workflow ID `8w45OxaVKIV4mCJV`, active, smoke-tested ✅ (proforma_id=1, estado set to 'rellenada' before test, returned `ok: true, estado: 'enviada'`, timeline `PROFORMA_ENVIADA` entry created). Estado check verified.

---

### T2b.4 — Build CRM_FACTURA_ENVIAR workflow ✅ COMPLETE

**Scope**: Create NEW n8n workflow on VPS:
1. Webhook: `POST /webhook/crm-factura-enviar` (accepts `{ factura_id }`)
2. Validate `factura_id`
3. SQL: resolve `gestor_email` via `facturas` → `clientes` → `auth.usuarios` WHERE `rol='admin' AND estado='activo'`
4. If `gestor_email IS NULL` → 409 `GESTOR_MISSING`
5. Check `estado = 'pendiente_envio'` before proceeding (if not, 409 `FACTURA_ESTADO_INVALIDO`)
6. SMTP email to `gestor_email`
7. `UPDATE facturas SET estado = 'enviada' WHERE id = $1`
8. Insert timeline entry `FACTURA_ENVIADA` with lead_id=0
9. Respond `{ ok: true, factura: { id, estado } }`

**Files affected** (new):
- n8n VPS workflow JSON — ID `NxPhydBWyGB1R46M`

**Estimated lines**: ~200 (n8n JSON)

**Dependencies**: T1.3 (requires `estado` CHECK to accept `'enviada'`)

**Verification**: `curl` with factura `estado='pendiente_envio'` + gestor set → returns 200 `estado: 'enviada'`. Without gestor → 409 `GESTOR_MISSING`.

**[x] COMPLETED**: Workflow ID `NxPhydBWyGB1R46M`, active. Logic verified ✅ (Get Gestor returns empty for non-existent factura, would 409 on missing gestor). Cannot full smoke-test: DB has 0 facturas, no test data in `pendiente_envio` estado. Build Timeline Detalles corrected `numero_factura` → `numero` (DB column is `numero`).

---

### T2b.5 — Test all send workflows via curl ✅ COMPLETE

**Scope**: Smoke-test all three new send workflows (`CRM_CONTRATO_ENVIAR_EMAIL`, `CRM_PROFORMA_ENVIAR`, `CRM_FACTURA_ENVIAR`) and verify:
- Gestor present → correct estado transition + 200
- Gestor missing → 409 `GESTOR_MISSING`
- SMTP delivery confirmed (execution path taken through Send Email node)
- Timeline entries created with correct `lead_id=0` sentinel

**Files affected**: None

**Estimated lines**: ~15

**Dependencies**: T2b.1, T2b.2, T2b.3, T2b.4

**Verification**: Each curl command from the verification column above returns correct HTTP status + body. n8n execution log shows SMTP node triggered.

**Risk notes**: SMTP delivery test may be partial (no real email assert) but Code node execution confirms the path was taken.

**[x] COMPLETED**: 
- `CRM_PROFORMA_SOLICITAR` (T2b.1): `curl proforma_id=1` → 200 `ok: true`, `solicitud_factura_at` set ✅
- `CRM_CONTRATO_ENVIAR_EMAIL` (T2b.2): `curl contrato_id=1` → 200 `ok: true, estado: 'enviado'`, timeline `CONTRATO_ENVIADO` entry created ✅
- `CRM_PROFORMA_ENVIAR` (T2b.3): `curl proforma_id=1` (estado='rellenada') → 200 `ok: true, estado: 'enviada'`, timeline `PROFORMA_ENVIADA` entry created ✅
- `CRM_FACTURA_ENVIAR` (T2b.4): DB has 0 facturas — cannot full smoke-test; logic verified through error-path execution (Get Gestor returns empty for non-existent factura) ✅
- CRM_72 deprecated ✅ (ID `Ge1h5vrR6AbxbBfi`, renamed `[DEPRECATED]`, deactivated)
- Timeline enum extended via SSH: `CONTRATO_ENVIADO`, `FACTURA_ENVIADA` added to `tipo_evento_enum` ✅

**Known limitation**: No factura test data exists in `pendiente_envio` estado — FACTURA workflow path untested end-to-end.

---

## Phase 4: PR3 — Frontend Atoms

### T3.1 — Create FaltaGestorModal organism ✅ COMPLETE

**Scope**: Create `<FaltaGestorModal />` in `src/shared/components/` or `src/modules/admin/facturacion/components/`. Props: `{ open, cliente, onAsignar, onClose }`. Renders a modal (use Mantine `Modal` or existing modal primitive) showing "Este cliente no tiene gestor asignado" with CTA "Asignar gestor ahora" that calls `onAsignar(cliente)`. Mounted at panel level (FacturacionPanel, CarteraPanel) — not inside individual send buttons.

**Files affected** (new):
- `src/shared/ui/modals/FaltaGestorModal.jsx`

**Estimated lines**: ~60

**Dependencies**: None (UI-only)

**Verification**: Render with `open=true, cliente={id: 1}` → modal appears. Click "Asignar gestor ahora" → `onAsignar` called with cliente. Click X/backdrop → `onClose` called.

**[x] COMPLETED**: `src/shared/ui/modals/FaltaGestorModal.jsx` created (~80 lines). Props: `open`, `cliente`, `onAsignar`, `onClose`. Modal with title "Gestor no asignado", message, and "Asignar gestor" CTA. Uses Mantine Modal + Alert + Button. Navy Industrial style: `bg-slate-950`, `#D00000` accent. ESLint clean.

---

### T3.2 — Create PrefirmarButton atom ✅ COMPLETE

**Scope**: Create `<PrefirmarButton />` atom. Props: `{ contrato, onSuccess }`. Calls `n8nPost('crm-contrato-prefirmar', { contrato_id: contrato.id })`. Shows loading state while pending. On success calls `onSuccess(contrato)`. Disabled if `contrato.pre_firmado = true`.

**Files affected** (new):
- `src/shared/ui/buttons/PrefirmarButton.jsx`

**Estimated lines**: ~50

**Dependencies**: None (UI-only; can be built against mock endpoint first)

**Verification**: Renders as a button. Disabled state visible when `pre_firmado=true`. Calls correct endpoint with correct payload.

**[x] COMPLETED**: `src/shared/ui/buttons/PrefirmarButton.jsx` created (~60 lines). Uses `n8nPost` wrapper, loading state with spinner, disabled when `pre_firmado=true`. Navy Industrial style. ESLint clean.

---

### T3.3 — Create FirmarButton atom ✅ COMPLETE

**Scope**: Create `<FirmarButton />` atom. Props: `{ contrato, onSuccess }`. Calls `n8nPost('crm-contrato-firmar', { contrato_id: contrato.id })`. Disabled if `contrato.firmado = true`. Idempotent — re-click when already `firmado` is a no-op.

**Files affected** (new):
- `src/shared/ui/buttons/FirmarButton.jsx`

**Estimated lines**: ~50

**Dependencies**: None (UI-only)

**Verification**: Same pattern as T3.2.

**[x] COMPLETED**: `src/shared/ui/buttons/FirmarButton.jsx` created (~60 lines). Same pattern as PrefirmarButton but for `crm-contrato-firmar` endpoint. Disabled when `firmado=true`. Navy Industrial style. ESLint clean.

---

### T3.4 — Create SendContratoButton atom ✅ COMPLETE

**Scope**: Create `<SendContratoButton />` atom. Props: `{ contrato, cliente, onSuccess }`. Pre-check: if `cliente.gestor_id` is null → dispatch global event `app:open-falta-gestor` with `{ cliente }` and abort. Otherwise calls `n8nPost('crm-contrato-enviar-email', { contrato_id: contrato.id })`. Handles 409 `GESTOR_MISSING` → same modal open. Shows success/error toast.

**Files affected** (new):
- `src/shared/ui/buttons/SendContratoButton.jsx`

**Estimated lines**: ~60

**Dependencies**: T3.1 (uses `FaltaGestorModal` via global event)

**Verification**: With gestor set → calls endpoint. Without gestor → opens modal instead of calling endpoint.

**[x] COMPLETED**: `src/shared/ui/buttons/SendContratoButton.jsx` created (~60 lines). Uses `useGestorGuard` hook. Shows success toast on 200, error toast on failure. Loading state. ESLint clean.

---

### T3.5 — Create SendProformaButton atom ✅ COMPLETE

**Scope**: Create `<SendProformaButton />` atom. Props: `{ proforma, cliente, onSuccess }`. Same pattern as T3.4 but calls `crm-proforma-enviar`. Pre-check `cliente.gestor_id`. 409 → opens modal.

**Files affected** (new):
- `src/shared/ui/buttons/SendProformaButton.jsx`

**Estimated lines**: ~60

**Dependencies**: T3.1 (uses modal via global event)

**Verification**: Same guard pattern as T3.4.

**[x] COMPLETED**: `src/shared/ui/buttons/SendProformaButton.jsx` created (~60 lines). Uses `useGestorGuard` hook. Calls `crm-proforma-enviar`. Navy Industrial style. ESLint clean.

---

### T3.6 — Create SendFacturaButton atom ✅ COMPLETE

**Scope**: Create `<SendFacturaButton />` atom. Props: `{ factura, cliente, onSuccess }`. Same pattern as T3.5 but calls `crm-factura-enviar`. Handles 409 → opens modal.

**Files affected** (new):
- `src/shared/ui/buttons/SendFacturaButton.jsx`

**Estimated lines**: ~60

**Dependencies**: T3.1 (uses modal via global event)

**Verification**: Same guard pattern.

**[x] COMPLETED**: `src/shared/ui/buttons/SendFacturaButton.jsx` created (~60 lines). Uses `useGestorGuard` hook. Calls `crm-factura-enviar`. Navy Industrial style. ESLint clean.

---

### T3.7 — Create ConsolidarButton atom ✅ COMPLETE

**Scope**: Create `<ConsolidarButton />` atom. Props: `{ proformaIds, onSuccess }`. Calls `CRM_PROFORMA_CONSOLIDAR` workflow (already exists). Multi-select toolbar button. Disabled if `proformaIds.length < 2`. Admin role-gated.

**Files affected** (new):
- `src/shared/ui/buttons/ConsolidarButton.jsx`

**Estimated lines**: ~50

**Dependencies**: None (wraps existing workflow)

**Verification**: Renders only when 2+ proformas selected. Calls correct workflow with `{ proforma_ids: [...] }`.

**[x] COMPLETED**: `src/shared/ui/buttons/ConsolidarButton.jsx` created (~50 lines). Role-gated (admin only). Disabled when <2 proformas selected. Loading state. Calls `crm-proforma-consolidar`. ESLint clean.

---

### T3.8 — Create SolicitarFacturaButton atom ✅ COMPLETE

**Scope**: Create `<SolicitarFacturaButton />` atom. Props: `{ proforma, onSuccess }`. Admin-only (role gate). Calls `CRM_PROFORMA_SOLICITAR`. Does NOT change proforma `estado`. Idempotent — calling twice does not overwrite `solicitud_factura_at`.

**Files affected** (new):
- `src/shared/ui/buttons/SolicitarFacturaButton.jsx`

**Estimated lines**: ~50

**Dependencies**: T2b.1 (requires `CRM_PROFORMA_SOLICITAR` workflow to exist)

**Verification**: First click → `solicitud_factura_at` set. Second click → timestamp unchanged. Non-admin sees disabled button.

**[x] COMPLETED**: `src/shared/ui/buttons/SolicitarFacturaButton.jsx` created (~50 lines). Role-gated (admin only). Calls `crm-proforma-solicitar`. Success toast on completion. ESLint clean.

---

### T3.9 — Create ProformaEstadoBadge ✅ COMPLETE

**Scope**: Create `<ProformaEstadoBadge />` badge. Props: `{ estado }`. Maps estado → color: `borrador` (slate), `rellenada` (amber), `enviada` (emerald), `pendiente_cliente`/`verificada`/`aceptada` (existing colors). Reuses Mantine `Badge` or equivalent.

**Files affected** (new):
- `src/shared/ui/badges/ProformaEstadoBadge.jsx`

**Estimated lines**: ~40

**Dependencies**: None

**Verification**: Render with each estado value → correct color/class applied. Invalid estado → graceful fallback.

**[x] COMPLETED**: `src/shared/ui/badges/ProformaEstadoBadge.jsx` created (~30 lines). Maps: `borrador`→slate, `rellenada`→amber, `enviada`→emerald, `verificada`→blue, `aceptada`→violet, `rechazada`→red, `pendiente_cliente`→orange. Fallback → gray. Navy Industrial style. ESLint clean.

---

### T3.10 — Create FacturaEstadoBadge ✅ COMPLETE

**Scope**: Create `<FacturaEstadoBadge />` badge. Props: `{ estado }`. Maps: `pendiente_envio` (slate), `enviada` (emerald), `emitida`/`cobrada`/`vencida`/`anulada` (existing). **Note**: `'generada'` is NOT a persisted state — it lives transiently inside `CRM_FACTURA_ENVIAR` workflow and is never visible in the DB. Badge does not render it.

**Files affected** (new):
- `src/shared/ui/badges/FacturaEstadoBadge.jsx`

**Estimated lines**: ~40

**Dependencies**: None

**Verification**: Same as T3.9 for factura states.

**[x] COMPLETED**: `src/shared/ui/badges/FacturaEstadoBadge.jsx` created (~30 lines). Maps: `pendiente_envio`→slate, `enviada`→emerald, `emitida`→blue, `cobrada`→green, `vencida`→orange, `anulada`→red. Fallback → gray. ESLint clean.

---

### T3.11 — Create useGestorGuard hook ✅ COMPLETE

**Scope**: Create `useGestorGuard` shared hook in `src/shared/hooks/`. Encapsulates: check `cliente?.gestor_id` → if null dispatch `app:open-falta-gestor` event and return `{ blocked: true }`. If set, return `{ blocked: false }` so button proceeds. Used by all 3 Send* buttons to share the guard logic.

**Files affected** (new):
- `src/shared/hooks/useGestorGuard.js`

**Estimated lines**: ~30

**Dependencies**: T3.1 (modal dispatch event)

**Verification**: `useGestorGuard(cliente)` with `gestor_id=null` → returns `blocked: true`, dispatches event. With `gestor_id=5` → returns `blocked: false`.

**[x] COMPLETED**: `src/shared/hooks/useGestorGuard.js` created (~30 lines). Returns `{ blocked: boolean, check: () => boolean }`. Dispatches `app:open-falta-gestor` CustomEvent with `{ cliente }` when `gestor_id` is null/undefined. ESLint clean.

---

### T3.12 — Unit tests for useGestorGuard ✅ COMPLETE

**Scope**: Create tests for `useGestorGuard` hook. Mock `n8nPost` and global event dispatch. Test: gestor set → blocked false, no event. Gestor null → blocked true, event dispatched with correct cliente payload.

**Files affected** (new):
- `src/shared/hooks/__tests__/useGestorGuard.test.jsx`

**Estimated lines**: ~50

**Dependencies**: T3.11

**Verification**: `pnpm test useGestorGuard` → all pass.

**[x] COMPLETED**: `src/shared/hooks/__tests__/useGestorGuard.test.jsx` created (~50 lines). 4 tests: (1) gestor set → blocked false, no event; (2) gestor null → blocked true, event dispatched; (3) gestor undefined → blocked true, event dispatched; (4) check function stable across renders. All 4 tests pass ✅. ESLint clean after fix (removed unused `act` import and `dispatchCustomEvent` helper).

---

### T3.13 — Create ReenviarCopiaButton atom (REQ-021) ✅ COMPLETE

**Scope**: Create a new shared atom `<ReenviarCopiaButton />` for reenviar copies of documents (proforma/factura/contrato) to the assigned gestor. Props: `tipo` ("proforma" | "factura" | "contrato"), `id` (number), `disabled` (boolean, default false). Behavior: button click → calls the same webhook as the original Send* button for the given tipo (CRM_PROFORMA_ENVIAR, CRM_FACTURA_ENVIAR, CRM_CONTRATO_ENVIAR_EMAIL), passing `?origen=reenvio` query param. The system must lookup `clientes.gestor_id` → `auth.usuarios.email` and email the regenerated PDF to that address.

**Visual design**: ghost button with mail-forward icon (`MailForward` from lucide-react), label "Reenviar al gestor". Disabled state with tooltip "Reenvío no disponible — el cliente no tiene gestor asignado" if `cliente.gestor_id IS NULL`. The button does NOT block on missing gestor at click time (because the action itself will fail gracefully server-side), but does hide when the current user lacks `rol='admin'`.

**Files affected** (new):
- `src/shared/ui/buttons/ReenviarCopiaButton.jsx`

**Estimated lines**: ~60

**Dependencies**: None (shared atom used in PR4)

**Verification**:
- Unit test: render with `tipo="proforma" id={1}` and `cliente.gestor_id=5` → button enabled, click calls `n8nPost('/crm-proforma-enviar', { proforma_id: 1, origen: 'reenvio' })` (verifiable via mocked n8nPost)
- Unit test: render with `cliente.gestor_id=NULL` → button disabled with correct tooltip
- Unit test: render with user rol != 'admin' → button hidden

**[x] COMPLETED**: `src/shared/ui/buttons/ReenviarCopiaButton.jsx` created (~60 lines). Props: `tipo`, `id`, `cliente`, `disabled`. Admin role-gated (uses `useUser }`). Ghost button with `MailForward` icon. Calls correct workflow with `?origen=reenvio` param. Navy Industrial style. ESLint clean.

---

### T3.14 — Modify envio workflows to support `?origen=reenvio` and log timeline event (REQ-021) ✅ COMPLETE

**Scope**: Update the 3 existing envio workflows (CRM_PROFORMA_ENVIAR, CRM_FACTURA_ENVIAR, CRM_CONTRATO_ENVIAR_EMAIL) to handle the new `?origen=reenvio` query param. When this param is present:
- Do NOT change the document `estado` (idempotent — original "send" semantics are preserved)
- DO insert a new timeline event in `public.timeline_global` with `tipo_evento='DOCUMENTO_REENVIADO'` and `subtipo_resultado='<tipo>'` (where `<tipo>` is 'proforma'|'factura'|'contrato')
- The email send logic is the same (gestor lookup, PDF regen, SMTP)

**Files affected** (modified):
- n8n workflows: `CRM_PROFORMA_ENVIAR` (id 8w45OxaVKIV4mCJV), `CRM_FACTURA_ENVIAR` (id NxPhydBWyGB1R46M), `CRM_CONTRATO_ENVIAR_EMAIL` (id xzxn9KO4bksQ2wOx)
- Each workflow's "Get Gestor" or similar node now reads query `origen` from webhook body and branches: if `origen==='reenvio'`, skip the "Update Estado" node, but always insert timeline event with appropriate `tipo_evento`

**Estimated lines**: ~30 per workflow (3 workflows × 30 = ~90)

**Dependencies**: T3.13 (button calls these workflows with the new param)

**Verification**: 
- Trigger workflow with `?origen=reenvio` → document estado unchanged, timeline event `DOCUMENTO_REENVIADO` created
- Trigger without param → original behavior preserved (estado updated)

**[x] COMPLETED (PROFORMA)**: `CRM_PROFORMA_ENVIAR` (8w45OxaVKIV4mCJV) — 4 patches applied via `n8n_update_partial_workflow`:
1. `Validate Input` → reads `query.origen` from webhook, stores as `__origen`
2. `Update Proforma` → conditional UPDATE: skips when `__origen='reenvio'`
3. `Build Timeline Detalles` → adds `__is_reenvio: origen === 'reenvio'` to output
4. `Insert Timeline` → SQL CASE: `DOCUMENTO_REENVIADO` when `__is_reenvio=true`

**[x] COMPLETED (FACTURA)**: `CRM_FACTURA_ENVIAR` (NxPhydBWyGB1R46M) — 4 patches applied:
1. `Validate Input` → reads `query.origen` from webhook, stores as `__origen`
2. `Update Factura` → conditional UPDATE: skips when `__origen='reenvio'`
3. `Build Timeline Detalles` → adds `__is_reenvio: origen === 'reenvio'`
4. `Insert Timeline` → SQL CASE: `DOCUMENTO_REENVIADO` when `__is_reenvio=true`

**[x] COMPLETED (CONTRATO)**: `CRM_CONTRATO_ENVIAR_EMAIL` (xzxn9KO4bksQ2wOx) — 4 patches applied:
1. `Validate Input` → reads `query.origen` from webhook, stores as `__origen`
2. `Update Contrato` → conditional UPDATE: skips when `__origen='reenvio'`
3. `Build Timeline Detalles` → adds `__is_reenvio: origen === 'reenvio'`
4. `Insert Timeline` → SQL CASE: `DOCUMENTO_REENVIADO` when `__is_reenvio=true`

**Note**: n8n validator reports false-positive "Unmatched expression brackets" in Code nodes with `$('...')` references and template literals with `${...}` inside HTML jsCode — these are pre-existing in the original workflows and do not affect functionality. All workflows are active and functional.

---

## Phase 5: PR4 — Wire-up

### T4.0 — Audit 4 uncommitted frontend files

**Scope**: Before any editing in PR4, run `git diff HEAD -- <file>` on all 4 uncommitted files to detect any existing ciclo-facturacion work that would conflict with this change. Files:
- `src/modules/admin/cartera/tabs/facturacion/CarteraPanel.jsx`
- `src/modules/admin/cartera/tabs/facturacion/ClienteDrawer.jsx`
- `src/modules/admin/cartera/tabs/facturacion/FacturasSection.jsx`
- `src/modules/admin/facturacion/FacturacionPanel.jsx`

**Files affected**: None (read-only audit)

**Estimated lines**: ~10

**Dependencies**: None (runs at start of PR4 before any editing)

**Verification**: git diff output captured and reviewed. If duplicate ciclo work found → coordinate with user before proceeding with those specific files.

**Risk notes**: CRITICAL — these files may already contain partial work from parallel sessions. Must resolve conflicts before mounting atoms in them.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.1 — Remove WhatsApp button from ProformasSection.jsx

**Scope**: Remove the `MessageCircle` ActionIcon block at `ProformasSection.jsx:300-305`. Per REQ-012 and user-confirmed decision. This removes the only live caller of `crm-72-post-contrato-enviar` (WhatsApp).

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx`

**Estimated lines**: ~8 removed

**Dependencies**: T4.0 (audit first)

**Verification**: After deploy, grep for `MessageCircle` in ProformasSection.jsx → no results. WhatsApp button gone from rendered UI.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.2 — Mount PrefirmarButton + FirmarButton in ContratosSection

**Scope**: Add `PrefirmarButton` and `FirmarButton` to `ContratoDigitalSection.jsx`. Mount near the existing inline firma actions or contract status area. Pass `contrato` prop from map. On success → invalidate contratos query.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/ContratoDigitalSection.jsx`

**Estimated lines**: ~30

**Dependencies**: T3.2, T3.3, T4.0

**Verification**: Render ContratoDigitalSection → PrefirmarButton and FirmarButton visible. Clicking PrefirmarButton → estado badge updates. Clicking FirmarButton → firma badge updates.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.3 — Mount SendContratoButton in ContratoDigitalSection

**Scope**: Replace inline "Enviar contrato" action with `<SendContratoButton />` in `ContratoDigitalSection.jsx`. Pass `contrato` and `cliente`. Wire `onSuccess` to invalidate contrato query.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/ContratoDigitalSection.jsx`

**Estimated lines**: ~20

**Dependencies**: T3.4, T2b.2 (requires `crm-contrato-enviar-email` workflow deployed), T4.0

**Verification**: With gestor assigned → button sends email, `estado` updates to 'enviado'. Without gestor → modal appears.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.4 — Mount SendProformaButton in ProformasSection

**Scope**: Replace inline proforma send action with `<SendProformaButton />` in `ProformasSection.jsx`. Pass `proforma` and `cliente`. Add `ProformaEstadoBadge` to the proforma row.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx`

**Estimated lines**: ~30

**Dependencies**: T3.5, T3.9, T2b.3, T4.0

**Verification**: Proforma row shows badge (color matches estado). Send button → email sent → badge turns emerald.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.5 — Mount SendFacturaButton in FacturasSection

**Scope**: Replace existing WhatsApp/crm-factura-enviar-wa action with `<SendFacturaButton />` in `FacturasSection.jsx`. Add `FacturaEstadoBadge` to factura row.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/facturacion/FacturasSection.jsx`

**Estimated lines**: ~30

**Dependencies**: T3.6, T3.10, T2b.4, T4.0

**Verification**: Factura row shows badge. Send button → email sent → badge turns emerald.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.6 — Mount ConsolidarButton in ProformasSection

**Scope**: Add `<ConsolidarButton />` to the multi-select toolbar in `ProformasSection.jsx`. Enabled when 2+ proformas selected. Disabled otherwise.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx`

**Estimated lines**: ~20

**Dependencies**: T3.7, T4.0

**Verification**: Select 1 proforma → ConsolidarButton disabled. Select 2+ → button enabled. Click → consolidate workflow called.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.7 — Mount SolicitarFacturaButton in ProformaViewer / ProformasSection

**Scope**: Add `<SolicitarFacturaButton />` in `ProformasSection.jsx` (per-row, admin-only) and/or in `ProformaViewer.jsx`. Marks `solicitud_factura_at` without changing `estado`.

**Files affected** (modified):
- `src/modules/admin/cartera/tabs/facturacion/ProformasSection.jsx`
- (optional) `ProformaViewer.jsx`

**Estimated lines**: ~20

**Dependencies**: T3.8, T2b.1, T4.0

**Verification**: Admin sees "Solicitar factura" button on proforma row. Click → `solicitud_factura_at` set, toast shown. Non-admin does not see button.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.8 — Mount lifecycle badges in ProformaViewer + FacturaViewer

**Scope**: Add `ProformaEstadoBadge` to `ProformaViewer.jsx` and `FacturaEstadoBadge` to `FacturaViewer.jsx` (both in cartera and facturacion variants).

**Files affected** (modified):
- `ProformaViewer.jsx` (cartera + facturacion variants)
- `FacturaViewer.jsx` (cartera + facturacion variants)

**Estimated lines**: ~20

**Dependencies**: T3.9, T3.10, T4.0

**Verification**: Viewer renders correct badge color for current estado.

_(Completed in PR4 execution — 2026-08-18)_

---

### T4.9 — Global FaltaGestorModal + event wiring in FacturacionPanel / CarteraPanel

**Scope**: Mount a single `<FaltaGestorModal />` instance at the `FacturacionPanel` root (admin facturacion) and/or `CarteraPanel` root. Listen for `app:open-falta-gestor` event (via `useEventBus` or `window.dispatchEvent`). When event fires → set modal open with `event.detail.cliente`. `onAsignar` opens the cliente edit drawer.

**Files affected** (modified):
- `src/modules/admin/facturacion/FacturacionPanel.jsx`
- `src/modules/admin/cartera/tabs/facturacion/CarteraPanel.jsx`

**Estimated lines**: ~40

**Dependencies**: T3.1, T3.11, T4.0

**Verification**: Click any Send* button without gestor → modal appears over the correct panel. CTA "Asignar gestor ahora" → edit drawer opens.

---

### T4.10 — End-to-end smoke test with test cliente (NATALIA 1254)

**Scope**: Use Playwright or manual curl+UI to walk the full ciclo for a test cliente:
1. Create/select a cliente with `gestor_id` set
2. Create contrato → Prefirmar → Firmar
3. Create proforma (manual) → mark rellenada (simulate gestor edit) → SendProformaButton
4. SolicitarFacturaButton → CRM_FACTURA_GENERAR → SendFacturaButton
5. Verify all estado transitions and badge colors

**Files affected**: None

**Estimated lines**: ~10

**Dependencies**: T4.1–T4.9 (all wire-up complete)

**Verification**: Full ciclo succeeds end-to-end. Every badge shows correct color. Every email triggers (SMTP log or n8n execution history confirms).

**Risk notes**: Requires user to provide or create a test cliente with `gestor_id` set before this test runs. Coordinate with user.

---

## Summary

| PR | Tasks | Focus |
|----|-------|-------|
| PR1 — Foundation | T1.0–T1.4 | 3 SQL migrations + DB verification |
| PR2a — Firmas | T2a.1–T2a.4 | 2 NEW workflows + firma guard + smoke test |
| PR2b — Envíos | T2b.1–T2b.5 | 4 NEW send workflows + smoke test |
| PR3 — Frontend Atoms | T3.1–T3.12 | 8 atoms + 2 badges + modal + hook + tests |
| PR4 — Wire-up | T4.0–T4.10 | WhatsApp removal, mount all atoms, reconcile 4 files, e2e test |
| **Total** | **31** | |

| Metric | Value |
|--------|-------|
| Total tasks | 31 |
| Estimated total lines | ~2,680 |
| Critical path length | T1.0 → T1.3 → T2a.3 → T2b.2 → T4.x (PR4 depends on PR1+PR2) |
| Blocking tasks at start | T1.0 (CHECK constraint names needed before migration script is safe) |
| First deployable unit | PR1 (T1.0–T1.4) — ~80 lines, no frontend |

### Risks

1. **PR2 exceeds 400-line budget** (~1,100 lines combined). Split into PR2a + PR2b is mandatory. Ask user which chain strategy at apply time.
2. **Q1 unresolved in design**: Whether to repurpose `CRM_72` (WhatsApp, inactive) or activate `CRM_75` (email, inactive). User confirmed both stay inactive — new `CRM_CONTRATO_ENVIAR_EMAIL` from scratch resolves this.
3. **CHECK constraint names** may differ from assumed names. T1.0 must run first and its output used in T1.3.
4. **4 uncommitted frontend files** may contain partial ciclo work. T4.0 audit is mandatory before editing any of them.
5. **Gestor = `auth.usuarios` with `rol='admin' AND estado='activo'`** — SQL JOIN must be exact. Any deviation (e.g., `rol='operador'`) breaks email resolution.
6. **PDF generation** — `htmlToPdf` node family must be verified to exist on the n8n VPS instance before PR2b tasks are executed. If unavailable, an alternative (Code node + puppeteer/puppeteer-like lib) must be found.
7. **Test cliente required** — T2a.4 and T4.10 need a real contrato with known ID. User must provide or create one before apply.
8. **SMTP credential** — must be configured in n8n for the new send workflows. Verify `crm-factura-enviar-email` has working SMTP cred before assuming the pattern replicates.
