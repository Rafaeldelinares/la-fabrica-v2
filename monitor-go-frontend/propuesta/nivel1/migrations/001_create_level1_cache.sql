-- ============================================================================
-- MIGRACIÓN: Nivel 1 Cache Table
-- Descripción: Tabla para cachear resultados de scraping HTTP puro (sin JS)
-- Versión: 001
-- Fecha: 2026-02-12
-- ============================================================================

-- Crear tabla de caché nivel 1
CREATE TABLE IF NOT EXISTS level1_cache (
    id BIGSERIAL PRIMARY KEY,
    
    -- Datos de búsqueda
    query TEXT NOT NULL UNIQUE,
    found BOOLEAN NOT NULL DEFAULT false,
    
    -- Datos del negocio
    place_id TEXT,
    name TEXT,
    address TEXT,
    rating NUMERIC(3, 2),
    review_count INTEGER,
    
    -- Metadata de resultados
    has_results BOOLEAN NOT NULL DEFAULT false,
    requires_js BOOLEAN NOT NULL DEFAULT false,
    result_count INTEGER NOT NULL DEFAULT 0,
    
    -- Datos completos en JSON (backup)
    result_data JSONB,
    
    -- Control de caché
    cached_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_access_at TIMESTAMP,
    access_count INTEGER NOT NULL DEFAULT 0,
    ttl_days INTEGER NOT NULL DEFAULT 30,
    
    -- Constraints
    CONSTRAINT valid_ttl CHECK (ttl_days > 0 AND ttl_days <= 365),
    CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5)),
    CONSTRAINT valid_review_count CHECK (review_count IS NULL OR review_count >= 0)
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

-- Índice principal por query (búsquedas rápidas)
CREATE INDEX IF NOT EXISTS idx_level1_cache_query ON level1_cache(query);

-- Índice por fecha de cache (para limpiezas)
CREATE INDEX IF NOT EXISTS idx_level1_cache_cached_at ON level1_cache(cached_at);

-- Índice compuesto para verificar expiración
CREATE INDEX IF NOT EXISTS idx_level1_cache_expiration 
ON level1_cache(cached_at, ttl_days);

-- Índice por place_id (para búsquedas inversas)
CREATE INDEX IF NOT EXISTS idx_level1_cache_place_id 
ON level1_cache(place_id) 
WHERE place_id IS NOT NULL;

-- Índice para estadísticas (queries más populares)
CREATE INDEX IF NOT EXISTS idx_level1_cache_access_count 
ON level1_cache(access_count DESC);

-- Índice por found (para filtrar resultados encontrados)
CREATE INDEX IF NOT EXISTS idx_level1_cache_found 
ON level1_cache(found) 
WHERE found = true;

-- Índice GIN para búsquedas en JSON (opcional, para queries avanzadas)
CREATE INDEX IF NOT EXISTS idx_level1_cache_result_data 
ON level1_cache USING GIN (result_data);

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para limpiar caché expirado
CREATE OR REPLACE FUNCTION cleanup_expired_level1_cache()
RETURNS TABLE(deleted_count BIGINT, freed_space TEXT) AS $$
DECLARE
    deleted_rows BIGINT;
    before_size BIGINT;
    after_size BIGINT;
BEGIN
    -- Obtener tamaño antes
    SELECT pg_total_relation_size('level1_cache') INTO before_size;
    
    -- Eliminar entradas expiradas
    DELETE FROM level1_cache 
    WHERE cached_at < NOW() - INTERVAL '1 day' * ttl_days;
    
    GET DIAGNOSTICS deleted_rows = ROW_COUNT;
    
    -- Obtener tamaño después
    SELECT pg_total_relation_size('level1_cache') INTO after_size;
    
    -- Vacuum para liberar espacio
    EXECUTE 'VACUUM ANALYZE level1_cache';
    
    RETURN QUERY SELECT 
        deleted_rows,
        pg_size_pretty(before_size - after_size);
END;
$$ LANGUAGE plpgsql;

-- Función para obtener estadísticas del caché
CREATE OR REPLACE FUNCTION get_level1_cache_stats()
RETURNS TABLE(
    total_entries BIGINT,
    valid_entries BIGINT,
    expired_entries BIGINT,
    found_rate NUMERIC,
    avg_access_count NUMERIC,
    cache_size TEXT,
    oldest_entry TIMESTAMP,
    newest_entry TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE cached_at > NOW() - INTERVAL '1 day' * ttl_days) as valid,
        COUNT(*) FILTER (WHERE cached_at <= NOW() - INTERVAL '1 day' * ttl_days) as expired,
        ROUND(
            COUNT(*) FILTER (WHERE level1_cache.found = true)::NUMERIC / 
            NULLIF(COUNT(*), 0) * 100, 
            2
        ) as found_pct,
        ROUND(AVG(access_count), 2) as avg_access,
        pg_size_pretty(pg_total_relation_size('level1_cache')) as size,
        MIN(cached_at) as oldest,
        MAX(cached_at) as newest
    FROM level1_cache;
END;
$$ LANGUAGE plpgsql;

-- Función para resetear contadores de acceso
CREATE OR REPLACE FUNCTION reset_level1_cache_access_counts()
RETURNS BIGINT AS $$
DECLARE
    updated_rows BIGINT;
BEGIN
    UPDATE level1_cache 
    SET access_count = 0, last_access_at = NULL;
    
    GET DIAGNOSTICS updated_rows = ROW_COUNT;
    
    RETURN updated_rows;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Trigger para actualizar automáticamente last_access_at
