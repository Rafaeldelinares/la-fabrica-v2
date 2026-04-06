# MEMORIA — La Fábrica IA

## IDENTIDAD
- Proyecto: La Fábrica IA (planta interna de ByBusiness)
- Estándar visual obligatorio: **Navy Industrial** (`bg-slate-950`, acento `#D00000`, `rounded-sm`, `JetBrains Mono` para datos)
- Stack frontend: React 19 + Vite + Tailwind CSS v4
- Orquestador datos: n8n (BFF supremo, frontend NUNCA ataca DB directamente)
- Motor IA local: Qwen (Ollama descartado)

## INFRAESTRUCTURA — DOS ENTORNOS (no confundir, cuesta tokens)

### LOCAL /opt/fabrica/
- n8n: localhost:5678 — MCP n8n-mcp apunta AQUÍ (CRM workflows)
- PostgreSQL: localhost:5432 DB fabrica — MCP postgres-fabrica apunta AQUÍ
- PostgreSQL Monitor: localhost:5435 DB reputacion_cache — MCP postgres-monitor
- Motor Go (monitor): :8092 (systemd, fuera de Docker)
- Scraper NANO: :8090 | HEAVY: :8091 (Docker)
- Dockhand: :3000 (fabrica_network)
- Motor Reputación invocación: `POST http://localhost:8092/webhook/scraper/go` body `{"query":{"q":"...","depth":5,"preload":false}}`
- Docker: gestionar con `docker ps/restart` en local via Bash
- Containers locales: `fabrica-n8n`, `config-postgres-1` (postgres:16, user: postgres), `fabrica-traefik`, `dockhand`, `postgres-monitor-v2` (postgres:15, :5435), `scraper-heavy-v2` (:8091), `scraper-nano-v2` (:8090)
- n8n API key LOCAL: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyOGRjMTdiZS02OWMwLTQ4YmEtYmU1ZC05MGUxOGVhMDRhZDIiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiNTM1NzBlN2ItZDRlOS00MzYyLTljNzAtZDhlNjEwYTg5ZDRhIiwiaWF0IjoxNzcyNDAzNzg1fQ.MRQwI54tPAa-Z3wX-xUIcwQyeuOQs9MWULCEYUJWQX8
- CRM DB separada: crm_bybusiness (en config-postgres-1, cred n8n: dDbqSfHHmwVrXhLh)

### VPS 72.60.191.179 (producción) — ZONA LIBRE DE IA (sin modelos, solo orquestación)
- n8n VPS: https://n8n.ia-bybusiness.online — **MCP n8n-mcp-vps** via túnel localhost:5679
  - Túnel: systemd `tunnel-n8n-vps.service` (activo, restart=always)
  - ⚠️ CRÍTICO: container n8n NO tiene port binding al host — `localhost:5678` NUNCA funciona desde VPS. SIEMPRE usar URL pública: `ssh root@72.60.191.179 "curl -H 'X-N8N-API-KEY: <key>' 'https://n8n.ia-bybusiness.online/api/v1/...'"``
  - API key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIyMWYyN2ZkMi1jY2NlLTRhZGQtYTNiNC01OGI4NTY3N2RhODkiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiODUzZWYxOTktMTNkOC00YWFhLTg0YzgtZGYyYTc0YWMyY2NjIiwiaWF0IjoxNzcyMTYwMzQ1fQ.XWlA72dTrr96u50HWYBgGJp6D2TzPQGwN4zP9YGPTDk
- PostgreSQL VPS: crm_bybusiness — **MCP postgres-vps** via túnel localhost:5433
  - Túnel: systemd `tunnel-postgres-vps.service` (activo, restart=always)
  - User: rafael_admin / DB: crm_bybusiness
  - SMTP cred ID: 8NbamWrMdRexLNwa (informacion@ia-bybusiness.com)
  - Proyectos: ESCAPARATE_COM/ES workflows
- PostgreSQL VPS: acceso via `ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d fabrica -c '...'"` — MCP NO llega
- WAHA: https://waha.ia-bybusiness.online (solo en VPS)
- Traefik: :80/:8080
- Deploy CRM: `rsync -az --delete CRM_ByBusiness/dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/`
- Deploy Escaparate COM: `rsync -az --delete escaparate-com/dist/ root@72.60.191.179:/var/www/escaparate-com/`
- Deploy Escaparate ES: `rsync -az --delete escaparate-es/dist/ root@72.60.191.179:/var/www/escaparate-es/`
- ⚠️ RUTAS /var/www/ia-bybusiness.com/ y /var/www/ia-bybusiness.es/ EXISTEN pero nginx NO las sirve — no usar para deploy
- Webhook 404 fix: `docker restart fabrica-n8n-1` + deactivate/activate ciclo

