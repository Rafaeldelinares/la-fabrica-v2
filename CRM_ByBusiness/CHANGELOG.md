# Changelog

All notable changes to CRM_ByBusiness are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased] — 2026-08-13

### Migración legacy de facturación (CRM anterior → CRM_ByBusiness)

Capacidad para absorber clientes del CRM anterior respetando numeración histórica, IBAN, fecha
máxima de pago, y permitiendo consolidación de proformas e importación de facturas sueltas.

**Documentación**: [`docs/LEGACY_FACTURACION_MIGRATION.md`](docs/LEGACY_FACTURACION_MIGRATION.md)
**Spec OpenSpec**: [`openspec/specs/legacy-facturacion-migration/spec.md`](openspec/specs/legacy-facturacion-migration/spec.md)
**Change OpenSpec**: [`openspec/changes/2026-08-13-legacy-facturacion-migration/`](openspec/changes/2026-08-13-legacy-facturacion-migration/)

### Added

- **Schema extendido** (PostgreSQL VPS `crm_bybusiness`):
  - `clientes.proformas`: +`fecha_maxima_pago date`, +`iban varchar(50)`, +`legacy_numero varchar(50)`,
    +`origen varchar(50) DEFAULT 'normal'`, +`proforma_padre_id integer REFERENCES clientes.proformas(id)`
  - `clientes.facturas`: +`legacy_numero varchar(50)`, +`origen varchar(50) DEFAULT 'normal'`
  - `clientes.contratos`: +`es_legacy boolean DEFAULT false`
  - CHECK constraint de proforma extendido: `borrador, verificada, pendiente_cliente, aceptada, aprobada, rechazada`
  - Índice: `idx_proformas_padre` sobre `proforma_padre_id`
- **Producto 12M nuevo** (`clientes.productos` id catálogo 18): "PRIMER PAGO 12M: Campaña SEO local",
  precio 144,50 €, duración 12 meses
- **`CRM_PROFORMA_CONSOLIDAR`** (workflow nuevo, ID `Km181i5Mc8mPI90W`): recibe `proforma_ids[]`,
  suma líneas de hijas agrupadas por descripción, crea proforma padre
  (`CONS-{cliente_id}-{YYMMDD-HH24MISS}`), marca hijas con `proforma_padre_id`
- **`CRM_FACTURA_IMPORTAR_LEGACY`** (workflow nuevo, ID `aK7UC5lZhlTfL39r`): importa facturas del CRM
  anterior sin proforma asociada. Crea factura con `numero=legacy_numero` (NO regenera serie A),
  emisor ByBusiness hardcoded

### Changed

- **`CRM_19_POST_PROFORMA`**: extendido con soporte para `legacy_numero`, `fecha_maxima_pago`,
  `iban`, `origen`, `estado` personalizable. VersionId `aff9e784-3724-4d15-a6fa-c31b8b177eea`
- **`CRM_FACTURA_GENERAR`**: bug de schema `crm_bybusiness.*` → `clientes.*` corregido. Ahora
  tiene 10 nodos: agregados **Copy Lineas** (de proforma_lineas a factura_lineas),
  **Update Emisor Receptor** (datos ByBusiness + cliente), **Create Pagos** (fraccionados
  automáticos). Datos emisor ByBusiness hardcoded. VersionId `bb2910b1-7947-4990-b0d7-10e44fb81e47`
- **`CRM_PROFORMA_VERIFICAR`**: schema bug arreglado (`crm_bybusiness.proformas` → `clientes.proformas`)
- **`CRM_70_POST_CONTRATO_DIGITAL`**: schema bug arreglado. Modelo corregido: usa `cliente_id`
  (no `lead_id`). Campos opcionales: `estado`, `referencia`, `objeto`, `importe_mensual`, `canal_envio`
- **`CRM_75_POST_CONTRATO_EMAIL`**: schema bug arreglado. Devuelve campos adicionales
  (`email_estado`, `whatsapp_estado`)
- **`series_facturacion`**: reset a 0 (series A y R en 2026) para auditoría limpia

### Data

- **Cliente de prueba 1254** (NATALIA MARTI ATELIER) cargado en VPS con 2 proformas legacy
  y 1 contrato digital pre-generado
