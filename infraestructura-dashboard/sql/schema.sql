CREATE SCHEMA IF NOT EXISTS infraestructura;

CREATE TABLE IF NOT EXISTS infraestructura.inventario_contenedores (
    id SERIAL PRIMARY KEY,
    container_id VARCHAR(64) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    imagen VARCHAR(255) NOT NULL,
    estado VARCHAR(50) NOT NULL,
    puertos TEXT,
    red VARCHAR(100),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    uptime VARCHAR(100),
    labels JSONB
);

CREATE TABLE IF NOT EXISTS infraestructura.servicios_endpoints (
    id SERIAL PRIMARY KEY,
    servicio VARCHAR(100) NOT NULL,
    tipo VARCHAR(50) NOT NULL, -- 'webhook', 'api', 'web', 'database'
    url TEXT NOT NULL,
    metodo VARCHAR(10), -- 'GET', 'POST', etc.
    descripcion TEXT,
    ejemplo_payload JSONB,
    activo BOOLEAN DEFAULT true,
    container_id VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS infraestructura.imagenes_disponibles (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    tag VARCHAR(100) NOT NULL,
    size_mb DECIMAL(10,2),
    en_uso BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(nombre, tag)
);

CREATE TABLE IF NOT EXISTS infraestructura.recursos_servidor (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    ram_total_gb DECIMAL(10,2),
    ram_usado_gb DECIMAL(10,2),
    ram_porcentaje INTEGER,
    disco_total_gb DECIMAL(10,2),
    disco_usado_gb DECIMAL(10,2),
    disco_porcentaje INTEGER,
    cpu_load DECIMAL(5,2),
    uptime VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS infraestructura.historial_auditorias (
    id SERIAL PRIMARY KEY,
    timestamp TIMESTAMP DEFAULT NOW(),
    tipo VARCHAR(50) NOT NULL, -- 'sync', 'deploy', 'cambio'
    descripcion TEXT,
    datos JSONB,
    usuario VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS infraestructura.workflows_n8n (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) UNIQUE NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT false,
    tags TEXT,
    nodes_count INTEGER DEFAULT 0,
    webhook_urls TEXT[],
    created_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW()
);
