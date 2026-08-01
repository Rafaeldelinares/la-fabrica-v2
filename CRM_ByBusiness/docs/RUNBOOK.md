# CRM ByBusiness — RUNBOOK

Documento de operación para el día a día del CRM. Última actualización: 2026-08-01.

---

## 1. Infraestructura

### Servidor principal

- **VPS**: `root@72.60.191.179` (Linux, 96 GB disco, 8 GB RAM, uptime 78+ días).
- **Frontend CRM**: nginx en container `web-crm-bybusiness` → `/var/www/crm.ia-bybusiness.com`.
- **Backend n8n**: container `n8n-vps-sqlite` (imagen custom `fabrica/n8n:2.11.0-patched`).
- **PostgreSQL producción**: container `fabrica-postgres-1` → DB `crm_bybusiness`.

### Local (no VPS)

- **Scrapers**: `scraper-nano-v2` (puerto 8090), `scraper-heavy-v2` (8091), `scraper-maps-v1` (8094), `gosom-scraper` (8096).
- **Motor de scraping (Go)**: `monitor-engine.service` en puerto 8092.
- **Túneles SSH**:
  - `tunnel-postgres-vps.service` → `localhost:5433` → VPS `:5432`.
  - `tunnel-monitor.service` → `localhost:5432` → VPS `:8092` (motor).
  - `tunnel-n8n-vps.service` → `localhost:5679` → VPS `:5678` (no usado activamente).
- **DB monitor cache**: container `postgres-monitor-v2` → DB `reputacion_cache` (puerto 5435).

---

## 2. URLs operacionales

| Servicio | URL |
|---|---|
| CRM frontend | https://crm.ia-bybusiness.com/ |
| n8n producción | https://n8n.ia-bybusiness.online/ |
| PostgreSQL vía túnel | `localhost:5433` (DB `crm_bybusiness`, user `rafael_admin`) |
| Motor scraper local | `http://localhost:8092/webhook/scraper/go` |
| Scraper NANO | `http://localhost:8090` |
| Scraper HEAVY | `http://localhost:8091` |

---

## 3. Cron jobs

### 3.1 Alimentador de reputación (local)

- **Schedule**: `0 */6 * * *` (cada 6 horas: 00:00, 06:00, 12:00, 18:00 UTC).
- **Script**: `/opt/fabrica/scripts/alimentador_reputacion.py --vps --scraper gosom --batch 50`.
- **Log**: `/var/log/fabrica/alimentador.log` (logrotate diario, 14 días).
- **Lo que hace**: toma 50 leads sin rating o con rating > 180 días, llama al motor Go para refrescar, escribe UPDATE en VPS vía SSH + docker exec.
- **Auditoría**: cada corrida inserta un evento `CRON_RUN` en `sistema.eventos_sistema` con detalles `{cron, batch_size, max_age_days, processed, updated, no_match, no_rating, errors, dry_run}`.
- **Validación**: tras 2 ciclos (12h), el campo `reputacion_at` de los leads procesados debe estar actualizado.

### 3.2 Métricas diarias de frescura (VPS)

- **Workflow**: `CRM_LEAD_FRESHNESS_METRICS` (id `HL57uWGJRrbJfETZ`).
- **Schedule**: `0 6 * * *` (06:00 UTC).
- **Lo que hace**: cuenta leads en buckets (fresco/cero/stale/sin_dato), guarda en `sistema.lead_freshness_metrics` y emite evento `CRON_RUN` con `detalles.pct_fresco`.
- **Threshold de alerta**: si `pct_fresco < 70%`, el workflow marca `alert_fired=true`.

### 3.3 Distribuidor automático de leads (VPS)

- **Workflow**: `CRM_DISTRIBUIDOR_CAMPANAS` (id `LjcIjmCBKuWUxOSZ`).
- **Trigger**: cron + webhook `POST /webhook/crm-distribuidor-campanas?operator_id=X&mode=one`.
- **Función DB**: `operaciones.distribuir_leads_campanas_v2()`.
- **Lo que hace**: asigna hasta 5 leads pendientes a campañas activas u operadores.

