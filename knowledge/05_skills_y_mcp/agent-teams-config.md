# [DOC] AGENT TEAMS LITE — Configuración La Fábrica

**Clasificación:** Documentación / Orquestación Multi-Agente
**Fecha instalación:** 2026-03-01
**Estado:** ✅ ACTIVO — 9 skills instaladas en `~/.claude/skills/`
**Repo:** https://github.com/Gentleman-Programming/agent-teams-lite

---

## ¿Qué es Agent Teams Lite?

Framework de Spec-Driven Development (SDD) que coordina sub-agentes especializados
para proyectos grandes (>10 archivos, >200 líneas). En lugar de una conversación
monolítica, divide el trabajo en fases con agentes especializados.

**Cuándo usar:** Features grandes, refactors complejos, nuevos módulos completos.
**Cuándo NO usar:** Fixes puntuales, cambios en 1-3 archivos, preguntas rápidas.

---

## Instalación (Referencia)

```bash
git clone --depth=1 https://github.com/Gentleman-Programming/agent-teams-lite.git /tmp/agent-teams-lite
cd /tmp/agent-teams-lite
bash scripts/install.sh --agent claude-code
# → 9 skills copiadas a ~/.claude/skills/
# → Instrucciones del orquestador añadidas a ~/.claude/CLAUDE.md
```

---

## Archivos Instalados

```
~/.claude/
├── CLAUDE.md                    — Instrucciones del orquestador SDD (138 líneas)
└── skills/
    ├── sdd-init/SKILL.md        — Bootstrap: inicializar contexto SDD en proyecto
    ├── sdd-explore/SKILL.md     — Explorer: analizar codebase e ideas
    ├── sdd-propose/SKILL.md     — Proposer: crear propuesta de arquitectura
    ├── sdd-spec/SKILL.md        — Spec Writer: escribir especificaciones técnicas
    ├── sdd-design/SKILL.md      — Designer: diseño técnico detallado
    ├── sdd-tasks/SKILL.md       — Task Planner: dividir en tareas con DAG
    ├── sdd-apply/SKILL.md       — Implementer: codificar según specs
    ├── sdd-verify/SKILL.md      — Verifier: validar contra especificaciones
    └── sdd-archive/SKILL.md     — Archiver: documentar y archivar
```

---

## Stack de La Fábrica (Contexto para sub-agentes)

| Capa | Tecnología |
|---|---|
| Backend | Go (Motor Monitor), PHP (CRM API) |
| Frontend | React 19 + Vite + Tailwind v4 |
| Base de datos | PostgreSQL (varios schemas) |
| Orquestación | n8n (BFF supremo) |
| Infra | Docker + systemd |
| Estilo | Navy Industrial (slate-950, #D00000, rounded-sm) |

---

## Comandos SDD Disponibles

> **Nota:** Los comandos del prompt original diferían de los reales. Aquí los comandos exactos:

| Comando | Acción |
|---|---|
| `/sdd-init` | Inicializar contexto SDD en el proyecto actual |
| `/sdd-explore <tema>` | Explorer analiza una idea sin crear archivos |
| `/sdd-new <nombre>` | Iniciar nuevo cambio (crea propuesta) |
| `/sdd-continue [nombre]` | Crear siguiente artefacto en la cadena |
| `/sdd-ff [nombre]` | Fast-forward: propuesta → specs → design → tasks |
| `/sdd-apply [nombre]` | Implementer ejecuta las tareas |
| `/sdd-verify [nombre]` | Verifier valida la implementación |
| `/sdd-archive [nombre]` | Archiver documenta y archiva el cambio |

---

## Grafo de Dependencias entre Fases

```
/sdd-new
    └─ sdd-explore → sdd-propose
                          │
            ┌─────────────┴─────────────┐
         sdd-spec                   sdd-design
            └─────────────┬─────────────┘
                       sdd-tasks
                          │
                       sdd-apply
                          │
                       sdd-verify
                          │
                       sdd-archive
```

- `sdd-spec` y `sdd-design` se pueden ejecutar en paralelo
- `sdd-tasks` requiere AMBOS: specs + design
- `sdd-verify` es opcional pero recomendado antes de archive

---

## Artifact Store

Agent Teams Lite guarda los artefactos intermedios (propuesta, specs, design, tasks)
en el backend de persistencia configurado:

| Prioridad | Backend | Estado en La Fábrica |
|---|---|---|
| 1 | **Engram** | ✅ Instalado — se usará automáticamente |
| 2 | OpenSpec (archivos) | Disponible si se pide explícitamente |
| 3 | None (efímero) | Fallback si Engram no responde |

---

## Reglas de La Fábrica para Sub-agentes

Cuando se lance SDD en un proyecto de La Fábrica, los sub-agentes deben:

- **Explorer:** Leer `/opt/fabrica/knowledge/` antes de analizar código
- **Designer:** Aplicar siempre Navy Industrial (slate-950, rounded-sm, #D00000)
- **Implementer:** Código debe pasar GGA antes de commit (`git commit` activa el hook)
- **Archiver:** Actualizar `/opt/fabrica/knowledge/02_proyectos/` al terminar
- **Todos:** Usar Engram (`mem_save`) para decisiones importantes de arquitectura

---

## Integración con Herramientas de La Fábrica

| Herramienta | Integración |
|---|---|
| **Engram** | Artifact store automático. Sub-agentes usan `mem_save`/`mem_search` |
| **GGA** | Hook pre-commit activo — el Implementer no puede saltárselo |
| **knowledge/** | Explorer lo lee al inicio, Archiver lo actualiza al final |
| **AGENTS.md** | Estándares que GGA enforcea en todo código generado |

---

## Comandos de Verificación

```bash
# Ver skills instaladas
ls ~/.claude/skills/

# Ver skill específica
cat ~/.claude/skills/sdd-apply/SKILL.md

# Ver instrucciones del orquestador
cat ~/.claude/CLAUDE.md | head -30

# Actualizar skills (re-clonar y re-instalar)
cd /tmp/agent-teams-lite && git pull && bash scripts/install.sh --agent claude-code
```

---

## Historial

| Fecha | Evento |
|---|---|
| 2026-03-01 | Instalación Agent Teams Lite, 9 skills en `~/.claude/skills/` |
| 2026-03-01 | Orquestador SDD configurado en `~/.claude/CLAUDE.md` |
| 2026-03-01 | Engram como artifact store automático (ya estaba instalado) |

**Mantenedor:** Rafael — La Fábrica IA
