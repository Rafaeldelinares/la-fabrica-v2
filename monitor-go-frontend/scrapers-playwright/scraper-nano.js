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

    async initialize() {
        await super.initialize();
        console.log(`[NANO] Scraper inicializado con bloqueo de recursos activo.`);
    }

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
            console.log(`[NANO] Navegando (optinizado): ${query}`);
            
             // Añadir cookie de consentimiento
             await context.addCookies([
                { name: 'CONSENT', value: 'YES+CB.20230220-10-p0.es+FX+266', domain: '.google.com', path: '/' },
                { name: 'SOCS', value: 'CAESAg==', domain: '.google.com', path: '/' }
            ]);

            const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: this.config.timeout });
            
            // Esperar selector ligera
            await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});

            const data = await this.extractBasicData(page);
            console.log(`[NANO] Resultado: Found=${data.found}`);

            return {
                query,
                level: 2,
                data,
                timestamp: new Date().toISOString()
            };

        } catch (e) {
            console.error(`[NANO] Error: ${e.message}`);
            throw e;
        } finally {
            await context.close();
        }
    }
}

module.exports = NanoScraper;
