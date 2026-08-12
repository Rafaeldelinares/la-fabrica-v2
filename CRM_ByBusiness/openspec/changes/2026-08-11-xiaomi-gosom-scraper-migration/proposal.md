# 2026-08-11-xiaomi-gosom-scraper-migration

## Why

El scraper actual de xiaomi-12 (`~/xiaomi-gb-scape/lib/crm-gb-scap.js`, 21,978 bytes) está **roto**:
- URL `?cid=` deprecada → Google devuelve URL de búsqueda en vez de place
- Selectores outdated → 0 place_id extraído
- Falta dep `@puppeteer/browsers` → wrapper no arranca limpio
- Cron jobs desactivados desde 2026-08-11 (crontab vaciado)
- 5,275 leads sin CID no se pueden procesar (incluye 9 `vendido` que son ORO)
- 17,589 leads con CID válido se scrapean pero el audit data tiene URLs bogus (place_id = "https://...")

**Búsqueda del fix** evaluó 51 repos en topic `google-maps-scraping`:
- ❌ Browser-based scrapers (gosom browser mode, omkarcloud, zohaibbashir, Petey1337, patxijuaristi, christivn, kawsarlog): **requieren glibc**, Termux es bionic, no corren
- ❌ fast-mode scrapers (gosom fast mode): corren en xiaomi pero **omiten `place_id`, `cid`, `review_count`** — campos obligatorios en webhooks
- ❌ SaaS scrapers (serpapi, outscraper, luminati): requieren cuenta externa
- ✅ **proot-distro + Ubuntu + gosom browser mode**: **única opción que da 100% de los datos en xiaomi-alone**

## What Changes

### Arquitectura nueva

```
xiaomi-12 (Termux, bionic)
└── proot-distro (user-space chroot con glibc)
    └── Ubuntu 22.04
        ├── Chromium (apt install)
        ├── Go 1.21+ (apt)
        ├── gosom/google-maps-scraper (go build)
        │   └── browser mode ✅ (36 data points)
        └── cron jobs (bash que llaman gosom via proot-distro login)
            ├── feed-leads-gosom.sh      (cron */30 min)
            ├── audit-clientes-gosom.sh  (cron 0 3 * * *)
            ├── search-cids-gosom.sh    (cron 0 */6 * * *)
            └── watchdog.sh             (sin cambios — vigila wrapper viejo, deprecated)
```

### Engine swap

| Componente | Antes | Ahora |
|---|---|---|
| Scraping engine | puppeteer-core (roto) | gosom browser mode en Ubuntu proot |
| Browser | headless_shell (Termux bionic) | Chromium Ubuntu (glibc) |
| Cookies | google_session.json (expiran) | opcional, no requerido |
| Wrapper | crm-gb-scap.js HTTP server :8095 | bin/google-maps-scraper (Go binary) |
| CLI | bash que llama curl al wrapper | bash que llama proot-distro → gosom |
| Storage | 100MB en $HOME | ~1.5GB Ubuntu + 500MB Chromium |

### Decisión arquitectónica

| Opción | Decisión | Razón |
|---|---|---|
| proot-distro + Ubuntu (vs Docker) | ✅ Elegido | Docker no disponible en Termux; proot user-space chroot funciona sin root |
| gosom browser mode (vs fast-mode) | ✅ Elegido | Browser mode da 36 data points; fast-mode omite place_id, cid, reviews_count |
| Cookie session (browser nuevo) | ❌ No usado | gosom browser mode funciona sin cookies gracias a la rotación de IP móvil residencial |
| VPS (rechazado por Rafael) | ❌ No | Independencia total requerida |

## Impact

| Área | Cambio | Severidad |
|---|---|---|
| xiaomi-12: proot-distro | nueva dependencia (1.5GB) | Media — instalación única |
| xiaomi-12: Ubuntu chroot | nueva capa (5GB) | Media — aislamiento del Termux base |
| xiaomi-12: Chromium | nueva dep (500MB) | Media — apt install |
| xiaomi-12: gosom Go binary | rebuild aarch64 | Baja — ya hay dev experience |
| xiaomi-12: cron jobs | rewrite (3 scripts) | Media — 1-2h trabajo |
| xiaomi-12: crm-gb-scap.js | deprecate, mantener como backup | Baja — backups `.bak` listos |
| n8n webhooks | **sin cambios** | ✅ Contrato intacto |
| PostgreSQL schema | **sin cambios** | ✅ Schema actual soporta todos los campos |
| Frontend CRM_ByBusiness | **sin cambios** | ✅ Visualización sigue OK |
| VPS (72.60.191.179) | **sin cambios** | ✅ Sigue siendo DB + n8n, xiaomi solo consume via SSH/POST |
| Sprint paralelo gbp-ficha-enrichment | sin impacto | ✅ No depende de la arquitectura del scraper |

## Out-of-scope

- ❌ Migrar a Places API New (rechazado por Rafael)
- ❌ Cambiar contratos de webhooks n8n (mantener tal cual)
- ❌ Cambiar schema PostgreSQL (gmaps_fichas ya tiene los 11 campos)
- ❌ Modificar frontend React
- ❌ Agregar lat/lng a schema (gosom browser mode los incluye en output, pero no se persisten aún — eso es sprint futuro `gbp-ficha-enrichment`)
- ❌ Eliminar puppeteer-core wrapper (mantener como backup por 30 días, luego sí)

