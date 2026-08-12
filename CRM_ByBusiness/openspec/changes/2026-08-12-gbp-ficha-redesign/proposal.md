# 2026-08-12-gbp-ficha-redesign

## Why

El usuario quiere rehacer la ficha del cliente con:
1. **Menú lateral** (en vez de 7 collapsibles apilados que relentizan)
2. **Audit trail UI** (visualización de `clientes.gbp_audit_history` con timestamps)
3. **Heatmap inline** (mini visualización de `popular_times` 24×7)
4. **Heatmap sector** (top sectores para el cliente)
5. **Automation controls** (botones de refresh manual, health-check, etc.)
6. **Future operations** (operaciones automatizadas para mejorar posicionamiento)

Estado actual:
- `GbpIndex.jsx` (192 líneas): 7 collapsibles verticales con `<Section>` wrapper
- Sin datos en `audit_history` visibles (la query existe pero no hay UI)
- Sin heatmap
- Sin automation
- Frontend con scrollbars vertical y horizontal

**Por qué ahora**:
- Backend ya scrapea 36 fields (vía xiaomi-12 sprint anterior)
- `clientes.gbp_audit_history` ya se popula (vía `insert-audit-snapshot.sh`)
- `sector_aggregates` ya existe (vía `search-sector.sh`)
- Falta la UI para visualizar todo esto

## What Changes

### Estructura nueva

```
GbpIndex (GbpFichaLayout)
├── Sidebar (200px)
│   ├── Item: Resumen (default)
│   ├── Item: Auditoría
│   ├── Item: Heatmap actividad
│   ├── Item: Sector
│   ├── Item: Configuración
│   ├── Item: Place ID
│   └── Item: Facturación (migrado)
└── Main (resto del width)
    └── Renderiza el contenido del item activo
```

### Componentes nuevos

1. **`GbpFichaLayout.jsx`** (NEW): wrapper sidebar + main
   - 200px sidebar fijo a la izquierda
   - Main scrollable
   - Responsive: sidebar colapsa a top tabs en <768px (mobile)

2. **`GbpSidebar.jsx`** (NEW): menu de navegación
   - 6 items con iconos + label
   - Badges opcionales (alertas, contadores)
   - Item activo destacado

3. **`GbpAuditTrail.jsx`** (NEW): timeline de auditoría
   - Lee `clientes.gbp_audit_history` ordenado por audited_at DESC
   - Muestra cada snapshot con: fecha, rating, reviews_count, delta vs anterior
   - Gráfico simple de evolución rating

4. **`GbpHeatmapActividad.jsx`** (NEW): heatmap 24×7
   - Lee `audit_data.popular_times` del último snapshot
   - Grid de 7 días × 24 horas
   - Color intensity = % de actividad

5. **`GbpSectorCard.jsx`** (NEW): stats del sector
   - Top 5 competidores en la zona
   - Promedio rating del sector vs cliente
   - Posición del cliente (% mejor que competencia)

6. **`GbpAutomation.jsx`** (NEW): controles de operaciones
   - Botón "Refrescar ahora" (llama al endpoint refresh)
   - Botón "Verificar cookies"
   - Health check del wrapper
   - Estado del último cron

### Componentes modificados

1. **`GbpIndex.jsx`**: refactor para usar `GbpFichaLayout`
2. **`GbpHeader.jsx`**: simplificación con datos clave

### Backwards compat

- Mantener export default `GbpIndex` (otros componentes lo importan)
- Mantener props `{ cliente }` 
- Comportamiento equivalente al actual si la sidebar no se implementa

## Impact

| Área | Cambio |
|---|---|
| `GbpIndex.jsx` | rewrite completo con layout nuevo |
| `GbpHeader.jsx` | simplificación |
| `GbpFichaActual.jsx` | adapta al layout (no tabs) |
| `GbpHistorico.jsx` | reemplaza a GbpAuditTrail.jsx (más visual) |
| `GbpCompetitiveAnalysis.jsx` | ahora dentro de GbpSectorCard |
| Nuevos | 6 componentes |
| Líneas | ~1500 nuevas (sustituye ~500) |

## Out-of-scope

- ❌ Backend changes (audit_history INSERT, sector_aggregates) — ya hecho en sprint anterior
- ❌ Migrar a facturacionTab lateral (eso es otro sprint)
- ❌ Responsive mobile completo (prioridad: desktop)

## Acceptance criteria

### Stage 1 — Layout ✅
- [ ] GbpFichaLayout.jsx con sidebar 200px + main scrollable
- [ ] 6 items en sidebar (Resumen, Auditoría, Heatmap, Sector, Config, PlaceID)
- [ ] GbpIndex refactor usa GbpFichaLayout
- [ ] Sin scrollbars vertical en viewport 1920×1080
- [ ] Tests pasan

### Stage 2 — Audit Trail ✅
- [ ] GbpAuditTrail.jsx lee gbp_audit_history
- [ ] Timeline visual con timestamps
- [ ] Delta rating entre snapshots

### Stage 3 — Heatmap y Sector ✅
- [ ] GbpHeatmapActividad.jsx con grid 24×7 desde popular_times
- [ ] GbpSectorCard.jsx con top 5 competidores

### Stage 4 — Automation ✅
- [ ] GbpAutomation.jsx con health check + manual refresh

## Risks

| Riesgo | Mitigación |
|---|---|
| Sidebar 200px quita mucho ancho | Main con padding compensa |
| Heatmap con 168 celdas (24×7) puede ser lento | Solo carga cuando item está activo |
| Datos vacíos (audit_history, sector) si crons no han corrido | Placeholder + mensaje "no data yet" |
| Performance con muchos snapshots en audit | Pagination o limit a últimos 30 |

## Decisión arquitectónica

**Lateral menu en lugar de tabs/colapsibles** — confirmado en sesión previa:
- Más denso visualmente
- Mejor para escritorio
- Acceso directo (1 click vs 2)
- Mobile colapsa a top tabs

**Componentes standalone vs compound**:
- Standalone: cada vista es su propio componente (testeable independiente)
- Compound: <200 líneas cada uno (GGA compliant)

## Owners

- Implementación: agent
- Design: Rafael (ya validó lateral menu en sesión anterior)
- Testing: Rafael

## Preflight (cached)

- Pace: A2 (Auto)
- Artifacts: B1 (OpenSpec)
- PRs: C1+C3 (Ask + Chained)
- Review budget: D1 (400 lines)

## Referencias

- `openspec/changes/2026-08-11-xiaomi-audits-and-heatmaps/` — backend
- `openspec/changes/2026-08-11-gbp-ficha-enrichment/` — schema + data
- `GbpIndex.jsx` (actual) — referencia de comportamiento
- `GbpHeader.jsx` (actual) — referencia de datos