- **1220 clientes, 1478 contratos, 447 proformas, 112 facturas** archivados a `legacy_archive.*`
- **Tablas auxiliares restauradas selectivamente**: `gbp_audit_history` (774),
  `series_factura` (6). NO restauradas (cache): `gbp_audit_cache`, `informes_competencia`,
  `emails_info_leads`, `competencia`, `sector_aggregates`

### Security

- Auditoría del flujo de facturación detectó 6 bugs críticos (todos corregidos): 4 workflows
  con schema incorrecto, estados React↔DB desincronizados, factura sin líneas/sin emisor/
  sin pagos fraccionados, modelo `lead_id` obsoleto

### Pending

- **VeriFactu/AEAT (Fix 7)**: STANDBY. Plan diseñado en [`openspec/changes/2026-08-13-verifactu-mock-mode/`](openspec/changes/2026-08-13-verifactu-mock-mode/)
  con Opción C (híbrido: workflow con flag `verifactu_mode` que switch entre `mock` y `real`).
  Mock permite testing end-to-end sin riesgo legal. Cambio a `real` = solo cambiar flag, sin reescribir código.
  Pendiente: certificado digital AEAT (B10577021) y decisión legal/fiscal sobre obligación VeriFactu de ByBusiness.
- **Modal frontend "Captura de antiguo CRM"** (Fase 5): pendiente
- **Cliente 1254 proforma 2 (LEGACY-2/2026) vacía (0€)**: usuario consultará mañana el total real

### Backups

- `/opt/fabrica/backups/crm/fase1_pre_modif_20260813_224847.dump` (601KB, pre-schema local)
- `/opt/fabrica/backups/crm/vps_pre_limpieza_20260813_225715.dump` (963KB, pre-limpieza VPS)

## [Unreleased] — 2026-08-14

### Rediseño ficha cliente — sidebar lateral + drawer ancho completo

Tabs horizontales reemplazados por sidebar vertical 15%, drawer limitado a 1080px → hasta 1800px.
Aprovecha mejor la zona de trabajo en pantallas grandes.

**Documentación**: [`docs/CLIENTE_DRAWER_REDESIGN.md`](docs/CLIENTE_DRAWER_REDESIGN.md)
**Spec OpenSpec**: [`openspec/specs/cliente-drawer-redesign/spec.md`](openspec/specs/cliente-drawer-redesign/spec.md)
**Change OpenSpec**: [`openspec/changes/2026-08-14-cliente-drawer-redesign/`](openspec/changes/2026-08-14-cliente-drawer-redesign/)

### Added

- **`src/modules/admin/cartera/ClienteDrawer.jsx`**: nuevo sidebar lateral vertical (15% del ancho del drawer)
  con 6 items (Ficha, Facturación, Historial, Google Business, SEO LOCAL, Tarjeta Digital).
  Item activo con `border-l-2 border-[#D00000]`. Labels con `whitespace-nowrap` para evitar truncado.

### Changed

- **`src/modules/admin/cartera/ClienteDrawer.jsx`**: contenido del tab activo pasa de
  `flex-1 overflow-y-auto` a `flex-1 overflow-y-auto custom-scrollbar px-[5%] py-5` (padding lateral 5%).
- **`src/modules/admin/cartera/CarteraPanel.jsx`** (líneas 472 y 495) y
  **`src/modules/admin/facturacion/FacturacionPanel.jsx`** (línea 90): drawer contenedor cambia de
  `w-[90vw] max-w-[1080px]` a `w-[95vw] max-w-[1800px]` para aprovechar zona de trabajo completa.

### Iteraciones del rediseño

1. **Iter 1**: Tabs horizontales → sidebar vertical 200px fijo
2. **Iter 2**: Sidebar 200px → 25% (proporcional)
3. **Iter 3**: Drawer 1080px → 1800px max (95vw)
4. **Iter 4**: Sidebar 25% → 15% + `whitespace-nowrap`

## [Unreleased] — 2026-08-13

### Drive-by auditing: informe competitivo también guarda auditoría GBP

Cuando se genera el informe competitivo para un cliente, los datos de auditoría de su
ficha GBP también se guardan/actualizan en `clientes.gbp_audit_history`.

