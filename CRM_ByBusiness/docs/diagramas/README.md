# CRM_ByBusiness — Diagramas

**Project**: CRM_ByBusiness  
**Date**: 2026-08-24  
**Version**: 1.0.0

## Índice Navegable

| # | Diagrama | Archivo | Propósito |
|---|----------|---------|-----------|
| 1 | ERD completo DB VPS | `01_erd_vps_completo.md` | Todas las tablas, FKs, cardinalidades |
| 2 | ERD core cliente-gmaps-agenda | `02_erd_core_cliente_gmaps.md` | Subset crítico para Fase 1 |
| 3 | Jerarquía frontend React | `03_frontend_jerarquia.md` | Torre de Control + Modo Túnel |
| 4 | Mapa de WFs n8n | `04_wf_n8n_mapa.md` | 228 WFs por dominio |
| 5 | Flujos E2E del negocio | `05_flujos_e2e.md` | 7 flujos end-to-end |
| 6 | Decisiones arquitectónicas | `06_decisiones_arquitectonicas.md` | 13 decisiones vigentes |
| 7 | Anti-patterns y gotchas | `07_anti_patterns.md` | No hacer y trampas |

---

## Convenciones usadas

- **Scope activo**: SOLO VPS — DB `crm_bybusiness` vía `postgres-vps` MCP (túnel :5433)
- **Lenguaje diagramas**: Mermaid
- **Artefactos técnicos**: inglés
- **Comentarios contextuales**: español neutro

## Fuentes de datos

- **DB**: `postgres-vps` → `information_schema`, `pg_catalog`
- **WFs**: `n8n-mcp-vps` → 228 workflows (3 páginas)
- **Frontend**: CodeGraph + `exploration.md`

## Gaps conhecidos

1. `operaciones.campanas` → **MISSING** (FK dangling en `operaciones.leads.campana_id`)
2. `clientes.citas` → **VACÍA** (0 rows) — usar `operaciones.llamadas_programadas`
3. `operaciones.leads.campana_id` → FK sin tabla referenciada