## REGISTRY DE SERVICIOS (DB local fabrica — postgres-fabrica MCP)

### Consultar workflows n8n sin SSH
```sql
-- Buscar por nombre
SELECT workflow_id, nombre, activo, webhook_urls, parametros_entrada
FROM infraestructura.workflows_n8n WHERE nombre ILIKE '%CRM_72%';

-- Ver JSON completo del workflow
SELECT workflow_json FROM infraestructura.workflows_n8n WHERE nombre = 'CRM_72_POST_CONTRATO_ENVIAR';

-- Todos los activos con webhook
SELECT nombre, webhook_urls[1] FROM infraestructura.workflows_n8n
WHERE activo AND webhook_urls IS NOT NULL ORDER BY nombre;
```

### Consultar servicios/infraestructura
```sql
SELECT servicio, tipo, url, url_interna, descripcion, notas
FROM infraestructura.servicios_endpoints ORDER BY entorno, tipo;
```

### Notas importantes
- 123 workflows VPS sincronizados con JSON completo (2026-03-22)
- 14 servicios documentados (n8n, WAHA, PostgreSQL, browserless, Traefik, frontends, scrapers)
- MCP postgres-fabrica es READ-ONLY — DDL/DML masivo: `PGPASSWORD='Samsung18091809&' psql -U rafael -h localhost -p 5432 -d fabrica`
- postgres-vps y n8n-mcp-vps ahora disponibles tras fix del %21 en mcp.json (requiere restart Claude Code)

## BASES DE DATOS (PostgreSQL :5432 local)
- `fabrica` → schemas: fabrica_core (bitácora, métricas, usuarios), infraestructura, public (n8n)
- `crm_bybusiness` → schemas: crm_bybusiness (leads, ventas, pagos), marketing, operaciones, rrhh, social
- `chathub_bybusiness` → schemas: chathub (config Waha), chathub_bybusiness (agentes IA, sesiones)
- `reputacion_cache` → PostgreSQL :5435, red monitor_network
- Regla de oro: frontend NUNCA ataca DB directamente, todo via n8n

## DOMINIOS
- ia-bybusiness.es → Escaparate España (Light Mode)
- ia-bybusiness.com → Escaparate Global (Light Mode)
- ia-bybusiness.cloud → SaaS clientes (futuro)

## PROYECTOS ACTIVOS

### CRM ByBusiness
- Stack: React 19 + Vite + PHP API + PostgreSQL
- Estado: Backend funcional, frontend en desarrollo
- Vistas: Torre de Control (Admin, 6 módulos) | Modo Túnel (Operador, 4 módulos)
- n8n distribuye leads cada 30s (3 prioridades)

### Monitor Reputación V2
- Estado: ✅ PRODUCCIÓN COMPLETA (2026-03-01)
- Motor Go :8092 con systemd (monitor-engine.service)
- Túnel SSH VPS con watchdog systemd (tunnel-monitor.service)
- Docker restart=always en todos los containers del stack monitor
- Bugs corregidos: opositare, is_simulated, listas vs detalles
- Archivos clave: main.go, scraper_service.go, scraper-nano.js, scraper-base.js
- Frontend: React + Recharts + Lucide, en desarrollo por Antigravity (2026-03-01)
- Docs: /opt/fabrica/knowledge/02_proyectos/Monitor_Reputacion/

### Escaparate Web (ia-bybusiness.es)
- Stack: React 18+ + Vite + Tailwind v4 + Framer Motion
- Estado: Frontend funcional, integración PHP pendiente
- Kiosk Mode: hero 8 pasos, rotación 5s

## GGA DISCIPLINE (zero debt policy)
- Ver: `memory/feedback_gga_discipline.md`
- Commits ≤3 archivos, PropTypes+JSDoc desde el primer commit, sin catch vacíos, sin inline styles, sin mock data, sin fallbacks localhost, `rounded-sm` siempre, setTimeout siempre con clearTimeout

## CONVENCIONES
- Nomenclatura n8n: [PROYECTO]_[MODULO]_[ACCION]
- Componentes React: máx 150 líneas
- Deploy a producción: solo con frase "AUTORIZO DESPLIEGUE FINAL"
- Skeleton Screens (prohibidos spinners circulares)
- Navegación cockpit: h-screen sin scroll global, scroll solo en paneles internos

---

# 🏭 ESTÁNDARES DE CÓDIGO - LA FÁBRICA IA

