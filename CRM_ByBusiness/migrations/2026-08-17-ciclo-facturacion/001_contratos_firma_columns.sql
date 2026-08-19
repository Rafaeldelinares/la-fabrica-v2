-- Migration: ciclo-facturacion — firma columns on contratos
-- Adds orthogonal signature state markers to contracts
-- Idempotent: uses ADD COLUMN IF NOT EXISTS

ALTER TABLE clientes.contratos
  ADD COLUMN IF NOT EXISTS pre_firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pre_firmado_at timestamp without time zone,
  ADD COLUMN IF NOT EXISTS firmado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS firmado_at timestamp without time zone;

-- Index for efficient queries on unsigned contracts (common filter in workflows)
CREATE INDEX IF NOT EXISTS idx_contratos_firmado ON clientes.contratos(firmado) WHERE firmado = false;
