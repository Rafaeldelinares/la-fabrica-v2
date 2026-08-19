-- Migration: ciclo-facturacion — fecha inicio relacion comercial
-- Agrega la fecha en que se inicio la relacion comercial con el cliente
-- (i.e. cuando se firma el primer contrato del cliente con un producto).
--
-- Esta fecha es la referencia para:
--   - Renovaciones del contrato (fecha_inicio + meses_duracion)
--   - Programacion de llamadas de seguimiento post-firma
--   - Reportes de antiguedad del cliente
--
-- Es nullable porque solo se setea al firmar el primer contrato.
-- Idempotente: usa ADD COLUMN IF NOT EXISTS.

ALTER TABLE clientes.clientes
  ADD COLUMN IF NOT EXISTS fecha_inicio_relacion DATE;

COMMENT ON COLUMN clientes.clientes.fecha_inicio_relacion IS
  'Fecha de inicio de la relacion comercial. Se setea al firmar el primer contrato. Usada para renovaciones y seguimiento.';
