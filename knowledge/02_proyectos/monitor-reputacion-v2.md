# [PRJ] MONITOR DE REPUTACIÓN V2 — FICHA DE ESTADO

**Clasificación:** Proyecto / Herramienta Comercial
**Estado:** ✅ PRODUCCIÓN COMPLETA
**Última sesión:** 2026-03-01
**Docs detallados:** `Monitor_Reputacion/prj_monitor_reputacion.md` | `Monitor_Reputacion/arquitectura.md`

---

## ESTADO ACTUAL DE SERVICIOS

| Servicio | Puerto | Auto-arranque | Estado |
|---|---|---|---|
| Motor Go (Orquestador) | 8092 | systemd `monitor-engine.service` | ✅ PRODUCCIÓN |
| Scraper NANO v2 | 8090 | Docker `restart: always` | ✅ PRODUCCIÓN |
| Scraper HEAVY v2 | 8091 | Docker `restart: always` | ✅ PRODUCCIÓN |
| PostgreSQL Caché | 5435 | Docker `restart: always` | ✅ PRODUCCIÓN |
| Túnel SSH → VPS | — | systemd `tunnel-monitor.service` | ✅ PRODUCCIÓN |

**Endpoint activo:**
```
POST http://localhost:8092/webhook/scraper/go
```

**Test de producción validado (2026-03-01):**
```bash
curl -X POST http://localhost:8092/webhook/scraper/go \
  -H "Content-Type: application/json" \
  -d '{"query": {"q": "ferreterías Málaga", "depth": 3, "preload": false}}'
# Resultado: 19 ferreterías reales con rating, reseñas y dirección
```

---

## BUGS CRÍTICOS RESUELTOS — 2026-03-01

| Bug | Root Cause | Archivo corregido |
|---|---|---|
| **opositare** | Selector CSS de competidores apuntaba a posición errónea en vista de lista | `scraper-nano.js`, `scraper-base.js` |
| **is_simulated** | Struct Go sin tag `json:"is_simulated"` — campo no se serializaba en la respuesta | `scraper_service.go` |
| **listas vs detalles** | NANO navegaba a URL de detalle en lugar de lista de resultados → datos vacíos | `scraper-nano.js`, `scraper-base.js` |

**Archivos modificados en esta sesión:**
```
monitor-go/
├── main.go              — Ajuste rutas HTTP y manejo de contextos por nivel
└── scraper_service.go   — Fix is_simulated + lógica niveles 3-4

monitor-go-frontend/
├── scraper-nano.js      — Fix lista vs detalle + bug opositare
└── scraper-base.js      — Selectores normalizados (base compartida)
```

---

## INFRAESTRUCTURA DE AUTO-ARRANQUE

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

### tunnel-monitor.service (Watchdog SSH)
```ini
[Unit]
Description=Monitor Reputacion — Túnel SSH Zero Trust (VPS:8092)
After=network-online.target monitor-engine.service
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/ssh -N \
  -o ServerAliveInterval=30 \
  -o ServerAliveCountMax=3 \
  -o ExitOnForwardFailure=yes \
  -R 8092:127.0.0.1:8092 root@72.60.191.179
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

**Secuencia de arranque garantizada:**
```
Boot
 └─ docker.service → postgres-monitor-v2 → scraper-nano-v2 + scraper-heavy-v2
 └─ monitor-engine.service (Go :8092)
     └─ tunnel-monitor.service (SSH inverso → VPS 72.60.191.179:8092)
```

---

## ESTRATEGIA DE EXTRACCIÓN (4 Niveles)

| Nivel | Tiempo | Método | Uso |
|---|---|---|---|
| 1 | ~1s | HTTP Raw | Confirmar existencia en Google Maps |
| 2 | ~8s | NANO (vista lista) | Rating general |
| 3 | ~15-20s | HEAVY (vista detalle) | **Default demo comercial** — Web, Teléfono, distribución 1-5★ |
| 4+ | >30s | HEAVY semántico | Auditorías de pago |
| — | 0.01s | Caché Postgres :5435 | Si la búsqueda ya se realizó antes |

---

## PRÓXIMOS PASOS

- [ ] Frontend React (Recharts + Lucide) — en desarrollo por Antigravity
- [ ] Integrar tool `monitor_reputacion` en Escaparate COM (Agente Sofía)
- [ ] Docs frontend: `Monitor_Reputacion/monitor-reputacion-frontend-v2.md`

---

## COMANDOS DE OPERACIÓN

```bash
# Estado de servicios
systemctl status monitor-engine
systemctl status tunnel-monitor

# Logs en vivo
journalctl -u monitor-engine -f
journalctl -u tunnel-monitor -f

# Reinicio manual si es necesario
systemctl restart monitor-engine
systemctl restart tunnel-monitor

# Estado Docker
docker ps | grep -E "scraper|postgres-monitor"
```
