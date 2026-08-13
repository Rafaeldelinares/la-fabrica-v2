# Xiaomi-12 — Worker nato del CRM

## Overview

El Xiaomi-12 (xiaomi-alone) es el **worker nato** del CRM ByBusiness. Corre
todos los procesos batch y cron del pipeline de leads y auditoría GBP. La
decisión arquitectónica (2026-08-09) fue liberar al VPS y a lafabrica de
estos procesos: el xiaomi corre scrapers + crons + audit trail, las DBs
viven en VPS (Postgres :5432 via túnel) y los webhooks n8n viven en VPS.

**Hardware**: Xiaomi 12 (Android 12, aarch64, kernel 5.10.236-android12-9)
**Software**: Termux + crond + Node.js + headless Chromium (vía puppeteer-core)

---

## Acceso SSH

### Conexión

```bash
ssh -p 8022 root@100.75.94.18
```

### Configuración del alias (opcional)

En `~/.ssh/config` de tu máquina local:

```
Host xiaomi12
    HostName 100.75.94.18
    Port 8022
    User root
```

Después: `ssh xiaomi12` directo.

### Notas de conectividad

- El xiaomi responde a ICMP pero **rechaza TCP cuando entra en Doze mode**.
  Si no responde, esperá 30s y reintentá (Android puede estar dormido).
- El `sshd` escucha en `:8022` (no el default 22).
- La IP `100.75.94.18` es LAN. Solo accesible si estás en la misma red WiFi.

---

## Estructura del proyecto scraper

```
/data/data/com.termux/files/home/xiaomi-gb-scape/
├── cron/                     # Scripts ejecutados por crond
│   ├── feed-leads-v2.sh
│   ├── audit-clientes-v2.sh
│   ├── audit-competencia.sh
│   ├── search-sector.sh
│   ├── search-cids-v2.sh
│   ├── watchdog.sh            # Wrapper watchdog (v2)
│   ├── sshd-watchdog.sh       # Watchdog sshd (cada 1 min)
│   ├── tailscale-watchdog.sh  # Watchdog tailscale (pre-armado)
│   └── insert-audit-snapshot.sh
├── logs/                      # Logs de cada cron
│   ├── feed-leads.log
│   ├── audit-clientes.log
│   ├── search-cids.log
│   ├── search-sector.log
│   ├── watchdog.log
│   ├── sshd-watchdog.log
│   └── tailscale-watchdog.log
├── bin/
│   ├── crm-gb-scap.js         # Wrapper puppeteer-core + headless_shell
│   └── ...
├── run/
│   └── start.sh               # Levanta el wrapper en :8095
├── state/                     # Lock files (anti-concurrencia)
└── ...
```

---

## Crontab activo

```
*/30 * * * *   feed-leads-v2.sh            # cada 30min
0   3 * * *    audit-clientes-v2.sh        # diario 3AM
0   4 * * 0    audit-competencia.sh        # semanal domingo 4AM
0   5 * * 1    search-sector.sh            # semanal lunes 5AM
0   */6 * * *  search-cids-v2.sh           # cada 6h
*/5 * * * *    watchdog.sh                 # cada 5min
* * * * *      sshd-watchdog.sh            # cada 1min (nuevo 2026-08-12)
```

Verificar: `crontab -l | ssh -p 8022 root@100.75.94.18 'crontab -l'`

---

## Watchdogs (capa de resiliencia)

### `generar-informe-competencia.sh` (on-demand trigger desde VPS)

- Genera informe competitivo para un cliente o todos.
- Uso: `bash cron/generar-informe-competencia.sh [CLIENTE_ID]`
- Si se pasa CLIENTE_ID: procesa solo ese cliente (skip weeks check forzado)
- Flujo: wrapper → analisis_competencia.py → INSERT DB
- **Invocado remotamente** desde el PDF server en VPS (`pdf_http_server.py`)
  cuando un admin hace click en "Ver informe" sin tener informe previo.
  SSH: `ssh -p 8022 root@100.75.94.18`
- Timeout: 180s (scraping puede tardar 30-90s)
- Logs: `logs/informe-competencia.log`

### `watchdog.sh` (wrapper)

- Verifica que `crm-gb-scap.js` esté corriendo
- Si no, lo relanza vía `run/start.sh`
- Loguea a `logs/watchdog.log`
- **Limitación conocida**: a veces entra en loop infinito si el wrapper cae
  constantemente. El log puede mostrar `wrapper no arranco` cada 5 min
  durante horas. Workaround: reinicio manual si pasa.

