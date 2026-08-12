# Tasks — 2026-08-11-xiaomi-gosom-scraper-migration (Option C)

> Source: `proposal.md` + `design.md` en este directorio.
> Implementación end-to-end en xiaomi-alone con proot-distro + Ubuntu + gosom browser mode.

---

## Phase 1: proot-distro + Ubuntu chroot (1h)

### T1. Install proot-distro en Termux
- **Owner**: agent
- **Esfuerzo**: 5min
- **Criterio**:
  ```bash
  ssh -p 8022 100.75.94.18 'pkg install proot-distro -y'
  ssh -p 8022 100.75.94.18 'proot-distro --help | head -5'
  ```
- **Verificación**: `which proot-distro` retorna path

### T2. Install Ubuntu 22.04 chroot
- **Owner**: agent
- **Esfuerzo**: 15min (descarga ~150MB)
- **Criterio**:
  ```bash
  proot-distro install ubuntu
  proot-distro login ubuntu -- 'cat /etc/os-release | head -3'
  ```
- **Verificación**: `proot-distro login ubuntu` arranca Ubuntu shell

### T3. apt update + install base packages
- **Owner**: agent
- **Esfuerzo**: 5min
- **Criterio**:
  ```bash
  proot-distro login ubuntu -- bash -c '
    apt update &&
    apt install -y wget curl git unzip jq ca-certificates
  '
  ```
- **Verificación**: `wget`, `curl`, `git`, `jq` disponibles en Ubuntu

---

## Phase 2: Chromium + Go + gosom build (1h)

### T4. Install Chromium
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  ```bash
  proot-distro login ubuntu -- bash -c '
    apt install -y chromium-browser
    chromium-browser --version
  '
  ```
- **Verificación**: `chromium-browser --version` retorna ≥120

### T5. Install Go 1.21+
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  ```bash
  proot-distro login ubuntu -- bash -c '
    wget -q https://go.dev/dl/go1.21.6.linux-arm64.tar.gz &&
    tar -C /usr/local -xzf go1.21.6.linux-arm64.tar.gz &&
    echo "export PATH=\$PATH:/usr/local/go/bin" >> ~/.bashrc
  '
  proot-distro login ubuntu -- bash -c 'export PATH=$PATH:/usr/local/go/bin && go version'
  ```
- **Verificación**: `go version` retorna `go1.21.6 linux/arm64`

### T6. Clone + build gosom
- **Owner**: agent
- **Esfuerzo**: 10min (clone + go mod download + go build)
- **Criterio**:
  ```bash
  proot-distro login ubuntu -- bash -c '
    export PATH=$PATH:/usr/local/go/bin &&
    mkdir -p /opt/gosom &&
    cd /opt &&
    git clone https://github.com/gosom/google-maps-scraper.git &&
    cd google-maps-scraper &&
    go build -o /opt/gosom/google-maps-scraper . &&
    ls -la /opt/gosom/google-maps-scraper &&
    /opt/gosom/google-maps-scraper -h | head -10
  '
  ```
- **Verificación**: `/opt/gosom/google-maps-scraper` existe, ejecutable, muestra help

### T7. Smoke test gosom en Ubuntu
- **Owner**: agent
- **Esfuerzo**: 15min
- **Criterio**:
  ```bash
  # Inside Ubuntu proot
  cat > /tmp/test1.txt <<'EOF'
  https://www.google.com/maps/place/?q=place_id:ChIJN1t_tDeuEmsRUsoyG83fr_4
  EOF
  /opt/gosom/google-maps-scraper \
    -input /tmp/test1.txt \
    -results /tmp/test1.csv \
    -c 1 -depth 1 -exit-on-inactivity 1m -lang es
  
  # Verify
  head -2 /tmp/test1.csv | head -c 800
  # Expected: title, place_id, cid, rating, reviews_count poblados
  ```
- **Verificación**:
  - `place_id` empieza con `0x` (no URL)
  - `review_count > 0`
  - `cid` numérico

