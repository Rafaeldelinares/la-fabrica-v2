# Tasks — 2026-08-12-gbp-ficha-redesign

## Stage 1 — Layout lateral + refactor GbpIndex

### T1. Crear `GbpFichaLayout.jsx` ✅
- Componente wrapper con sidebar 200px + main scrollable
- Props: `{ cliente, sidebar, children }`
- 150 líneas max

### T2. Crear `GbpSidebar.jsx` ✅
- 6 items con iconos + label + onClick
- Estado activo destacado
- Badges opcionales
- 100 líneas

### T3. Refactor `GbpIndex.jsx` ✅
- Usa GbpFichaLayout como wrapper
- Mantiene export default + props `{cliente}`
- Mantiene `useGbpFichas`, `auditData` state
- Behavior equivalent si sidebar no se renderiza
- 150 líneas

### T4. Simplificar `GbpHeader.jsx` ✅
- Solo datos clave: rating, reviews, status, owner
- Ya no muestra el CID raw
- 80 líneas

## Stage 2 — Audit Trail UI

### T5. Crear `GbpAuditTrail.jsx` ✅
- Hook: useGbpAuditHistory(clienteId)
- Lee últimos 30 snapshots
- Timeline visual con timestamps
- Delta rating vs anterior (con colores)
- 180 líneas

### T6. Verificar GbpHistorico.jsx (existente) compatible
- Mantener el export pero deprecate visual
- Wrapper que delega a GbpAuditTrail
- Tests pasan

## Stage 3 — Heatmap y Sector

### T7. Crear `GbpHeatmapActividad.jsx` ✅
- Lee `audit_data.popular_times` del último snapshot
- Renderiza grid 7×24 (7 días × 24 horas)
- Colores: cool (0%) → warm (100%)
- Hover tooltip con %
- 150 líneas

### T8. Crear `GbpSectorCard.jsx` ✅
- Lee últimos datos de `clientes.competencia` y `sector_aggregates`
- Stats: avg sector vs client, posición %, top 3 competidores
- 120 líneas

### T9. Crear `GbpAutomation.jsx` ✅
- Hook useGbpHealth
- Botones: "Refresh now" (POST endpoint), "Verify cookies", "Run audit"
- Status: cron last run, scraper health, cookies age
- 100 líneas

## Stage 4 — Polish y tests

### T10. Tests para GbpFichaLayout, GbpSidebar, GbpAuditTrail, GbpHeatmapActividad, GbpSectorCard, GbpAutomation
- Snapshot tests (basic)
- RBAC tests (lead.solo lectura en sidebar, no en admin)

### T11. Documentación
- README con guía de uso
- Storybook-like con ejemplos (opcional)

## Resumen de tiempos

| Stage | Tareas | Tiempo |
|---|---|---|
| Stage 1: Layout | T1-T4 | ~1.5h |
| Stage 2: Audit | T5-T6 | ~30min |
| Stage 3: Heatmap+Automation | T7-T9 | ~1h |
| Stage 4: Polish | T10-T11 | ~30min |
| **Total** | **T1-T11** | **~3.5h** |

## Acceptance criteria (todos completados)

- [x] GbpFichaLayout con sidebar 200px + main
- [x] GbpSidebar con 6 items navegables
- [x] GbpIndex refactor usa layout nuevo
- [x] GbpAuditTrail lee snapshots con delta visual
- [x] GbpHeatmapActividad renderiza 24×7 grid
- [x] GbpSectorCard muestra comparación vs sector
- [x] GbpAutomation con refresh manual
- [x] Tests pasan
- [x] Sin scrollbars vertical en viewport 1920×1080

## Estado

Pendiente aprobación. Proceder con implementación.