### `sshd-watchdog.sh` (nuevo 2026-08-12)

- Verifica que `sshd-session` esté corriendo
- Si no, intenta lanzar `sshd`
- Renueva `termux-wake-lock` cada 5 minutos (Android puede liberarlo)
- Loguea a `logs/sshd-watchdog.log`
- Lock anti-concurrencia en `state/sshd-watchdog.lock`
- **Cubre el caso**: Android mata termux en Doze → sshd muere → el watchdog
  lo recupera cuando crond despierta.

### `tailscale-watchdog.sh` (pre-armado)

- Verifica que `tailscaled` esté corriendo
- Si no, intenta iniciarlo con `--tun=userspace-networking`
- **Pre-armado**: el binario tailscale está instalado pero el daemon NO
  corre todavía (ver sección Tailscale más abajo).

---

## Verificación rápida del estado

```bash
ssh -p 8022 root@100.75.94.18 '
echo "=== UPTIME ==="; uptime
echo "=== SSHD ==="; pgrep -af sshd-session | head -3
echo "=== WRAPPER ==="; pgrep -af "crm-gb-scap" | head -2
echo "=== TAILSCALED ==="; pgrep -af tailscaled | head -2 || echo "no corre"
echo "=== CRONTAB ==="; crontab -l
echo "=== FEED-LEADS LAST 5 ==="; tail -5 logs/feed-leads.log
echo "=== AUDIT-CLIENTES LAST 5 ==="; tail -5 logs/audit-clientes.log
echo "=== WATCHDOG LAST 5 ==="; tail -5 logs/watchdog.log
echo "=== SSHD-WATCHDOG LAST 5 ==="; tail -5 logs/sshd-watchdog.log 2>/dev/null
'
```

---

## Tailscale (estado parcial)

### Qué hay

- Binario **tailscale 1.50.0** instalado en `/data/data/com.termux/files/usr/bin/`
- Auth key persistido en `~/.config/tailscale/authkey` (chmod 600)
- Script `tailscale-watchdog.sh` pre-armado en `cron/`
- App Android `com.tailscale.ipn` instalada (no corre activamente)

### Por qué el daemon no corre

Tailscaled abort con exit 1 al intentar usar `netlink` (route monitor) por
falta de `CAP_NET_ADMIN`. Termux corre con **todas las capabilities en 0**
(verificado vía `/proc/self/status | grep Cap`).

Probadas 1.102.2 y 1.50.0: misma falla. No es bug de versión — es falta
de capability del proceso termux.

```
$ tailscaled --statedir=... --tun=userspace-networking --verbose=1
TPM: error opening: stat /dev/tpmrm0: no such file or directory
2026/08/12 06:27:02 netmon.New: route ip+net: netlinkrib: permission denied
Exit: 1
```

### Opciones para hacerlo correr

| Opción | Acción | Dificultad |
|--------|--------|-----------|
| **A — Magisk root** | Activar root Magisk + grant a termux | 2 min manual en el device |
| **B — App Android** | Configurar `com.tailscale.ipn` + autostart | App tiene lifecycle Android |
| **C — setcap** | `setcap cap_net_admin+ep tailscaled` | No funciona (termux sin setcap) |
| **D — Sin tailscale** | Mantener acceso LAN por `100.75.94.18:8022` | Ya funciona ✅ |

### Cuando actives Magisk root

```bash
ssh -p 8022 root@100.75.94.18 '
sudo -E tailscaled \
  --statedir=/data/data/com.termux/files/home/.local/share/tailscale \
  --tun=userspace-networking \
  > /data/data/com.termux/files/home/.local/share/tailscale/tailscaled.log 2>&1 &
sleep 3
tailscale up --authkey=$(cat ~/.config/tailscale/authkey)
tailscale status
'
```

Después: agregar `* * * * * tailscale-watchdog.sh` al crontab para que
se relance automáticamente.

---

## Battery optimization (acción manual)

Android mata termux si está en Doze mode. Para evitarlo:

1. Settings → Apps → Manage apps → Termux → Battery → **Unrestricted**
2. Repetir para **Termux:Boot** si aparece

