---
title: "ERD Completo — DB VPS crm_bybusiness"
date: 2026-08-24
project: CRM_ByBusiness
version: 1.0.0
---

# Diagrama 1: ERD Completo — DB VPS

**Tablas**: 34 tablas base en 9 schemas  
**FKs válidas**: 27  
**Triggers**: 1 (`operaciones.sync_llamada_cliente_id`)  
**Gaps**: `operaciones.campanas` MISSING

## Tabla de Entidades

| Schema | Tabla | Filas | Tamaño | Notas |
|--------|-------|-------|--------|-------|
| auth | usuarios | 3 | 16KB | PK: id |
| clientes | clientes | 193 | 434KB | PK: id, FK: lead_id→leads |
| clientes | gmaps_fichas | 193 | 442KB | FK: cliente_id→clientes |
| clientes | gmaps_historico | 352 | 15.8MB | FK: cliente_id,ficha_id→clientes,gmaps_fichas |
| clientes | entorno_competitivo | 53 | 295KB | FK: cliente_id→clientes |
| clientes | scrape_schedule | 193 | 41KB | FK: cliente_id→clientes |
| clientes | contratos | 229 | 106KB | FK: cliente_id,proforma_id,producto_id |
| clientes | contratos_digitales | 229 | 156KB | FK: contrato_id→contratos |
| clientes | proformas | 229 | 106KB | FK: cliente_id,contrato_id,proforma_padre_id |
| clientes | proforma_lineas | 248 | 115KB | FK: proforma_id,producto_id |
| clientes | productos | 59 | 57KB | PK: id |
| clientes | facturas | 0 | 8KB | VACÍA |
| clientes | factura_lineas | 0 | 8KB | VACÍA |
| clientes | citas | 0 | 25KB | **VACÍA — usar llamadas_programadas** |
| clientes | interacciones | 0 | 8KB | VACÍA |
| clientes | scrape_schedule | 193 | 41KB | FK: cliente_id→clientes |
| clientes | scraping_jobs | 0 | 8KB | VACÍA |
| clientes | informes_cache | 0 | 8KB | VACÍA |
| clientes | tarjetas_digitales | 0 | 8KB | VACÍA |
| clientes | configuracion_gestor | 0 | 8KB | VACÍA |
| clientes | series_facturacion | 0 | 0KB | VACÍA |
| clientes | series_factura | 0 | 0KB | VACÍA |
| clientes | gestor_envios | 0 | 8KB | VACÍA |
| clientes | gestor_envio_facturas | 0 | 0KB | VACÍA |
| clientes | contrato_envios | 0 | 8KB | VACÍA |
| clientes | factura_envios | 0 | 8KB | VACÍA |
| clientes | proforma_estado_log | 0 | 8KB | VACÍA |
| operaciones | leads | 299 | 229KB | PK: id, **FK dangling: campana_id** |
| operaciones | llamadas_programadas | 564 | 246KB | FK: cliente_id→clientes |
| operaciones | llamadas_activas | 0 | 8KB | VACÍA |
| operaciones | historial_llamadas | 0 | 8KB | VACÍA |
| operaciones | campanas_envios | 0 | 0KB | VACÍA |
| reputacion | alertas | 0 | 8KB | VACÍA |
| sistema | eventos_sistema | 4 | 16KB | PK: id |
| public | timeline_global | 0 | 8KB | VACÍA |

## Diagrama de Entidades (Mermaid)