CREATE OR REPLACE FUNCTION update_last_access_at()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.access_count > OLD.access_count THEN
        NEW.last_access_at = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_last_access
BEFORE UPDATE ON level1_cache
FOR EACH ROW
WHEN (NEW.access_count > OLD.access_count)
EXECUTE FUNCTION update_last_access_at();

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de entradas válidas (no expiradas)
CREATE OR REPLACE VIEW level1_cache_valid AS
SELECT 
    id, query, found, place_id, name, address, 
    rating, review_count, has_results, requires_js,
    result_count, cached_at, last_access_at, access_count,
    ttl_days,
    (NOW() - cached_at) as age,
    (NOW() - INTERVAL '1 day' * ttl_days + cached_at) as expires_in
FROM level1_cache
WHERE cached_at > NOW() - INTERVAL '1 day' * ttl_days
ORDER BY cached_at DESC;

-- Vista de queries más populares
CREATE OR REPLACE VIEW level1_cache_top_queries AS
SELECT 
    query,
    found,
    access_count,
    cached_at,
    last_access_at,
    ROUND(
        EXTRACT(EPOCH FROM (last_access_at - cached_at)) / 3600, 
        2
    ) as hours_between_accesses
FROM level1_cache
WHERE cached_at > NOW() - INTERVAL '1 day' * ttl_days
ORDER BY access_count DESC
LIMIT 100;

-- Vista de estadísticas por día
CREATE OR REPLACE VIEW level1_cache_daily_stats AS
SELECT 
    DATE(cached_at) as date,
    COUNT(*) as entries_created,
    COUNT(*) FILTER (WHERE found = true) as found_count,
    COUNT(*) FILTER (WHERE requires_js = true) as requires_js_count,
    AVG(result_count) as avg_result_count,
    AVG(rating) FILTER (WHERE rating IS NOT NULL) as avg_rating
FROM level1_cache
WHERE cached_at > NOW() - INTERVAL '30 days'
GROUP BY DATE(cached_at)
ORDER BY date DESC;

-- ============================================================================
-- PROGRAMACIÓN DE TAREAS (Requiere pg_cron extension)
-- ============================================================================

-- Descomentar si tienes pg_cron instalado:

-- Limpiar caché expirado diariamente a las 3 AM
-- SELECT cron.schedule(
--     'cleanup-level1-cache',
--     '0 3 * * *',
--     'SELECT cleanup_expired_level1_cache()'
-- );

-- Vacuum semanal los domingos a las 4 AM
-- SELECT cron.schedule(
--     'vacuum-level1-cache',
--     '0 4 * * 0',
--     'VACUUM ANALYZE level1_cache'
-- );

-- ============================================================================
-- DATOS DE EJEMPLO (Opcional - para testing)
-- ============================================================================

-- Insertar algunos datos de ejemplo
-- INSERT INTO level1_cache (query, found, place_id, name, address, rating, review_count)
-- VALUES 
--     ('Restaurante El Patio Málaga', true, 'ChIJ123abc', 'El Patio', 'Calle Example 1, Málaga', 4.5, 234),
--     ('Hotel Costa del Sol Marbella', true, 'ChIJ456def', 'Costa del Sol Hotel', 'Av. Marítima 50, Marbella', 4.2, 567),
--     ('Peluquería Mary Sevilla', false, NULL, NULL, NULL, NULL, NULL);

-- ============================================================================
-- COMENTARIOS EN COLUMNAS (Documentación)
-- ============================================================================

COMMENT ON TABLE level1_cache IS 'Caché de resultados de scraping HTTP nivel 1 (sin JavaScript)';
COMMENT ON COLUMN level1_cache.query IS 'Query de búsqueda original (negocio + ciudad)';
COMMENT ON COLUMN level1_cache.found IS 'Si se encontró el negocio en Google Maps';
COMMENT ON COLUMN level1_cache.place_id IS 'Google Place ID único del negocio';
COMMENT ON COLUMN level1_cache.requires_js IS 'Si la página requiere JavaScript para renderizar';
COMMENT ON COLUMN level1_cache.result_data IS 'Datos completos del resultado en formato JSON';
COMMENT ON COLUMN level1_cache.access_count IS 'Número de veces que se ha consultado esta entrada';
COMMENT ON COLUMN level1_cache.ttl_days IS 'Días de validez del caché antes de expirar';

-- ============================================================================
-- PERMISOS (Opcional - ajustar según tu configuración)
-- ============================================================================

-- Crear rol de solo lectura para reportes
-- CREATE ROLE level1_cache_readonly;
-- GRANT SELECT ON level1_cache TO level1_cache_readonly;
-- GRANT SELECT ON level1_cache_valid TO level1_cache_readonly;
-- GRANT SELECT ON level1_cache_top_queries TO level1_cache_readonly;

-- ============================================================================
-- VERIFICACIÓN DE LA MIGRACIÓN
-- ============================================================================

-- Verificar que la tabla existe
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'level1_cache') THEN
        RAISE NOTICE '✓ Tabla level1_cache creada exitosamente';
    ELSE
        RAISE EXCEPTION '✗ Error: Tabla level1_cache no existe';
    END IF;
END $$;

-- Verificar índices
DO $$
DECLARE
    index_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE tablename = 'level1_cache';
    
    RAISE NOTICE '✓ % índices creados en level1_cache', index_count;
END $$;

-- Mostrar estadísticas iniciales
SELECT * FROM get_level1_cache_stats();

-- ============================================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================================