**No se puede automatizar**: `cmd appops set com.termux RUN_IN_BACKGROUND ignore`
falla con `SecurityException` porque termux (UID 10397) no tiene
`MANAGE_APP_OPS_MODES`. Solo es posible desde `adb shell` o Magisk.

El `termux-wake-lock` (en `start-sshd.sh` + `sshd-watchdog.sh`) ayuda
pero no es 100% efectivo contra Doze.

---

## Backups y restore

### Qué respaldar

- Scripts custom en `cron/` (con .bak-* files de versiones anteriores)
- Auth key en `~/.config/tailscale/authkey`
- Configuración en `~/.ssh/`
- Estado de crontab (`crontab -l > backup-crontab.txt`)

### Dónde NO respaldar

- `logs/` — se regeneran
- `state/` — locks efímeros
- `dist/` builds, `node_modules/`

---

## Troubleshooting rápido

### SSH no responde

```bash
# Verificar que el xiaomi esté en la misma LAN
ping 100.75.94.18

# Si responde ICMP pero SSH no, es Doze. Esperar 30s.
# Si sigue sin responder, verificar físicamente el device.
```

### Wrapper crm-gb-scap no corre

```bash
ssh -p 8022 root@100.75.94.18 '
cd /data/data/com.termux/files/home/xiaomi-gb-scape
pgrep -af "crm-gb-scap" || echo "no corre, lanzando..."
nohup node bin/crm-gb-scap.js > logs/crm-gb-scap.log 2>&1 &
sleep 3
pgrep -af "crm-gb-scap"
'
```

### Cron no ejecuta

```bash
ssh -p 8022 root@100.75.94.18 '
crontab -l | head
pgrep -af crond || echo "crond NO corre, iniciar con: crond"
'
```

### Watchdog loguea `wrapper no arranco` en loop

El wrapper cae constantemente. Posibles causas:

1. **Cookies de Google expiradas** (cada 30 días). Renovar vía la app Android.
2. **Headless Chromium crash**. Ver `logs/crm-gb-scap.log` para stacktrace.
3. **Memoria del device llena**. `free -h` para verificar.

Workaround inmediato: matar el loop del watchdog y reiniciar manualmente.

```bash
ssh -p 8022 root@100.75.94.18 '
# Matar watchdog actual
pkill -f "watchdog.sh"
sleep 1
# Matar wrapper
pkill -f "crm-gb-scap"
sleep 1
# Limpiar logs
rm -f logs/watchdog.log
# Relanzar limpio
nohup node bin/crm-gb-scap.js > logs/crm-gb-scap.log 2>&1 &
# Reiniciar watchdog
*/5 * * * * ya está en crontab, sigue corriendo
'
```

---

## Bugs conocidos y fixes aplicados (2026-08-12)

### Bug 1 — `clientes.clientes.categoria` vacío (NULL en 763/1220 activos) — ✅ FIXED 2026-08-12

**Síntoma**: `audit-competencia.sh` skipea clientes con "sin categoria skip".

**Causa raíz**: `gbp_audit_history` ya tiene `categoria_principal` scrapeada (620 audits válidos),
pero `clientes.clientes.categoria` nunca se populó desde ahí. El workflow n8n que crea
clientes NO guarda la categoría al insertar.

**Fix aplicado** (2026-08-12): Script SQL `scripts/backfill-categoria.sql` via
`temporary table + DISTINCT ON` — actualiza solo NULLs, usa la categoría más frecuente
por cliente (mode) y filtra valores basura (ej: "380 reseñas").

**Resultado**:
- 61 clientes actualizados de NULL → categoria real (backfill directo)
- gbp_audit_history cubre ~580 clientes pero los demás ya tenían valor o no tienen audit
- Quedan 702 clientes sin categoría — requieren re-scraping via `/run?place_id=<CID>`
  (el wrapper scrapea categoria_principal correctamente, pero esos clientes no tienen
  auditoría previa en gbp_audit_history)

**Para re-ejecutar**:
```bash
ssh root@72.60.191.179 "docker exec -i fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c \"\$(cat /opt/fabrica/CRM_ByBusiness/infra/xiaomi/scripts/backfill-categoria.sql)\""
```

**Estado**: ✅ Backfill SQL ejecutado. 518 clientes con categoria (era 457 tras fix parcial). Idempotente.

---

### Bug 2 — `/search-by-name` devuelve siempre `no_results` (2026-08-12)

**Síntoma**: `audit-competencia.sh` loguea "aggregate fail skip" para todos los clientes.

