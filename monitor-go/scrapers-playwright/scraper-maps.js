const { chromium } = require('playwright');

/**
 * MapsScraper — Modo "usuario real"
 * Abre maps.google.com, escribe en el buscador y extrae el primer resultado.
 * Último recurso: no fuerza localidad en la URL, deja que Google Maps
 * use su propio ranking de relevancia (igual que haría un usuario).
 */
class MapsScraper {
    constructor() {
        this.browser = null;
        this.timeout = parseInt(process.env.MAPS_TIMEOUT || '45000');
    }

    async initialize() {
        console.log('[MAPS] Iniciando navegador...');
        this.browser = await chromium.launch({
            headless: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-networking',
                '--disable-extensions',
                '--disable-default-apps',
            ]
        });
        console.log('[MAPS] ✓ Navegador iniciado');
    }

    async scrape(query) {
        if (!this.browser) await this.initialize();

        const start = Date.now();
        console.log(`[MAPS] Buscando: "${query}"`);

        const context = await this.browser.newContext({
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            locale: 'es-ES',
        });

        // Bloquear imágenes y fuentes para ir más rápido
        await context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot}', r => r.abort());

        // Cookie de consentimiento
        await context.addCookies([
            { name: 'CONSENT', value: 'YES+CB.20230220-10-p0.es+FX+266', domain: '.google.com', path: '/' },
            { name: 'SOCS',    value: 'CAESAg==',                        domain: '.google.com', path: '/' }
        ]);

        const page = await context.newPage();
        page.setDefaultTimeout(this.timeout);

        try {
            // 1. Navegar directamente a la búsqueda en Maps (evita interact con buscador vacío)
            const encodedQuery = encodeURIComponent(query);
            await page.goto(
                `https://www.google.com/maps/search/${encodedQuery}?hl=es&gl=ES`,
                { waitUntil: 'domcontentloaded', timeout: this.timeout }
            );

            // 2. Esperar resultado — puede ser ficha directa o lista
            await Promise.race([
                page.waitForSelector('h1.DUwDvf, h1[class*="fontHeadline"]', { timeout: 15000 }),
                page.waitForSelector('div[role="feed"]',                      { timeout: 15000 }),
                page.waitForSelector('a[href*="/maps/place"]',                { timeout: 15000 }),
            ]).catch(() => {});

            // 4. Detectar si es lista o ficha única
            const isList = await page.evaluate(() => {
                const h1 = document.querySelector('h1')?.textContent?.trim() || '';
                return h1 === 'Resultados' || h1 === 'Results' ||
                       !!document.querySelector('div[role="feed"]') ||
                       document.querySelectorAll('a[href*="/maps/place"]').length > 2;
            });

            if (isList) {
                console.log('[MAPS] Lista detectada — navegando al primer resultado');
                const firstHref = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href*="/maps/place"]'));
                    return links[0]?.href || null;
                });
                if (!firstHref) return this._empty(query, start);
                // Navegar directamente a la ficha (no click — evita panel deslizante)
                await page.goto(firstHref + '&hl=es', { waitUntil: 'domcontentloaded', timeout: this.timeout });
                await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
            }

            // 5. Extraer datos de la ficha
            const data = await this._extractData(page);

            // Resultado fantasma: nombre == query
            if (data.name && data.name.trim().toLowerCase() === query.trim().toLowerCase()) {
                console.log('[MAPS] Resultado fantasma detectado — sin ficha real');
                return this._empty(query, start);
            }

            console.log(`[MAPS] ✓ ${data.name} | ${data.rating}★ ${data.reviews}r — ${Date.now() - start}ms`);
            return { found: !!data.name, query, data, latency_ms: Date.now() - start };

        } catch (err) {
            console.error(`[MAPS] Error: ${err.message}`);
            return this._empty(query, start);
        } finally {
            await context.close().catch(() => {});
        }
    }

    async _extractData(page) {
        // Esperar carga asíncrona de reseñas (cualquier aria-label con estrellas o stars)
        await page.waitForFunction(() => {
            return !!document.querySelector('[aria-label*="estrellas"], [aria-label*="stars"], [aria-label*="star"]');
        }, { timeout: 8000 }).catch(() => {});

        return await page.evaluate(() => {
            // Nombre
            const name = document.querySelector('h1')?.textContent?.trim() || null;

            // Rating + reseñas: buscar todos los aria-labels con números
            let rating = null, reviews = null;
            const allEl = document.querySelectorAll('[aria-label]');
            for (const el of allEl) {
                const label = el.getAttribute('aria-label') || '';
                // "4,5 estrellas" / "4.5 stars" / "4,5 de 5 estrellas"
                if (/estrellas|stars/i.test(label)) {
                    const rMatch = label.match(/([0-9]+[,.][0-9]+|[0-9]+)\s*(?:de\s*5\s*)?(?:estrellas|stars)/i);
                    if (rMatch && !rating) rating = parseFloat(rMatch[1].replace(',', '.'));
                    // "1.234 reseñas" / "1,234 reviews"
                    const revMatch = label.match(/([0-9][0-9.,\s]*)\s*(?:reseñas|reviews)/i);
                    if (revMatch && !reviews) reviews = parseInt(revMatch[1].replace(/[.,\s]/g, ''));
                }
                if (rating && reviews) break;
            }

            // Fallback: número de reseñas desde span visible
            if (!reviews) {
                const spans = document.querySelectorAll('span, button');
                for (const s of spans) {
                    const txt = s.textContent?.trim() || '';
                    const m = txt.match(/^\(?([0-9][0-9.,]*)\)?\s*(?:reseñas|reviews)?$/i);
                    if (m && !isNaN(parseInt(m[1].replace(/[.,]/g, '')))) {
                        const n = parseInt(m[1].replace(/[.,]/g, ''));
                        if (n > 0 && n < 1000000 && !reviews) { reviews = n; break; }
                    }
                }
            }

            // Dirección
            const address = document.querySelector('button[data-item-id="address"]')?.textContent?.trim() ||
                            document.querySelector('[data-tooltip="Copiar dirección"]')?.closest('button')?.textContent?.trim() || null;

            // Teléfono
            const phone = document.querySelector('button[data-item-id^="phone"]')?.textContent?.trim() || null;

            // Website
            const website = document.querySelector('a[data-item-id="authority"]')?.href || null;

            // CID desde URL — formato nuevo: hex !1s0x{hex1}:{hex2} → decimal
            const url = window.location.href;
            let cid = null;
            // Intentar extraer Place ID (/g/...) como CID alternativo
            const placeIdMatch = url.match(/!1s([^!?&]+)/);
            if (placeIdMatch) cid = placeIdMatch[1];
            // Formato antiguo /19s
            const cidOldMatch = url.match(/!19s([^!?&]+)/);
            if (cidOldMatch) cid = cidOldMatch[1];

            // Desglose de estrellas
            const breakdown = { '1': 0, '2': 0, '3': 0, '4': 0, '5': 0 };
            document.querySelectorAll('table[aria-label] tr, [aria-label*="estrellas"] tr, [aria-label*="star"] tr').forEach(row => {
                const cells = row.querySelectorAll('td');
                if (cells.length >= 2) {
                    const stars = cells[0].textContent.trim();
                    const count = parseInt(cells[cells.length - 1].textContent.replace(/[^0-9]/g, '')) || 0;
                    if (['1','2','3','4','5'].includes(stars)) breakdown[stars] = count;
                }
            });

            return { name, rating, reviews, address, phone, website, cid, url, breakdown };
        });
    }

    _empty(query, start) {
        return { found: false, query, data: {}, latency_ms: Date.now() - start };
    }
}

module.exports = MapsScraper;
