-- Schema de infraestructura para monitorización

CREATE SCHEMA IF NOT EXISTS infraestructura;

-- Tabla de contenedores Docker
CREATE TABLE IF NOT EXISTS infraestructura.inventario_contenedores (
    id SERIAL PRIMARY KEY,
    container_id VARCHAR(100) UNIQUE,
    nombre VARCHAR(255),
    imagen VARCHAR(255),
    estado VARCHAR(50),
    puertos TEXT,
    red VARCHAR(100),
    uptime TEXT,
    labels JSONB,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de endpoints y webhooks
CREATE TABLE IF NOT EXISTS infraestructura.servicios_endpoints (
    id SERIAL PRIMARY KEY,
    servicio VARCHAR(255) NOT NULL,
    tipo VARCHAR(50),
    url TEXT NOT NULL,
    metodo VARCHAR(10),
    descripcion TEXT,
    ejemplo_payload JSONB,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de workflows de n8n
CREATE TABLE IF NOT EXISTS infraestructura.workflows_n8n (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT false,
    webhook_urls TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de imágenes Docker disponibles
CREATE TABLE IF NOT EXISTS infraestructura.imagenes_disponibles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255),
    tag VARCHAR(100),
    size_mb NUMERIC(10,2),
    en_uso BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nombre, tag)
);

-- Tabla de recursos del servidor
CREATE TABLE IF NOT EXISTS infraestructura.recursos_servidor (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    ram_total_gb NUMERIC(10,2),
    ram_usado_gb NUMERIC(10,2),
    ram_porcentaje INTEGER,
    disco_total_gb NUMERIC(10,2),
    disco_usado_gb NUMERIC(10,2),
    disco_porcentaje INTEGER,
    cpu_load NUMERIC(5,2),
    uptime TEXT
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS infraestructura.historial_auditorias (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    tipo VARCHAR(50),
    descripcion TEXT,
    datos JSONB
);

-- Asignar permisos
ALTER TABLE infraestructura.inventario_contenedores OWNER TO rafael;
ALTER TABLE infraestructura.servicios_endpoints OWNER TO rafael;
ALTER TABLE infraestructura.workflows_n8n OWNER TO rafael;
ALTER TABLE infraestructura.imagenes_disponibles OWNER TO rafael;
ALTER TABLE infraestructura.recursos_servidor OWNER TO rafael;
ALTER TABLE infraestructura.historial_auditorias OWNER TO rafael;
