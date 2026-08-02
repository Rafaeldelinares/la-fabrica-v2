# Spec: lead-callbacks (S05)

## Purpose

Provide operators with a dedicated panel (`MisCallbacksPanel`) to view, reschedule, and cancel their upcoming callbacks, backed by a new `CRM_CALLBACKS_GESTIONAR` workflow. State stays in sync with `CRM_WATCHDOG_CALLBACKS`.

## Affected Components

- `src/components/dashboard/MisCallbacksPanel.jsx` (new)
- `src/components/dashboard/OperatorDashboard.jsx` (Zone4 integration)
- Workflow: `CRM_CALLBACKS_GESTIONAR` (new — cancel + reschedule operations)

## Requirements

### REQ-001: MisCallbacksPanel lists today's callbacks

The system MUST display a list of the current operator's callbacks scheduled for today, pulled from `CRM_CALLBACKS_OPERADOR` data via `useN8nQuery`.

#### Scenario: Operator views callback list

- GIVEN the operator is on `OperatorDashboard` and has upcoming callbacks
- WHEN the `MisCallbacksPanel` is rendered
- THEN a list of today's callbacks is displayed with: contact name, scheduled time, status badge, and action buttons (Reschedule, Cancel)

#### Scenario: Operator has no callbacks today

- GIVEN the operator has no callbacks scheduled for today
- WHEN `MisCallbacksPanel` renders
- THEN a "Sin callbacks programados" empty state is shown
- AND no error is thrown

#### Scenario: Callback list shows loading skeleton

- GIVEN `MisCallbacksPanel` is rendering
- WHEN the callback data is being fetched
- THEN a skeleton list is shown (not a spinner)
- AND the panel area is non-empty (no layout shift)

### REQ-002: Operator can reschedule a callback

The system MUST allow the operator to reschedule a callback to a new date/time, calling `CRM_CALLBACKS_GESTIONAR` with action `reschedule`.

#### Scenario: Operator reschedules a callback

- GIVEN the operator is viewing `MisCallbacksPanel`
- WHEN they click "Reprogramar" on a callback item
- THEN a datetime picker modal opens
- AND selecting a new time and confirming calls `CRM_CALLBACKS_GESTIONAR` with `action: 'reschedule'`, `callback_id`, and `new_datetime`
- AND on success the list updates to show the new time
- AND a success notification is shown

#### Scenario: Reschedule fails due to network error

- GIVEN the operator submitted a reschedule request
- WHEN the `CRM_CALLBACKS_GESTIONAR` POST fails (network error)
- THEN an error notification is shown: "No se pudo reprogramar el callback"
- AND the original callback time remains displayed
- AND no data inconsistency occurs

#### Scenario: Reschedule fails because watchdog already took the callback

- GIVEN the operator submitted a reschedule request
- WHEN `CRM_CALLBACKS_GESTIONAR` returns an error indicating the callback was already processed by watchdog
- THEN an error notification explains the situation
- AND the operator is prompted to refresh the list

### REQ-003: Operator can cancel a callback

The system MUST allow the operator to cancel a callback, calling `CRM_CALLBACKS_GESTIONAR` with action `cancel`.

#### Scenario: Operator cancels a callback

- GIVEN the operator is viewing `MisCallbacksPanel`
- WHEN they click "Cancelar" on a callback item
- THEN a confirmation dialog appears: "¿Cancelar este callback?"
- AND confirming calls `CRM_CALLBACKS_GESTIONAR` with `action: 'cancel'`, `callback_id`
- AND on success the callback disappears from the list
- AND a success notification is shown

#### Scenario: Cancel fails due to permission denied

- GIVEN the operator submitted a cancel request
- WHEN `CRM_CALLBACKS_GESTIONAR` returns 403 (permission denied)
- THEN an error notification is shown
- AND the callback remains in the list

### REQ-004: CRM_CALLBACKS_GESTIONAR workflow contract

The `CRM_CALLBACKS_GESTIONAR` workflow MUST accept `{ action: 'reschedule' | 'cancel', callback_id: string, operator_id?: string, new_datetime?: string }` and return `{ success: boolean, error?: string, callback?: object }`.

#### Scenario: CRM_CALLBACKS_GESTIONAR reschedule succeeds

- GIVEN `CRM_CALLBACKS_GESTIONAR` is called with `action: 'reschedule'`, `callback_id`, and `new_datetime`
- WHEN the workflow validates the callback belongs to the requesting operator
- THEN it reschedules the callback in the DB
- AND returns `{ success: true, callback: { id, scheduled_at, status } }`

#### Scenario: CRM_CALLBACKS_GESTIONAR cancel succeeds

- GIVEN `CRM_CALLBACKS_GESTIONAR` is called with `action: 'cancel'` and `callback_id`
- WHEN the workflow validates the callback
- THEN it marks the callback as cancelled
- AND returns `{ success: true }`

### REQ-005: Watchdog synchronization

The system MUST ensure that actions in `MisCallbacksPanel` do not conflict with `CRM_WATCHDOG_CALLBACKS_V2` processing.

#### Scenario: Callback cancelled before watchdog processes it

- GIVEN an operator cancels a callback via `MisCallbacksPanel`
- WHEN `CRM_WATCHDOG_CALLBACKS_V2` runs within the same time window
- THEN the watchdog detects the callback is already cancelled (`estado = 'cancelada'`) and skips it
- AND no duplicate processing occurs

#### Verification evidence (2026-08-02): Watchdog skip behavior is provably correct

- **DB function** `public.crm_watchdog_callbacks()` has `WHERE lp.estado = 'pendiente'` — cancelled callbacks (`estado = 'cancelada'`) are never selected
- **Workflow** `CRM_WATCHDOG_CALLBACKS_V2` (VPS `oiCboRThnoOAeLxW`) has `Hay callbacks` (IF) and `Redistribuir Callback` (UPDATE) nodes **disabled** — all logic lives in the DB function
- **Conclusion**: No DB or workflow changes needed; skip behavior is correct by design

## Out of Scope

- Creating new callbacks (only reschedule + cancel)
- Cross-operator callback reassignment
- Historical callback records (beyond today's list)
- P3 toggle modifications

## Dependencies

- S05 depends on S04 (OperatorDashboard Zone4 must exist for the panel placement)

## Acceptance Criteria

- [ ] `MisCallbacksPanel` created in `src/components/dashboard/`
- [ ] Panel lists today's callbacks with reschedule and cancel actions
- [ ] Empty state shown when no callbacks exist
- [ ] Reschedule and cancel operations call `CRM_CALLBACKS_GESTIONAR`
- [ ] Error states handled gracefully (network, permission, watchdog conflict)
- [ ] Loading state uses skeleton screen
- [ ] No `console.log`, no inline styles, Navy Industrial style
- [ ] E2E smoke spec: list callbacks, reschedule, cancel
