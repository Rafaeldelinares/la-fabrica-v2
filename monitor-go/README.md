# Monitor de Reputación [Go Version V2]

Versión consolidada y robusta del Monitor de Reputación, diseñada para producción con tolerancia a fallos y observabilidad.

## Características Principales
- **Estrategia Multi-Scraper:** Fallback automático (Directo -> Nano -> Heavy -> Cache Stale).
- **Rate Limiting:** Protección "Anti-Ban" integrada (10 req/min).
- **Logging Estructurado:** Logs en formato JSON con `logrus`.
- **Salud del Sistema:** Endpoint `/health` para monitoreo de DB y conectividad.

## Requisitos
- Go 1.24+
- Docker & Docker Compose (para Scrapers y PostgreSQL)

## Configuración (.env)
Crea un archivo `.env` en la raíz con las siguientes variables:
```env
SERVER_PORT=:8092
DB_URL=postgres://usuario:password@localhost:5432/db_name?sslmode=disable
NANO_SCRAPER_URL=http://localhost:8090/api/v1/jobs
HEAVY_SCRAPER_URL=http://localhost:8091/api/v1/jobs
NANO_TIMEOUT=2m
HEAVY_TIMEOUT=10m
```

## Ejecución

1. **Levantar Infraestructura:**
   ```bash
   docker compose up -d
   ```

2. **Ejecutar Servidor Go:**
   ```bash
   go run .
   ```

## API Endpoints
- `POST /webhook/scraper/go`: Procesamiento de scraping.
- `GET /health`: Estado de salud del sistema y base de datos.