---

## Phase 3: Validación con leads reales (30min)

### T8. Test con 5 leads reales
- **Owner**: agent
- **Esfuerzo**: 15min
- **Criterio**:
  ```bash
  # Obtener CIDs de muestra de la DB
  IDS=$(ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql ..." | head -5)
  
  # Construir queries
  cat > /tmp/test2.txt <<EOF
  https://www.google.com/maps/place/?q=place_id:14855
  https://www.google.com/maps/place/?q=place_id:17141
  https://www.google.com/maps/place/?q=place_id:17142
  https://www.google.com/maps/place/?q=place_id:17759
  https://www.google.com/maps/place/?q=place_id:1300001
  EOF
  
  /opt/gosom/google-maps-scraper -input /tmp/test2.txt -results /tmp/test2.csv \
    -c 2 -depth 1 -exit-on-inactivity 2m -lang es
  ```
- **Verificación**:
  - ≥3/5 leads con place_id formato `0x...`
  - ≥3/5 con review_count > 0
  - ≥3/5 con rating real (1-5)

### T9. Validar data de un cliente conocido (962)
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  ```bash
  # Cliente 962 tiene CID 0xd4712b0bb4ef155:0x5273da08d9e62196
  echo "https://www.google.com/maps/place/?q=place_id:0xd4712b0bb4ef155:0x5273da08d9e62196" > /tmp/test962.txt
  /opt/gosom/google-maps-scraper -input /tmp/test962.txt -results /tmp/test962.csv \
    -c 1 -depth 1 -exit-on-inactivity 1m
  cat /tmp/test962.csv
  ```
- **Verificación**:
  - `title` = "Centro Psicología & Logopedia Infantil - DON SANCHO" (o similar)
  - `rating` ≈ 5.0 (esperado)
  - `review_count` > 40 (esperado)

---

## Phase 4: cron scripts reescritos (1.5h)

### T10. Crear template helper para cron scripts
- **Owner**: agent
- **Esfuerzo**: 15min
- **Criterio**:
  - Crear `~/xiaomi-gb-scape/lib/gosom-helper.sh` con funciones comunes:
    - `gosom_run <input_file> <output_file> [extra_args]`
    - `parse_cid_from_dataid <data_id>`
    - `gosom_field_get <csv> <row> <field>`
  - Sourceable desde los 3 scripts cron
- **Verificación**: `source lib/gosom-helper.sh && gosom_run /tmp/x /tmp/y` funciona

### T11. Reescribir `feed-leads-gosom.sh`
- **Owner**: agent
- **Esfuerzo**: 30min
- **Criterio**: Ver `design.md` §2.3
- **Funcionalidad**:
  1. Query leads activos con CID
  2. Construir input.txt con URLs Maps
  3. Ejecutar gosom via proot
  4. Parsear output CSV
  5. POST a /webhook/crm-gb-scape-save-lead
  6. State tracking en `state/feed-leads-gosom.json`
- **Verificación**:
  - `LIMIT=2 bash feed-leads-gosom.sh` exit 0
  - 2 leads en DB con `reputacion_at` actualizado

### T12. Reescribir `audit-clientes-gosom.sh`
- **Owner**: agent
- **Esfuerzo**: 30min
- **Idéntico patrón** a T11, pero query sobre `clientes.clientes`
- **Verificación**:
  - `LIMIT=2 bash audit-clientes-gosom.sh` exit 0
  - 2 clientes en `clientes.gmaps_fichas` con `gmaps_last_updated` reciente

### T13. Reescribir `search-cids-gosom.sh`
- **Owner**: agent
- **Esfuerzo**: 15min
- **Funcionalidad**:
  1. Query leads sin CID (5,275)
  2. Construir input.txt con queries de búsqueda por nombre
  3. Ejecutar gosom con `-fast-mode` (no browser mode, para velocidad)
  4. Extraer primer place_id de cada query
  5. UPDATE `operaciones.leads` con google_cid encontrado