**Versión:** 1.0
**Última actualización:** 2026-03-01
**Scope:** Todos los proyectos de La Fábrica

## FILOSOFÍA

Las Tres Leyes de La Fábrica:
1. Velocidad con Solidez - Sin atajos que comprometan estabilidad
2. Soberanía Total - Zero licencias, el cliente es dueño de todo
3. Estándar Militar - Si no parece grado industrial, no sale a producción

## REGLAS GENERALES (TODOS LOS PROYECTOS)

OBLIGATORIO:
- Toda función pública debe tener comentario descriptivo
- Variables descriptivas, no abreviaturas crípticas
- Sin contraseñas, API keys o secrets hardcodeados NUNCA
- Sin IPs hardcodeadas, usar variables de entorno
- Sin código comentado sin motivo (usar Git para historial)
- Sin console.log, fmt.Println, var_dump en código de producción
- Manejo de errores explícito, nunca ignorar errores silenciosamente

DOCKER:
- Containers siempre con restart=always para producción
- Nombres descriptivos: proyecto-componente-version
- Volúmenes siempre en /opt/fabrica/proyecto/data
- Health checks obligatorios en todos los containers

GIT:
- Commits en formato: tipo(scope): descripción
- Tipos válidos: feat, fix, docs, refactor, test, chore
- Descripción en español, clara y concisa
- Un commit = una cosa (no mezclar features con fixes)

## BACKEND GO

NAMING:
- Variables: camelCase
- Funciones exportadas: PascalCase
- Funciones privadas: camelCase
- Constantes: SCREAMING_SNAKE_CASE

CÓDIGO:
- Structs deben tener tags json
- Errores siempre loguear antes de return
- Validar todos los inputs en endpoints públicos
- Usar context.Context en operaciones largas
- Defer para cleanup de recursos

PROHIBIDO:
- panic() en código de producción
- Variables globales mutables
- SQL queries sin prepared statements

## FRONTEND REACT

NAMING:
- Componentes: PascalCase
- Hooks personalizados: useCamelCase
- Archivos de componentes: PascalCase.jsx
- Utilidades: camelCase.js

CÓDIGO:
- Props siempre destructuradas
- useState para estado local, Context para global
- useEffect con array de dependencias SIEMPRE
- Key prop obligatorio en listas
- PropTypes o TypeScript para componentes reutilizables

ESTILO NAVY INDUSTRIAL:
- Fondo: bg-slate-950 o bg-slate-900
- Bordes: rounded-sm (PROHIBIDO rounded-xl o rounded-full)
- Acentos: Solo rojo #D00000 para acciones críticas
- Tipografía: Inter para UI, JetBrains Mono para datos
- No usar spinners circulares, usar skeleton screens

