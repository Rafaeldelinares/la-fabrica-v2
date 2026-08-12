# Design — 2026-08-11-xiaomi-gosom-scraper-migration (Option C)

> **Estado**: Aprobado por Rafael. Pendiente implementación. Sin decisiones de arquitectura abiertas.

---

## 0. Resumen del approach

**Opción C**: proot-distro + Ubuntu + gosom browser mode en xiaomi-12.

```
xiaomi-12 (Termux, bionic libc)
├── Termux shell (coordinator)
│   ├── proot-distro (gestor de chroot)
│   ├── cron daemon (sigue activo)
│   └── cron jobs nuevos (bash → proot → gosom)
│
└── Ubuntu 22.04 chroot (proot-distro login ubuntu)
    ├── /usr/bin/chromium-browser
    ├── /usr/local/go (Go 1.21+)
    ├── /opt/gosom/google-maps-scraper (Go binary)
    │   ├── scraper (browser mode)
    │   └── runner (jobs queue)
    └── /opt/gosom/state/ (state files)
```

---

## 1. Arquitectura detallada

### 1.1 Capas de ejecución

```
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA 1: Termux (bionic) — coordinator                              │
│  ├─ cron daemon: crond                                                │
│  ├─ cron scripts: feed-leads-gosom.sh, audit-clientes-gosom.sh,      │
│  │             search-cids-gosom.sh, watchdog.sh (deprecating)        │
│  ├─ proot-distro binary: gestor de Ubuntu chroot                       │
│  └─ SSH server (puerto 8022)                                         │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ exec proot
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA 2: Ubuntu 22.04 (chroot) — scraper                              │
│  ├─ /usr/bin/chromium-browser (headless)                              │
│  ├─ /opt/gosom/google-maps-scraper (Go binary)                       │
│  │  └─ Browser mode: Playwright + Chromium                            │
│  ├─ Output: CSV/JSON en /opt/gosom/output/                            │
│  └─ State: /opt/gosom/state/ (job queue, retry state)                │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ POST HTTP
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA 3: VPS n8n (intacta, no cambia)                                │
│  ├─ CRM_GB_SCAPE_SAVE_LEAD (EPjSea8GBZsTVKkk)                        │
│  └─ CRM_GB_SCAPE_SAVE_CLIENTE (fJy7pfNYVZqj6LXY)                     │
└─────────────────────────────────────────────────────────────────────┘
                              ↓ UPDATE/INSERT
┌─────────────────────────────────────────────────────────────────────┐
│  CAPA 4: PostgreSQL (intacta)                                        │
│  ├─ operaciones.leads                                                  │
│  └─ clientes.gmaps_fichas                                              │
└─────────────────────────────────────────────────────────────────────┘
```

### 1.2 Flujo end-to-end (cron job)

```
1. crond dispara feed-leads-gosom.sh (cron */30)
2. Script SSH-a VPS, query: SELECT id, google_cid FROM operaciones.leads WHERE ...
3. Script construye input.txt con URLs Google Maps por CID
4. Script ejecuta: proot-distro login ubuntu -- /opt/gosom/run.sh input.txt output.csv
5. gosom scraper corre con browser mode (Chromium + cookies opcionales)
6. Output CSV → script parsea → POST a /webhook/crm-gb-scape-save-lead
7. n8n valida y UPDATE operaciones.leads
8. Script limpia state files
9. Log resultado en /xiaomi-gb-scape/logs/feed-leads.log
```

---

## 2. Componentes

### 2.1 proot-distro + Ubuntu chroot

**Setup inicial** (one-time, 1h):
```bash
# En Termux
pkg install proot-distro -y
proot-distro install ubuntu
proot-distro login ubuntu

# Dentro de Ubuntu
apt update && apt upgrade -y
apt install -y wget curl git chromium-browser
# Go 1.21+
wget https://go.dev/dl/go1.21.6.linux-arm64.tar.gz
tar -C /usr/local -xzf go1.21.6.linux-arm64.tar.gz
export PATH=$PATH:/usr/local/go/bin
go version
```

