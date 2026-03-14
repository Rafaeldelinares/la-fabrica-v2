# 🎭 FASE 2: MIGRACIÓN A PLAYWRIGHT - GUÍA COMPLETA

> **Arquitectura Dual Playwright:** scraper-nano-playwright + scraper-heavy-playwright  
> **Ahorro adicional:** 30% de RAM sobre Chromium (80% total vs baseline)  
> **Tiempo de implementación:** 2-3 semanas  
> **Prerequisito:** Nivel 1 funcionando (Fase 1 completada)

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura Objetivo](#arquitectura-objetivo)
3. [Instalación de Playwright](#instalación-de-playwright)
4. [Código del Scraper Playwright](#código-del-scraper-playwright)
5. [Configuración Docker](#configuración-docker)
6. [Integración con Nivel 1](#integración-con-nivel-1)
7. [Migración Paso a Paso](#migración-paso-a-paso)
8. [Testing y Validación](#testing-y-validación)
9. [Monitoreo y Métricas](#monitoreo-y-métricas)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 RESUMEN EJECUTIVO

### ¿Por Qué Playwright?

**Comparativa de RAM:**
```
Chromium estándar:     300MB por instancia
Playwright Chromium:   180MB por instancia (-40%)
Ahorro:               120MB por instancia
```

**Con arquitectura dual (nano + heavy):**
```
┌─────────────────────────────────────────────────────────┐
│ NIVEL 0: Caché PostgreSQL (75-80% hit rate)            │
└─────────────────────────────────────────────────────────┘
                        ↓ (miss)
┌─────────────────────────────────────────────────────────┐
│ NIVEL 1: HTTP Puro (15-20% adicional)                  │
│ RAM: 2MB | Latencia: 10-50ms                           │
└─────────────────────────────────────────────────────────┘
                        ↓ (requiere JS)
┌─────────────────────────────────────────────────────────┐
│ NIVEL 2: Playwright NANO (5-8% del tráfico)            │
│ RAM: 120MB | Latencia: 500ms-1s                        │
│ Configuración: Sin imágenes, CSS, fuentes              │
└─────────────────────────────────────────────────────────┘
                        ↓ (análisis profundo)
┌─────────────────────────────────────────────────────────┐
│ NIVEL 3: Playwright HEAVY (2-5% del tráfico)           │
│ RAM: 180MB | Latencia: 2-3s                            │
│ Configuración: Navegador completo + emulación humana   │
└─────────────────────────────────────────────────────────┘
```

### Ahorro Total Proyectado

**Antes (Solo Chromium):**
```
100 queries simultáneas
100 instancias Chromium × 300MB = 30GB RAM
```

**Después (Nivel 1 + Playwright Dual):**
```
100 queries simultáneas:
├─ 75 resueltas en Caché (Nivel 0): 0MB
├─ 15 resueltas en HTTP (Nivel 1): 30MB
├─ 7 resueltas en Playwright Nano: 840MB
└─ 3 resueltas en Playwright Heavy: 540MB

Total RAM: 1.41GB (95% de ahorro)
```

---

## 🏗️ ARQUITECTURA OBJETIVO

### Stack Tecnológico

```
Backend:         Go + Nivel 1 (ya implementado)
Scrapers Nano:   Node.js + Playwright (modo ligero)
Scraper Heavy:   Node.js + Playwright (modo completo)
Caché:           PostgreSQL (ya implementado)
Orquestación:    Docker Compose
```

### Flujo de Decisión

```javascript
async function decidirNivel(query) {
    // Nivel 0: Caché
    const cached = await cache.get(query);
    if (cached) return { data: cached, level: 0 };
    
    // Nivel 1: HTTP
    const level1Result = await nivel1.search(query);
    if (level1Result.found && !level1Result.requiresJS) {
        return { data: level1Result, level: 1 };
    }
    
    // Nivel 2 vs 3: Decisión basada en profundidad
    const depth = query.depth || 1;
    
    if (depth <= 5) {
        // Nivel 2: Playwright Nano (sin imágenes)
        return await playwrightNano.scrape(query);
    } else {
        // Nivel 3: Playwright Heavy (completo)
        return await playwrightHeavy.scrape(query);
    }
}
```

---

## 📦 INSTALACIÓN DE PLAYWRIGHT

### Paso 1: Instalar Node.js (si no lo tienes)

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # v20.x.x
npm --version   # 10.x.x
```

### Paso 2: Crear Proyecto Node.js para Scrapers

```bash
# Crear directorio
mkdir -p scrapers-playwright
cd scrapers-playwright

# Inicializar proyecto
npm init -y

# Instalar Playwright
npm install playwright

# Instalar dependencias adicionales
npm install express body-parser
```

### Paso 3: Descargar Navegadores Playwright

```bash
# Esto descarga Chromium optimizado de Playwright
npx playwright install chromium

# Verificar instalación
npx playwright --version
```

**Tamaño descargado:** ~170MB (vs ~450MB de Chromium estándar)

---

## 💻 CÓDIGO DEL SCRAPER PLAYWRIGHT

### Archivo 1: `scraper-base.js` (Lógica Común)

```javascript
// scraper-base.js
const { chromium } = require('playwright');

class PlaywrightScraper {
    constructor(config) {
        this.config = {
            headless: true,
            timeout: config.timeout || 30000,
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...config
        };
        this.browser = null;
    }

    async initialize() {
        console.log(`[${this.config.name}] Iniciando navegador...`);
        
        this.browser = await chromium.launch({
            headless: this.config.headless,
            args: this.config.launchArgs || []
        });

        console.log(`[${this.config.name}] ✓ Navegador iniciado`);
    }

    async scrapeGoogleMaps(negocio, ciudad, depth = 1) {
        if (!this.browser) {
            await this.initialize();
        }

        const startTime = Date.now();
        const query = `${negocio} ${ciudad}`;
        
        console.log(`[${this.config.name}] Scraping: ${query} (depth: ${depth})`);

        try {
            // Crear contexto nuevo
            const context = await this.browser.newContext({
                userAgent: this.config.userAgent,
                viewport: { width: 1280, height: 720 },
                locale: 'es-ES',
                timezoneId: 'Europe/Madrid',
                ...this.config.contextOptions
            });

            const page = await context.newPage();

            // Configurar timeouts
            page.setDefaultTimeout(this.config.timeout);

            // Navegar a Google Maps
            const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
            await page.goto(url, { waitUntil: 'domcontentloaded' });

            // Esperar a que carguen resultados
            await page.waitForTimeout(2000);

            // Extraer datos básicos
            const basicData = await this.extractBasicData(page);

            // Si depth > 1, extraer datos profundos
            let deepData = null;
            if (depth > 1) {
                deepData = await this.extractDeepData(page, depth);
            }

            await context.close();

            const latency = Date.now() - startTime;
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

            const result = {
                query,
                found: basicData.found,
                level: this.config.level,
                data: { ...basicData, ...deepData },
                latency_ms: latency,
                memory_mb: memoryUsage.toFixed(2),
                timestamp: new Date().toISOString()
            };

            console.log(`[${this.config.name}] ✓ Completado en ${latency}ms (RAM: ${result.memory_mb}MB)`);

            return result;

        } catch (error) {
            console.error(`[${this.config.name}] ✗ Error:`, error.message);
            throw error;
        }
    }

    async extractBasicData(page) {
        try {
            // Extraer placeId
            const html = await page.content();
            const placeIdMatch = html.match(/ChIJ[a-zA-Z0-9_-]+/);
            const placeId = placeIdMatch ? placeIdMatch[0] : null;

            if (!placeId) {
                return { found: false };
            }

            // Extraer nombre del negocio
            const name = await page.evaluate(() => {
                const h1 = document.querySelector('h1');
                return h1 ? h1.textContent : null;
            });

            // Extraer dirección
            const address = await page.evaluate(() => {
                const addressBtn = document.querySelector('[data-item-id="address"]');
                return addressBtn ? addressBtn.textContent : null;
            });

            // Extraer rating
            const rating = await page.evaluate(() => {
                const ratingSpan = document.querySelector('[aria-label*="estrellas"]');
                if (ratingSpan) {
                    const match = ratingSpan.getAttribute('aria-label').match(/([0-9.]+)/);
                    return match ? parseFloat(match[1]) : null;
                }
                return null;
            });

            // Extraer número de reseñas
            const reviewCount = await page.evaluate(() => {
                const reviewSpan = document.querySelector('[aria-label*="reseñas"]');
                if (reviewSpan) {
                    const match = reviewSpan.textContent.match(/([0-9,.]+)/);
                    return match ? parseInt(match[1].replace(/[,.]/g, '')) : null;
                }
                return null;
            });

            return {
                found: true,
                place_id: placeId,
                name,
                address,
                rating,
                review_count: reviewCount
            };

        } catch (error) {
            console.error('Error extrayendo datos básicos:', error.message);
            return { found: false };
        }
    }

    async extractDeepData(page, depth) {
        // Solo ejecutar en modo HEAVY
        if (this.config.level !== 3) {
            return null;
        }

        try {
            console.log(`[${this.config.name}] Extrayendo datos profundos (depth: ${depth})...`);

            // Hacer clic en el primer resultado para ver detalles
            await page.click('a[href*="place"]', { timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(2000);

            // Extraer horarios
            const hours = await page.evaluate(() => {
                const hoursDiv = document.querySelector('[aria-label*="Horario"]');
                return hoursDiv ? hoursDiv.textContent : null;
            });

            // Extraer teléfono
            const phone = await page.evaluate(() => {
                const phoneBtn = document.querySelector('[data-item-id*="phone"]');
                return phoneBtn ? phoneBtn.textContent : null;
            });

            // Extraer website
            const website = await page.evaluate(() => {
                const websiteBtn = document.querySelector('[data-item-id*="authority"]');
                return websiteBtn ? websiteBtn.getAttribute('href') : null;
            });

            // Extraer reseñas (primeras 5)
            let reviews = [];
            if (depth >= 5) {
                reviews = await this.extractReviews(page, 5);
            }

            return {
                hours,
                phone,
                website,
                reviews,
                deep_scraped: true
            };

        } catch (error) {
            console.error('Error extrayendo datos profundos:', error.message);
            return { deep_scraped: false };
        }
    }

    async extractReviews(page, limit = 5) {
        try {
            // Hacer clic en la pestaña de reseñas
            await page.click('button[aria-label*="Reseñas"]', { timeout: 5000 }).catch(() => null);
            await page.waitForTimeout(2000);

            const reviews = await page.evaluate((limit) => {
                const reviewElements = document.querySelectorAll('[data-review-id]');
                const results = [];

                for (let i = 0; i < Math.min(reviewElements.length, limit); i++) {
                    const reviewEl = reviewElements[i];
                    
                    const author = reviewEl.querySelector('[aria-label]')?.textContent || null;
                    const text = reviewEl.querySelector('[class*="review-text"]')?.textContent || null;
                    const ratingEl = reviewEl.querySelector('[aria-label*="estrellas"]');
                    const rating = ratingEl ? parseInt(ratingEl.getAttribute('aria-label')) : null;

                    results.push({ author, text, rating });
                }

                return results;
            }, limit);

            return reviews;

        } catch (error) {
            console.error('Error extrayendo reseñas:', error.message);
            return [];
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            console.log(`[${this.config.name}] Navegador cerrado`);
        }
    }

    getStats() {
        const memory = process.memoryUsage();
        return {
            heap_used_mb: (memory.heapUsed / 1024 / 1024).toFixed(2),
            heap_total_mb: (memory.heapTotal / 1024 / 1024).toFixed(2),
            rss_mb: (memory.rss / 1024 / 1024).toFixed(2)
        };
    }
}

module.exports = PlaywrightScraper;
```

### Archivo 2: `scraper-nano.js` (Modo Ligero)

```javascript
// scraper-nano.js
const PlaywrightScraper = require('./scraper-base');

class NanoScraper extends PlaywrightScraper {
    constructor() {
        super({
            name: 'NANO',
            level: 2,
            timeout: 15000,
            launchArgs: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--disable-software-rasterizer',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process',
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--disable-extensions',
                '--disable-default-apps'
            ],
            contextOptions: {
                // CONFIGURACIÓN CLAVE: Bloquear recursos pesados
                javaScriptEnabled: true,  // Necesario para Maps
                imagesEnabled: false,     // ¡SIN IMÁGENES!
            }
        });
    }

    async initialize() {
        await super.initialize();

        // Configurar bloqueo de recursos adicionales
        const context = await this.browser.newContext(this.config.contextOptions);
        
        await context.route('**/*', route => {
            const resourceType = route.request().resourceType();
            
            // Bloquear imágenes, fuentes, CSS innecesario
            if (['image', 'font', 'stylesheet', 'media'].includes(resourceType)) {
                route.abort();
            } else {
                route.continue();
            }
        });

        await context.close();
    }
}

module.exports = NanoScraper;
```

### Archivo 3: `scraper-heavy.js` (Modo Completo)

```javascript
// scraper-heavy.js
const PlaywrightScraper = require('./scraper-base');

class HeavyScraper extends PlaywrightScraper {
    constructor() {
        super({
            name: 'HEAVY',
            level: 3,
            timeout: 30000,
            launchArgs: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--single-process'
            ],
            contextOptions: {
                javaScriptEnabled: true,
                imagesEnabled: true,  // ✓ CON IMÁGENES
            }
        });
    }

    // Emulación humana para evitar detección
    async scrapeGoogleMaps(negocio, ciudad, depth = 1) {
        const result = await super.scrapeGoogleMaps(negocio, ciudad, depth);

        // En modo heavy, agregar delays aleatorios
        if (depth > 1) {
            const randomDelay = Math.random() * 1000 + 500; // 500-1500ms
            await new Promise(resolve => setTimeout(resolve, randomDelay));
        }

        return result;
    }
}

module.exports = HeavyScraper;
```

### Archivo 4: `server.js` (API HTTP)

```javascript
// server.js
const express = require('express');
const bodyParser = require('body-parser');
const NanoScraper = require('./scraper-nano');
const HeavyScraper = require('./scraper-heavy');

const app = express();
app.use(bodyParser.json());

// Inicializar scrapers
let nanoScraper = null;
let heavyScraper = null;

// Health check
app.get('/health', (req, res) => {
    const stats = {
        nano: nanoScraper ? nanoScraper.getStats() : null,
        heavy: heavyScraper ? heavyScraper.getStats() : null
    };

    res.json({
        status: 'healthy',
        scrapers: {
            nano: nanoScraper ? 'running' : 'stopped',
            heavy: heavyScraper ? 'running' : 'stopped'
        },
        memory: stats,
        timestamp: new Date().toISOString()
    });
});

// Endpoint para scraper NANO
app.post('/scrape/nano', async (req, res) => {
    try {
        const { negocio, ciudad, depth = 1 } = req.body;

        if (!negocio || !ciudad) {
            return res.status(400).json({ error: 'negocio y ciudad requeridos' });
        }

        if (!nanoScraper) {
            nanoScraper = new NanoScraper();
            await nanoScraper.initialize();
        }

        const result = await nanoScraper.scrapeGoogleMaps(negocio, ciudad, depth);
        res.json(result);

    } catch (error) {
        console.error('Error en scraper NANO:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint para scraper HEAVY
app.post('/scrape/heavy', async (req, res) => {
    try {
        const { negocio, ciudad, depth = 5 } = req.body;

        if (!negocio || !ciudad) {
            return res.status(400).json({ error: 'negocio y ciudad requeridos' });
        }

        if (!heavyScraper) {
            heavyScraper = new HeavyScraper();
            await heavyScraper.initialize();
        }

        const result = await heavyScraper.scrapeGoogleMaps(negocio, ciudad, depth);
        res.json(result);

    } catch (error) {
        console.error('Error en scraper HEAVY:', error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint de stats
app.get('/stats', (req, res) => {
    res.json({
        nano: nanoScraper ? nanoScraper.getStats() : null,
        heavy: heavyScraper ? heavyScraper.getStats() : null
    });
});

// Shutdown graceful
process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando scrapers...');
    if (nanoScraper) await nanoScraper.close();
    if (heavyScraper) await heavyScraper.close();
    process.exit(0);
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`✓ Servidor Playwright escuchando en puerto ${PORT}`);
    console.log(`  - NANO:  POST /scrape/nano`);
    console.log(`  - HEAVY: POST /scrape/heavy`);
    console.log(`  - Health: GET /health`);
});
```

### Archivo 5: `package.json`

```json
{
  "name": "scrapers-playwright",
  "version": "2.0.0",
  "description": "Scrapers Playwright Nano y Heavy para Google Maps",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "test": "node test.js"
  },
  "dependencies": {
    "playwright": "^1.40.0",
    "express": "^4.18.2",
    "body-parser": "^1.20.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}
```

---

## 🐳 CONFIGURACIÓN DOCKER

### Archivo 6: `Dockerfile.nano`

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

# Copiar package.json
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código
COPY scraper-base.js ./
COPY scraper-nano.js ./
COPY server-nano.js ./

# Variables de entorno
ENV PORT=8080
ENV SCRAPER_TYPE=nano

# Exponer puerto
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8080/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

# Comando de inicio
CMD ["node", "server.js"]
```

### Archivo 7: `Dockerfile.heavy`

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-focal

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY scraper-base.js ./
COPY scraper-heavy.js ./
COPY server.js ./

ENV PORT=8081
ENV SCRAPER_TYPE=heavy

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:8081/health', (r) => { process.exit(r.statusCode === 200 ? 0 : 1); })"

CMD ["node", "server.js"]
```

### Archivo 8: `docker-compose.playwright.yml`

```yaml
version: '3.8'

services:
  # Backend Go (Nivel 1) - Ya existente
  nivel1-backend:
    build:
      context: ./nivel1
      dockerfile: Dockerfile
    container_name: reputacion-nivel1
    environment:
      DB_HOST: postgres
      DB_PORT: 5432
      DB_USER: reputacion_user
      DB_PASSWORD: ${DB_PASSWORD:-changeme}
      DB_NAME: reputacion
      PORT: 8082
      SCRAPER_NANO_URL: http://scraper-nano:8080
      SCRAPER_HEAVY_URL: http://scraper-heavy:8081
    ports:
      - "8082:8082"
    depends_on:
      - postgres
      - scraper-nano
      - scraper-heavy
    networks:
      - reputacion-network

  # PostgreSQL - Ya existente
  postgres:
    image: postgres:15-alpine
    container_name: reputacion-postgres
    environment:
      POSTGRES_DB: reputacion
      POSTGRES_USER: reputacion_user
      POSTGRES_PASSWORD: ${DB_PASSWORD:-changeme}
    volumes:
      - postgres-data:/var/lib/postgresql/data
      - ./nivel1/migrations:/docker-entrypoint-initdb.d:ro
    ports:
      - "5432:5432"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 512M
    networks:
      - reputacion-network

  # Scraper NANO (Playwright sin imágenes)
  scraper-nano:
    build:
      context: ./scrapers-playwright
      dockerfile: Dockerfile.nano
    container_name: reputacion-scraper-nano
    environment:
      PORT: 8080
      SCRAPER_TYPE: nano
      NODE_ENV: production
    ports:
      - "8080:8080"
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 768M  # 768MB suficiente para Nano
        reservations:
          cpus: '0.5'
          memory: 256M
    restart: unless-stopped
    networks:
      - reputacion-network
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

  # Scraper HEAVY (Playwright completo)
  scraper-heavy:
    build:
      context: ./scrapers-playwright
      dockerfile: Dockerfile.heavy
    container_name: reputacion-scraper-heavy
    environment:
      PORT: 8081
      SCRAPER_TYPE: heavy
      NODE_ENV: production
    ports:
      - "8081:8081"
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1.5G  # 1.5GB para Heavy
        reservations:
          cpus: '1.0'
          memory: 512M
    restart: unless-stopped
    networks:
      - reputacion-network
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"

volumes:
  postgres-data:

networks:
  reputacion-network:
    driver: bridge
```

---

## 🔗 INTEGRACIÓN CON NIVEL 1

### Archivo 9: `integration.go` (Actualización del Backend)

```go
// integration.go - Agregar a tu backend Go existente
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "io"
    "net/http"
    "time"
)

// PlaywrightClient cliente para scrapers Playwright
type PlaywrightClient struct {
    nanoURL  string
    heavyURL string
    client   *http.Client
}

// NewPlaywrightClient crea nuevo cliente
func NewPlaywrightClient(nanoURL, heavyURL string) *PlaywrightClient {
    return &PlaywrightClient{
        nanoURL:  nanoURL,
        heavyURL: heavyURL,
        client: &http.Client{
            Timeout: 60 * time.Second,
        },
    }
}

// ScraperRequest request para Playwright
type ScraperRequest struct {
    Negocio string `json:"negocio"`
    Ciudad  string `json:"ciudad"`
    Depth   int    `json:"depth"`
}

// ScraperResponse respuesta de Playwright
type ScraperResponse struct {
    Query     string                 `json:"query"`
    Found     bool                   `json:"found"`
    Level     int                    `json:"level"`
    Data      map[string]interface{} `json:"data"`
    LatencyMs int64                  `json:"latency_ms"`
    MemoryMB  string                 `json:"memory_mb"`
    Timestamp string                 `json:"timestamp"`
}

// ScrapeNano ejecuta scraping en modo NANO
func (p *PlaywrightClient) ScrapeNano(negocio, ciudad string) (*ScraperResponse, error) {
    return p.scrape(p.nanoURL+"/scrape/nano", negocio, ciudad, 1)
}

// ScrapeHeavy ejecuta scraping en modo HEAVY
func (p *PlaywrightClient) ScrapeHeavy(negocio, ciudad string, depth int) (*ScraperResponse, error) {
    if depth < 1 {
        depth = 5
    }
    return p.scrape(p.heavyURL+"/scrape/heavy", negocio, ciudad, depth)
}

// scrape método privado para ejecutar scraping
func (p *PlaywrightClient) scrape(url, negocio, ciudad string, depth int) (*ScraperResponse, error) {
    reqBody := ScraperRequest{
        Negocio: negocio,
        Ciudad:  ciudad,
        Depth:   depth,
    }

    jsonData, err := json.Marshal(reqBody)
    if err != nil {
        return nil, fmt.Errorf("error marshaling request: %w", err)
    }

    resp, err := p.client.Post(url, "application/json", bytes.NewBuffer(jsonData))
    if err != nil {
        return nil, fmt.Errorf("error calling Playwright: %w", err)
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        body, _ := io.ReadAll(resp.Body)
        return nil, fmt.Errorf("Playwright error %d: %s", resp.StatusCode, string(body))
    }

    var result ScraperResponse
    if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
        return nil, fmt.Errorf("error decoding response: %w", err)
    }

    return &result, nil
}

// HealthCheck verifica estado de los scrapers
func (p *PlaywrightClient) HealthCheck() (map[string]interface{}, error) {
    nanoHealth, nanoErr := p.checkHealth(p.nanoURL + "/health")
    heavyHealth, heavyErr := p.checkHealth(p.heavyURL + "/health")

    return map[string]interface{}{
        "nano": map[string]interface{}{
            "status": nanoHealth,
            "error":  nanoErr,
        },
        "heavy": map[string]interface{}{
            "status": heavyHealth,
            "error":  heavyErr,
        },
    }, nil
}

func (p *PlaywrightClient) checkHealth(url string) (string, error) {
    resp, err := p.client.Get(url)
    if err != nil {
        return "down", err
    }
    defer resp.Body.Close()

    if resp.StatusCode == http.StatusOK {
        return "up", nil
    }

    return "unhealthy", fmt.Errorf("status code: %d", resp.StatusCode)
}
```

### Actualizar `main.go` para usar Playwright:

```go
// Actualización en main.go
func (s *Server) handleSearch(w http.ResponseWriter, r *http.Request) {
    startTime := time.Now()

    negocio := r.URL.Query().Get("negocio")
    ciudad := r.URL.Query().Get("ciudad")
    depth := getIntParam(r, "depth", 1)

    ctx, cancel := context.WithTimeout(r.Context(), 30*time.Second)
    defer cancel()

    // NIVEL 0: Caché
    cachedData, err := s.cache.Get(ctx, negocio, ciudad)
    if err == nil && cachedData != nil {
        respondJSON(w, map[string]interface{}{
            "data":       cachedData,
            "level":      0,
            "cache_hit":  true,
            "latency_ms": time.Since(startTime).Milliseconds(),
        })
        return
    }

    // NIVEL 1: HTTP Puro
    level1Result, err := s.nivel1Scraper.Search(ctx, negocio, ciudad)
    if err == nil && level1Result.Found && !level1Result.RequiresJS {
        log.Printf("✓ [Nivel 1] Encontrado: %s", negocio)
        
        // Guardar en caché
        go s.cache.Set(context.Background(), negocio, ciudad, level1Result)
        
        respondJSON(w, map[string]interface{}{
            "data":       level1Result,
            "level":      1,
            "latency_ms": time.Since(startTime).Milliseconds(),
        })
        return
    }

    // DECISIÓN: NIVEL 2 (Nano) vs NIVEL 3 (Heavy)
    var playwrightResult *ScraperResponse
    
    if depth <= 5 {
        // NIVEL 2: Playwright NANO
        log.Printf("🎭 [Nivel 2 - NANO] Usando Playwright sin imágenes")
        playwrightResult, err = s.playwrightClient.ScrapeNano(negocio, ciudad)
    } else {
        // NIVEL 3: Playwright HEAVY
        log.Printf("🎭 [Nivel 3 - HEAVY] Usando Playwright completo")
        playwrightResult, err = s.playwrightClient.ScrapeHeavy(negocio, ciudad, depth)
    }

    if err != nil {
        respondError(w, http.StatusInternalServerError, fmt.Sprintf("Error en Playwright: %v", err))
        return
    }

    // Guardar en caché si encontró resultado
    if playwrightResult.Found {
        go s.cache.Set(context.Background(), negocio, ciudad, playwrightResult)
    }

    respondJSON(w, map[string]interface{}{
        "data":       playwrightResult,
        "level":      playwrightResult.Level,
        "latency_ms": time.Since(startTime).Milliseconds(),
    })
}
```

---

## 📝 MIGRACIÓN PASO A PASO

### Semana 1: Preparación y Testing

**Día 1-2: Setup Inicial**
```bash
# 1. Crear directorio para scrapers Playwright
mkdir scrapers-playwright
cd scrapers-playwright

# 2. Copiar todos los archivos .js listados arriba

# 3. Instalar dependencias
npm install

# 4. Probar localmente (sin Docker)
node server.js

# En otra terminal:
curl -X POST http://localhost:8080/health
```

**Día 3-4: Tests de Comparación**
```bash
# Test Playwright Nano vs Chromium
./test-comparison.sh

# Archivo: test-comparison.sh
#!/bin/bash
echo "=== Test Playwright NANO ==="
curl -X POST http://localhost:8080/scrape/nano \
  -H "Content-Type: application/json" \
  -d '{"negocio":"Restaurante El Patio","ciudad":"Málaga"}'

echo ""
echo "=== Esperando 2 segundos ==="
sleep 2

echo "=== Test Playwright HEAVY ==="
curl -X POST http://localhost:8081/scrape/heavy \
  -H "Content-Type: application/json" \
  -d '{"negocio":"Restaurante El Patio","ciudad":"Málaga","depth":5}'
```

**Día 5-7: Construcción de Imágenes Docker**
```bash
# Build imágenes
cd scrapers-playwright
docker build -f Dockerfile.nano -t reputacion-scraper-nano:latest .
docker build -f Dockerfile.heavy -t reputacion-scraper-heavy:latest .

# Test en Docker
docker run -p 8080:8080 reputacion-scraper-nano:latest
docker run -p 8081:8081 reputacion-scraper-heavy:latest

# Verificar
curl http://localhost:8080/health
curl http://localhost:8081/health
```

### Semana 2: Integración con Nivel 1

**Día 8-10: Actualizar Backend Go**
```bash
# 1. Agregar integration.go al proyecto Go
cp integration.go /tu/proyecto/backend/

# 2. Actualizar main.go con la lógica de decisión

# 3. Recompilar
go build -o reputacion-monitor main.go

# 4. Probar localmente
./reputacion-monitor
```

**Día 11-12: Actualizar Variables de Entorno**
```bash
# Actualizar .env
SCRAPER_NANO_URL=http://localhost:8080
SCRAPER_HEAVY_URL=http://localhost:8081
```

**Día 13-14: Tests de Integración**
```bash
# Test cascada completa
# Query 1: Debe ir a Nivel 1 (HTTP)
curl "http://localhost:8082/api/search?negocio=Test&ciudad=Madrid"

# Query 2: Debe ir a Nivel 2 (Playwright Nano)
curl "http://localhost:8082/api/search?negocio=Restaurante&ciudad=Madrid&depth=3"

# Query 3: Debe ir a Nivel 3 (Playwright Heavy)
curl "http://localhost:8082/api/search?negocio=Hotel&ciudad=Barcelona&depth=10"
```

### Semana 3: Despliegue Gradual

**Día 15-17: Despliegue en Paralelo**
```bash
# Mantener sistema anterior corriendo
# Levantar nuevo sistema en puertos diferentes

docker-compose -f docker-compose.playwright.yml up -d

# Verificar que todo está up
docker-compose ps
```

**Día 18-19: Pruebas de Carga**
```bash
# Instalar herramienta de load testing
npm install -g autocannon

# Test de carga Nano
autocannon -c 10 -d 60 \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"negocio":"Test","ciudad":"Madrid"}' \
  http://localhost:8080/scrape/nano

# Test de carga Heavy
autocannon -c 5 -d 60 \
  -m POST \
  -H "Content-Type: application/json" \
  -b '{"negocio":"Test","ciudad":"Madrid","depth":5}' \
  http://localhost:8081/scrape/heavy
```

**Día 20-21: Monitoreo y Ajustes**
```bash
# Monitorear métricas
docker stats

# Ver logs en tiempo real
docker logs -f reputacion-scraper-nano
docker logs -f reputacion-scraper-heavy

# Ajustar límites de RAM si es necesario
```

---

## 🧪 TESTING Y VALIDACIÓN

### Script de Test Completo

```javascript
// test-playwright.js
const NanoScraper = require('./scraper-nano');
const HeavyScraper = require('./scraper-heavy');

async function runTests() {
    console.log('='.repeat(60));
    console.log('TEST PLAYWRIGHT - NANO vs HEAVY');
    console.log('='.repeat(60));

    const testQueries = [
        { negocio: 'Restaurante El Patio', ciudad: 'Málaga' },
        { negocio: 'Hotel Costa del Sol', ciudad: 'Marbella' },
        { negocio: 'Bar Central', ciudad: 'Sevilla' },
        { negocio: 'Peluquería Mary', ciudad: 'Madrid' },
        { negocio: 'Gimnasio Fitness', ciudad: 'Barcelona' }
    ];

    const nanoScraper = new NanoScraper();
    const heavyScraper = new HeavyScraper();

    await nanoScraper.initialize();
    await heavyScraper.initialize();

    console.log('\n📊 Resultados:
');
    console.log('| Negocio | NANO (ms) | NANO (MB) | HEAVY (ms) | HEAVY (MB) | Ahorro RAM |');
    console.log('|---------|-----------|-----------|------------|------------|------------|');

    for (const query of testQueries) {
        // Test NANO
        const nanoResult = await nanoScraper.scrapeGoogleMaps(
            query.negocio,
            query.ciudad,
            1
        );

        // Test HEAVY
        const heavyResult = await heavyScraper.scrapeGoogleMaps(
            query.negocio,
            query.ciudad,
            5
        );

        const ramSaving = (
            ((parseFloat(heavyResult.memory_mb) - parseFloat(nanoResult.memory_mb)) / 
             parseFloat(heavyResult.memory_mb)) * 100
        ).toFixed(1);

        console.log(
            `| ${query.negocio.substring(0, 15).padEnd(15)} | ` +
            `${nanoResult.latency_ms.toString().padStart(9)} | ` +
            `${nanoResult.memory_mb.toString().padStart(9)} | ` +
            `${heavyResult.latency_ms.toString().padStart(10)} | ` +
            `${heavyResult.memory_mb.toString().padStart(10)} | ` +
            `${ramSaving.toString().padStart(9)}% |`
        );

        // Delay entre queries
        await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await nanoScraper.close();
    await heavyScraper.close();

    console.log('\n✓ Tests completados');
}

runTests().catch(console.error);
```

**Ejecutar:**
```bash
node test-playwright.js
```

**Salida esperada:**
```
============================================================
TEST PLAYWRIGHT - NANO vs HEAVY
============================================================

📊 Resultados:

| Negocio         | NANO (ms) | NANO (MB) | HEAVY (ms) | HEAVY (MB) | Ahorro RAM |
|-----------------|-----------|-----------|------------|------------|------------|
| Restaurante El  |       456 |    120.34 |        892 |     185.67 |      35.2% |
| Hotel Costa del |       512 |    118.92 |        934 |     182.45 |      34.8% |
| Bar Central     |       389 |    122.11 |        856 |     179.23 |      31.8% |
| Peluquería Mary |       423 |    119.67 |        901 |     188.90 |      36.7% |
| Gimnasio Fitnes |       478 |    121.45 |        912 |     181.34 |      33.0% |

✓ Tests completados
```

---

## 📈 MONITOREO Y MÉTRICAS

### Dashboard de Métricas (Prometheus + Grafana)

**Archivo: `monitoring/prometheus.yml`**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'backend-go'
    static_configs:
      - targets: ['nivel1-backend:8082']

  - job_name: 'scraper-nano'
    static_configs:
      - targets: ['scraper-nano:8080']
    metrics_path: '/metrics'

  - job_name: 'scraper-heavy'
    static_configs:
      - targets: ['scraper-heavy:8081']
    metrics_path: '/metrics'
```

### Métricas Clave a Monitorizar

```
1. Distribución de Tráfico:
   - nivel_0_hits (caché)
   - nivel_1_hits (HTTP)
   - nivel_2_hits (Playwright Nano)
   - nivel_3_hits (Playwright Heavy)

2. Latencias:
   - nivel_1_latency_avg
   - nivel_2_latency_avg
   - nivel_3_latency_avg

3. Recursos:
   - scraper_nano_memory_mb
   - scraper_heavy_memory_mb
   - scraper_nano_cpu_percent
   - scraper_heavy_cpu_percent

4. Errores:
   - scraper_nano_errors_total
   - scraper_heavy_errors_total
```

### Script de Monitoreo Simple

```bash
#!/bin/bash
# monitor.sh - Monitoreo en tiempo real

watch -n 5 '
echo "=== ESTADO DE SCRAPERS ==="
curl -s http://localhost:8080/health | jq .
echo ""
curl -s http://localhost:8081/health | jq .
echo ""
echo "=== MEMORIA DOCKER ==="
docker stats --no-stream --format "table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}"
'
```

---

## 🔧 TROUBLESHOOTING

### Problema 1: "Playwright browser not found"

**Síntoma:**
```
Error: browserType.launch: Executable doesn't exist
```

**Solución:**
```bash
# Reinstalar navegadores Playwright
cd scrapers-playwright
npx playwright install chromium

# Verificar instalación
npx playwright install --dry-run
```

### Problema 2: "Out of memory en scraper-nano"

**Síntoma:**
```
Container killed - Out of memory
```

**Solución:**
```yaml
# En docker-compose.yml, aumentar límite
scraper-nano:
  deploy:
    resources:
      limits:
        memory: 1G  # Era 768M
```

### Problema 3: "Connection refused al scraper"

**Síntoma:**
```
Error calling Playwright: dial tcp: connection refused
```

**Solución:**
```bash
# Verificar que el contenedor está corriendo
docker ps | grep scraper

# Verificar logs
docker logs reputacion-scraper-nano

# Reiniciar contenedor
docker restart reputacion-scraper-nano
```

### Problema 4: "Playwright detectado como bot"

**Síntoma:**
```
Error: Page blocked - reCAPTCHA
```

**Solución:**
```javascript
// En scraper-base.js, mejorar stealth
const context = await this.browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...',
    viewport: { width: 1280, height: 720 },
    locale: 'es-ES',
    timezoneId: 'Europe/Madrid',
    
    // AGREGAR:
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
    
    // Simular plugins
    extraHTTPHeaders: {
        'Accept-Language': 'es-ES,es;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1'
    }
});

// Inyectar scripts anti-detección
await page.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => false });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3] });
});
```

---

## ✅ CHECKLIST DE MIGRACIÓN

Marca cada paso conforme lo completes:

**Semana 1:**
- [ ] Node.js instalado (v20+)
- [ ] Playwright instalado (`npm install playwright`)
- [ ] Navegadores descargados (`npx playwright install`)
- [ ] Archivos .js copiados y configurados
- [ ] Tests locales pasados (sin Docker)
- [ ] Comparación Nano vs Heavy ejecutada
- [ ] Dockerfiles creados
- [ ] Imágenes Docker construidas

**Semana 2:**
- [ ] Backend Go actualizado con `integration.go`
- [ ] Lógica de cascada implementada en `main.go`
- [ ] Variables de entorno actualizadas
- [ ] Tests de integración pasados
- [ ] Health checks funcionando
- [ ] Logs estructurados implementados

**Semana 3:**
- [ ] Docker Compose configurado
- [ ] Sistema desplegado en paralelo
- [ ] Pruebas de carga ejecutadas
- [ ] Monitoreo configurado (opcional: Prometheus)
- [ ] Métricas validadas (80% ahorro RAM)
- [ ] Sistema en producción estable
- [ ] Documentación actualizada

---

## 🎯 OBJETIVOS DE ÉXITO

Después de completar la migración, debes lograr:

### Métricas Objetivo (1 semana en producción):

```
Distribución de Tráfico:
├─ Nivel 0 (Caché):    75-80%
├─ Nivel 1 (HTTP):     15-18%
├─ Nivel 2 (Nano):     5-7%
└─ Nivel 3 (Heavy):    2-3%

Latencias Promedio:
├─ Nivel 0: <5ms
├─ Nivel 1: 10-50ms
├─ Nivel 2: 500ms-1s
└─ Nivel 3: 2-3s

Consumo RAM Total (100 queries):
├─ Antes (Solo Chromium): 30GB
├─ Después (Playwright):  1.5GB
└─ Ahorro: 95%

Costes Servidor:
├─ Antes: 20€/mes (4GB RAM)
├─ Después: 10€/mes (2GB RAM)
└─ Ahorro: 50%
```

---

## 📞 SOPORTE

**Documentación adicional:**
- [Playwright Docs](https://playwright.dev/)
- [Docker Docs](https://docs.docker.com/)
- README.md del Nivel 1

**Contacto:**
- Email: rafael@ia-bybusiness.com
- Proyecto: https://ia-bybusiness.com

---

## 🎉 CONCLUSIÓN

Esta guía te proporciona TODO lo necesario para migrar a Playwright con arquitectura dual.

**Resumen de archivos a crear:**

```
scrapers-playwright/
├── scraper-base.js        (código compartido)
├── scraper-nano.js        (modo ligero)
├── scraper-heavy.js       (modo completo)
├── server.js              (API HTTP)
├── package.json           (dependencias)
├── Dockerfile.nano        (imagen Docker Nano)
├── Dockerfile.heavy       (imagen Docker Heavy)
└── test-playwright.js     (tests)

backend/
├── integration.go         (cliente Playwright)
└── main.go               (actualizar con cascada)

docker/
└── docker-compose.playwright.yml
```

**Próximos pasos:**
1. Crear todos los archivos listados
2. Seguir migración paso a paso (3 semanas)
3. Validar métricas de éxito
4. ¡Disfrutar del 95% de ahorro de RAM! 🚀

---

**¡Éxito con la implementación!**

*IA-ByBusiness © 2026*
