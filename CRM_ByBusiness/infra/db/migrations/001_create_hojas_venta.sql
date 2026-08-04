-- Migration: 001_create_hojas_venta
-- Creates the hojas_venta table for storing completed sale forms
-- and the notificaciones_admin table for admin in-app notifications.

CREATE TABLE IF NOT EXISTS crm_bybusiness.hojas_venta (
  id                      SERIAL PRIMARY KEY,
  lead_id                 INTEGER NOT NULL,
  operador_id             INTEGER NOT NULL,
  nombre_comercial        VARCHAR(255),
  nombre_contacto         VARCHAR(255),
  fecha                   DATE,
  nombre_facturacion      VARCHAR(255),
  nombre_empresa          VARCHAR(255),
  dni_cif                 VARCHAR(50),
  direccion               VARCHAR(255),
  ciudad                  VARCHAR(100),
  provincia               VARCHAR(100),
  codigo_postal           VARCHAR(10),
  telefono                VARCHAR(50),
  email                   VARCHAR(255),
  pagina_web              VARCHAR(255),
  categorias              TEXT,
  precio_sin_iva          NUMERIC(12,2),
  precio_con_iva          NUMERIC(12,2),
  notas                   TEXT,
  estado                  VARCHAR(20)  DEFAULT 'pendiente',  -- pendiente | enviada | cerrada
  admin_destino_id        INTEGER,
  created_at              TIMESTAMP     DEFAULT NOW(),
  updated_at              TIMESTAMP     DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hojas_venta_lead       ON crm_bybusiness.hojas_venta(lead_id);
CREATE INDEX IF NOT EXISTS idx_hojas_venta_operador   ON crm_bybusiness.hojas_venta(operador_id);
CREATE INDEX IF NOT EXISTS idx_hojas_venta_estado     ON crm_bybusiness.hojas_venta(estado);
CREATE INDEX IF NOT EXISTS idx_hojas_venta_admin     ON crm_bybusiness.hojas_venta(admin_destino_id);

-- Notificaciones in-app para admins
CREATE TABLE IF NOT EXISTS crm_bybusiness.notificaciones_admin (
  id              SERIAL PRIMARY KEY,
  tipo            VARCHAR(50),   -- 'hoja_venta_pendiente' | etc
  referencia_id   INTEGER,        -- hoja_venta.id si aplica
  admin_id        INTEGER,
  mensaje         TEXT,
  leida           BOOLEAN         DEFAULT false,
  created_at      TIMESTAMP       DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_admin_admin     ON crm_bybusiness.notificaciones_admin(admin_id);
CREATE INDEX IF NOT EXISTS idx_notif_admin_leida    ON crm_bybusiness.notificaciones_admin(leida);
CREATE INDEX IF NOT EXISTS idx_notif_admin_tipo      ON crm_bybusiness.notificaciones_admin(tipo);