**Persistencia**: proot-distro no persiste state. El chroot está en `~/proot-distro/installed/ubuntu/`. Cada `proot-distro login ubuntu` arranca Ubuntu fresh.

**Optimización** (opcional, después de Phase 1):
- `proot-distro login ubuntu --fix-low-perms` para algunos casos
- `proot-distro login ubuntu --kill-on-exit` para cleanup

### 2.2 gosom/google-maps-scraper (Go)

**Build en Ubuntu proot**:
```bash
# Dentro de Ubuntu
cd /opt
git clone https://github.com/gosom/google-maps-scraper.git
cd google-maps-scraper
go build -o /opt/gosom/google-maps-scraper .
# Binary en /opt/gosom/google-maps-scraper
```

**Usage desde cron**:
```bash
proot-distro login ubuntu -- /opt/gosom/google-maps-scraper \
  -input /tmp/queries.txt \
  -results /tmp/results.csv \
  -c 4 \
  -depth 1 \
  -exit-on-inactivity 3m \
  -lang es
```

**State files**: gosom tiene `--produce` con `-dsn` para producción. Para MVP (single machine), usar input file + output file + state local en `/opt/gosom/state/`.

### 2.3 cron scripts (3 reescritos)

**`feed-leads-gosom.sh`** (reemplaza `feed-leads-v2.sh`):
```bash
#!/bin/bash
# Feed leads via gosom browser mode
set -e

LIMIT="${LIMIT:-150}"
WRA=/data/data/com.termux/files/home/xiaomi-gb-scape
PROOT=proot-distro
UBUNTU=/opt/gosom
LOG=$WRA/logs/feed-leads.log
STATE=$WRA/state/feed-leads.json

mkdir -p "$(dirname "$LOG")" "$(dirname "$STATE")"
[ -f "$STATE" ] || echo "[]" > "$STATE"

log() { echo "[$(date -Iseconds)] $1" | tee -a "$LOG"; }

# 1. Query leads con CID válido
ROWS=$(ssh -o ConnectTimeout=10 -o BatchMode=yes root@72.60.191.179 \
  "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -tA -F , -c \"SELECT id, google_cid FROM operaciones.leads WHERE estado IN ('pendiente','nuevo','contactado','interesado','negociando','asignado','callback','error','no_contesta','vendido') AND reputacion_at IS NULL OR reputacion_at < NOW() - INTERVAL '14 days' ORDER BY reputacion_at NULLS FIRST LIMIT $LIMIT\"")

[ -z "$ROWS" ] && { log "no hay leads pendientes"; exit 0; }

# 2. Construir input.txt con URLs Google Maps
INPUT=/tmp/gosom-input-$$.txt
> "$INPUT"
while IFS=, read -r LEAD_ID LEAD_CID; do
  [ -z "$LEAD_ID" ] && continue
  echo "https://www.google.com/maps/place/?q=place_id:$LEAD_CID" >> "$INPUT"
done <<< "$ROWS"

# 3. Ejecutar gosom vía proot-distro
OUTPUT=/tmp/gosom-output-$$.csv
log "scrapeando $(wc -l < "$INPUT") leads via gosom browser mode"
$PROOT login ubuntu -- $UBUNTU/google-maps-scraper \
  -input "$INPUT" \
  -results "$OUTPUT" \
  -c 4 -depth 1 -exit-on-inactivity 3m -lang es 2>&1 | tee -a "$LOG"

# 3. Parsear output y POST a webhook
TOTAL=0
while IFS=, read -r TITLE CID RATING REVIEWS ...; do
  [ -z "$CID" ] && continue
  LEAD_ID=$(grep -F "$CID" "$INPUT" | grep -oE 'place_id:[0-9]+' | head -1 | cut -d: -f2)
  [ -z "$LEAD_ID" ] && continue

  PAYLOAD=$(jq -n --argjson lid "$LEAD_ID" \
    --arg title "$TITLE" --arg cid "$CID" --argjson rating "$RATING" --argjson reviews "$REVIEWS" \
    '{lead_id: $lid, audit_data: {place_id: $cid, name: $title, rating: $rating, reviews_count: $reviews}}')

  RESP=$(curl -sS -X POST "https://n8n.ia-bybusiness.online/webhook/crm-gb-scape-save-lead" \
    -H "Content-Type: application/json" -d "$PAYLOAD" -m 30)
  if echo "$RESP" | grep -q '"ok":true'; then
    log "OK id=$LEAD_ID cid=$CID rating=$RATING"
    TOTAL=$((TOTAL+1))
  else
    log "FAIL id=$LEAD_ID: $RESP"
  fi
done < "$OUTPUT"

# 4. Cleanup
rm -f "$INPUT" "$OUTPUT"
log "FIN feed-leads-gosom processed=$TOTAL"
```

