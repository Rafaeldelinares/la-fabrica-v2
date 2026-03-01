# [DOC] ENGRAM — Memoria Persistente para Agentes IA

**Clasificación:** Documentación / Herramienta MCP
**Fecha instalación:** 2026-03-01
**Versión binario:** 1.7.0
**Versión plugin Claude Code:** 0.1.0
**Estado:** ✅ ACTIVO — Plugin instalado vía marketplace oficial Claude Code

---

## ¿Qué es Engram?

Sistema de memoria persistente que permite a Claude Code recordar información entre sesiones:
- Decisiones de arquitectura tomadas
- Bugs resueltos y sus soluciones exactas
- Patrones de código que funcionan en La Fábrica
- Configuraciones específicas de proyectos

Funciona como un segundo cerebro con SQLite + FTS5 (full-text search), cero dependencias,
y se expone como servidor MCP a Claude Code.

---

## Ubicación

| Elemento | Ruta |
|---|---|
| Binario | `/usr/local/bin/engram` |
| Base de datos | `~/.engram/engram.db` |
| Plugin Claude Code | `~/.claude/plugins/cache/engram/engram/0.1.0/` |
| Config MCP del plugin | `~/.claude/plugins/cache/engram/engram/0.1.0/.mcp.json` |
| Settings Claude Code | `~/.claude/settings.json` |

**El plugin fue instalado automáticamente con:**
```bash
engram setup claude-code
```
No requiere editar `~/.claude.json` manualmente. El sistema de plugins lo gestiona.

---

## Comandos CLI

```bash
engram stats                        # Estado: sesiones, observaciones, proyectos
engram save "<título>" "<contenido>" [--project PROYECTO]  # Guardar memoria
engram search "<texto>"             # Buscar en todas las memorias (FTS)
engram context [proyecto]           # Recuperar contexto de sesión anterior
engram search ""                    # Listar todas las memorias (FTS vacío = todas)
engram timeline <obs_id>            # Contexto cronológico alrededor de un evento
engram export [fichero.json]        # Exportar todo a JSON
engram import <fichero.json>        # Importar desde JSON
engram tui                          # Terminal UI interactivo
engram serve [puerto]               # HTTP API (default: 7437)
engram sync                         # Sincronizar con .engram/ del proyecto
engram sync --import                # Importar chunks de .engram/ local
engram sync --status                # Ver estado de sincronización
```

---

## Herramientas MCP Disponibles en Claude Code

El perfil `--tools=agent` activa 11 herramientas. Las más relevantes:

| Tool MCP | Uso |
|---|---|
| `mem_save` | Guardar memoria después de resolver bugs o implementar features |
| `mem_search` | Buscar en memoria para recordar cómo se resolvió algo |
| `mem_context` | Recuperar contexto de la sesión anterior al inicio de cada conversación |
| `mem_session_summary` | Resumen de sesión al final de cada trabajo |

---

## Configuración MCP (Referencia)

El plugin instaló automáticamente esta config en Claude Code:
```json
{
  "mcpServers": {
    "engram": {
      "command": "engram",
      "args": ["mcp", "--tools=agent"]
    }
  }
}
```

---

## Workflow Recomendado en La Fábrica

**Inicio de sesión:**
1. Claude Code lee `/opt/fabrica/knowledge/` (contexto del proyecto)
2. Usar `mem_context` para recuperar el estado de la última sesión
3. Preguntar en qué proyecto trabajamos hoy

**Durante el trabajo:**
- Después de resolver un bug importante → `mem_save`
- Antes de cambios arquitectónicos → `mem_search` para ver decisiones previas
- Cuando se implementa una feature compleja → `mem_save` con el patrón que funcionó

**Fin de sesión:**
- `mem_session_summary` con resumen de lo hecho
- Git commit de la documentación actualizada en `knowledge/`

---

## Proyectos con Engram Activo

| Proyecto | ID engram | Notas |
|---|---|---|
| Monitor Reputación V2 | `monitor-reputacion` | Memorias guardadas: bugs 2026-03-01 |
| La Fábrica (core) | `fabrica-core` | Arquitectura general guardada |
| CRM ByBusiness | `crm-bybusiness` | Pendiente primer guardado |
| Escaparate COM | `escaparate-com` | Pendiente primer guardado |

---

## Sincronización entre Máquinas

Engram puede compartir memorias via Git. Cada proyecto puede tener un directorio `.engram/` commiteado:

```bash
# Exportar memorias de un proyecto al repo
engram sync --project monitor-reputacion

# En otra máquina, importar
engram sync --import
```

---

## Troubleshooting

| Problema | Solución |
|---|---|
| Plugin no aparece en Claude Code | Reiniciar Claude Code. El plugin se activa en el siguiente arranque |
| Engram no responde como MCP | `pkill engram && engram mcp --tools=agent &` (modo debug) |
| Base de datos corrupta | `cp ~/.engram/engram.db ~/.engram/engram.db.backup` luego `rm ~/.engram/engram.db && engram stats` (se recrea) |
| Binario no encontrado | Verificar con `which engram`. Debe estar en `/usr/local/bin/engram` |

---

## Notas de Instalación (2026-03-01)

- El prompt original especificaba `engram init` y `engram-linux` — ambos no existen en v1.7.0
- El binario real se llama `engram_1.7.0_linux_amd64.tar.gz` en GitHub releases
- `engram setup claude-code` usa el sistema de plugins oficial de Claude Code (no edita `~/.claude.json`)
- La DB se auto-crea con el primer comando (no requiere `init`)
- Memorias iniciales guardadas: #1 bugs Monitor V2, #2 Arquitectura La Fábrica

**Mantenedor:** Rafael — La Fábrica IA
