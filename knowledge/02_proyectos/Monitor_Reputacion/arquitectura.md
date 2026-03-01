# [PRJ] Monitor Reputación V2 — Arquitectura Técnica

**Clasificación:** Proyecto / Arquitectura
**Estado:** ✅ PRODUCCIÓN COMPLETA (2026-03-01)

---

## 1. VISION

Motor de monitoreo de reputación online para pequeños negocios. Escanea Google Maps y extrae datos de reputación (rating, reseñas, distribución de estrellas, web, teléfono) con 4 niveles de profundidad para uso comercial en vivo.

---

## 2. STACK TÉCNICO

| Capa | Tecnología | Puerto |
|---|---|---|
| Orquestador | Go 1.21+ | 8092 |
| Scraper rápido | Node.js + Playwright | 8090 |
| Scraper profundo | Node.js + Playwright | 8091 |
| Caché de datos | PostgreSQL 15 Alpine | 5435 |
| Frontend | React 19 + Vite + Tailwind v4 | 5173 (dev) |
| Infraestructura | Docker + systemd | — |

---

## 3. ESTRUCTURA DE ARCHIVOS

### Motor Go (`/opt/fabrica/monitor-go/`)
```
monitor-go/
├── main.go              — Entrada HTTP, rutas /search /status /health
├── scraper_service.go   — Lógica de niveles 1-4, decisión Nano/Heavy
├── level1_scraper.go    — HTTP Raw (nivel 1, confirmación existencia)
├── level1_parser.go     — Parser de respuesta nivel 1
├── level1_cache.go      — Caché en memoria L1
├── db.go                — Conexión PostgreSQL :5435
├── config.go            — Variables de entorno y configuración
├── models.go            — Structs: SearchResult, BusinessData, is_simulated
└── monitor_engine       — Binario compilado (producción)
```

### Scrapers Playwright (`/opt/fabrica/monitor-go-frontend/`)
```
monitor-go-frontend/
├── scraper-nano.js      — Playwright ultraligero, vista de LISTA Google Maps
│                          256MB RAM máx. Sin carga de imágenes.
├── scraper-base.js      — Base compartida: selectores normalizados, helpers
├── scraper-heavy.js     — Playwright profundo, vista de DETALLE del negocio
│                          1.5GB RAM máx. Scroll infinito + emulación humana.
└── package.json
```

### Frontend React (`/opt/fabrica/monitor-reputacion-frontend/`)
```
monitor-reputacion-frontend/
├── src/
│   ├── components/      — UI Navy Industrial
│   ├── pages/
│   └── services/        — Integración Motor Go :8092
├── package.json
└── vite.config.js
```

---

## 4. FLUJO DE DATOS

```
[Cliente / Demo Comercial]
        |
        v
[VPS :8092] ──SSH Inverso──> [La Fábrica :8092]
                                      |
                              [Motor Go — main.go]
                                 /           \
                          Nivel 1-2        Nivel 3-4
                         (HTTP Raw)    (Playwright)
                              |              |
                       [scraper-nano]  [scraper-heavy]
                        Vista LISTA   Vista DETALLE
                              \              /
                               [Postgres :5435]
                               (Caché L1: 0.01s)
                                      |
                              [JSON Response]
                                      |
                           [Frontend React :5173]
```

---

## 5. SERVICIOS SYSTEMD (Auto-arranque)

### monitor-engine.service
```ini
[Unit]
Description=Monitor Reputacion — Motor Go (Puerto 8092)
After=network.target docker.service

[Service]
Type=simple
WorkingDirectory=/opt/fabrica/monitor-go
ExecStart=/opt/fabrica/monitor-go/monitor_engine
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

### tunnel-monitor.service
```ini
[Unit]
Description=Monitor Reputacion — Túnel SSH Zero Trust (VPS:8092)
After=network-online.target monitor-engine.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/ssh -N -o ServerAliveInterval=30 -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes -R 8092:127.0.0.1:8092 root@72.60.191.179
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Comandos de gestión:**
```bash
systemctl status monitor-engine
systemctl status tunnel-monitor
journalctl -u monitor-engine -f    # logs en vivo Motor Go
journalctl -u tunnel-monitor -f    # logs en vivo túnel
```

---

## 6. BASE DE DATOS DE CACHE

```
PostgreSQL :5435  (container: postgres-monitor-v2)
DB: reputacion_cache

Tablas clave:
├── cache_resultados    — Resultados indexados por query + nivel
├── businesses          — Datos de negocio normalizados
├── reviews_raw         — Reseñas en texto plano (nivel 4)
└── search_history      — Historial de búsquedas con timestamps
```

**Política de caché:**
- Hit rate objetivo: >80% en demos comerciales repetidas
- TTL: configurable por nivel (nivel 3 default: 24h)
- Tiempo de respuesta en caché: ~0.01s vs 15-20s sin caché

---

## 7. VARIABLES DE ENTORNO

```bash
# monitor-go/.env
DB_HOST=localhost
DB_PORT=5435
DB_USER=monitor
DB_PASSWORD=monitor_password
DB_NAME=reputacion_cache
API_PORT=8092

NANO_SCRAPER_URL=http://localhost:8090
HEAVY_SCRAPER_URL=http://localhost:8091
```

---

## 8. BUGS RESUELTOS (2026-03-01)

| Bug | Root Cause | Fix |
|---|---|---|
| **opositare** | Selector CSS apuntaba a posición incorrecta en lista de resultados | Normalizado en `scraper-base.js` con selector robusto |
| **is_simulated** | Campo booleano del struct Go sin tag `json:"is_simulated"` | Añadido tag en `models.go`, propagado en `scraper_service.go` |
| **listas vs detalles** | `scraper-nano.js` navegaba a URL de detalle en lugar de vista de lista | Separadas rutas: NANO=lista, HEAVY=detalle |

---

## 9. ESTADO COMPLETO DEL SISTEMA

| Componente | Estado |
|---|---|
| Motor Go (:8092) | ✅ Funcional + systemd auto-arranque |
| Scraper NANO (:8090) | ✅ Funcional + Docker restart=always |
| Scraper HEAVY (:8091) | ✅ Funcional + Docker restart=always |
| Postgres caché (:5435) | ✅ Funcional + Docker restart=always |
| Túnel SSH → VPS | ✅ Robusto + systemd watchdog |
| Bugs opositare/is_simulated/listas | ✅ Corregidos |
| Frontend React | 🔨 En desarrollo (Antigravity) |

---

## 10. RENDIMIENTO

- Nivel 1: ~1s (HTTP Raw)
- Nivel 2: ~8s (Playwright lista)
- Nivel 3: ~15-20s (Playwright detalle) — **default demo comercial**
- Nivel 4+: >30s (semántico, auditorías)
- Con caché activa: 0.01s en todos los niveles
- Throughput estimado: ~1000 establecimientos/min (batch sin caché)