**Mecanismo**:
- `pdf_http_server.py` ejecuta el script Xiaomi vía SSH y captura el output completo
- El Xiaomi debe imprimir un bloque `===AUDIT_JSON_START===...===AUDIT_JSON_END===`
  con el JSON de auditoría del cliente
- `pdf_http_server.py` parsea el bloque y hace UPSERT en `gbp_audit_history`
  (fuente: 'webhook', compatible con CHECK constraint existente)

### Added

- **`infra/scripts/pdf_http_server.py`** — `_insert_audit_history()` con UPSERT via CTE
  (DELETE + INSERT para mismo place_id+source). Conexión directa a postgres
  via Docker internal network (172.19.0.4). `_extract_audit_json()` parsea markers.
  `_trigger_xiaomi_scrape()` ya no usa `| tail -20` — captura output completo.
- **`infra/scripts/pdf_http_server.py`** — `_trigger_xiaomi_scrape()` extrae el bloque
  AUDIT_JSON del output Xiaomi y llama a `_insert_audit_history()` después del scrape.

### Changed

- **`infra/scripts/pdf_http_server.py`** — SSH a Xiaomi ya no usa `| tail -20` para
  permitir parseo del bloque AUDIT_JSON (20 líneas no eran suficientes para JSON completo).

## [Unreleased] — 2026-08-13

### Informe competitivo on-demand (sin esperar al cron de 4 semanas)

Cuando un admin hace click en "Ver informe competitivo" y NO hay informe previo,
el backend dispara inmediatamente el scraping en Xiaomi (30-90s) y devuelve el PDF
completo — sin esperar al cron de 4 semanas.

### Added

- **`infra/scripts/pdf_http_server.py`** — trigger scraping via SSH cuando no hay
  informe previo. Flujo: check DB → SSH Xiaomi (`generar-informe-competencia.sh`)
  → wait 180s → verify DB write → return PDF. Lock anti-duplicados con `fcntl.flock`.
  Errores manejados: timeout, cookies expiradas, Xiaomi sin resultados.
- **`useInformeCompetencia.js`** — timeout fetch aumentado a 180s (era 30s).
  Mensaje de error específico para timeout. Extracción de detalle desde respuesta JSON.
- **`GbpInformeCompetencia.jsx`** — skeleton con mensaje contextual:
  "Generando informe por primera vez…" vs "Extrayendo datos de competidores…".
  `isGenerating` computed via elapsed time > 5s threshold.
- **`GbpInformeCompetencia.test.jsx`** — 2 nuevos tests: skeleton con
  "Generando..." y mensaje de timeout 180s. Total: 11 tests.
- **`infra/xiaomi/README.md`** — documentación de `generar-informe-competencia.sh`
  y su invocación on-demand desde VPS.

## [Unreleased] — 2026-06-28

### Operador delinesrafa en producción + Leads landing split + Opción B 2FA

Tres grandes hitos consolidados: el operador `delinaresrafa@gmail.com`
completo end-to-end, el split de leads en LEEDS LANDING vs GESTIÓN DE LEEDS,
y la migración del flujo 2FA a Opción B (el usuario configura su propio secret).

### Added

- **Operador `delinaresrafa@gmail.com`** (id 48 en `auth.usuarios`, role `operador`)
  con 2FA `RafAdmin2026!CRM` (bcryptjs 10 rounds).
- **`IngresarClienteModal`** (`src/modules/admin/leads/IngresarClienteModal.jsx`)
  — form para convertir lead en cliente con prefill desde `venta_detalles`.
- **`SetupOblatorio2FAScreen`** (`src/modules/auth/SetupOblatorio2FAScreen.jsx`)
  — pantalla de setup obligatorio de 2FA. Llama `crm-activar-2fa` para generar
  el secret del usuario, muestra QR + verify input. El admin nunca ve el secret.
- **Workflow `CRM_REGISTRAR_RESULTADO`** (id `6x0x8DCOBzZf62K6`) — reconstruido
  desde cero (12 nodos, 6 ramas: venta, callback, no_interesa, responsable,
  enviar_info, no_contesta, error). La rama VENTA inserta historial_llamadas,
  marca el lead como vendido y crea cliente + venta.
- **Workflow `CRM_AGENDA_V2`** (id `dqj7YNrXBLZvyt86`) — agenda unificada
  UNION ALL de 4 fuentes (historial_llamadas, llamadas_programadas,
  clientes.citas, timeline_global).
