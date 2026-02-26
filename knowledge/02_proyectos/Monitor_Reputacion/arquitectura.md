# Monitor Reputación — Arquitectura

## 📋 Visión

Motor de monitoreo de reputación online para pequeños negocios. Escanea Google Maps, redes sociales y plataformas de reseñas para analizar la reputación de empresas.

## 🏗️ Stack Técnico

- **Lenguaje Principal**: Go (alto rendimiento)
- **Scraping**: Playwright + Go
- **Base de Datos**: PostgreSQL
- **Orquestación**: n8n
- **Frontend**: Go (reportes, opcional)

## 🔍 Componentes Principales

### 1. Motor de Scraping (Go)
```
monitor-go/
├── main.go (punto de entrada)
├── scraper_service.go (lógica de scraping)
├── level1_scraper.go (escaneo nivel 1)
├── level1_parser.go (parseo de datos)
├── level1_cache.go (caché local)
├── db.go (conexión PostgreSQL)
├── config.go (configuración)
├── models.go (estructuras de datos)
└── monitor_engine (binario compilado)
```

### 2. Scrapers Playwright
```
scrapers-playwright/
├── google_maps_scraper.js
├── google_reviews_scraper.js
├── tripadvisor_scraper.js
└── otros_scrapers/
```

### 3. Base de Datos
```
reputacion_cache (PostgreSQL)
├── Tabla: reseñas
├── Tabla: puntuaciones
├── Tabla: análisis_sentimiento
└── Tabla: historial_seguimiento
```

### 4. Workflow n8n
```
[DEMO] Scraper Engine Go
├── Webhook trigger (recibe solicitudes)
├── Llamada a motor Go
├── Espera resultados (polling)
├── Procesa datos
└── Almacena en PostgreSQL
```

## 📊 Flujo de Datos
```
1. Solicitud → n8n webhook
2. n8n → Motor Go (http://localhost:8888)
3. Go → Playwright scrapers
4. Scrapers → Google Maps, Reseñas, etc.
5. Resultados → PostgreSQL
6. Reportes → Dashboard (opcional)
```

## 🎯 Características

### Monitoreo
- Google Maps (estrellas, reseñas)
- Google Reviews
- TripAdvisor
- Facebook
- Yelp

### Análisis
- Puntuación promedio
- Análisis de sentimiento
- Tendencias temporales
- Palabras clave destacadas

### Reportes
- Dashboard ejecutivo
- Alertas de cambios
- Comparativa histórica
- Exportación de datos

## 🚀 Estado

- ✅ Motor Go funcional
- ✅ Scrapers Playwright operativos
- ✅ BD PostgreSQL activa
- ✅ Workflow n8n demo disponible
- ⏳ Frontend reportes (en desarrollo)

## 🔧 Configuración
```
monitor-go/.env
├── DB_HOST=localhost
├── DB_PORT=5435 (postgres-monitor-v2)
├── DB_USER=postgres
├── DB_PASSWORD=***
└── API_PORT=8888
```

## ⚡ Rendimiento

- Scraping optimizado con caché L1
- Límite de profundidad configurable (depth: 1-10)
- Benchmark: ~1000 establecimientos por minuto

