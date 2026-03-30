const PlaywrightScraper = require('./scraper-base');
const log = require('./logger');

/**
 * NanoScraper — Scraper de nivel 2 optimizado para Google Maps.
 * Bloquea imágenes, fuentes y estilos para reducir latencia y consumo de recursos.
 * Extiende PlaywrightScraper con interception de red activa.
 */
class NanoScraper extends PlaywrightScraper {
    /**
     * Inicializa NanoScraper con configuración optimizada para bajo consumo:
     * bloqueo de GPU, sin sandbox, nivel 2, timeout 15s, geolocalización Madrid por defecto.
     */
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
                // '--single-process', // Causas inestabilidad en Docker
                '--disable-background-networking',
                '--disable-sync',
                '--disable-translate',
                '--disable-extensions',
                '--disable-default-apps'
            ],
            contextOptions: {
                javaScriptEnabled: true,
                hasTouch: false,
                isMobile: false,
                // Bloquear imágenes desde configuración de contexto
                permissions: ['geolocation'],
                geolocation: { latitude: 40.416775, longitude: -3.703790 } // Madrid por defecto
            }
        });
    }

    /** Inicializa el navegador Playwright con bloqueo de recursos activo. */
    async initialize() {
        await super.initialize();
        log.info('[NANO] Scraper inicializado con bloqueo de recursos activo.');
    }

    /**
     * Busca un negocio en Google Maps por nombre y ciudad.
     * @param {string} negocio - Nombre del negocio
     * @param {string} ciudad - Ciudad donde buscar
     * @param {number} depth - Nivel de profundidad (default 1)
     */
    async scrapeGoogleMaps(negocio, ciudad, depth = 1) {
        if (!this.browser) {
            await this.initialize();
        }

        // En Nano, interception de red para bloquear imágenes
        const context = await this.browser.newContext(this.config.contextOptions);

        // Bloquear recursos innecesarios
        await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot}', route => route.abort());
        await context.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(type)) {
                return route.abort(); // Bloqueo agresivo
            }
            return route.continue();
        });

        // Llamar a la lógica base pero pasando el contexto modificado (truco: sobrescribir el método base o inyectar contexto no es directo en JS clases simples sin refactorizar base.
        // Para simplificar: Copiamos la lógica de navegación pero usando este contexto optimizado.

        const page = await context.newPage();
        try {
            const query = `${negocio} ${ciudad}`;
            log.info(`[NANO] Navegando: ${query}`);

            // Añadir cookie de consentimiento
            await context.addCookies([
                { name: 'CONSENT', value: 'YES+CB.20230220-10-p0.es+FX+266', domain: '.google.com', path: '/' },
                { name: 'SOCS', value: 'CAESAg==', domain: '.google.com', path: '/' }
            ]);

            const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es&gl=ES`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });

            // Esperar selector ligera
            await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});

            const data = await this.extractBasicData(page);
            log.info(`[NANO] Resultado: Found=${data.found}`);

            return {
                query,
                level: 2,
                data,
                timestamp: new Date().toISOString()
            };

        } catch (e) {
            log.error(`[NANO] Error: ${e.message}`);
            throw e;
        } finally {
            await context.close();
        }
    }

    /**
     * Navega directamente a una URL de Google Maps (CID o place) y extrae los datos del negocio.
     * Devuelve el formato esperado por el motor Go para executeMapsJobByCID.
     * @param {string} url - URL de Google Maps o CID URL (https://www.google.com/maps/?cid=...)
     * @returns {Promise<{found: boolean, url: string, data: object, latency_ms: number}>}
     */
    async scrapeByURL(url) {
        if (!this.browser) await this.initialize();

        const context = await this.browser.newContext(this.config.contextOptions);
        await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot}', route => route.abort());
        await context.route('**/*', route => {
            const type = route.request().resourceType();
            if (['image', 'media', 'font', 'stylesheet'].includes(type)) return route.abort();
            return route.continue();
        });

        const page = await context.newPage();
        try {
            log.info(`[NANO] scrapeByURL: ${url}`);
            await context.addCookies([
                { name: 'CONSENT', value: 'YES+CB.20230220-10-p0.es+FX+266', domain: '.google.com', path: '/' },
                { name: 'SOCS', value: 'CAESAg==', domain: '.google.com', path: '/' }
            ]);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
            await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});

            const data = await this.extractBasicData(page);
            log.info(`[NANO] scrapeByURL result: found=${data.found}`);

            if (!data.found) {
                return { found: false, url, data: {}, latency_ms: 0 };
            }

            return {
                found:      true,
                url,
                data: {
                    name:    data.name    || '',
                    rating:  data.rating  || null,
                    reviews: data.review_count || null,
                    address: data.address || '',
                    phone:   null,
                    website: null,
                    cid:     data.place_id || null,
                },
                latency_ms: 0,
            };
        } catch (e) {
            log.error(`[NANO] scrapeByURL error: ${e.message}`);
            throw e;
        } finally {
            await context.close();
        }
    }
}

module.exports = NanoScraper;