### 3.4 Backfill de calidad de leads (VPS)

- **Workflow**: `CRM_BACKFILL_LEAD_QUALITY` (id `i7UTe5EkotG5FBm3`).
- **Schedule**: `0 3 * * *` (03:00 UTC).
- **Lo que hace**: cuenta leads pendientes sin reputacion, inserta evento `INFORME_MENSUAL` con estadísticas.

---

## 4. Workflows n8n principales

| ID | Nombre | Función |
|---|---|---|
| `dqj7YNrXBLZvyt86` | `CRM_AGENDA_V2` | Eventos para Agenda Global (admin). |
| `HL57uWGJRrbJfETZ` | `CRM_LEAD_FRESHNESS_METRICS` | Métricas diarias + evento cron. |
| `LjcIjmCBKuWUxOSZ` | `CRM_DISTRIBUIDOR_CAMPANAS` | Distribuye leads a operadores. |
| `DU4BwjV9lf4Bk2DU` | `CRM_LLAMADA_ACTIVA_FIX` | Recupera llamada activa del operador. |
| `oHx70G0lZdY5SexB` | `CRM_BACKFILL_REPUTACION` | Backfill manual de reputación. |
| `i7UTe5EkotG5FBm3` | `CRM_BACKFILL_LEAD_QUALITY` | Métricas diarias de calidad de leads. |
| `6x0x8DCOBzZf62K6` | `CRM_REGISTRAR_RESULTADO` | Registra resultado de llamada. |
| `HYALG4I2vMRfVFvV` | `CRM_USUARIOS_CREAR` | Crea usuarios (reparado en sesión anterior). |
| `Yj3ezffN6y4x8vqE` | `CRM_USUARIOS_ACTIVAR_2FA` | Activa 2FA. |
| `TVTaOj30rO2uP8Ga` | `CRM_USUARIOS_OBLIGAR_2FA` | Fuerza 2FA obligatoria. |
| `i42H9X5kniYvewyZ` | `CRM_USUARIOS_DESACTIVAR_2FA` | Desactiva 2FA. |
| `300t0LVfPMSDcGai` | `CRM_USUARIOS_DESOBLIGAR_2FA` | Quita obligatoriedad 2FA. |
| `d6Mpx3Vm1QPEdkwq` | `CRM_USUARIOS_VERIFICAR_2FA` | Verifica código TOTP. |

---

## 5. Base de datos

### Tablas principales

| Tabla | Función |
|---|---|
| `operaciones.leads` | Leads pendientes de llamar (28k+). |
| `operaciones.historial_llamadas` | Registro de llamadas realizadas. |
| `operaciones.llamadas_programadas` | Callbacks y seguimientos. |
| `operaciones.llamadas_activas` | Llamada en curso del operador. |
| `operaciones.lead_campana` | Relación lead-campaña. |
| `operaciones.campanas` | Campañas de llamadas/WhatsApp. |
| `operaciones.campanas_envios` | Envíos de proforma (canal + status). |
| `operaciones.distribuir_leads_campanas_v2` | Función distribuidora. |
| `operaciones.fn_lead_vendido_to_cliente` | Trigger lead → cliente. |
| `clientes.clientes` | Clientes convertidos. |
| `clientes.citas` | Citas de admin/operador (tipo='cliente'). |
| `sistema.eventos_sistema` | Eventos del sistema (cron, backup, gbp, informe). |
| `sistema.lead_freshness_metrics` | Métricas diarias de frescura. |
| `auth.usuarios` | Usuarios del CRM. |

### Conexión

- **Vía túnel** `localhost:5433` (en local): `PGPASSWORD='Samsung18091809&' psql -h localhost -p 5433 -U rafael_admin -d crm_bybusiness`.
- **Vía SSH directo al VPS** (recomendado para escribir): `ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c '...'"`.
- **Credenciales operativas**: user `rafael_admin`, password ver en `.env` local o en vault.

---

## 6. Despliegues

### Frontend (CRM)

