# Delta Spec: lead-callbacks (F02 Watchdog Verification)

## MODIFIED Requirements

### Requirement: REQ-005: Watchdog synchronization

The system MUST ensure that actions in `MisCallbacksPanel` do not conflict with `CRM_WATCHDOG_CALLBACKS_V2` processing. The watchdog workflow's IF and UPDATE nodes are **disabled**; only the `crm_watchdog_callbacks()` database function executes on schedule. Callbacks with `estado != 'cancelada'` are processed by the function; callbacks already cancelled by the operator via `MisCallbacksPanel` are skipped.

(Previously: General watchdog synchronization principle with no implementation detail)

#### Scenario: Callback cancelled before watchdog processes it

- GIVEN an operator cancels a callback via `MisCallbacksPanel`
- WHEN `CRM_WATCHDOG_CALLBACKS_V2` runs within the same time window
- THEN the watchdog detects the callback is already cancelled (`estado = 'cancelada'`) and skips it
- AND no duplicate processing occurs

#### Scenario: Watchdog processes only non-cancelled callbacks

- GIVEN `CRM_WATCHDOG_CALLBACKS_V2` executes on schedule
- WHEN the workflow's IF + UPDATE nodes are disabled (verified via VPS n8n UI)
- THEN only `crm_watchdog_callbacks()` DB function runs
- AND only callbacks with `estado != 'cancelada'` are processed
- AND callbacks cancelled via `CRM_CALLBACKS_GESTIONAR` are excluded from processing

#### Scenario: E2E verifies watchdog skip behavior

- GIVEN the E2E spec `f02-watchdog-skip-coverage.spec.js` runs against production
- WHEN it calls `CRM_CALLBACKS_GESTIONAR` to cancel a callback then triggers the watchdog
- THEN the E2E assert confirms the callback was skipped (not re-processed)

### Requirement: Watchdog skip behavior — verification evidence

**CR-03 / S05 R4 verification — 2026-08-02**

#### Verification 1: DB function filter

- **Function**: `public.crm_watchdog_callbacks()` on VPS (`crm_bybusiness`)
- **Verified clause**: `WHERE lp.estado = 'pendiente'`
- **Effect**: Callbacks with `estado = 'cancelada'` (or any non-`pendiente` value) are never selected by the cursor
- **Conclusion**: Skip logic is provably correct — cancelled callbacks are never picked up for redistribution

#### Verification 2: Workflow node states

- **Workflow**: `CRM_WATCHDOG_CALLBACKS_V2` (VPS ID: `oiCboRThnoOAeLxW`)
- **Active nodes**: `Schedule Trigger` (15-min cron) + `Ejecutar Watchdog` (Postgres — calls DB function)
- **Disabled nodes**: `Hay callbacks` (IF) + `Redistribuir Callback` (UPDATE)
- **Effect**: No conditional branching or manual redistribution occurs in the workflow; the DB function is the sole execution path
- **Conclusion**: Workflow architecture is safe — all skip logic lives in the DB function's `WHERE` filter

#### Verification 3: DB function body excerpt

```
v_cursor CURSOR FOR
  SELECT lp.id as programada_id, lp.lead_id, lp.operador_id, lco.campana_id
  FROM operaciones.llamadas_programadas lp
  LEFT JOIN operaciones.lead_campana lco ON lco.lead_id = lp.lead_id AND lco.estado = 'activa'
  WHERE lp.estado = 'pendiente'          <-- KEY FILTER: excludes 'cancelada'
    AND lp.fecha_programada BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
    AND (...)
```

**Outcome**: No DB change required. No workflow change required. Skip behavior is correct and verified.
