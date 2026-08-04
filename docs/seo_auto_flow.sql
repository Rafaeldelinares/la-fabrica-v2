-- Auto-registration flow: when a new client gets google_cid, auto-create seo.locations entry
-- Applied: 2026-08-05

-- Function: trigger function to auto-register client location
CREATE OR REPLACE FUNCTION seo.fn_auto_register_client_location()
RETURNS TRIGGER AS $$
BEGIN
  -- Only insert if google_cid is populated AND cliente is active
  IF NEW.google_cid IS NOT NULL AND NEW.google_cid <> '' AND NEW.estado = 'activo' THEN
    INSERT INTO seo.locations (client_id, google_cid, business_name, is_monitored)
    VALUES (NEW.id, NEW.google_cid, NEW.nombre_comercial, TRUE)
    ON CONFLICT (google_cid) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on clientes.clientes (INSERT and UPDATE of google_cid or estado)
DROP TRIGGER IF EXISTS trg_auto_register_client_location ON clientes.clientes;
CREATE TRIGGER trg_auto_register_client_location
AFTER INSERT OR UPDATE OF google_cid, estado ON clientes.clientes
FOR EACH ROW
EXECUTE FUNCTION seo.fn_auto_register_client_location();