```bash
cd /opt/fabrica/CRM_ByBusiness
npm run build
rsync -az --delete dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/
ssh -o BatchMode=yes root@72.60.191.179 "touch /var/www/crm.ia-bybusiness.com/assets/AgendaGlobalPanel-*.js /var/www/crm.ia-bybusiness.com/assets/index-*.js /var/www/crm.ia-bybusiness.com/index.html"
```

(El `touch` fuerza al nginx a actualizar headers `Last-Modified` para invalidar cache del navegador.)

### Backend (workflows n8n)

- Cualquier modificación a workflows se hace vía REST API de n8n con `X-N8N-API-KEY`.
- Backup automático de workflows: `verificación/` y `backups/` en `/opt/fabrica/CRM_ByBusiness-vps-snapshot/`.
- Workflows críticos tienen backup pre-fix en `backups/2026-MM-DD-<desc>/`.

---

## 7. Verificación operacional

### Cada día

1. **Métricas de frescura** (`sistema.lead_freshness_metrics`): ¿`pct_fresco > 70%`? Si no, revisar alimentador.
2. **Alimentador corrió 4 veces** en 24h: `grep CRON_RUN /var/log/fabrica/alimentador.log`.
3. **Eventos cron del día**: `SELECT * FROM sistema.eventos_sistema WHERE tipo_evento='CRON_RUN' AND fecha_evento > NOW() - INTERVAL '24 hours';`.
4. **Agenda Global accesible** desde el navegador sin error.

### Cada semana

1. **Cobertura de leads**: distribución por `scoring` y `reputacion_at`.
2. **Backups de VPS**: existen los backups automáticos de `fabrica-postgres-1`?
3. **Snapshots del CRM**: ¿hay commits sin commit en `/opt/fabrica/CRM_ByBusiness-vps-snapshot/`?

### Cada mes

1. **Backups del snapshot**: `git log --oneline` en `/opt/fabrica/CRM_ByBusiness-vps-snapshot/` debería tener > 30 commits.
2. **Rotación de API keys**: revisar fecha de expiración de la API key de n8n y otros servicios.
3. **Review de logs**: `tail -1000 /var/log/fabrica/alimentador.log | grep -i error`.

---

## 8. Solución de problemas comunes

### CRM no carga / pantalla blanca

1. **Refrescar con Ctrl+Shift+R** (cache fuerte).
2. Verificar en F12 → Network si la petición a `crm-agenda-unificada` aparece.
3. Si no aparece: `curl https://crm.ia-bybusiness.com/test-agenda.html` (página de diagnóstico).
4. Si curl da error de CORS: bug de preflight. Verificar `Access-Control-Allow-Origin` en headers de respuesta.

### Alimentador no actualiza ratings

1. Verificar `tail -f /var/log/fabrica/alimentador.log` (últimas corridas).
2. Si `errors > 0` o el log se queda colgado en `scraper 1 items (type=detail) latency 130s`: el motor Go está bloqueado. Reiniciar:
   ```bash
   docker restart monitor-engine
   ```
3. Si `no_rating` es alto: las consultas devuelven rating 0. Eso es un problema del scraper, no del alimentador.

### n8n no responde

1. `systemctl status monitor-engine.service tunnel-postgres-vps.service`.
2. Verificar que `docker ps` muestre `n8n-vps-sqlite`, `fabrica-postgres-1` activos.
3. Si n8n murió: `ssh root@72.60.191.179 "docker start n8n-vps-sqlite"`.

### Login falla (2FA)

1. `SELECT email, totp_habilitado, totp_secret FROM auth.usuarios WHERE email = '<user>'`.
2. Si `totp_secret` está vacío, el usuario necesita reconfigurar TOTP.
3. Backend: `auth.verify_totp(secret_b32, code, 5)` funciona con códigos TOTP de ±5 intervalos (±150s).

---

## 9. Documentación de sesiones

Todas las sesiones de trabajo en CRM ByBusiness quedan registradas en `/opt/fabrica/CRM_ByBusiness-vps-snapshot/verification/` con el formato `YYYY-MM-DD-<desc>.md`. Incluyen:

