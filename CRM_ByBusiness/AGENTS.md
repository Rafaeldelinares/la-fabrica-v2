# CRM_ByBusiness — Agent Guidelines

Convenciones operativas para todas las sesiones que trabajen sobre este proyecto. Este archivo se lee ANTES de cualquier operación de discovery, implementación o modificación.

## Session Bootstrap (OBLIGATORIO)

Al inicio de **toda sesión** que toque este proyecto, el agente DEBE ejecutar este bootstrap en orden, ANTES de hacer cualquier query a DB, llamada a n8n, o edición de código:

1. Cargar el mapa mental navegable desde engram:
   - `mem_search` topic_key: `crm/mental-map-completo`
   - `mem_get_observation` del ID retornado para contenido completo
2. Confirmar scope activo cargando:
   - `mem_search` topic_key: `crm/scope-solo-vps`
3. Si la sesión toca citas/agenda, cargar además:
   - `mem_search` topic_key: `crm/agenda-citas-tipos-2026-08-24`
4. Si la sesión toca scraping/OnePlus, cargar además:
   - `mem_search` topic_key: `crm/infraestructura-oneplus`
5. Si la sesión toca captación/llamada/operador/leads, cargar además:
   - `mem_search` topic_key: `crm/capa1-modo-tunel`
6. Si la sesión toca gestión admin/cliente/GMB/datos/citas/facturación, cargar además:
   - `mem_search` topic_key: `crm/capa2-torre-control`
7. **Recién después** empezar a operar.

Si el usuario da una orden directa sin que se haya hecho bootstrap, el agente DEBE:
- Cargar el contexto PRIMERO
- Reportar si la orden contradice el estado actual del proyecto
- Recién después ejecutar

## Frases ancla (red de seguridad)

Estas frases activan el bootstrap aunque no haya contexto explícito del proyecto:

- "continuamos CRM"
- "arrancamos CRM_ByBusiness"
- "cargá contexto CRM"
- "sigo con el CRM"

Si el usuario dice cualquiera de estas al inicio, ejecutar bootstrap completo.

## Scope activo (regla dura)

**SOLO VPS** para operaciones de runtime:

| Recurso | MCP a usar | Endpoint |
|---|---|---|
| Base de datos | `postgres-vps` | DB `crm_bybusiness` vía túnel `localhost:5433` |
| Workflows n8n | `n8n-mcp-vps` | `https://n8n.ia-bybusiness.online` (túnel `localhost:5679`) |
| Scraping | OnePlus 10T | SSH Tailscale `100.89.189.113` → VPS |

**PROHIBIDO** para runtime:
- `postgres-crm` (DB local :5432) — es histórica, no refleja producción
- `n8n-mcp-local` (n8n local) — el productivo está en VPS

Excepciones únicas (consultar antes de usar):
- Migración de datos legacy desde local → VPS
- Auditoría histórica
- Debugging de bug que solo se reproduce con datos locales

## Topic keys de engram (cargar en este orden si se necesita cascada)

1. `crm/mental-map-completo` — overview completo (MEGA, 14 secciones, todo el proyecto)
2. `crm/scope-solo-vps` — qué DB/WFs usar
3. `crm/capa1-modo-tunel` — capa operador (captación → venta)
4. `crm/capa2-torre-control` — capa admin (cliente + GMB + datos + citas + facturación)
5. `crm/agenda-citas-tipos-2026-08-24` — detalle de citas (9 casos concretos)
6. `crm/infraestructura-oneplus` — OnePlus setup
7. `crm/fuentes-de-datos-vps-vs-local` — distinción local vs VPS
8. `crm/arquitectura-pdfs-on-demand` — decisión PDFs
9. `crm/fase-1-automatizar-flujo-manual` — contexto Fase 1
10. `crm/wf-n8n-inventario-fase-1` — WFs relevantes
11. `crm/discovery-metodologia-db` — recetas SQL
12. `crm/diagramas-creados-2026-08-24` — referencia a los 7 .md en docs/diagramas/
13. `crm/session-bootstrap-convention` — convención de arranque
14. `crm/leads-vs-clientes` — diferencia conceptual
15. `crm/estado-actual/leads` — snapshot numérico de leads

