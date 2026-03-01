# [DOC] PLAN DE INSTALACIÓN DE MCPs — LA FÁBRICA IA

**Clasificación:** Documentación / MCPs y Herramientas
**Fecha:** 2026-03-02
**Estado:** PENDIENTE DE INSTALACIÓN

---

## ¿QUÉ SON LOS MCPs?

Los **Model Context Protocol (MCP) Servers** son extensiones que dan a Claude Code acceso directo a herramientas y servicios externos. En lugar de ejecutar comandos bash, Claude puede interactuar con n8n, PostgreSQL o Docker de forma nativa y estructurada.

**Configuración en Claude Code:** `~/.claude/settings.json` → sección `mcpServers`

---

## MCP 1: n8n MCP Server

**Repositorio:** https://github.com/n8n-io/n8n-mcp-server

### Problema que resuelve
Sin este MCP, modificar workflows de n8n requiere editar el JSON directamente en PostgreSQL mediante scripts Python complejos (ver Phase 2 de sofia-monitor-reputacion). Con el MCP, Claude puede leer y modificar workflows con comandos naturales.

### Beneficios específicos para La Fábrica
- Crear/modificar workflows sin tocar la DB
- Activar/desactivar workflows directamente
- Añadir nodos y conexiones sin exportar/importar JSON
- Ejecutar workflows de prueba con datos de test
- Gestionar credenciales y variables de entorno

### Prerrequisitos
Crear un API Key en n8n antes de instalar:
1. Ir a `http://localhost:5678` → Settings → API → Create API Key
2. Guardar el key generado

### Instalación

```bash
npm install -g n8n-mcp-server
```

### Configuración en `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "n8n": {
      "command": "n8n-mcp-server",
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "TU_API_KEY_AQUI"
      }
    }
  }
}
```

### Ejemplo de uso
```
"Lista todos los workflows activos en n8n"
"Añade un nodo HTTP Request al workflow ESCAPARATE_COM_Cliente_Nuevo_V3_COMPLETO"
"Activa el workflow con ID XcXJL3qqsIWFu4KZ"
"Muestra las ejecuciones del último día del workflow CRM_Distribuidor"
```

---

## MCP 2: PostgreSQL MCP Server

**Repositorio:** https://github.com/modelcontextprotocol/servers/tree/main/src/postgres

### Problema que resuelve
Actualmente, cada query SQL requiere:
```bash
docker exec config-postgres-1 psql -U rafael -d fabrica -c "SELECT ..."
```
Con este MCP, Claude ejecuta queries directamente sin bash.

### Beneficios específicos para La Fábrica
- Consultar schemas y tablas de fabrica, crm_bybusiness, reputacion_cache
- Inspeccionar datos de n8n (workflow_entity, execution_entity, webhook_entity)
- Debugging de flujos y datos sin salir del contexto
- Queries complejas con JOINs entre múltiples schemas

### Instalación

```bash
npm install -g @modelcontextprotocol/server-postgres
```

### Configuración en `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "postgres-fabrica": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://rafael:Samsung18091809&@localhost:5432/fabrica"
      ]
    },
    "postgres-monitor": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://monitor:monitor_password@localhost:5435/reputacion_cache"
      ]
    }
  }
}
```

> **Nota de seguridad:** Las credenciales en settings.json son visibles en texto plano. Usar variables de entorno si hay preocupación de seguridad. En La Fábrica (entorno local aislado), es aceptable.

### Ejemplo de uso
```
"¿Cuántos leads hay en la tabla marketing.leads?"
"Muestra la estructura de la tabla crm_bybusiness.leads"
"¿Qué workflows están activos en n8n ahora mismo?"
"Busca en reputacion_cache los resultados de 'ferreterías Málaga'"
```

---

## MCP 3: Docker MCP Server

**Repositorio:** https://github.com/ckreiling/mcp-server-docker

### Problema que resuelve
Sin este MCP, cada operación de Docker requiere bash:
```bash
docker exec fabrica-n8n ...
docker logs scraper-nano-v2 --tail 50
docker restart fabrica-n8n
```
Con el MCP, Claude gestiona containers directamente.

### Beneficios específicos para La Fábrica
- Ver logs de n8n, scrapers y postgres sin bash
- Restart de containers cuando algo falla
- Inspeccionar variables de entorno de containers
- Monitorizar uso de recursos (CPU/RAM) de los stacks
- Pull de nuevas imágenes y redeploy

### Instalación

```bash
npm install -g mcp-server-docker
```

### Configuración en `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "docker": {
      "command": "mcp-server-docker",
      "env": {
        "DOCKER_HOST": "unix:///var/run/docker.sock"
      }
    }
  }
}
```

> **Nota:** El usuario debe tener permisos sobre `/var/run/docker.sock`. Verificar con `groups | grep docker`.

### Ejemplo de uso
```
"¿Qué containers están corriendo ahora mismo?"
"Muestra los últimos 50 logs de scraper-nano-v2"
"Reinicia el container fabrica-n8n"
"¿Cuánta memoria está usando el stack de monitor?"
```

---

## CONFIGURACIÓN COMPLETA COMBINADA

`~/.claude/settings.json` final con los 3 MCPs + Engram (ya instalado):

```json
{
  "extraKnownMarketplaces": {
    "engram": {
      "source": {
        "source": "github",
        "repo": "Gentleman-Programming/engram"
      }
    }
  },
  "enabledPlugins": {
    "engram@engram": true
  },
  "mcpServers": {
    "n8n": {
      "command": "n8n-mcp-server",
      "env": {
        "N8N_API_URL": "http://localhost:5678/api/v1",
        "N8N_API_KEY": "CREAR_EN_N8N_SETTINGS"
      }
    },
    "postgres-fabrica": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://rafael:Samsung18091809&@localhost:5432/fabrica"
      ]
    },
    "postgres-monitor": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://monitor:monitor_password@localhost:5435/reputacion_cache"
      ]
    },
    "docker": {
      "command": "mcp-server-docker",
      "env": {
        "DOCKER_HOST": "unix:///var/run/docker.sock"
      }
    }
  }
}
```

---

## AUTO-APROBACIÓN DE COMANDOS (Investigación 2026-03-02)

### Cómo funciona
Claude Code usa un único mecanismo: `permissions.allow` en `settings.json`. Cada comando debe especificarse **exactamente** — no hay wildcards ni regex.

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git log --oneline -20)",
      "Bash(docker ps)",
      "Bash(docker ps -a)"
    ]
  }
}
```

