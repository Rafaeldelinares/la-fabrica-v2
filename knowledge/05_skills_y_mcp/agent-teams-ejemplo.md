# [DOC] AGENT TEAMS LITE — Ejemplo de Uso en La Fábrica

**Clasificación:** Documentación / Ejemplo Práctico
**Última actualización:** 2026-03-01

---

## Cuándo Activar SDD

Agent Teams Lite (SDD) se recomienda cuando el orquestador detecta:
- Feature que toca >10 archivos
- Nuevo módulo o sistema completo
- Refactor de arquitectura
- Cualquier tarea donde perder el contexto sería costoso

Para cambios pequeños (1-3 archivos, bugs puntuales), usar Claude Code directamente.

---

## Caso Real: Integrar Tool monitor_reputacion en Agente Sofía

Este es el próximo trabajo pendiente en La Fábrica. Así se ejecutaría con SDD:

### Comando inicial

```
/sdd-new integrar-monitor-en-sofia
```

### Ejecución automática por fases

**Explorer** (`/sdd-explore`):
- Lee `/opt/fabrica/knowledge/02_proyectos/escaparate-com.md`
- Lee `/opt/fabrica/knowledge/05_skills_y_mcp/tools/monitor_reputacion_tool.md`
- Analiza `/opt/fabrica/escaparate-com/n8n-workflows/`
- Identifica flujo: `ESCAPARATE_COM_Cliente_Nuevo_V3`
- Detecta: AI Agent n8n con Sofía, webhook en `:5678`

**Proposer** (`/sdd-propose`):
- Propone: Añadir nodo HTTP Request al flujo n8n existente
- Endpoint: `http://172.17.0.1:8092/webhook/scraper/go`
- Trigger: Cuando Sofía detecte negocio + ciudad en el mensaje del usuario
- Alternativa A: Tool directa en AI Agent Node
- Alternativa B: Subworkflow separado

**Spec Writer** (`/sdd-spec`):
```
specs.md:
- El AI Agent debe extraer negocio + ciudad del mensaje
- La búsqueda se construye: "{tipo_negocio} {ciudad}"
- El nodo HTTP Request tiene timeout de 30s
- Si is_simulated=true, Sofía NO menciona que son datos simulados
- Sofía presenta máximo 3 negocios del resultado
- Si hay error de red, Sofía continúa sin el dato de reputación
```

**Designer** (`/sdd-design`):
```
design.md:
- Nodo 1: AI Agent (Sofía detecta negocio + ciudad)
- Nodo 2: HTTP Request → 172.17.0.1:8092
- Nodo 3: IF → is_simulated check (no visible al usuario)
- Nodo 4: Set → Formatear respuesta con top 3 negocios
- Nodo 5: AI Agent → Sofía responde con datos de reputación
```

**Task Planner** (`/sdd-tasks`):
```
tasks.md:
1. Exportar flujo actual ESCAPARATE_COM_Cliente_Nuevo_V3 como backup
2. Añadir nodo HTTP Request con config monitor_reputacion
3. Añadir lógica de extracción negocio+ciudad en prompt de Sofía
4. Configurar manejo de error (timeout, red caída)
5. Testear con "tengo una ferretería en Málaga"
6. Verificar que is_simulated no se expone al usuario
7. Hacer commit del workflow exportado actualizado
8. Actualizar escaparate-com.md en knowledge/
```

**Implementer** (`/sdd-apply`):
- Modifica el flujo n8n paso a paso
- Cada cambio validado con test en tiempo real
- Commits por tarea con mensajes claros

**Verifier** (`/sdd-verify`):
```
verification-report.md:
✓ Nodo HTTP Request configurado con 172.17.0.1:8092
✓ Timeout 30s configurado
✓ Sofía presenta datos de reputación en respuesta
✓ Error handling: continúa sin datos si backend caído
⚠ Pendiente: Test con múltiples ciudades
```

**Archiver** (`/sdd-archive`):
- Actualiza `/opt/fabrica/knowledge/02_proyectos/escaparate-com.md`
- Actualiza `/opt/fabrica/knowledge/TAREAS_PENDIENTES.md`
- `mem_save` en Engram: "Sofía usa 172.17.0.1:8092 para monitor_reputacion desde n8n Docker"
- Commit del flujo exportado actualizado

### Resultado esperado

Agente Sofía capaz de generar el "Efecto WOW" con datos reales de Google Maps
en la conversación de captación, aumentando la tasa de conversión de leads.

---

## Caso Anterior: Frontend Monitor Reputación (Referencia)

> Este caso ya se ejecutó con Antigravity (no con SDD). Se documenta aquí
> como referencia de lo que SDD hubiera generado automáticamente.

**Lo que SDD hubiera hecho diferente:**
- Hubiera generado `specs.md` formales antes de codificar
- Los componentes hubieran tenido contratos de interfaz definidos
- La verificación hubiera detectado el indicador de tiempo en caché antes del deploy
- Los formularios modales (ContactModal, ATSModal) hubieran estado en el spec desde el inicio

**Lección:** Para proyectos con múltiples componentes, SDD evita el backlog de ajustes post-entrega.

---

## Flujo Rápido (Fast-Forward)

Para proyectos donde confías en el auto-piloto:

```
/sdd-ff integrar-monitor-en-sofia
```

Ejecuta en secuencia: `sdd-propose → sdd-spec → sdd-design → sdd-tasks`
y muestra resumen al final sin interrumpir entre fases.

Luego:
```
/sdd-apply integrar-monitor-en-sofia
/sdd-verify integrar-monitor-en-sofia
/sdd-archive integrar-monitor-en-sofia
```

---

## Comandos de Referencia Rápida

```bash
# Iniciar nuevo proyecto SDD
/sdd-init

# Iniciar cambio nuevo
/sdd-new nombre-del-cambio

# Fast-forward (planning completo)
/sdd-ff nombre-del-cambio

# Implementar
/sdd-apply nombre-del-cambio

# Verificar
/sdd-verify nombre-del-cambio

# Archivar y documentar
/sdd-archive nombre-del-cambio
```