- **Verificación**:
  - `LIMIT=10 bash search-cids-gosom.sh` exit 0
  - DB tiene nuevos CIDs en `operaciones.leads.google_cid`

### T14. Backup de los scripts v2 viejos
- **Owner**: agent
- **Esfuerzo**: 1min
- **Criterio**:
  ```bash
  cd ~/xiaomi-gb-scape/cron
  for f in feed-leads-v2 audit-clientes-v2 search-cids-v2; do
    mv ${f}.sh ${f}.sh.disabled-proot
  done
  ```
- **Verificación**: los `.sh.disabled-proot` existen

---

## Phase 5: Test end-to-end (1h)

### T15. Test E2E con leads reales
- **Owner**: agent
- **Esfuerzo**: 20min
- **Criterio**:
  ```bash
  # Desde Termux
  cd ~/xiaomi-gb-scape/cron
  LIMIT=3 bash feed-leads-gosom.sh
  LIMIT=3 bash audit-clientes-gosom.sh
  LIMIT=5 bash search-cids-gosom.sh
  ```
- **Verificación**:
  - 3 leads en `operaciones.leads` con `reputacion_at` reciente
  - 3 clientes en `clientes.gmaps_fichas` con `gmaps_last_updated` reciente
  - 5 leads sin CID ahora tienen CID

### T16. Verificar webhooks n8n
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  - Query `n8n executions` para los workflows `CRM_GB_SCAPE_SAVE_LEAD/CLIENTE`
  - Status: `success` (no `error`)
  - Sin URLs bogus en `google_cid`
- **Verificación**:
  ```bash
  curl -sS "https://n8n.ia-bybusiness.online/api/v1/executions?workflowId=fJy7pfNYVZqj6LXY&limit=5"
  ```

### T17. Query DB final
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  ```sql
  -- Verificar que no hay URLs bogus en google_cid
  SELECT COUNT(*) FROM operaciones.leads 
  WHERE reputacion_at > NOW() - INTERVAL '30 minutes'
    AND google_cid LIKE 'https://%';
  -- Esperado: 0
  
  -- Verificar place_id formato correcto
  SELECT COUNT(*) FROM operaciones.leads 
  WHERE reputacion_at > NOW() - INTERVAL '30 minutes'
    AND (google_cid ~ '^0x[0-9a-f]+:[0-9a-f]+$' OR google_cid ~ '^[0-9]+$');
  -- Esperado: > 0
  
  -- Verificar reviews_count real
  SELECT id, rating, num_reseñas, LEFT(google_cid, 30) 
  FROM operaciones.leads
  WHERE reputacion_at > NOW() - INTERVAL '30 minutes'
  LIMIT 10;
  -- Esperado: rating entre 1-5, num_reseñas entre 1-1000+
  ```

### T18. Verificar cliente 962 específicamente
- **Owner**: agent
- **Esfuerzo**: 10min
- **Criterio**:
  ```sql
  -- Cliente 962 (Centro Psicología)
  SELECT id, gmaps_rating, gmaps_reseñas, LEFT(google_cid, 30), gmaps_address
  FROM clientes.gmaps_fichas
  WHERE cliente_id = 962;
  -- Esperado: rating ≈ 5.0, reseñas > 40, google_cid formato correcto
  ```

---

## Phase 6: Reactivar crontab (15min)

### T19. Activar cron jobs nuevos
- **Owner**: agent
- **Esfuerzo**: 5min
- **Criterio**:
  ```bash
  ssh -p 8022 100.75.94.18 'crontab -' <<CRONTAB_EOF
  # La Fábrica IA - xiaomi-12 GBM scraper cron v3 (gosom browser mode)
  */30 * * * * /data/data/com.termux/files/home/xiaomi-gb-scape/cron/feed-leads-gosom.sh >/dev/null 2>&1
  0 3 * * * /data/data/com.termux/files/home/xiaomi-gb-scape/cron/audit-clientes-gosom.sh >/dev/null 2>&1
  0 */6 * * * /data/data/com.termux/files/home/xiaomi-gb-scape/cron/search-cids-gosom.sh >/dev/null 2>&1
  CRONTAB_EOF
  ```
