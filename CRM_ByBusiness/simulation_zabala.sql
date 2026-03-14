
-- Limpieza y Preparación de Operadores
INSERT INTO operadores (nombre, email, role, password, tag_correo) VALUES 
('Marta', 'marta@bybusiness.com', 'operador', 'pass123', 'CRM_Marta'),
('Luis', 'luis@bybusiness.com', 'operador', 'pass123', 'CRM_Luis'),
('Pedro', 'pedro@bybusiness.com', 'operador', 'pass123', 'CRM_Pedro')
ON CONFLICT (email) DO UPDATE SET tag_correo = EXCLUDED.tag_correo;

-- FASE 1: MÁSCARA DE SEGURIDAD
UPDATE leads SET email = 'informacion+test_zabala@ia-bybusiness.com' WHERE nombre_comercial LIKE '%Talleres Zabala%';

-- FASE 2: INYECCIÓN DE HISTORIA
-- ID del Lead 1049 (Talleres Zabala)
DELETE FROM timeline_global WHERE lead_id = (SELECT id FROM leads WHERE nombre_comercial LIKE '%Talleres Zabala%');

-- Día T-7: Carga Inicial
INSERT INTO timeline_global (lead_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT id, 'LLAMADA', 'Carga de Combustible', '{"nota": "Lead cargado desde base maestra. Rating 3.5"}'::jsonb, '2026-02-02 09:00:00'
FROM leads WHERE nombre_comercial LIKE '%Talleres Zabala%';

-- Día T-6: Intento Fallido (Marta)
INSERT INTO timeline_global (lead_id, operador_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT l.id, o.id, 'LLAMADA', 'No contesta / Buzón', '{"nota": "El lead sigue libre."}'::jsonb, '2026-02-03 11:00:00'
FROM leads l, operadores o WHERE l.nombre_comercial LIKE '%Talleres Zabala%' AND o.nombre = 'Marta';

-- Día T-5: Rechazo (Luis)
INSERT INTO timeline_global (lead_id, operador_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT l.id, o.id, 'LLAMADA', 'No le interesa ahora', '{"nota": "Lead sigue libre pero enfriado."}'::jsonb, '2026-02-04 16:30:00'
FROM leads l, operadores o WHERE l.nombre_comercial LIKE '%Talleres Zabala%' AND o.nombre = 'Luis';

-- Día T-4: Captura y Bloqueo (Pedro)
INSERT INTO timeline_global (lead_id, operador_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT l.id, o.id, 'EMAIL', 'Interesado / Info', '{"nota": "Documentación enviada. Lead bloqueado para Pedro."}'::jsonb, '2026-02-05 10:15:00'
FROM leads l, operadores o WHERE l.nombre_comercial LIKE '%Talleres Zabala%' AND o.nombre = 'Pedro';

UPDATE leads SET operador_id = (SELECT id FROM operadores WHERE nombre = 'Pedro'), estado = 'SEGUIMIENTO' 
WHERE nombre_comercial LIKE '%Talleres Zabala%';

-- Día T-2: Respuesta Cliente
INSERT INTO timeline_global (lead_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT id, 'EMAIL_RECIBIDO', 'Confirmación Lectura', '{"nota": "He visto la info, llamadme el lunes."}'::jsonb, '2026-02-07 12:00:00'
FROM leads l WHERE nombre_comercial LIKE '%Talleres Zabala%';

-- Día T-0 (HOY): Cierre
INSERT INTO timeline_global (lead_id, operador_id, tipo_evento, subtipo_resultado, detalles, fecha_evento)
SELECT l.id, o.id, 'VENTA', 'Venta Cerrada (Proforma)', '{"nota": "Venta de Posicionamiento Maps (18 meses)."}'::jsonb, NOW()
FROM leads l, operadores o WHERE l.nombre_comercial LIKE '%Talleres Zabala%' AND o.nombre = 'Pedro';

UPDATE leads SET estado = 'VENDIDO' WHERE nombre_comercial LIKE '%Talleres Zabala%';
