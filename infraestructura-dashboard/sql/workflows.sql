CREATE TABLE IF NOT EXISTS infraestructura.workflows_n8n (
    id SERIAL PRIMARY KEY,
    workflow_id VARCHAR(100) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    activo BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

ALTER TABLE infraestructura.workflows_n8n OWNER TO rafael;
