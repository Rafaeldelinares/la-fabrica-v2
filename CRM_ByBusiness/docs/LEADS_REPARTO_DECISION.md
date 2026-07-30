# Decisión: Reparto de Leads entre LEADS LANDING y GESTIÓN DE LEADS

**Fecha**: 2026-06-21
**Estado**: Vigente
**Workflows afectados**: `CRM_LEADS_LANDING_FINAL` (id `yAtQ6wt8YtFwQLvr`), `CRM_GESTION_LEADS_GET` (id `5DuC7I7jenCBmzv9`)
**Componentes afectados**: `LeadsLandingPanel.jsx`, `LeadsPanel.jsx` (legacy), `WorkBody.jsx`, `Dashboard.jsx`

## Contexto

Inicialmente había un único panel "GESTIÓN DE LEADS" que mostraba todos los leads mezclados. Rafael pidió iterar sobre el reparto entre dos paneles con diferentes lógicas de negocio:

1. **LEADS LANDING** — para que el admin vea qué leads son **pre-clientes** (captación web) y qué leads **ya se convirtieron en ventas**.
2. **GESTIÓN DE LEADS** — para tener el **pool de leads sin tocar** que se pueden asignar a operadores.

## Alternativas consideradas

### Opción A — Solo captación web en LEADS LANDING

```sql
WHERE l.origen IN ('landing_digital', 'captacion_web')
```

- ✅ Simple, sin JOINs adicionales
- ❌ El admin no ve las **ventas recientes** (desatascos, aurgi, etc.)

### Opción B — Captación + operador activo

```sql
WHERE l.origen IN ('landing_digital', 'captacion_web')
   OR l.estado IN ('asignado', 'vendido', 'en_llamada')
```

- ✅ Muestra captación y operador activo
- ❌ **164 leads `asignado` de `almacen_masivo`** saturaban la vista
- ❌ El admin pedía que `almacen_masivo` fuera a GESTIÓN DE LEADS

### Opción C (FINAL) — Captación + leads con cliente vinculado

```sql
WHERE (l.origen IN ('landing_digital', 'captacion_web'))
   OR (c.id IS NOT NULL)   -- c = clientes.clientes joined on c.lead_id = l.id
```

- ✅ Muestra captación web (cualquier estado)
- ✅ Muestra leads que **ya se convirtieron en clientes** (ventas reales)
- ✅ Los leads `asignado` (en gestión) van a GESTIÓN DE LEADS
- ✅ `almacen_masivo` solo aparece si ya se vendió

## Queries finales

### LEADS LANDING — `CRM_LEADS_LANDING_FINAL`

```sql
SELECT
  l.id, l.nombre_comercial, l.telefono, l.email, l.localidad, l.provincia, l.categoria,
  l.estado, l.prioridad, l.origen, l.campana_id, l.operador_id,
  u.nombre as operador_nombre, l.created_at, l.updated_at, l.es_simulacion,
  l.intentos_no_contesta, c.id as cliente_id, c.fecha_alta as cliente_fecha_alta,
  c.estado as cliente_estado,
  COALESCE((SELECT hl.detalles::text FROM operaciones.historial_llamadas hl
            WHERE hl.lead_id = l.id AND hl.resultado = 'venta'
            ORDER BY hl.created_at DESC LIMIT 1), NULL) as venta_detalles,
  (SELECT COUNT(*) FROM operaciones.historial_llamadas hl2 WHERE hl2.lead_id = l.id) as total_llamadas,
  (SELECT MAX(hl3.created_at) FROM operaciones.historial_llamadas hl3 WHERE hl3.lead_id = l.id) as ultima_interaccion
FROM operaciones.leads l
LEFT JOIN auth.usuarios u ON u.id = l.operador_id
LEFT JOIN clientes.clientes c ON c.lead_id = l.id
WHERE l.es_simulacion = false
  AND l.telefono IS NOT NULL
  AND l.telefono != ''
  AND (
    l.origen IN ('landing_digital', 'captacion_web')
    OR c.id IS NOT NULL
  )
ORDER BY l.updated_at DESC NULLS LAST, l.created_at DESC
LIMIT 1000
```

