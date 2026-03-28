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

EXCEPCIÓN — DIGITAL HUB (digital.ia-bybusiness.com y digital.ia-bybusiness.es):
El proyecto digital-hub/ tiene su propio sistema de diseño Light Mode independiente
del estándar Navy Industrial. En este proyecto están PERMITIDOS:
- rounded-xl, rounded-2xl, rounded-full
- Paleta de color propia (bg-white, bg-slate-50, blue-600, slate-900)
- Fuente Outfit (Google Fonts)
- GGA NO debe aplicar reglas Navy Industrial a rutas digital-hub/
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