- **Verificación**: `crontab -l` muestra las 3 entradas

### T20. Monitoring setup
- **Owner**: agent
- **Esfuerzo**: 5min
- **Criterio**:
  - Crear `~/xiaomi-gb-scape/logs/monitor.sh` que corre cada 5min via cron (manual)
  - Chequea:
    - `crond` corriendo
    - gosom binary existe
    - proot Ubuntu accesible
    - Último log < 2h de antigüedad
  - Alert: si falla, log + exit non-zero
- **Verificación**: `bash monitor.sh` exit 0 con setup OK

### T21. Documentación en engram + final check
- **Owner**: agent
- **Esfuerzo**: 5min
- **Criterio**:
  - `mem_save` con resumen del sprint: xiaomi-gosom-scraper-migration completada
  - `git status` limpio
  - `git log --oneline c394309..HEAD` muestra commits del día
- **Verificación**: 1+ memories con `topic_key: decision/xiaomi-gosom-scraper-completed`

---

## Resumen de tiempos

| Phase | Tareas | Tiempo |
|---|---|---|
| Phase 1: proot-distro + Ubuntu | T1-T3 | 25min |
| Phase 2: Chromium + Go + gosom | T4-T7 | 45min |
| Phase 3: Validación | T8-T9 | 25min |
| Phase 4: cron scripts | T10-T14 | 1.5h |
| Phase 5: E2E test | T15-T18 | 50min |
| Phase 6: Reactivar + monitoring | T19-T21 | 15min |
| **Total** | **T1-T21** | **~4.5h** |

(En budget D1=400 líneas, implementación ≈250 líneas nuevas, OK)

---

## Riesgos por task

| Task | Riesgo | Mitigación |
|---|---|---|
| T1-T2 | proot-distro install falla en Android 5.10 | Ya verificado compatible; alternative: install via F-Droid |
| T4 | Chromium no en apt | `apt install -y chromium-browser` funciona en Ubuntu 22.04 |
| T6 | go build falla (network para módulos) | Verificar `go mod download` con proxy si necesario |
| T7 | Browser mode bloqueado por Google | IP móvil residencial; backoff si 0 results |
| T11-T13 | Scripts bash complicados | Probar cada uno individualmente antes de integrar |

---

## Definition of Done

- [ ] Phase 1-6 completados
- [ ] Cron jobs ejecutan en schedule sin intervención
- [ ] 5+ leads con `reputacion_at` reciente, `google_cid` formato `0x...`, `num_reseñas > 0`
- [ ] 3+ clientes con `gmaps_last_updated` reciente
- [ ] 0 URLs bogus en `google_cid`
- [ ] n8n executions: status=success, no errors
- [ ] Logs de cron sin errores críticos
- [ ] Documentación en engram
- [ ] Proposal + design + tasks commited en repo
- [ ] Backup de scripts v2 viejos en `.disabled-proot`

---

## Referencias

- **Proposal**: `proposal.md` (en este directorio)
- **Design**: `design.md` (en este directorio)
- **Previous sprints**:
  - `openspec/changes/archive/2026-08-06-gbp-sprint2/`
  - `openspec/changes/2026-08-11-gbp-ficha-enrichment/`
- **GitHub repos**:
  - https://github.com/gosom/google-maps-scraper
  - https://github.com/topics/google-maps-scraping
- **Engram**:
  - `decision/decisi-n-final-option-c-proot-distro-ubuntu-gosom-browser-mode-para-xiaomi-alone`
  - `task/backlog-enriquecer-ficha-gbp-...`
  - `bug/xiaomi-12-gbm-cron-v2-4-bugs-fixed-crontab-deployed`
  - `bug/n8n-save-cliente-fan-out-fix-respond-no-depende-de-rama-paralela`