- Decisiones de diseño.
- Lista de bugs arreglados.
- Procedimientos de deploy.
- Backups de workflows críticos.

Para cada sesión nueva, crear un archivo `verification/YYYY-MM-DD-<topic>.md` y un commit en el repo del snapshot.

---

## 10. Contactos y referencias

- **Snapshot repo**: `/opt/fabrica/CRM_ByBusiness-vps-snapshot/` (Git repo independiente).
- **API key n8n**: en `/home/rafael/.config/opencode/opencode.json` bajo `mcp.n8n-mcp-vps.environment.N8N_API_KEY`.
- **Documentación anterior**: `/opt/fabrica/AGENTS.md` (reglas globales de La Fábrica IA).

---

## 11. Workflow de commits local (GGA)

**Estado actual (2026-08-01)**: GGA funcionando con **provider local `lmstudio:qwen2.5-coder-7b-instruct`**. No hace falta `--no-verify` en commits. Los commits pasan normal y Qwen revisa local.

### Configuración

- **`/opt/fabrica/.gga`**: `PROVIDER="lmstudio:qwen2.5-coder-7b-instruct"` (commiteado en `fbbfef7`)
- **`/opt/fabrica/.git/hooks/pre-commit`**: debe exportar `LMSTUDIO_HOST="http://localhost:11434/v1"` antes de llamar a `gga run`. Como los hooks no se trackean, este cambio es **local** y hay que verificarlo en cada máquina nueva:
  ```bash
  cat /opt/fabrica/.git/hooks/pre-commit
  # Debe incluir: export LMSTUDIO_HOST="http://localhost:11434/v1"
  ```
  Si falta, agregarlo:
  ```bash
  cat > /opt/fabrica/.git/hooks/pre-commit <<'HOOK'
  #!/usr/bin/env bash
  export PATH="/home/rafael/.local/bin:$PATH"
  unset ANTHROPIC_API_KEY
  export LMSTUDIO_HOST="http://localhost:11434/v1"
  gga run || exit 1
  HOOK
  chmod +x /opt/fabrica/.git/hooks/pre-commit
  ```

### Requisitos

- **LMStudio corriendo** en `localhost:11434` (con `lms server start` o desde la GUI). Verificar con:
  ```bash
  /home/rafael/.lmstudio/bin/lms status   # debe decir "Server: ON (port: 11434)"
  ```
- **Modelo cargado**: `qwen2.5-coder-7b-instruct` (4.68 GB, optimizado para code review). Cargar con:
  ```bash
  /home/rafael/.lmstudio/bin/lms load qwen2.5-coder-7b-instruct
  ```

### Si algo falla

1. **`Provider execution failed`**: LMStudio está caído o el modelo no está cargado. Reiniciar LMStudio y recargar el modelo.
2. **Review muy lenta / timeout 180s**: subir `TIMEOUT="600"` en `.gga` o usar `qwen3.5-9b` (más rápido, menos preciso para código).
3. **Querés saltar GGA puntualmente**: `git commit --no-verify` (sigue funcionando).
4. **Desinstalar el hook completamente**: `gga uninstall`.

### Histórico

- Antes (2026-08-01): `opencode` provider → corruppía index → `--no-verify` workaround.
- Ahora: `lmstudio:qwen2.5-coder-7b-instruct` → flujo limpio.

### Por qué no otros providers (lecciones)