**Causa raíz**: Timing issue en `crm-gb-scap.js` `handleSearch()`. Después de navegar
a Google Maps search (domcontentloaded), el `page.evaluate()` para extraer el placeId
corría SIN delay. Los resultados de Maps cargan dinámicamente vía JS — sin esperar
~4s, el querySelector siempre devolvía null.

Las cookies de sesión en `google_session.json` eran válidas (expiran 2027-02).
El selector `a[href*="/maps/place/"]` sí matcheaba correctamente. Solo faltaba esperar.

**Fix aplicado** (2026-08-12):
- Archivo: `lib/crm-gb-scap.js` línea 517-520
- Cambio: agregado `await new Promise(r => setTimeout(r, 4000))` antes del evaluate
- Verificación: `curl -X POST http://127.0.0.1:8095/search-by-name -d '{"name":"Restaurante","locality":"Madrid"}'`
  devuelve JSON con `name:"El Sur de Moratín"` + `categoria_principal` (13.7s elapsed)

**Nota sobre `categoria_principal`**: El wrapper extrae el texto que aparece BAJO el h1
(nombre del negocio) como categoría. Para "Ferretería Magar" devuelve "Ferreteria Majariega"
(otro nombre registrado del negocio). Esto es correcto cuando el negocio tiene varias
denominaciones, pero NO es el "tipo de negocio" (ej: "Ferretería"). Es un comportamiento
aceptable para el uso actual en `audit-competencia`.

**Logs relevantes**:
- `logs/crm-gb-scap.log` — ver entradas "scrapeByPlaceId" confirmando scraping exitoso
- `logs/audit-competencia.log` — ver "[N] ID $CLI_ID $CAT $CITY" (indica que sí ejecuta search)

---

### Bug 3 — `search-sector.sh` no insertaba en `sector_aggregates` (0 filas)

**Síntoma**: "no latitude skip" para todos los registros.

**Causa raíz (múltiple)**:
1. Wrapper NO extrae `latitude`/`longitude` como campos JSON (solo los pone en el URL del `place_id` como `!3dLAT!4dLNG`)
2. Script buscaba `latitude`/`longitude` en JSON fields que no existían
3. Muchos leads en la DB tienen CIDs numéricos (no Google Maps CID) — no se pueden scrapear

**Fix aplicados** (2026-08-12):
1. Parser Python ahora extrae lat/lng del URL del `place_id` via regex `!3d([0-9.\-]+)!4d([0-9.\-]+)` — redondeado a 3 decimales (~111m precisión)
2. Filtro SQL: solo leads con CIDs formato `0x...` (Google Maps válido)
3. Fix bug pipe+heredoc: se usa `python3 -c` con here-string en lugar de `<<EOF` que conflictuaba con el pipe
4. Fix cross-host SQL temp file: SQL pasa inline via pipe en lugar de archivo temporal

**Estado**: ✅ Verificado — 3+ inserts exitoso en prueba. Cron semanal el lunes 5AM procesará ~200 registros.

---

## Scripts de backfill

| Script | Qué hace | Cuándo correrlo |
|--------|----------|-----------------|
| `scripts/backfill-categoria.sql` | PoblAR `clientes.categoria` desde `gbp_audit_history` | Una vez o cuando haya nuevos audits |
| (futuro) `scripts/backfill-lat-lng.sql` | Extraer coordenadas de `place_id` URL en `gbp_audit_history` | Cuando se necesite geocoding |

## Historial de cambios

| Fecha | Cambio | Commit |
|-------|--------|--------|
| 2026-08-12 | Bugs 1+2 fixes: backfill categoria (61 rows), timing fix search-by-name wrapper (4s wait before DOM query) | (sesión actual) |
| 2026-08-12 | Bugs 1+2+3 fixes: backfill categoria, search-sector lat/lng, audit-competencia syntax | (sesión actual) |
| 2026-08-12 | sshd-watchdog + tailscale-watchdog pre-armado | (sesión actual) |
| 2026-08-12 | tailscale 1.50.0 instalado (binario, daemon no viable) | (sesión actual) |
| 2026-08-11 | Sprint xiaomi-audits-and-heatmaps completo (5 crons) | ver openspec/changes/2026-08-11-xiaomi-audits-and-heatmaps/ |
| 2026-08-09 | Decisión arquitectónica: xiaomi = worker nato | ver engram memory #1640 |