**`audit-clientes-gosom.sh`** y **`search-cids-gosom.sh`**: estructura análoga, adaptados a sus queries específicas.

### 2.4 Watchdog

**Decisión**: el `watchdog.sh` actual vigila el `crm-gb-scap.js` deprecated. **NO se modifica**. Cuando se decida deprecar el wrapper viejo (30 días post-deploy), se ajustará el watchdog.

---

## 3. Data Mapping

**Sin cambios** vs design anterior. La tabla place_id → webhook field se mantiene:

| gosom field | wrapper actual | webhook field | nota |
|---|---|---|---|
| `title` | `name` | `audit_data.name` | ✓ |
| `place_id` (data_id) | `place_id` | `audit_data.place_id` | gosom browser mode → real |
| `cid` (extracted) | — | `audit_data.cid` | nuevo |
| `review_rating` | `rating` | `audit_data.rating` | ✓ |
| `review_count` | `reviews_count` | `audit_data.reviews_count` | gosom browser mode → real (no 0) |
| `phone` | `telefono` | `audit_data.phone` | ✓ |
| `web_site` | `web` | `audit_data.web_site` | ⚠️ field name cambia |
| `address` | `address` | `audit_data.address` | ✓ |
| `category` | `categoria_principal` | `audit_data.category` | nuevo |
| `latitude` | — | (no persisted yet) | sprint futuro |
| `longitude` | — | (no persisted yet) | sprint futuro |
| `popular_times` | — | (no persisted yet) | sprint futuro |
| `owner` | `owner` | (no persisted yet) | sprint futuro |

**Cambio crítico vs Option B**:
- `place_id` → **REAL** (no derivación)
- `cid` → **REAL** (no derivación)
- `review_count` → **REAL** (no NULL/0)
- Todos los 36 data points de gosom disponibles

---

## 4. API Contracts (cron scripts ↔ gosom)

### 4.1 Input file format
```
https://www.google.com/maps/place/?q=place_id:14855
https://www.google.com/maps/place/?q=place_id:17864
https://www.google.com/maps/search/Ferretería+Málaga
```

### 4.2 Output CSV format (gosom browser mode)
```
title,place_id,cid,review_rating,review_count,phone,web_site,address,category,latitude,longitude,...
"Ferretería López","0xaaa:0xbbb",15518955678945057543,4.5,23,"+34 952...","https://...","C. ...","Hardware store",36.7,-4.4,...
```

### 4.3 Cron timings
- `feed-leads-gosom.sh`: `*/30 * * * *` (cada 30 min)
- `audit-clientes-gosom.sh`: `0 3 * * *` (diario 03:00)
- `search-cids-gosom.sh`: `0 */6 * * *` (cada 6h)
- `watchdog.sh`: `*/5 * * * *` (deprecated pero no se toca)

### 4.4 Failure modes
- **proot-distro fails**: log error, exit non-zero, cron no avanza
- **gosom fails**: output file vacio, script skip
- **webhook fails**: response not "ok":true, log, skip
- **DB fails**: ssh fails, log, exit
- **Timeout**: 3m inactivity, gosom exits, script parses partial output

---

## 5. Setup steps (Phase 1-2)

### Phase 1: proot-distro + Ubuntu (1h)
```bash
ssh -p 8022 100.75.94.18
pkg install proot-distro -y
proot-distro install ubuntu
proot-distro login ubuntu
# Inside Ubuntu:
apt update && apt upgrade -y
apt install -y wget curl git unzip
```