### Jerarquía de configuración
| Archivo | Alcance | Prioridad |
|---|---|---|
| `~/.claude/settings.json` | Todos los proyectos | Base global |
| `/proyecto/.claude/settings.json` | Solo ese proyecto | Override global |
| `/proyecto/.claude/settings.local.json` | Local, no versionar | Override máximo |

### Estado actual en La Fábrica
`/opt/fabrica/.claude/settings.local.json` contiene 150+ comandos auto-aprobados generados durante el desarrollo. Estos son **específicos de sesión** (settings.local).

Para comandos de uso frecuente que queremos siempre disponibles, moverlos a `/opt/fabrica/.claude/settings.json` (con control de versiones).

### Comandos recomendados para auto-aprobar en settings.json

```json
{
  "permissions": {
    "allow": [
      "Bash(git status)",
      "Bash(git log --oneline -20)",
      "Bash(git diff --stat)",
      "Bash(git branch -a)",
      "Bash(docker ps)",
      "Bash(docker ps -a)",
      "Bash(systemctl status monitor-engine.service --no-pager)",
      "Bash(systemctl status tunnel-monitor.service --no-pager)",
      "Bash(ss -tlnp | grep 8092)"
    ]
  }
}
```

### Reglas de seguridad
- **Auto-aprobar:** lecturas (SELECT, ls, cat, git log, docker ps)
- **NO auto-aprobar:** escrituras destructivas (DELETE, DROP, rm -rf, git reset --hard)
- **Siempre confirmar:** deploy a producción, restart de servicios críticos

---

## ORDEN DE INSTALACIÓN RECOMENDADO

1. **PostgreSQL MCP** — Mayor impacto inmediato, sin prerrequisitos
2. **Docker MCP** — Simple, sin configuración especial
3. **n8n MCP** — Requiere crear API Key en n8n UI primero

---

## NOTAS ADICIONALES

- Todos los MCPs usan `npx` o binarios globales — Node.js requerido
- Verificar Node.js: `node --version` (requiere v18+)
- Después de instalar, reiniciar Claude Code para que detecte los nuevos MCPs
- Los MCPs se conectan en tiempo real — si el servicio está caído, el MCP falla gracefully
