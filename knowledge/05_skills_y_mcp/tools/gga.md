# [DOC] GGA — Gentleman Guardian Angel

**Clasificación:** Documentación / Herramienta Quality Gate
**Fecha instalación:** 2026-03-01
**Versión:** 2.7.0
**Estado:** ✅ ACTIVO — Hook pre-commit instalado en `/opt/fabrica/.git/hooks/pre-commit`

---

## ¿Qué es GGA?

Code review automático con IA en pre-commit hooks. Valida que todo código cumpla
con los estándares de La Fábrica antes de permitir commits, usando Claude como
motor de análisis.

Funciona como guardián: si el código viola alguna regla de `AGENTS.md`, el
commit queda **bloqueado** con una lista detallada de violaciones.

---

## Ubicación

| Elemento | Ruta |
|---|---|
| Binario | `~/.local/bin/gga` |
| Librerías | `~/.local/share/gga/lib/` |
| Config del repo | `/opt/fabrica/.gga` |
| Estándares La Fábrica | `/opt/fabrica/AGENTS.md` |
| Hook git | `/opt/fabrica/.git/hooks/pre-commit` |

---

## Instalación (Referencia)

El prompt original especificaba `curl ... | bash` — eso no funciona porque GGA
instala desde archivos locales, no descarga un binario. El proceso correcto:

```bash
# 1. Clonar repo completo
git clone --depth=1 https://github.com/Gentleman-Programming/gentleman-guardian-angel.git /tmp/gga-install

# 2. Instalar (copia bin/gga y lib/*.sh a ~/.local/)
cd /tmp/gga-install && bash install.sh

# 3. Copiar pr_mode.sh (bug del installer v2.7.0: no lo copia)
cp /tmp/gga-install/lib/pr_mode.sh ~/.local/share/gga/lib/

# 4. Añadir al PATH
echo 'export PATH="/home/rafael/.local/bin:$PATH"' >> ~/.bashrc
export PATH="/home/rafael/.local/bin:$PATH"

# 5. Verificar
gga --version   # → gga v2.7.0
```

---

## Configuración Activa (`/opt/fabrica/.gga`)

```ini
PROVIDER="claude"
FILE_PATTERNS="*.go,*.js,*.jsx,*.tsx,*.ts,*.php,*.sql,*.sh"
EXCLUDE_PATTERNS="node_modules,vendor,.git,dist,build,*.test.go,*.spec.js,*.d.ts"
RULES_FILE="AGENTS.md"
STRICT_MODE="true"
TIMEOUT="60"
```

**Nota:** El parámetro del prompt era `AGENTS_FILE` — el nombre real es `RULES_FILE`.
**Nota:** El repo es un monorepo. El `.gga` va en la raíz (`/opt/fabrica/`) donde
está el `.git`, no en los subdirectorios de proyecto.

---

## Comandos CLI

```bash
gga --version            # Verificar versión instalada
gga init                 # Crear .gga por defecto en directorio actual
gga install              # Instalar hook pre-commit en .git/hooks/
gga uninstall            # Desinstalar hook pre-commit
gga run                  # Ejecutar review manual de archivos en staging (sin commit)
gga run --pr-mode        # Review de todos los cambios vs rama base
```

---

## Workflow de Uso

```
1. Editas código en cualquier proyecto
2. git add archivo.go
3. git commit -m "fix(monitor): corregir selector de lista"
4. GGA intercepta el commit automáticamente
5. Envía el diff a Claude con los estándares de AGENTS.md
6. → PASSED: commit procede
   → FAILED: commit bloqueado + lista de violaciones
7. Corriges las violaciones
8. git add -p && git commit -m "fix(monitor): corregir selector de lista"
```

---

## Proyectos Protegidos

Todos los proyectos del monorepo `/opt/fabrica` quedan protegidos con un único hook:

| Proyecto | Extensiones revisadas |
|---|---|
| Monitor Reputación V2 (Go) | `*.go` |
| Monitor Frontend / Escaparate (React) | `*.js`, `*.jsx`, `*.tsx`, `*.ts` |
| CRM ByBusiness (PHP) | `*.php`, `*.sql` |
| Scripts de infraestructura | `*.sh` |
| Todos | `AGENTS.md` se aplica transversalmente |

---

## Estándares Enforced (Resumen)

Los estándares completos están en `/opt/fabrica/AGENTS.md`. Los más críticos:

- Sin `fmt.Println`, `console.log`, `var_dump` en producción
- Sin contraseñas, API keys o IPs hardcodeadas
- Funciones públicas con comentario descriptivo
- Naming conventions por lenguaje (camelCase Go, snake_case SQL, PascalCase React)
- Navy Industrial en React: `rounded-sm`, sin `rounded-xl`, Tailwind solo
- Docker: `restart: always`, health checks obligatorios
- Git: `tipo(scope): descripción en español`

---

## Notas Técnicas Importantes

### Limitación: Claude Code Session

GGA no puede ejecutarse desde **dentro de una sesión Claude Code** activa.
Error: `Claude Code cannot be launched inside another Claude Code session.`

Esto es **normal y esperado**. El hook funciona perfectamente cuando el usuario
hace `git commit` desde su terminal. Solo falla si Claude Code intenta hacer
commits internamente (que no hace por defecto).

Para testing desde terminal fuera de Claude Code:
```bash
unset CLAUDECODE && gga run   # Solo para testing
```

### Bug conocido del installer v2.7.0

El `install.sh` no copia `pr_mode.sh`. Si GGA falla con:
`/home/rafael/.local/share/gga/lib/pr_mode.sh: No existe el archivo`

```bash
cp /tmp/gga-install/lib/pr_mode.sh ~/.local/share/gga/lib/
```

---

## Actualizar Estándares

Los estándares evolucionan. Cuando un commit legítimo quede bloqueado
injustamente, actualizar `/opt/fabrica/AGENTS.md` y hacer commit:

```bash
# Editar AGENTS.md con la excepción o aclaración
git add AGENTS.md
git commit --no-verify -m "chore: actualizar estándar AGENTS.md"
```

---

## Bypass (Solo Emergencias)

```bash
git commit --no-verify -m "hotfix: descripción de la emergencia"
```

Usar **únicamente** en emergencias críticas de producción. Documentar siempre
la razón en el mensaje de commit.

---

## Historial

| Fecha | Evento |
|---|---|
| 2026-03-01 | Instalación GGA v2.7.0. Bug pr_mode.sh corregido manualmente |
| 2026-03-01 | Hook instalado en `/opt/fabrica/.git/hooks/pre-commit` |
| 2026-03-01 | AGENTS.md v1.0 creado con estándares completos de La Fábrica |

**Mantenedor:** Rafael — La Fábrica IA
