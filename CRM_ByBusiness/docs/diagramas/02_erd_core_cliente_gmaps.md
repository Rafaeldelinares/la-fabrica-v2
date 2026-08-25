---
title: "ERD Core — Cliente, Gmaps, Agenda"
date: 2026-08-24
project: CRM_ByBusiness
version: 1.0.0
---

# Diagrama 2: ERD Core — Cliente, Gmaps, Agenda

**Scope**: Tablas críticas para Fase 1 y flujo operativo  
**Filas totales**: ~1,300 (clientes 193 + gmaps 738 + llamadas 564 + leads 299)

## Tabla de Entidades Core

| Tabla | Filas | PK | FKs | Notas |
|-------|-------|----|-----|-------|
| `clientes.clientes` | 193 | id | lead_id→leads, gestor_id→usuarios | Canonical client source |
| `clientes.gmaps_fichas` | 193 | id | cliente_id→clientes | GBP cache, 100% place_id |
| `clientes.gmaps_historico` | 352 | id | cliente_id→clientes, ficha_id→gmaps_fichas | Snapshots de scraping |
| `clientes.entorno_competitivo` | 53 | id | cliente_id→clientes | Datos competitivos |
| `clientes.scrape_schedule` | 193 | cliente_id | cliente_id→clientes | Tracking de scrapes |
| `operaciones.leads` | 299 | id | operador_id→usuarios | **NOTA: campana_id FK dangling** |
| `operaciones.llamadas_programadas` | 564 | id | cliente_id→clientes, lead_id→leads, operador_id→usuarios | **TRUE agenda** |
| `clientes.interacciones` | 0 | id | cliente_id→clientes | VACÍA — no usar |

## Diagrama Core (Mermaid)

