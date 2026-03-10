CREATE SCHEMA IF NOT EXISTS escaparate_com;
CREATE SCHEMA IF NOT EXISTS rrhh;

CREATE TABLE IF NOT EXISTS escaparate_com.demo_conversaciones (
    id SERIAL PRIMARY KEY,
    session_id VARCHAR(100) UNIQUE,
    tipo_usuario VARCHAR(50) NOT NULL, -- cliente_nuevo, cliente_existente, candidato
    nombre VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(50),
    empresa VARCHAR(255),
    sector VARCHAR(100),
    necesidad_detectada TEXT,
    tiene_local BOOLEAN,
    cv_adjunto VARCHAR(500), -- Ruta del archivo CV (solo candidatos)
    mensajes JSONB, -- [{role: "user|ai", text: "...", timestamp: "..."}]
    datos_adicionales JSONB, -- Campos extra específicos de cada flujo
    estado VARCHAR(50) DEFAULT 'en_conversacion', -- en_conversacion, completado, derivado_waha
    waha_enviado BOOLEAN DEFAULT false,
    email_enviado BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_demo_email ON escaparate_com.demo_conversaciones(email);
CREATE INDEX IF NOT EXISTS idx_demo_telefono ON escaparate_com.demo_conversaciones(telefono);
CREATE INDEX IF NOT EXISTS idx_demo_session ON escaparate_com.demo_conversaciones(session_id);
CREATE INDEX IF NOT EXISTS idx_demo_tipo ON escaparate_com.demo_conversaciones(tipo_usuario);

CREATE TABLE IF NOT EXISTS rrhh.candidatos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    email VARCHAR(255),
    telefono VARCHAR(50),
    posicion VARCHAR(255),
    experiencia TEXT,
    requisitos_ok BOOLEAN,
    cv_url VARCHAR(500),
    cv_recibido BOOLEAN,
    estado VARCHAR(50) DEFAULT 'pendiente_revision',
    disponibilidad VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