### GESTIÓN DE LEADS — `CRM_GESTION_LEADS_GET`

```sql
SELECT
  l.id, l.nombre_comercial, l.telefono, l.email, l.localidad, l.provincia, l.categoria,
  l.estado, l.prioridad, l.origen, l.campana_id, l.operador_id,
  u.nombre as operador_nombre, l.created_at, l.updated_at, l.es_simulacion,
  l.intentos_no_contesta,
  c.id as cliente_id, c.fecha_alta as cliente_fecha_alta,
  c.estado as cliente_estado,
  (SELECT COUNT(*) FROM operaciones.historial_llamadas hl2 WHERE hl2.lead_id = l.id) as total_llamadas,
  (SELECT MAX(hl3.created_at) FROM operaciones.historial_llamadas hl3 WHERE hl3.lead_id = l.id) as ultima_interaccion
FROM operaciones.leads l
LEFT JOIN auth.usuarios u ON u.id = l.operador_id
LEFT JOIN clientes.clientes c ON c.lead_id = l.id
WHERE l.es_simulacion = false
  AND l.telefono IS NOT NULL
  AND l.telefono != ''
  AND l.origen NOT IN ('landing_digital', 'captacion_web')
  AND c.id IS NULL
ORDER BY l.created_at DESC
LIMIT 2000
```

## Tab y sidebar mapping

| Sidebar id | activeTab | Componente | tabTitle |
|------------|-----------|------------|----------|
| `LEADS_GESTON` | `LEADS_GESTON` | `LeadsLandingPanel` | LEADS LANDING |
| — | `LEADS_LANDING` | `LeadsLandingPanel` (alias) | LEADS LANDING |
| — (legacy) | `LEADS_MGMT` | `LeadsPanel` (legacy) | GESTIÓN DE LEADS |

El sidebar muestra **"GESTIÓN DE LEADS"** con id `LEADS_GESTON` que mapea a `LeadsLandingPanel`. Esto es intencional: el sidebar mantiene el nombre de negocio, pero el panel interno tiene el nombre técnico "LEADS LANDING" (en el `<h2>` interno y en el `tabTitles`).

## KPIs resultantes (2026-06-21)

| Panel | Total | Desglose |
|-------|-------|----------|
| LEADS LANDING | 37 | 9 captación web + 28 vendidos (con cliente_id) |
| GESTIÓN DE LEADS | 2000 | 877 almacen_masivo + 1123 scraper_bajo (sin cliente) |

## Por qué "cliente vinculado" en vez de "estado = vendido"

El campo `operaciones.leads.estado` **no se actualiza de forma confiable** cuando un lead se vende. El trigger `fn_lead_vendido_to_cliente` inserta un cliente (con `ON CONFLICT lead_id DO UPDATE`) pero el `NEW.estado` no siempre es `'vendido'`. En su lugar, usamos `clientes.clientes.id IS NOT NULL` como **fuente de verdad**: si hay un cliente vinculado al lead, significa que pasó por el flujo de venta.

## Workflow IDs

| Workflow | ID | Webhook path |
|----------|-----|--------------|
| `CRM_LEADS_LANDING_FINAL` | `yAtQ6wt8YtFwQLvr` | `GET /webhook/crm-leads-landing-get` |
| `CRM_GESTION_LEADS_GET` | `5DuC7I7jenCBmzv9` | `GET /webhook/crm-gestion-leads-get` |

## Cambios futuros

- Cuando los scrapers vuelvan a estar activos y `reputacion_at` se actualice, considerar refiltrar el pool de gestión por reputación mínima.
- Si el volumen de `almacen_masivo` baja de 1000, subir el `LIMIT` a 5000 en GESTIÓN DE LEADS.
