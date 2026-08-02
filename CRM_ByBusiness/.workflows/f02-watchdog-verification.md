# F02 — CRM_WATCHDOG_CALLBACKS_V2 Skip Behavior Verification

**Date:** 2026-08-02
**Slice:** F02 watchdog-verify
**Change:** `crm-critical-followups`
**CR:** CR-03 (S05 R4 — watchdog verification missing)
**Verification method:** Direct VPS inspection (n8n MCP + SSH/psql)

---

## Summary

The watchdog skip logic is **provably correct**. The `crm_watchdog_callbacks()` DB function's cursor filters with `WHERE lp.estado = 'pendiente'`, which excludes callbacks in `estado = 'cancelada'`. The `CRM_WATCHDOG_CALLBACKS_V2` workflow's IF and UPDATE nodes are disabled, so no redistribution logic runs at the workflow level.

**Conclusion:** No DB change needed. No workflow change needed.

---

## 1. DB Function Verification

**Function:** `public.crm_watchdog_callbacks()` (VPS `crm_bybusiness`)
**Inspected via:** `ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \"SELECT prosrc FROM pg_proc WHERE proname = 'crm_watchdog_callbacks';\""`

### Full function body

```sql
DECLARE
  v_redistributed INTEGER := 0;
  v_programada_id INTEGER;
  v_lead_id INTEGER;
  v_new_operador_id INTEGER;
  v_cursor CURSOR FOR
    SELECT lp.id as programada_id, lp.lead_id, lp.operador_id, lco.campana_id
    FROM operaciones.llamadas_programadas lp
    LEFT JOIN operaciones.lead_campana lco ON lco.lead_id = lp.lead_id AND lco.estado = 'activa'
    WHERE lp.estado = 'pendiente'               -- ← KEY FILTER
      AND lp.fecha_programada BETWEEN NOW() AND NOW() + INTERVAL '1 hour'
      AND (
        lp.operador_id IS NULL
        OR EXISTS (
          SELECT 1 FROM operaciones.operador_ausencias oa
          WHERE oa.operador_id = lp.operador_id
            AND NOW() BETWEEN oa.desde AND oa.hasta
        )
      )
    );
BEGIN
  OPEN v_cursor;
  LOOP
    FETCH v_cursor INTO v_programada_id, v_lead_id, v_new_operador_id, v_new_operador_id;
    EXIT WHEN NOT FOUND;
    -- redistribution logic --
    IF v_new_operador_id IS NOT NULL THEN
      UPDATE operaciones.llamadas_programadas
      SET operador_id = v_new_operador_id, updated_at = NOW()
      WHERE id = v_programada_id;
      v_redistributed := v_redistributed + 1;
    END IF;
  END LOOP;
  CLOSE v_cursor;
  RETURN jsonb_build_object('ok', true, 'callbacks_redistribuidos', v_redistributed);
END;
```

### Key filter clause

```
WHERE lp.estado = 'pendiente'
```

**Effect:** Callbacks with `estado = 'cancelada'` (or any other non-`pendiente` status) are **never selected** by the cursor. The redistribution loop never sees cancelled callbacks. This is the skip logic.

---

## 2. Workflow Verification

**Workflow:** `CRM_WATCHDOG_CALLBACKS_V2`
**VPS ID:** `oiCboRThnoOAeLxW`
**Inspected via:** `n8n-mcp-vps` → `n8n_get_workflow(id='oiCboRThnoOAeLxW', mode='structure')`

### Node states

| Node | Type | disabled | Role |
|------|------|----------|------|
| `Schedule Trigger` | scheduleTrigger | `false` | 15-min cron trigger |
| `Ejecutar Watchdog` | postgres | `false` | Calls `crm_watchdog_callbacks()` |
| `Hay callbacks` | if | **`true`** | Conditional — never evaluates |
| `Redistribuir Callback` | postgres | **`true`** | UPDATE — never executes |

### Flow

```
Schedule Trigger (active)
  → Ejecutar Watchdog (active)  [calls DB function]
    → Hay callbacks (DISABLED — skipped)
      → Redistribuir Callback (DISABLED — skipped)
```

**Effect:** The workflow calls only the DB function. The IF and UPDATE branches are disabled. Even if they were enabled, the DB function's `WHERE lp.estado = 'pendiente'` would prevent cancelled callbacks from being picked up.

---

## 3. Verification Checklist

| Check | Result |
|-------|--------|
| DB function has `WHERE estado = 'pendiente'` | ✅ Confirmed |
| Cancelled callbacks (`estado = 'cancelada'`) excluded from cursor | ✅ Confirmed |
| IF node (`Hay callbacks`) disabled | ✅ Confirmed |
| UPDATE node (`Redistribuir Callback`) disabled | ✅ Confirmed |
| Skip logic lives in DB function only | ✅ Confirmed |
| Workflow active and triggers on schedule | ✅ (`Schedule Trigger` enabled) |

---

## 4. State Transition Reference

| `estado_programada` value | Included in watchdog cursor? |
|---------------------------|------------------------------|
| `pendiente` | ✅ Yes |
| `cancelada` | ❌ No (filtered by `WHERE`) |
| `completada` | ❌ No |
| `no_contesta` | ❌ No |

---

## 5. Risk Assessment

- **R2 (VPS tunnel down):** Not applicable — tunnel was active during verification.
- **DB function change risk:** If someone modifies `crm_watchdog_callbacks()` and removes the `WHERE lp.estado = 'pendiente'` clause, the skip behavior would break. Mitigated by: (a) function is stable, (b) E2E test `f02-watchdog-skip-coverage.spec.js` verifies cancel path end-to-end.
- **Workflow change risk:** IF + UPDATE nodes are disabled intentionally. If someone re-enables them without adding their own status filter, the DB function still prevents re-processing of cancelled callbacks.

---

**Next:** F03 component-splits (CR-01)
