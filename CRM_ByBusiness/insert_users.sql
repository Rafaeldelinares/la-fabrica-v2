-- Semilla de Usuarios CRM ByBusiness
-- Esquema: public.operadores

-- 1. El Supervisor
INSERT INTO operadores (nombre, email, role, estado, password, usa_filtros)
VALUES (
    'Supervisor Central', 
    'admin@bybusiness.com', 
    'admin', 
    'libre', 
    'Admin2026', 
    false
)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    password = EXCLUDED.password;

-- 2. El Agente
INSERT INTO operadores (nombre, email, role, estado, password, usa_filtros)
VALUES (
    'Agente Operativo 01', 
    'operador1@bybusiness.com', 
    'operador', 
    'desconectado', 
    'Operador2026', 
    true
)
ON CONFLICT (email) DO UPDATE SET 
    role = EXCLUDED.role,
    password = EXCLUDED.password,
    usa_filtros = EXCLUDED.usa_filtros;