EXCEPCIÓN — ESCAPARATE (ia-bybusiness.com y ia-bybusiness.es):
Los proyectos escaparate-com/ y escaparate-es/ tienen su propio sistema de diseño
independiente del estándar Navy Industrial. En estos proyectos están PERMITIDOS:
- rounded-xl, rounded-2xl, rounded-full, rounded-[40px]
- Inline styles para colores de marca (#25d366, #00a884, #dcf8c6, etc.)
- Paleta de color propia (blancos, slate-200, emerald, blue-600)
- Framer Motion con animaciones propias
- GGA NO debe aplicar reglas Navy Industrial a rutas escaparate-com/ o escaparate-es/
salvo indicación explícita del usuario.

EXCEPCIÓN — CSS custom properties vía inline style:
Cuando Tailwind no puede generar clases arbitrarias con valores dinámicos de runtime
(ej: anchos proporcionales calculados en JS), se permite el patrón:
  style={{ '--var': `${valor}%` }} + className="[width:var(--var)]"
Usar SOLO cuando no existe alternativa Tailwind. Documentar con comentario en el código.

PROHIBIDO:
- Inline styles genéricos (usar Tailwind). Ver excepción CSS custom properties arriba.
- console.log en producción (scripts CLI: usar process.stdout.write o logger wrapper)
- setTimeout sin clearTimeout

## BASE DE DATOS POSTGRESQL

NAMING:
- Tablas: snake_case, singular (user no users)
- Columnas: snake_case
- Índices: idx_tabla_campo
- Foreign keys: fk_tabla_campo

CÓDIGO:
- Siempre usar prepared statements (librería pg con queries parametrizadas)
- Transacciones para operaciones múltiples
- Índices en columnas de búsqueda frecuente
- Constraints de integridad referencial

EXCEPCIÓN — Scripts CLI admin (psql via execSync/SSH):
Los scripts de importación/migración de un solo uso (ej: import-gbp-2026.js) que ejecutan
psql via SSH en bases de datos remotas donde la librería pg no es viable pueden usar
string interpolation SOLO si se cumplen TODAS estas condiciones:
1. Los valores numéricos se validan con parseInt/parseFloat antes de interpolación
2. Los strings se escapan con .replace(/'/g, "''") (estándar de escape psql)
3. El script NO es accesible desde internet (CLI local/admin, no endpoint web)
4. El origen de datos es interno (nuestra BD o scrapers controlados, no input externo libre)
Documentar el script con un aviso explícito de estas condiciones.

PROHIBIDO:
- SELECT * en producción
- Queries sin WHERE en tablas grandes
- Passwords sin hash

## N8N WORKFLOWS

NAMING:
- Nodos: Descripción clara en español
- Workflows: MAYÚSCULAS_CON_GUIONES
- Variables: {{ $json.camelCase }}

CÓDIGO:
- Validar entrada de webhooks SIEMPRE
- Documentar lógica compleja con notas
- Error handling en todos los nodos críticos
- Timeout razonable en HTTP requests

PROHIBIDO:
- Webhooks sin validación
- Loops infinitos sin condición de salida
- Credenciales en el workflow (usar Credentials)

## PHP

NAMING:
- Variables: $camelCase
- Funciones: camelCase
- Clases: PascalCase
- Constantes: SCREAMING_SNAKE_CASE

CÓDIGO:
- PSR-12 como estándar
- Type hints en funciones
- Prepared statements para SQL
- Validación de inputs siempre

PROHIBIDO:
- eval() NUNCA
- extract() sobre datos de usuario
- register_globals
- SQL injection vulnerabilities

## VALIDACIÓN DE COMMITS

Antes de permitir commit, verificar:
1. No hay console.log, fmt.Println, var_dump
2. No hay contraseñas o API keys
3. No hay IPs hardcodeadas
4. Funciones públicas tienen comentarios
5. Naming conventions se respetan
6. No hay código comentado sin explicación

RESPUESTA:
Si TODO está bien: STATUS: PASSED
Si hay violaciones: STATUS: FAILED con lista detallada de problemas

FORMATO DE RESPUESTA OBLIGATORIO:
STATUS: [PASSED o FAILED]

[Si FAILED, lista de violaciones línea por línea]

---

## SKILLS REGISTRY - La Fábrica IA

### Context Management
| Skill | Description | Location |
|-------|-------------|----------|
| `context-guardian` | Protocolo para mantener uso de contexto por debajo del 85% con checkpoints automáticos y limpieza de archivos grandes | [SKILL.md](.fabrica-twin/skills/context-guardian/SKILL.md) |

### Digital Twins System (FABRICA_TWIN)
| Skill | Description | Location |
|-------|-------------|----------|
| `fabrica-twin` | Sistema de gemelos digitales para capturar, documentar y reutilizar patrones de trabajo | [SKILL.md](.fabrica-twin/skills/fabrica-twin/SKILL.md) |

### Cloud Storage Integration
| Skill | Description | Location |
|-------|-------------|----------|
| `dropbox-integration` | Skill para integrar Dropbox API v2 con OAuth2 y refresh tokens automáticos | [SKILL.md](/home/rafael/.claude/skills/dropbox-integration/SKILL.md) |

### Usage Notes
- **Cargar skills automáticamente** cuando el contexto coincida con trigger keywords
- **Context Guardian es OBLIGATORIO** - mantener contexto <85% previene compactaciones
- **Checkpoint cada ~35 tool-calls** - usar `mem_session_summary` preventivamente
- **Limpieza node_modules** - ejecutar script `./cleanup-script.sh` cuando directorio >100MB

---

## VERIFICACIÓN AUTOMÁTICA MCPs

**Al inicio de cada sesión con opencode**, ejecutar automáticamente:
```bash
/opt/fabrica/.opencode-startup.sh
```

**Propósito:** Verificar que todos los MCPs estén operativos antes de comenzar a trabajar.

**MCPs verificados:**
1. PostgreSQL VPS (postgres-vps) - túnel localhost:5433
2. n8n-mcp-local - API localhost:5678  
3. n8n-mcp-vps - API https://n8n.ia-bybusiness.online
4. PostgreSQL fabrica (postgres-fabrica) - localhost:5432
5. PostgreSQL monitor (postgres-monitor) - localhost:5435

**Resultado esperado:** `✅ TODOS LOS MCPs FUNCIONALES (5/5)`

**Si hay fallos:** Mostrar workarounds disponibles y sugerir reparación.