## Acceptance criteria

- [ ] `proot-distro install ubuntu` completa en xiaomi-12
- [ ] `apt install chromium wget curl` completa en Ubuntu chroot
- [ ] `go build` de gosom/google-maps-scraper completa sin errores
- [ ] Test con 5 place_ids reales (962, 980, 981) retorna 36 data points SIN URLs bogus en `place_id`
- [ ] Test retorna `review_count > 0` (no 0, no NULL) — confirma browser mode
- [ ] Test retorna `place_id` formato `0x...` (no URL de Google)
- [ ] Test retorna `cid` numérico
- [ ] Cron job feed-leads-gosom.sh ejecuta cada 30 min, persiste real data, exit 0
- [ ] Cron job audit-clientes-gosom.sh ejecuta diario 03:00, exit 0
- [ ] DB check: `SELECT * FROM clientes.gmaps_fichas WHERE reputacion_at > NOW() - INTERVAL '1 hour'` retorna rows con rating real (4.0+, no 0)
- [ ] DB check: ningún `google_cid LIKE 'https://%'` después de 24h de operación
- [ ] End-to-end: lead 363 procesado → UPDATE en operaciones.leads con rating + place_id + reviews_count
- [ ] End-to-end: cliente 962 procesado → UPDATE en clientes.clientes + UPSERT en clientes.gmaps_fichas
- [ ] No nuevos errores en n8n executions de save-lead / save-cliente (status=success)

## Risks

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| proot-distro instalación falla en Android 5.10 | Baja | Documentado, alternatives: proot directamente, chroot con root (no disponible) |
| Ubuntu apt install chromium no disponible | Baja | Snap flatpak fallback; chromium-browser package oficial |
| gosom build falla (Go version mismatch) | Baja | Forzar Go 1.21+ via apt; si falla, usar Go binary prebuilt |
| proot overhead degrada throughput 30% | Media | Aceptable — 120 places/min × 0.7 = ~85 places/min todavía suficiente |
| Tailscale routing dentro de proot | Media | `--bind` flags en proot; si falla, gosom no necesita Tailscale (sale a internet directo) |
| Cron jobs se rompen por path changes | Baja | Backup completo `.bak-pre-proot`; rollback en 15min |
| Storage insuficiente después de 6 meses | Baja | 202GB libre; Ubuntu proot = 5GB; 1 año de logs = 1GB; holgura amplia |
| google detecta y bloquea (recurrente) | Alta | Rotación de IPs por usar mobile network (Tailscale) — ya mitigado por diseño |

## Rollback plan

1. **Detener cron jobs**: `crontab -r` (ya vacío hoy, mantener así hasta confirmar Option C)
2. **Reactivar wrapper viejo** (tiene backup): `cp crm-gb-scap.js.bak-pre-escape-fix crm-gb-scap.js && start.sh`
3. **Quitar proot**: `proot-distro remove ubuntu` (~5min)
4. **Verificar**: `ps -ef | grep crm-gb-scap` confirma wrapper corriendo
5. **Tiempo total rollback**: < 15 minutos

Los scripts cron tienen backups `.bak-pre-escape-fix` y `.bak-pre-wrap-fix`. El wrapper CLI tiene `.bak-pre-search-post-fix`.

## Dependencies

- **Nuevas en xiaomi-12**:
  - `proot-distro` (Termux package, ~5MB)
  - Ubuntu 22.04 chroot (~1.5GB)
  - `chromium-browser` (apt, ~500MB)
  - Go 1.21+ (apt, ~300MB)
  - gosom source (git clone, ~5MB)

- **Sin cambios**:
  - n8n webhooks
  - PostgreSQL
  - Frontend React
  - VPS (72.60.191.179)

## Open questions

- Q1: ¿Cuánto tiempo podemos correr cron jobs antes de detectar bloqueos? Si Google bloquea, ¿qué hacemos? (Sugerencia: backoff exponencial + IP refresh)
- Q2: ¿Mantenemos wrapper viejo como fallback 30 días o lo eliminamos ya? (Sugerencia: mantener 30 días, eliminar si todo OK)
- Q3: ¿Necesitamos actualizar el cron `watchdog.sh` ahora? (Sugerencia: NO, dejarlo vigilando crm-gb-scap viejo deprecated)

## Preflight (cached)

- **Pace**: A2 (Auto — execute back-to-back)
- **Artifacts**: B1 (OpenSpec files in repo)
- **PRs**: C1+C3 (Ask + Chained PRs when needed)
- **Review budget**: D1 (400 lines)

## Owners

- **Implementación**: agent (yo, en este sprint) + Rafael valida
- **Operación**: Rafael (mantenimiento continuo, refresh de proot, monitoring)

## Referencias

- `openspec/changes/archive/2026-08-06-gbp-sprint2/` (sprint previo archivado)
- `openspec/changes/2026-08-11-gbp-ficha-enrichment/` (sprint paralelo, consumidor)
- GitHub: https://github.com/gosom/google-maps-scraper (5.5k⭐)
- GitHub topic: https://github.com/topics/google-maps-scraping (51 repos evaluados)
- Termux proot-distro docs: https://wiki.termux.com/wiki/PRoot
- Engram: `decision/decisi-n-final-option-c-proot-distro-ubuntu-gosom-browser-mode-para-xiaomi-alone`