```mermaid
erDiagram
    clientes.clientes {
        int id PK "193 rows"
        varchar nombre_comercial "Unique per client"
        varchar nombre_fiscal
        varchar cif
        varchar telefono
        varchar email
        varchar web
        text direccion
        varchar localidad
        varchar provincia
        int lead_id FK "operaciones.leads"
        int gestor_id FK "auth.usuarios"
        varchar estado "activo|baja"
        timestamp fecha_alta
        varchar google_cid
        numeric gmaps_rating
        int gmaps_resenas
        text gmaps_url
        text gmaps_address
        jsonb gmaps_sentiment
        text place_id
        bool competitive_enabled
        int competitive_frequency_days
        jsonb competitive_recipients
        date fecha_renovacion "auto-updated on renewal"
        date proxima_accion_fecha "VACÍA - NO USAR"
    }

    clientes.gmaps_fichas {
        int id PK "193 rows - 100% place_id"
        int cliente_id FK "clientes.clientes"
        text google_cid
        text place_id "GBP identifier"
        varchar gmaps_nombre
        text gmaps_url
        text gmaps_address
        numeric gmaps_rating
        int gmaps_resenas
        jsonb gmaps_sentiment
        varchar email_gmaps
        varchar categoria
        int completeness_score "0-100"
        numeric latitud
        numeric longitud
        jsonb horarios_json
        text thumbnail_url
        text maps_phone
        text maps_website
        bool managed_by_bybusiness
        bool monitor_activo
    }

    clientes.gmaps_historico {
        bigint id PK "352 rows"
        int cliente_id FK "clientes.clientes"
        int ficha_id FK "clientes.gmaps_fichas"
        timestamp scraped_at
        text query_busqueda
        text geo
        jsonb competidores
        text grid_cell
        text fuente
    }

    clientes.entorno_competitivo {
        bigint id PK "53 rows"
        int cliente_id FK "clientes.clientes"
        timestamp scraped_at
        text query_busqueda
        text geo
        jsonb competidores
        text grid_cell
        text fuente
    }

    clientes.scrape_schedule {
        int cliente_id PK FK "clientes.clientes"
        timestamp last_scrape_at "Last successful scrape"
    }

    clientes.interacciones {
        int id PK "0 rows - VACÍA"
        int cliente_id FK "clientes.clientes"
        varchar tipo
        text notas
        timestamp created_at
    }

    operaciones.leads {
        int id PK "299 rows"
        varchar nombre_comercial
        varchar telefono
        varchar email
        text web
        varchar estado "pendiente|nuevo|ocado|vendido|no_interes"
        varchar prioridad "alta|normal|baja"
        int intentos "Contact attempts"
        int operador_id FK "auth.usuarios"
        varchar origen "landing_digital|captacion_web|scraper"
        int campana_id "FK DANGLING - operaciones.campanas MISSING"
        bool es_simulacion
        timestamp freeze_hasta
        timestamp reputacion_at "STALE since ~2026-05-09"
    }

    operaciones.llamadas_programadas {
        int id PK "564 rows - ALL estado=pendiente"
        int lead_id FK "operaciones.leads"
        int operador_id FK "auth.usuarios"
        int cliente_id FK "clientes.clientes"
        varchar tipo "responsable|seguimiento"
        varchar nombre_responsable
        timestamp fecha_programada "THE cita datetime"
        varchar estado "ALL = pendiente"
        text notas
        bool es_simulacion
    }

    auth.usuarios {
        int id PK "3 rows"
        varchar nombre
        varchar email UK
        varchar rol "admin|operador|en_practicas|supervisor"
        varchar estado
        bool es_simulacion
    }

    %% FK Relationships
    clientes.clientes ||--o{ clientes.gmaps_fichas : "1:N"
    clientes.clientes ||--o{ clientes.gmaps_historico : "1:N"
    clientes.clientes ||--o{ clientes.entorno_competitivo : "1:N"
    clientes.clientes ||--o| clientes.scrape_schedule : "1:1"
    clientes.clientes ||--o| clientes.interacciones : "1:N"
    clientes.clientes ||--o{ operaciones.llamadas_programadas : "1:N"
    
    clientes.gmaps_fichas ||--o{ clientes.gmaps_historico : "1:N"
    
    auth.usuarios ||--o{ operaciones.leads : "1:N"
    auth.usuarios ||--o{ operaciones.llamadas_programadas : "1:N"
    
    operaciones.leads ||--o{ operaciones.llamadas_programadas : "1:N"
    
    %% Legacy/Dangling
    clientes.clientes ||--o| operaciones.leads : "lead_id"
```

## Campos Clave para Fase 1

### Para detectar citas próximas (14 días)

```sql
-- Query para Fase 1 nightly cron
SELECT 
  lp.id,
  lp.cliente_id,
  c.nombre_comercial,
  c.email,
  lp.tipo,
  lp.fecha_programada
FROM operaciones.llamadas_programadas lp
JOIN clientes.clientes c ON c.id = lp.cliente_id
WHERE lp.fecha_programada BETWEEN NOW() AND NOW() + INTERVAL '14 days'
  AND lp.estado = 'pendiente'
  AND lp.es_simulacion = false
ORDER BY lp.fecha_programada ASC;
```

### Tipos de Cita

| Tipo | Descripción | Uso |
|------|-------------|-----|
| `responsable` | Reunión cara a cara con decisor | Informes estratégicos (Competitive Analysis) |
| `seguimiento` | Llamada de control | Informes ligeros (Estado GBP) |

### Estructura gmaps_sentiment (jsonb)

```json
{
  "positive": 85,
  "neutral": 10,
  "negative": 5,
  "average_rating": 4.2,
  "total_reviews": 127,
  "last_updated": "2026-08-20T12:00:00Z"
}
```

## Vistas y Materialized Views

No detectadas en los schemas inspeccionados.

## Notas de Migración 2026-08-23

- `operaciones.llamadas_programadas.cliente_id` populado vía trigger `sync_llamada_cliente_id()`
- El trigger hace match `leads.nombre_comercial = clientes.nombre_comercial`
- **NO hay migración de `clientes.citas`** — sigue vacía