- **Workflow `CRM_LEADS_LANDING_FINAL`** (id `yAtQ6wt8YtFwQLvr`) — query
  `(l.origen IN ('landing_digital', 'captacion_web')) OR (c.id IS NOT NULL)`.
  Devuelve captación web + ventas reales.
- **Workflow `CRM_GESTION_LEADS_GET`** (id `5DuC7I7jenCBmzv9`) — query
  `l.origen NOT IN ('landing_digital', 'captacion_web') AND c.id IS NULL`.
  Pool de gestión.
- **Workflow `CRM_USUARIOS_OBLIGAR_2FA`** (id `TVTaOj30rO2uP8Ga`) — webhook
  `POST /webhook/crm-obligar-2fa`, setea `totp_obligatorio=true`.
- **Workflow `CRM_USUARIOS_DESOBLIGAR_2FA`** (id `300t0LVfPMSDcGai`) — webhook
  `POST /webhook/crm-desobligar-2fa`, setea `totp_obligatorio=false`.
- **`docs/LEADS_REPARTO_DECISION.md`** — decisión Option C documentada con
  SQL, alternativas y justificación.
- **`docs/OPERADOR_DELINESRAFA_FLOW.md`** — flujo paso a paso del operador
  (actualizado con Opción B 2FA).
- **`docs/NGINX_CACHE_FIX.md`** — fix del cache 1-year que ocultaba bundles.

### Changed

- **`LeadsLandingPanel.jsx`** — título interno `<h2>` cambia de "GESTIÓN DE
  LEADS" a "LEADS LANDING".
- **`WorkBody.jsx`** — tab routing: `LEADS_GESTON` y `LEADS_LANDING` →
  `<LeadsLandingPanel />`, `LEADS_MGMT` → `<LeadsPanel />` (legacy).
- **`Dashboard.jsx`** — `tabTitles.LEADS_GESTON: 'LEADS LANDING'`.
- **`LeadsPanel.jsx`** (legacy) — endpoint cambiado de `crm-leads-admin` a
  `crm-gestion-leads-get`. Acceso a datos: `data.leads` y `data.total`.
- **`Login.jsx`** — árbol de decisión post-login: si
  `totp_obligatorio && (!totp_habilitado || !totp_secret)` → `SETUP_OBLIGATORIO_2FA`.
- **`AuthContext.jsx`** — `login()` persiste `totp_obligatorio` y
  `totp_configurado` en localStorage.
- **`UsuariosList.jsx`** — `Modal2FA` eliminado. Botón 2FA con 3 estados
  visuales: gris `ShieldOff` (no obligatorio) → click OBLIGATE;
  ámbar `ShieldAlert` (obligatorio pero sin configurar) → click DESOBLIGATE;
  verde `ShieldCheck` (configurado) → click DISABLE.
- **Workflow `CRM_USUARIOS_LISTA`** (id `iM6bc2VznYnUQreP`) — query incluye
  `totp_obligatorio`.
- **Workflow `CRM_LOGIN_V4`** (id `rqMKcs6oPqJyRqMW`) — query y respuesta
  incluyen `totp_obligatorio` y `totp_secret`.
- **Workflow `CRM_USUARIOS_VERIFICAR_2FA`** (id `d6Mpx3Vm1QPEdkwq`) — cuando
  `is_setup=true` también setea `totp_habilitado=true`.

### Fixed

- **nginx 1-year cache** (`/opt/fabrica/data/nginx/crm-bybusiness.conf` en
  el host, montado en `web-crm-bybusiness:/etc/nginx/conf.d/default.conf`).
  Regla única cambiada a dos reglas: `.js` y `.css` →
  `expires 0; add_header Cache-Control no-cache`; imágenes/woff2 siguen 1y.
  Recargar con `docker exec web-crm-bybusiness nginx -s reload`.
- **Queries de `CRM_REGISTRAR_RESULTADO`** (`Update Lead Vendido` +
  `Insert Cliente`) — reescritas con `queryReplacement` + `$1..$N` en vez de
  string interpolation. Antes n8n pasaba literal `'undefined'` cuando el path
  del body no coincidía, fallando silenciosamente. Ahora siempre funciona.
