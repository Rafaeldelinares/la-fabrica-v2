# [PRJ] DEMO REPUTACION ONLINE V2

**Clasificación:** Proyecto / Herramienta Comercial (Go Engine)
**Estado:** ✅ PRODUCCIÓN COMPLETA — Backend 100% estable + Auto-arranque + Túnel VPS
**Última sesión:** 2026-03-01

---

## 1. ARQUITECTURA DE MICROSERVICIOS

El sistema ha abandonado APIs externas en favor de una arquitectura nativa residente exclusivamente en La Fábrica local.

*   **Backend Go (Orquestador — Puerto 8092):** Contiene la lógica de decisión, enrutamiento y un limitador de velocidad integrado (`googleLimiter`) para evitar el bloqueo de IPs.
*   **Scraper NANO v2 (Puerto 8090):** Trabajador Playwright ultraligero (restringido a 256MB RAM). Bloquea la carga de imágenes para máxima velocidad. Optimizado para búsquedas en **vista de lista** de Google Maps.
*   **Scraper HEAVY v2 (Puerto 8091):** Trabajador pesado (hasta 1.5GB RAM). Realiza emulación humana y *scroll* infinito para leer reseñas y extraer métricas de sentimiento. Opera sobre la **vista de detalle** del negocio.
*   **Caché (Puerto 5435):** Base de datos Postgres aislada dedicada a almacenar resultados previos. Si una búsqueda se repite, el tiempo de respuesta baja de 20s a 0.01s.

---

## 2. ESTRATEGIA DE EXTRACCIÓN (Los 4 Niveles)

El sistema opera en 4 niveles de profundidad según el tiempo disponible durante la venta:

*   **Nivel 1 (1s):** HTTP Raw para confirmar que el negocio existe en Google Maps.
*   **Nivel 2 (8s):** Nano Scraper — extrae el rating general desde la vista de lista.
*   **Nivel 3 (15-20s):** "El Punto Dulce". Heavy Scraper extrae Web, Teléfono y el reparto de 1 a 5 estrellas desde la vista de detalle. Usado por defecto para impresionar al cliente en vivo.
*   **Nivel 4+ (>30s):** Extracción semántica de texto de reseñas. Reservado para auditorías de pago o profundas.

---

## 3. SESIÓN DE PRODUCCIÓN — 2026-03-01

### Bugs Corregidos

| Bug | Descripción | Archivo |
|---|---|---|
| **opositare** | Selector CSS roto para competidores en vista de lista; se normalizó el selector de posición | `scraper-nano.js` / `scraper-base.js` |
| **is_simulated** | El campo booleano no se propagaba correctamente desde Go al JSON de respuesta; faltaba la serialización del struct | `scraper_service.go` |
| **listas vs detalles** | El NANO atacaba la URL de detalle en lugar de la de lista de resultados, devolviendo datos vacíos; se separaron las rutas de extracción por contexto | `scraper-nano.js` / `scraper-base.js` |

### Archivos Modificados

```
monitor-go/
├── main.go              — Ajuste de rutas HTTP y manejo de contextos de nivel
├── scraper_service.go   — Fix serialización is_simulated + lógica de nivel 3/4
monitor-go-frontend/
├── scraper-nano.js      — Fix selector lista vs detalle + bug opositare
└── scraper-base.js      — Refactor base compartida: selectores normalizados
```

---

## 4. INFRAESTRUCTURA DE AUTO-ARRANQUE (Grado Militar)

### Servicios systemd Creados

**`monitor-engine.service`** — Levanta el binario Go al arrancar el sistema:
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

**`tunnel-monitor.service`** — Túnel SSH inverso robusto hacia el VPS:
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

### Docker con Restart Always

Todos los contenedores del stack Monitor (`postgres-monitor-v2`, `scraper-nano-v2`, `scraper-heavy-v2`) operan con `restart: always` en el `docker-compose.yml`, garantizando recuperación automática sin intervención manual.

### Watchdog Automático

El servicio `tunnel-monitor.service` incorpora watchdog nativo de systemd:
- `ServerAliveInterval=30` — Keepalive cada 30s para detectar caídas
- `ServerAliveCountMax=3` — Tras 3 fallos consecutivos, mata y reinicia
- `Restart=always` + `RestartSec=10` — Reinicio automático con backoff de 10s

**Secuencia de arranque garantizada:**
```
Boot → docker.service → postgres-monitor-v2 → scraper-nano-v2 + scraper-heavy-v2
     → monitor-engine.service (Go :8092)
     → tunnel-monitor.service (SSH → VPS:8092)
```

---

## 5. FRONTEND (En Desarrollo)

Ver documento: [`monitor-reputacion-frontend-v2.md`](./monitor-reputacion-frontend-v2.md)

Stack: React + Vite + Tailwind + Recharts + Lucide. Integración directa con Motor Go `:8092`.
Ejecutado por: **Antigravity** (sesión activa 2026-03-01).