## Mapa mental completo

- **Texto**: `/opt/fabrica/CRM_ByBusiness/exploration.md` (720 líneas, 6 bloques)
- **Diagramas visuales (Mermaid)**: `/opt/fabrica/CRM_ByBusiness/docs/diagramas/`
  - `README.md` — índice navegable
  - `01_erd_vps_completo.md` — ERD 34 tablas en 9 schemas
  - `02_erd_core_cliente_gmaps.md` — ERD subset crítico Fase 1
  - `03_frontend_jerarquia.md` — Torre Control + Modo Túnel + auth
  - `04_wf_n8n_mapa.md` — 228 WFs por dominio
  - `05_flujos_e2e.md` — 7 flujos E2E
  - `06_decisiones_arquitectonicas.md` — 13 decisiones vigentes
  - `07_anti_patterns.md` — trampas conocidas

## Decisiones arquitectónicas vigentes (NO cambiar sin SDD formal)

1. OnePlus 10T = scraper único del proyecto (no restaurar Docker Nano/Heavy)
2. PDFs on-demand (no almacenar artefactos)
3. Lead ↔ Cliente por FK `cliente_id` (migration 2026-08-23)
4. Contactabilidad 90d (no 30d — scrapers cayeron)
5. VPS = production DB
6. `clientes.citas` vacía → usar `operaciones.llamadas_programadas`
7. Agenda tiene 2 tipos: `responsable` (reunión con decisor, ~renovaciones) y `seguimiento` (control)
8. Datos GMB = scraping público de Google Maps (no GBP API oficial)
9. Navy Industrial en frontend (bg-slate-950, rounded-sm, #D00000, JetBrains Mono datos)
10. Auth 2FA TOTP vía DB function `auth.verify_totp()`
11. Estado frontend: React Query + AuthContext (no Zustand/Redux)
12. Tablas legacy `gbp_*` abandonadas en local (mantener por compatibilidad, no migrar)
13. 2/17 GBP reports activos (Estado GBP, Informe Competitivo) — los otros 15 están dormants
14. **Dos capas operativas distintas**: Modo Túnel (operador, conversión lead→cliente) vs Torre de Control (admin, gestión cliente+GMB+datos+citas+facturación)
15. **Handoff entre capas**: el único punto es el branch VENTA de `CRM_REGISTRAR_RESULTADO` (Modo Túnel → Torre de Control)

## Anti-patterns (NO hacer)

- ❌ Asumir nombres de tablas/columnas sin verificar con `information_schema`
- ❌ Asumir que DB local = producción
- ❌ Asumir sinónimos de campos sin chequear (ej: "renovación" = `responsable` aquí)
- ❌ Empezar queries/operaciones antes del bootstrap
- ❌ Modificar código sin entender arquitectura
- ❌ Crear archivos en `/opt/fabrica/` raíz cuando es para este proyecto (usar `/opt/fabrica/CRM_ByBusiness/`)
- ❌ Hardcodear IPs, credenciales, paths
- ❌ Usar `console.log`, `console.warn` en producción
- ❌ Hacer DDL o DML masivo vía MCP `postgres-vps` (es READ-ONLY); usar psql directo

## Convenciones heredadas de La Fábrica

Este proyecto hereda las reglas de `/opt/fabrica/AGENTS.md`:

- Componentes React máx 150 líneas
- PropTypes + JSDoc desde el primer commit
- Sin catch vacíos
- Sin mock data
- Sin fallbacks localhost
- `rounded-sm` siempre (Navy Industrial)
- `setTimeout` siempre con `clearTimeout`
- Skeleton screens (prohibidos spinners circulares)
- Navegación cockpit: h-screen sin scroll global

## Cómo actualizar este archivo

Cuando cambien decisiones arquitectónicas, schema, WFs o tipos:
1. Actualizar `crm/mental-map-completo` en engram
2. Actualizar `/opt/fabrica/CRM_ByBusiness/exploration.md` (mapa completo)
3. Actualizar este `AGENTS.md` (convención persistente)
4. Mantener los 3 sincronizados