- **`CRM_USUARIOS_DESACTIVAR_2FA`** (id `i42H9X5kniYvewyZ`) — query usaba
  `updated_at = NOW()` pero `auth.usuarios` NO tiene esa columna. Removido,
  ahora con `queryReplacement` correcto.
- **Trigger `operaciones.fn_lead_vendido_to_cliente`** — reescrito para usar
  `crm_bybusiness.operadores` (no `public.usuarios`, que no existe), con
  fallback "Sistema". Resuelve `cliente.nombre_comercial` desde
  `NEW.contacto_nombre` (no `NEW.nombre_negocio`).
- **Schema `clientes.clientes`** — columna `updated_at` añadida
  (`ALTER TABLE clientes.clientes ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`).
- **Schema `auth.usuarios`** — columna `totp_obligatorio` añadida
  (`ALTER TABLE auth.usuarios ADD COLUMN totp_obligatorio BOOLEAN NOT NULL DEFAULT false;`).
- **Hook `useN8n`** — `n8nFetch` ahora retorna `null` para body vacío
  en vez de tirar `SyntaxError: Unexpected end of JSON input`.

### Removed

- **`Modal2FA`** component en `UsuariosList.jsx` — ya no es necesario
  (Opción B: el admin nunca entrega el secret manualmente).
- `QRCodeSVG`, `OTPAuth`, `Copy` imports de `UsuariosList.jsx`.
- `qrModal` state de `UsuariosList.jsx`.

### Security

- **2FA Opción B** — el admin no genera ni ve el secret del usuario. El
  secret se genera y verifica dentro del flujo del propio usuario.
- **2FA bcryptjs flow** documentado en `OPERADOR_DELINESRAFA_FLOW.md`:
  path `/usr/local/lib/node_modules/n8n/node_modules/.pnpm/bcryptjs@2.4.3/node_modules/bcryptjs`
  dentro de `n8n-vps-sqlite`, `rtrim($hash, E'\n')` requerido.
- **5 queries SQL injection hardened** (legacy): uso de `queryReplacement`
  con `$1..$N` en vez de string interpolation en queries críticas.

## [Unreleased] — 2026-06-15

### Roadmap Completion (June 13-15, 2026)

This release completes a 3-day roadmap covering security hardening, code quality,
UX improvements, and production deploy.

### Added

- **Rosa sales script** (`src/data/guionRosa.js`) — canonical 9-step script with `interpolarGuionRosa(lead, user)`
- **Teleprompter component** (`src/components/dashboard/Teleprompter.jsx`) — renders the script
- **Operator result flow doc** (`docs/crm-operator-flow.md`) — 7-button result workflow
- **n8n custom image doc** (`docs/n8n-custom-image.md`) — build/deploy instructions for the patched n8n image
- **Architecture doc** (`docs/ARCHITECTURE.md`) — full system architecture, deployment, conventions
- **README.md** — project entry point with quick start
- **2FA validation** — PL/pgSQL `auth.verify_totp()` and `auth.base32_decode()` functions
- **is_setup flag** in 2FA flow — distinguishes setup-time vs verify-time code submission
- **Validate Input pattern** in 5 n8n workflows — strict regex validation + IF + Error Respond
- **Custom n8n Docker image** (`fabrica/n8n:2.11.0-patched`) — 2 patches baked in (GRANT_TOKEN_TTL + OFFER_VALID_TIME_MS)

### Changed

- **fetch → n8nGet/n8nPost migration** — 60+ files, ~80 raw fetch calls eliminated
- **HTTP check hardening** — 33+ files now have `if (!res.ok) throw new Error('HTTP ${status} — ${body}')` before `.json()`
- **Login flow** — doLogin/doLoginApi/handleSubmitResetPassword all have HTTP checks
- **CRM_USUARIOS_AUSENCIA_GESTIONES** — changed from GET to POST (was causing silent 404)
- **CRM_AGENDA_V2** — relaxed date filter from `CURRENT_DATE` to `NOW() - INTERVAL '30 days'`
- **AuthContext** — try/catch on localStorage parse, removed `window.location.reload()` on logout
- **eslint.config.js** — added `argsIgnorePattern: '^[A-Z_]'` for destructured constants
- **useN8n hook** — extended with `baseUrl` option for workflows on different n8n instances

