const PlaywrightScraper = require('./scraper-base');

class HeavyScraper extends PlaywrightScraper {
    constructor() {
        super({
            name: 'HEAVY',
            level: 3,
            timeout: 60000, // Más tiempo para heavy
            launchArgs: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox'
                // '--single-process'
            ],
            contextOptions: {
                javaScriptEnabled: true,
                // Heavy SÍ permite imágenes para evitar detección extrema, aunque consume más RAM
                // Pero podemos bloquear fuentes para ahorrar algo
            }
        });
    }

    // Sobrescribir para añadir delays humanos
    async scrapeGoogleMaps(negocio, ciudad, depth = 5) {
        console.log(`[HEAVY] Iniciando scraping profundo con emulación humana...`);
        const result = await super.scrapeGoogleMaps(negocio, ciudad, depth);

        // Simulamos lectura humana si se pidieron reseñas profundas
        if (depth > 1 && result.found) {
             const randomDelay = Math.floor(Math.random() * 2000) + 1000;
             console.log(`[HEAVY] Simulando lectura humana (${randomDelay}ms)...`);
             await new Promise(r => setTimeout(r, randomDelay));
        }

        return result;
    }
}

module.exports = HeavyScraper;