```mermaid
erDiagram
    auth.usuarios {
        int id PK
        varchar nombre
        varchar email UK
        varchar password_hash
        varchar totp_secret
        bool totp_habilitado
        bool totp_configurado
        bool totp_obligatorio
        varchar rol
        varchar estado
        uuid llamada_actual
        bool es_simulacion
        timestamp ultimo_acceso
    }

    clientes.clientes {
        int id PK
        varchar nombre_comercial
        varchar nombre_fiscal
        varchar cif
        varchar telefono
        varchar email
        varchar web
        text direccion
        varchar localidad
        varchar provincia
        int lead_id FK
        int contacto_id
        int operador_captacion_id
        int gestor_id FK
        varchar estado
        timestamp fecha_alta
        varchar google_cid
        numeric gmaps_rating
        int gmaps_resenas
        text gmaps_url
        jsonb gmaps_sentiment
        timestamp gmaps_last_updated
        text place_id
        bool competitive_enabled
        int competitive_frequency_days
        jsonb competitive_recipients
        date fecha_renovacion
        date proxima_accion_fecha "VACÍA"
    }

    clientes.gmaps_fichas {
        int id PK
        int cliente_id FK
        text google_cid
        text place_id
        varchar gmaps_nombre
        text gmaps_url
        text gmaps_address
        numeric gmaps_rating
        int gmaps_resenas
        jsonb gmaps_sentiment
        varchar email_gmaps
        varchar categoria
        int completeness_score
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
        bigint id PK
        int cliente_id FK
        int ficha_id FK
        timestamp scraped_at
        text query_busqueda
        text geo
        jsonb competidores
        text grid_cell
        text fuente
    }

    clientes.entorno_competitivo {
        bigint id PK
        int cliente_id FK
        timestamp scraped_at
        text query_busqueda
        text geo
        jsonb competidores
        text grid_cell
        text fuente
    }

    clientes.scrape_schedule {
        int cliente_id PK FK
        timestamp last_scrape_at
    }

    clientes.contratos {
        int id PK
        int cliente_id FK
        int proforma_id FK
        int producto_id FK
        varchar estado
        date fecha_firma
        date fecha_inicio
        date fecha_fin
    }

    clientes.contratos_digitales {
        int id PK
        int contrato_id FK
        varchar url
        varchar estado
    }

    clientes.proformas {
        int id PK
        int cliente_id FK
        int contrato_id FK
        int proforma_padre_id FK
        varchar estado
        numeric total
        timestamp created_at
    }

    clientes.proforma_lineas {
        bigint id PK
        int proforma_id FK
        int producto_id FK
        int cantidad
        numeric precio_unitario
        numeric subtotal
    }

    clientes.productos {
        int id PK
        varchar nombre
        varchar descripcion
        numeric precio
        bool activo
    }

    clientes.citas {
        int id PK
        int cliente_id FK
        varchar tipo "VACÍA"
        timestamp fecha_programada "VACÍA"
        varchar estado "VACÍA"
    }

    clientes.interacciones {
        int id PK
        int cliente_id FK
        varchar tipo
        text notas
        timestamp created_at
    }

    operaciones.leads {
        int id PK
        varchar nombre_comercial
        varchar telefono
        varchar email
        text web
        text direccion
        varchar localidad
        varchar provincia
        varchar categoria
        numeric scoring
        numeric rating
        int num_resenas
        text google_maps_link
        varchar google_cid
        varchar estado
        varchar prioridad
        int intentos
        int operador_id FK
        varchar origen
        int origen_id
        int campana_id "FK DANGLING — operacion.campanas MISSING"
        bool es_simulacion
        timestamp freeze_hasta
        varchar freeze_razon
        int intentos_no_contesta
        timestamp reputacion_at "STALE desde ~2026-05-09"
    }

    operaciones.llamadas_programadas {
        int id PK
        int lead_id FK
        int operador_id FK
        int cliente_id FK
        varchar tipo "responsable|seguimiento"
        varchar nombre_responsable
        timestamp fecha_programada
        varchar estado "pendiente"
        text notas
        bool es_simulacion
    }

    reputacion.alertas {
        int id PK
        int cliente_id FK
        varchar tipo
        varchar severidad
        text descripcion
        bool resuelta
        timestamp created_at
    }

    sistema.eventos_sistema {
        int id PK
        varchar tipo
        text detalles
        timestamp created_at
    }

    public.timeline_global {
        int id PK
        int lead_id
        int cliente_id
        int operador_id
        varchar tipo_evento
        varchar subtipo_resultado
        jsonb detalles
        timestamp fecha_evento
        timestamp fecha_agendada
    }

    %% FKs
    clientes.clientes ||--o{ clientes.gmaps_fichas : "cliente_id"
    clientes.clientes ||--o{ clientes.gmaps_historico : "cliente_id"
    clientes.clientes ||--o{ clientes.entorno_competitivo : "cliente_id"
    clientes.clientes ||--o{ clientes.scrape_schedule : "cliente_id"
    clientes.clientes ||--o{ clientes.contratos : "cliente_id"
    clientes.clientes ||--o{ clientes.proformas : "cliente_id"
    clientes.clientes ||--o{ clientes.citas : "cliente_id"
    clientes.clientes ||--o{ clientes.interacciones : "cliente_id"
    clientes.clientes ||--o{ operaciones.llamadas_programadas : "cliente_id"
    clientes.clientes ||--o{ reputacion.alertas : "cliente_id"
    
    clientes.contratos ||--o{ clientes.contratos_digitales : "contrato_id"
    clientes.contratos ||--o| clientes.proformas : "proforma_id"
    clientes.contratos ||--o| clientes.productos : "producto_id"
    
    clientes.proformas ||--o{ clientes.proforma_lineas : "proforma_id"
    clientes.proformas ||--o{ clientes.contratos : "contrato_id"
    clientes.proformas ||--o| clientes.proformas : "proforma_padre_id"
    
    clientes.gmaps_fichas ||--o{ clientes.gmaps_historico : "ficha_id"
    
    auth.usuarios ||--o{ operaciones.leads : "operador_id"
    auth.usuarios ||--o{ operaciones.llamadas_programadas : "operador_id"
    
    operaciones.leads ||--o{ operaciones.llamadas_programadas : "lead_id"
    
    %% FK DANGLING
    operaciones.leads }o--o| operaciones.campanas : "campana_id MISSING"
```

## Notas sobre Cardinalidad

- **193 clientes** ↔ **193 gmaps_fichas** (1:1)
- **193 clientes** ↔ **352 gmaps_historico** (1:N)
- **229 contratos** ↔ **229 contratos_digitales** (1:1)
- **229 proformas** ↔ **248 proforma_lineas** (1:N)
- **564 llamadas_programadas** ↔ **193 clientes** (N:1 vía FK)

## Trigger de Sincronización

```sql
-- Trigger: sync_llamada_cliente_id()
-- Tabla: operaciones.llamadas_programadas
-- Función: auto-populate cliente_id desde lead_id
--         haciendo match por nombre_comercial entre leads y clientes
```

## Gaps Identificados

| Gap | Gravedad | Tabla Afectada |
|-----|----------|----------------|
| `operaciones.campanas` MISSING | 🔴 CRÍTICA | `operaciones.leads.campana_id` FK dangling |
| `clientes.citas` VACÍA | 🟡 NOTA | 0 rows — usar `operaciones.llamadas_programadas` |
| `proxima_accion_fecha` VACÍA | 🟡 NOTA | `clientes.clientes` — no usar para scheduling |
| `reputacion_at` STALE | 🟡 NOTA | ~2026-05-09 — scrapers caídos |