### Security

- **5 n8n workflows hardened** against SQL injection:
  - CRM_42_REGISTRAR_INTERACCION
  - CRM_GESTOR_CONFIG_UPDATE
  - CRM_CAMPANAS_VERIFICAR_CONFLICTOS
  - CRM_LEADS_HUERFANOS
  - CRM_LANDING_DIGITAL_LEAD_NUEVO (rolled back to original with its own escape)
- **4 high-traffic workflows audited** in n8n (CRM_HISTORIAL_OPERADOR, CRM_USUARIOS_ELIMINAR, CRM_DISTRIBUIDOR_HUERFANOS, CRM_CAMPANA_FINALIZAR)
- **V1/V2/V3** workflows hardened:
  - CRM_LEAD_DETAIL — Validate Input + IF + Error Respond
  - CRM_CAMPANAS_ACTIVAS_V2 — Validate Input + IF + Error Respond + quoting fix
- **CRM_DISTRIBUIDOR_CAMPANAS** — fixed bug where result was deleted because workflow
  called `result.delete()` when items were 0 (instead of guarding with IF)

### Fixed

- **Limpieza de console.log / fmt.Println / var_dump** en código de producción
- **Comillas faltantes** en queries parametrizadas
- **HTTPS termination** — Traefik configurado para forzar HTTPS
- **TOTP secret encoding** — bug donde AuthContext decodificaba con base32 en vez de base32 RFC

## Commit History (since origin/main base)

```
a495ca7 docs(security): document CRM_DISTRIBUIDOR_CAMPANAS fix
0472f91 docs(security): document hardening pitfalls + update hardened workflow list
a209f31 perf(crm): lazy-load ClienteDrawer and NuevoClienteDrawer
a9036aa docs(security): add n8n SQL injection audit report
b5b7421 perf(crm): code-split all admin/operator panels via React.lazy
83e6865 docs(crm): add ARCHITECTURE.md, README.md, CHANGELOG.md
e67db7c refactor(crm): migrate 35 more files to n8nGet/n8nPost + fix 36 lint issues
7fbfa59 docs(n8n): document custom image with GRANT_TOKEN_TTL + OFFER_VALID_TIME_MS patches
d8aedf7 fix(crm): crm-ausencia-gestiones uses POST — workflow expects POST, was called via GET causing 404
834bd64 fix(crm): gga Round 2 — inline ProgresoBar acepta actual/objetivo
b6cb07d chore(crm): lint cleanup — 100 → 36 problemas (-64%)
285ba75 fix(crm): gga Round 1 fixes — refreshData Promise, auth HTTP check, multi-base n8n
0403858 refactor(crm): migrate 9 files to n8nGet/n8nPost helpers
6bd44fb fix(crm): harden 27 frontend files against silent JSON parse failures
f96cfc3 fix(admin): HTTP check + parse defensive on remaining fetch calls
5c2e39c fix(auth): harden 2FA + login flow
b03e0bf feat(crm): wire Rosa sales script + document operator result flow
cf155f6 chore(gbp): limpiar GGA flags pre-existentes en index.jsx + componentes
d6028a5 feat(gbp): fix build + GbpAutomation panel + tests
```

### Infra — Xiaomi-12 worker nato (2026-08-12)

Resiliencia y bootstrap del Xiaomi-12 (worker nato de cron + scrapers):

- **`sshd-watchdog.sh`** — Verifica `sshd-session` cada 1 min, relance si murió,
  renueva `termux-wake-lock` cada 5 min. Lock anti-concurrencia en
  `state/sshd-watchdog.lock`. Loguea a `logs/sshd-watchdog.log`.
- **`tailscale-watchdog.sh`** — Pre-armado. Verifica `tailscaled` cada 1 min;
  lo inicia si existe el binario, loguea "no instalado" si no.
- **`infra/xiaomi/README.md`** — Documentación completa del worker: SSH
  access, estructura de scripts, crontab activo, watchdogs, troubleshooting,
  estado de tailscale, battery opt manual, backups.
- **Tailscale 1.50.0 instalado** — Binario en `/usr/bin/` + auth key persistido
  en `~/.config/tailscale/authkey`. **Daemon NO viable** sin `CAP_NET_ADMIN`
  (termux capabilities = 0). Ver `infra/xiaomi/README.md` para opciones
  (Magisk root, app Android, mantener LAN).

