-- Migration: ciclo-facturacion — proforma columns
-- Adds contract link and invoice request tracking to proformas
-- Idempotent: uses ADD COLUMN IF NOT EXISTS

ALTER TABLE clientes.proformas
  ADD COLUMN IF NOT EXISTS contrato_id integer REFERENCES clientes.contratos(id),
  ADD COLUMN IF NOT EXISTS solicitud_factura_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS solicitada_por_user_id integer REFERENCES auth.usuarios(id);

CREATE INDEX IF NOT EXISTS idx_proformas_contrato_id ON clientes.proformas(contrato_id);
