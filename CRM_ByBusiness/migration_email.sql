
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'tipo_evento_enum') THEN
        CREATE TYPE tipo_evento_enum AS ENUM ('LLAMADA', 'EMAIL', 'CITA', 'VENTA', 'COBRO', 'INCIDENCIA', 'VENCIMIENTO', 'EMAIL_RECIBIDO');
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS timeline_global (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id INTEGER NOT NULL REFERENCES leads(id),
    operador_id INTEGER REFERENCES operadores(id),
    tipo_evento tipo_evento_enum NOT NULL,
    subtipo_resultado VARCHAR(100),
    detalles JSONB,
    fecha_evento TIMESTAMP DEFAULT NOW(),
    fecha_agendada TIMESTAMP
);

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='operadores' AND column_name='tag_correo') THEN
        ALTER TABLE operadores ADD COLUMN tag_correo VARCHAR(50);
    END IF;
END $$;

UPDATE operadores SET tag_correo = 'CRM_Admin' WHERE role = 'admin';
UPDATE operadores SET tag_correo = 'CRM_Agente01' WHERE role = 'operador';