### Audit competencia — fixed + sprint nuevo (2026-08-12)

**Fixes aplicados hoy**:
- `db_query.py`: docker exec ahora usa `-i` flag (sin esto, stdin a psql no se
  procesaba — bug raíz de los 16 INSERTs que parecían OK pero no persistían).
  Cambió 0 → **16 clientes con competencia en DB** después de ejecutar el script.
- Backfill categoria: 511 clientes con categoria real (era 1).
- Garbage filter: detecta UI labels tipo "Selecciona tus fechas para ver los mejores precios"
  y los skipea correctamente.

**Sprint nuevo**: `openspec/changes/2026-08-12-categoria-sugerencias/`
- Sugerencias de categoría GBP desde análisis de competidores
- Wrapper devuelve top 10 (no 1) + categoria_principal de cada uno
- Detector heurístico "específico > genérico" basado en keywords + longitud
- UI en ficha cliente con botón "Marcar como implementado"
- Tracking automático via re-scrape semanal
- Effort estimado: ~10-12h

**Phase 1 completada** (2026-08-12):
- `lib/crm-gb-scap.js` modificado: `/search-by-name` devuelve hasta 10 resultados con
  categoria_principal (antes solo 1). Backup `.bak-pre-top10`.
- `lib/detect_sugerencias.py` creado: heurística de especificidad + filtros
  (rating > cliente+0.5, categoria != nombre).
- `cron/categoria-sugerencias.sh` creado: orquesta el flujo completo.
- `clientes.categoria_sugerencias` tabla creada en VPS.
- Test real con cliente "Fontanería Madrid" detectó sugerencia:
  "Fontanero Urgencia Madrid" (competidor con rating 4.6, 678 reviews).
- Detección de bug conocido: Google Maps a veces devuelve el nombre del
  negocio como `categoria_principal` — filtrado en el detector.

### Frontend — Gbp ficha redesign Stage 2 completo (2026-08-12)

- **`GbpSectorCard.jsx`** — Fix import path (6→5 niveles `../`). Build
  vuelve a pasar.
- **`GbpAutomation.jsx`** — Panel de automatización: health check
  (`crm-health` webhook) + manual refresh (`crm-gbp-ficha-audit`).
  Item "automation" agregado al sidebar con icono Zap (lucide).
- **`GbpAutomation.test.jsx`** — 7 tests unitarios con vitest +
  @testing-library/react. Cobertura: render, health OK/FAIL, retry,
  manual refresh con cliente_id, disabled durante ejecución.
- **Suite completa GBP** — 105/105 tests pasando.

(Plus commits to come for this Unreleased section's docs and code-split.)
## [Unreleased] — 2026-08-13 — PDF server: 1 cliente = 2 paginas

Fix para el flujo del modal de informe competitivo cuando el admin
hace click en un cliente especifico. Antes devolvia un PDF minimo
sin cajas/logo. Ahora devuelve el formato completo:

- Portada con logo ByBusiness + fecha + stats
- 4 cajas con bordes visibles:
  - Caja 1: Score gauge + Rating vs promedio + Reviews vs promedio
  - Caja 2: TOP 5 COMPETIDORES POR RATING
  - Caja 3: ACTIVIDADES DE COMPETIDORES (nube)
  - Caja 4: RECOMENDACIONES

Cambios:
- `enviar_informes.generate_pdf_bytes(cliente_id=None)` acepta parametro
  para filtrar data y generar solo el detalle del cliente pedido
- `pdf_http_server.py` importa `enviar_informes` como modulo y llama
  directamente `generate_pdf_bytes(cliente_id=X)` (sin subprocess)
- Ya no envia email automaticamente (eso lo hace solo main() cuando
  se ejecuta directamente)

Test verificado:
- webhook V8 con cliente_id=496: HTTP 200, 92 KB, **2 paginas**,
  formato completo con cajas/logo
- Antes: 55 KB, 1 pagina, formato minimo (sin cajas)

Commits:
- `a093ad1` fix(pdf): import directamente en lugar de subprocess
- `7506d45` fix(crm): pdf server devuelve full-format PDF para 1 cliente