| Provider | Por qué no |
|---|---|
| `claude` | OAuth expirado (consolidamos a MiniMax + opencode-go) |
| `opencode` | Bug snapshot/index corruption en v1.18.10 |
| `opencode:opencode-go/kimi-k2.5` | OAuth de opencode-go vencido |
| `minimax` con `sk-cp-...` | Error 1004 — key de opencode-coding-plan, no de `api.minimax.io` |
| `minimax` con `sk-nKSH-...` | Error 1004 — key de opencode-go, no de `api.minimax.io` |
| `lmstudio` | ✅ Funciona |
   ```

**Aplicar hasta que**: opencode arregle el bug de interacción snapshot/index. Hay un issue abierto en `Gentleman-Programming/opencode` (buscar por "snapshot index corruption" — pendiente de verificar).

---

## Cambios recientes

### 2026-08-01

- Fix del shim `CampanasPanel.jsx`: ahora `OperatorDashboard.jsx` importa directamente de `../../modules/admin/campanas/CampanasPanel`. Build y deploy OK.
- Log del cron alimentador movido de `/tmp/alimentador_cron.log` a `/var/log/fabrica/alimentador.log` con logrotate diario.
- Workflow `CRM_BACKFILL_LEAD_QUALITY` creado (id `i7UTe5EkotG5FBm3`) que corre diario a las 03:00 UTC y registra estadísticas de calidad de leads.
- Bug-A: 42 filas mal clasificadas en `clientes.citas` migradas a `sistema.eventos_sistema` (35 BACKUP, 4 RENOVACION, 3 INCIDENCIA).
- Bug-B: nuevo UNION ALL leg en `CRM_AGENDA_V2` que lee `operaciones.campanas_envios`. Toggle `envio_proforma_waha` ahora con 74 eventos, `aceptacion_proforma` con 8.
- **Sección 11 agregada**: workflow de commits local con workaround para GGA hook (provider `opencode` corrompe index).
- **Regresión detectada y corregida**: `Sidebar.jsx` tenía `isOpen: PropTypes.isRequired` (válido solo como chain), HEAD tenía `PropTypes.bool.isRequired`. Fixed en commit 6ad58a4.
- **Sección 11 actualizada**: GGA ahora usa `lmstudio:qwen2.5-coder-7b-instruct` (puerto 11434). No hace falta `--no-verify`. Workflow de commits vuelve a la normalidad. Provider `opencode` queda descartado por el bug de snapshot/index corruption.

---

## 12. CI/CD

### Workflows

| Workflow | Archivo | Trigger | Qué hace |
|---|---|---|---|
| **CI** | `.github/workflows/ci.yml` | PR/push a `main` | lint, lint:scope, build, unit tests (vitest) |
| **E2E** | `.github/workflows/e2e.yml` | PR/push a `main`, manual | Playwright E2E (12 specs) |
| **Deploy** | `.github/workflows/deploy.yml` | push a `main`, manual | build + rsync a VPS producción |

Los tres archivos viven en `.github/workflows/` del monorepo.

### Secrets necesarios (GitHub)

Configurar en **Settings → Secrets and variables → Actions** del repo:

| Secret | Descripción |
|---|---|
| `VPS_SSH_KEY` | Clave SSH privada con acceso root al VPS |
| `VPS_HOST` | IP del VPS (ej: `72.60.191.179`) |
| `N8N_API_KEY` | (Futuro) API key de n8n para deploys de workflows |

### Cómo agregar un secret

1. Ir a `https://github.com/Rafaeldelinares/la-fabrica-v2/settings/secrets/actions`
2. Click **New repository secret**
3. Agregar `VPS_SSH_KEY` (copiar desde `~/.ssh/id_rsa` local)
4. Agregar `VPS_HOST` con el valor `72.60.191.179`

### Deploy manual

1. Ir a tab **Actions**
2. Seleccionar workflow **Deploy**
3. Click **Run workflow**

### Cómo debuguear un workflow que falla

1. Ir a **Actions** → seleccionar el run fallido → clickear el job fallido
2. Leer los logs expandiendo cada step
3. Descargar artifacts (playwright-report, test-results) desde la sección **Artifacts**
4. Corregir localmente, commitear, y clickear **Re-run all jobs**

### Proteger la branch main

1. **Settings → Branches → Add rule**
2. Branch name pattern: `main`
3. Habilitar:
   - ✅ Require a pull request before merging
   - ✅ Require status checks to pass before merging
   - Agregar checks requeridos: `lint-and-build`, `unit-tests`, `e2e`
   - ✅ Do not allow bypassing the above settings

### Documentación detallada

Ver `.github/workflows/README.md` — incluye tabla de comandos locales equivalentes, cómo ver reportes de Playwright, y cómo cambiar `needs: []` por `needs: [lint-and-build, unit-tests]` en deploy si se quiere gating automático.