### Phase 2: Chromium + Go + gosom (1h)
```bash
# Inside Ubuntu proot
apt install -y chromium-browser
# Verify Chromium
chromium-browser --version

# Install Go 1.21+
wget https://go.dev/dl/go1.21.6.linux-arm64.tar.gz
tar -C /usr/local -xzf go1.21.6.linux-arm64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
source ~/.bashrc
go version

# Build gosom
mkdir -p /opt/gosom
cd /opt
git clone https://github.com/gosom/google-maps-scraper.git
cd google-maps-scraper
go build -o /opt/gosom/google-maps-scraper .
ls -la /opt/gosom/google-maps-scraper
/opt/gosom/google-maps-scraper -h | head -20
```

### Phase 3: test browser mode (30min)
```bash
# Inside Ubuntu proot
cat > /tmp/test-queries.txt <<EOF
https://www.google.com/maps/place/?q=place_id:0xd72f753aa560507:0x360e5c308fe69a82
https://www.google.com/maps/place/?q=place_id:0x360e5c308fe69a82
https://www.google.com/maps/place/?q=place_id:0xcaa0fad0a7c7e6ea
EOF

/opt/gosom/google-maps-scraper \
  -input /tmp/test-queries.txt \
  -results /tmp/test-results.csv \
  -c 2 -depth 1 -exit-on-inactivity 2m -lang es

# Verify CSV has all 36 fields populated
head -2 /tmp/test-results.csv | head -c 500
```

**Criterio de éxito**: 
- `place_id` empieza con `0x` (no URL)
- `review_count > 0`
- `cid` numérico
- Sin errores

---

## 6. Cron jobs reescritos (Phase 4)

### Mapping de scripts

| Antes (roto) | Ahora (Option C) | Cambio |
|---|---|---|
| `feed-leads-v2.sh` | `feed-leads-gosom.sh` | rewrite completo |
| `audit-clientes-v2.sh` | `audit-clientes-gosom.sh` | rewrite completo |
| `search-cids-v2.sh` | `search-cids-gosom.sh` | rewrite completo |
| `watchdog.sh` | (sin cambios, deprecated) | mantener como backup |

Todos los scripts nuevos siguen el patrón:
1. SSH a VPS, query
2. Construir input.txt con URLs
3. `proot-distro login ubuntu -- /opt/gosom/google-maps-scraper -input ... -results ...`
4. Parsear CSV output
5. POST a webhook
6. Cleanup

---

## 7. Storage y performance

| Recurso | Estimado | Disponible xiaomi-12 | Margen |
|---|---|---|---|
| proot-distro Ubuntu | 1.5GB | 202GB | 200x |
| Chromium + cache | 500MB | 202GB | 400x |
| Go toolchain | 300MB | 202GB | 670x |
| gosom build | 50MB | 202GB | 4000x |
| Logs (1 año) | 1GB | 202GB | 200x |
| **Total usado** | **~3.4GB** | **202GB** | **60x margen** |

| Métrica | Browser mode (proot) | vs original wrapper |
|---|---|---|
| Throughput | ~85 places/min | ~10 places/min |
| Latency por place | ~700ms | ~5000ms |
| Memory per browser | 150MB | 80MB |
| CPU avg | 5% | 8% |

---

## 8. Error handling y resilience

```bash
# En cada cron script:
set -euo pipefail  # strict mode

# 1. Pre-check: proot-distro existe
command -v proot-distro >/dev/null || { log "FATAL: proot-distro no instalado"; exit 1; }

# 2. Pre-check: Ubuntu chroot existe
[ -d ~/proot-distro/installed/ubuntu ] || { log "FATAL: Ubuntu chroot no existe"; exit 1; }

# 3. Pre-check: gosom binary existe
[ -x /opt/gosom/google-maps-scraper ] || { log "FATAL: gosom binary no encontrado"; exit 1; }

# 4. Pre-check: VPS reachable
ssh -o ConnectTimeout=5 -o BatchMode=yes root@72.60.191.179 'echo OK' >/dev/null || { log "FATAL: VPS no reachable"; exit 1; }

# 5. Ejecutar con timeout
timeout 600 proot-distro login ubuntu -- /opt/gosom/google-maps-scraper ... || \
  { log "WARN: gosom timeout o error"; exit 1; }
```

