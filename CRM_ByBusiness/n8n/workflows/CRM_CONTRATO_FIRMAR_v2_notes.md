# CRM_CONTRATO_FIRMAR — Notas de cambios v2 (2026-08-19)

## Workflow ID
`sfgLJ99mINSwaSJH`

## Cambios respecto a v1

### Query del nodo "Update Contrato (Firmar)"

**Antes:** Solo seteaba `firmado=true, firmado_at=NOW()` en el contrato.

**Ahora:** Setea además, en una sola query CTE:
- `firmado = true`
- `firmado_at = NOW()`
- `contratos.fecha_inicio = COALESCE(fecha_inicio, MIN(fecha) de proformas del cliente)` — usa la fecha de la proforma si el campo está vacío (caso import histórico)
- `clientes.fecha_inicio_relacion = MIN(fecha) de proformas del cliente` — solo si es null

## Comportamiento esperado

| Campo | Valor | Notas |
|---|---|---|
| `contrato.firmado` | `true` | |
| `contrato.firmado_at` | `NOW()` | fecha de firma |
| `contrato.fecha_inicio` | `COALESCE(existente, MIN(proforma.fecha))` | no sobrescribe si ya tiene valor |
| `cliente.fecha_inicio_relacion` | `MIN(proforma.fecha)` | solo si es null |

## Coherencia con el CRM antiguo

Cuando se importan datos del CRM antiguo, la fecha de inicio de la relación
comercial debe ser la fecha de la proforma original (no la fecha actual).
Esto permite mantener la trazabilidad histórica.
