-- Migration: ciclo-facturacion — extend estado CHECK constraints
-- Adds new lifecycle states for proformas and facturas
-- Existing constraint names from pg_constraint audit:
--   proformas: proformas_estado_check
--   facturas:  facturas_estado_check
-- Idempotent: uses DROP CONSTRAINT IF EXISTS before ADD

-- Drop existing CHECK constraints
ALTER TABLE clientes.proformas DROP CONSTRAINT IF EXISTS proformas_estado_check;
ALTER TABLE clientes.facturas  DROP CONSTRAINT IF EXISTS facturas_estado_check;

-- Re-add proformas_estado_check with extended values
-- Existing values: borrador, verificada, pendiente_cliente, aceptada, aprobada, rechazada
-- Added: rellenada, enviada
ALTER TABLE clientes.proformas ADD CONSTRAINT proformas_estado_check
  CHECK (estado IN (
    'borrador',
    'verificada',
    'pendiente_cliente',
    'aceptada',
    'aprobada',
    'rechazada',
    'rellenada',
    'enviada'
  ));

-- Re-add facturas_estado_check with extended values
-- Existing values: emitida, cobrada, vencida, anulada
-- Added: pendiente_envio, enviada
ALTER TABLE clientes.facturas ADD CONSTRAINT facturas_estado_check
  CHECK (estado IN (
    'emitida',
    'cobrada',
    'vencida',
    'anulada',
    'pendiente_envio',
    'enviada'
  ));