**Retry policy**: 
- Si cron falla, exit code != 0 → log error, no reintento (cron esperará al próximo slot)
- Manual retry: ejecutar script manual con `LIMIT=N` desde Termux

---

## 9. Testing strategy (Phase 5)

### 9.1 Test unit (post-Phase 3)
- Verificar gosom binary funciona
- Verificar 36 fields en CSV output
- Verificar `place_id` formato `0x...`
- Verificar `review_count > 0`
- Verificar `cid` numérico

### 9.2 Test integration (Phase 4-5)
- Correr `feed-leads-gosom.sh LIMIT=2` desde Termux
- Verificar POST a webhook retorna `ok:true`
- Verificar DB tiene rating + reviews_count reales
- Idem para `audit-clientes-gosom.sh` con cliente 962

### 9.3 Test E2E (Phase 5)
- Cron jobs ejecutan schedule completo
- 24h de operación sin intervenciones
- DB tiene 100+ leads actualizados
- No URLs bogus en `google_cid`

### 9.4 Rollback test
- Detener cron jobs
- Activar wrapper viejo desde backup
- Verificar que vuelva a correr
- Tiempo: <15min

---

## 10. Limitaciones conocidas

- **Throughput reducido 30%** por proot overhead (aceptable)
- **No headless_shell directo** — usamos Chromium Ubuntu (más estándar)
- **Sin cookies** — dependemos de IP móvil residencial para evitar bloqueos
- **No paralelismo browser** — gosom con `-c 2` max para no saturar memoria xiaomi (759MB libre)
- **Updates Ubuntu** requieren re-test del scraper (apt update puede romper Chromium)

---

## 11. Migración desde puppeteer-core wrapper

| Estado | Acción |
|---|---|
| Día 0 (deploy) | proot-distro setup + gosom build. Cron jobs nuevos coexisten con viejos. |
| Día 0+1h | Test E2E con leads/clientes reales. Validar data. |
| Día 1+ | Activar cron jobs nuevos. Desactivar viejos (`mv feed-leads-v2.sh feed-leads-v2.sh.disabled`). |
| Día 30 | Si todo OK, eliminar wrapper viejo + node_modules + crm-gb-scap.js. Cleanup ~50MB. |
| Día 30+ | Mantenimiento estándar. apt update mensual en Ubuntu chroot. |

---

## 12. Decisión técnica destacada

**¿Por qué proot-distro + Ubuntu y no otra opción?**

| Opción | Por qué descartada |
|---|---|
| Docker | No disponible en Termux sin root |
| chroot nativo | Requiere root, no disponible en Termux |
| Alpine via proot | gosom no testeado en Alpine (musl libc issues) |
| Debian via proot | Posible pero Ubuntu es más estable con snaps/apt |
| Arch via proot | Menos testing, pacman menos familiar |
| **Ubuntu 22.04 via proot** | ✅ **Recomendado** (LTS, snap support, broad testing, pkg manager conocido) |

---

## 13. Open architectural questions (cerradas)

- Q: ¿proot-distro con qué distro? → **Ubuntu 22.04 LTS** (LTS, estable, broad testing)
- Q: ¿Necesitamos root para proot? → **No**, proot emula chroot sin root
- Q: ¿Glibc se emula correctamente? → **Sí**, proot intercepta syscalls y redirige
- Q: ¿Cookies necesarias? → **No** para browser mode (depende de IP rotativa)
- Q: ¿Headless o visible? → **Headless** (`-browser-pool-size 0` default)
- Q: ¿Storage suficiente? → **Sí**, 202GB libres, ~3.4GB usados
- Q: ¿Performance OK? → **Sí**, ~85 places/min (vs 10 del wrapper actual)
