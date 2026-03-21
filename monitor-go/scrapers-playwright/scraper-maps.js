const { chromium } = require('playwright');
const log = require('./logger');

const SESSION_DIR = process.env.GOOGLE_SESSION_DIR || '/google-session';

/**
 * MapsScraper — Sesión persistente de Google
 * Usa launchPersistentContext con una sesión de Google guardada en disco.
 * Setup inicial: ejecutar setup-session.js una vez en la máquina local.
 */
class MapsScraper {
    constructor() {
        this.context = null;
        this.timeout = parseInt(process.env.MAPS_TIMEOUT || '45000');
    }

    async initialize() {
        log.info(`[MAPS] Iniciando contexto persistente (sesión: ${SESSION_DIR})`);
        this.context = await chromium.launchPersistentContext(SESSION_DIR, {
            headless: true,
            args: [
                '--disable-gpu',
                '--disable-dev-shm-usage',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-background-networking',
                '--disable-extensions',
                '--disable-default-apps',
                '--disable-blink-features=AutomationControlled',
            ],
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            locale: 'es-ES',
            viewport: { width: 1280, height: 800 },
        });

        // Bloquear imágenes y fuentes globalmente para el contexto
        await this.context.route('**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,eot}', r => r.abort());

        log.info('[MAPS] Contexto persistente listo');
    }

    /**
     * Busca un negocio por texto en Google Maps.
     * @param {string} query
     */
    async scrape(query) {
        if (!this.context) await this.initialize();

        const start = Date.now();
        log.info(`[MAPS] Buscando: "${query}"`);
        const page = await this.context.newPage();
        page.setDefaultTimeout(this.timeout);

        try {
            const encodedQuery = encodeURIComponent(query);
            await page.goto(
                `https://www.google.com/maps/search/${encodedQuery}?hl=es&gl=ES`,
                { waitUntil: 'domcontentloaded', timeout: this.timeout }
            );

            await Promise.race([
                page.waitForSelector('h1.DUwDvf, h1[class*="fontHeadline"]', { timeout: 15000 }),
                page.waitForSelector('div[role="feed"]',                      { timeout: 15000 }),
                page.waitForSelector('a[href*="/maps/place"]',                { timeout: 15000 }),
            ]).catch(() => {});

            const currentUrl = page.url();

            // Si Maps redirigió directamente a la ficha (búsqueda por web reconocida), no necesitamos navegar
            if (currentUrl.includes('/maps/place/')) {
                log.info('[MAPS] Redirigido directamente a ficha');
                await page.waitForSelector('h1', { timeout: 8000 }).catch(() => {});
            } else {
                const isList = await page.evaluate(() => {
                    const h1 = document.querySelector('h1')?.textContent?.trim() || '';
                    return h1 === 'Resultados' || h1 === 'Results' ||
                           !!document.querySelector('div[role="feed"]') ||
                           document.querySelectorAll('a[href*="/maps/place"]').length > 2;
                });

                const needsNavigation = isList || currentUrl.includes('/maps/search/');
                if (needsNavigation) {
                    log.info(isList ? '[MAPS] Lista detectada — navegando al primer resultado' : '[MAPS] Navegando a ficha directa');
                    // Esperar hasta 6s a que aparezca al menos un link de ficha
                    await page.waitForSelector('a[href*="/maps/place"]', { timeout: 6000 }).catch(() => {});
                    // Re-check: quizás Maps redirigió a ficha directa durante la espera
                    const urlAfterWait = page.url();
                    if (urlAfterWait.includes('/maps/place/')) {
                        log.info('[MAPS] Redirigido a ficha durante espera');
                        await page.waitForSelector('h1', { timeout: 5000 }).catch(() => {});
                        const data = await this._extractData(page);
                        if (!data.name) return this._empty(query, start);
                        log.info(`[MAPS] OK: ${data.name} | ${data.rating}★ ${data.reviews}r — ${Date.now() - start}ms`);
                        return { found: !!data.name, query, data, latency_ms: Date.now() - start };
                    }
                    const firstHref = await page.evaluate(() => {
                        const links = Array.from(document.querySelectorAll('a[href*="/maps/place"]'));
                        return links[0]?.href || null;
                    });
                    if (!firstHref) {
                        log.warn(`[MAPS] Sin resultados para: "${query}"`);
                        return this._empty(query, start);
                    }
                    await page.goto(firstHref + '&hl=es', { waitUntil: 'domcontentloaded', timeout: this.timeout });
                    await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
                }
            }

            const data = await this._extractData(page);

            if (data.name && data.name.trim().toLowerCase() === query.trim().toLowerCase()) {
                log.warn('[MAPS] Resultado fantasma detectado — sin ficha real');
                return this._empty(query, start);
            }

            log.info(`[MAPS] OK: ${data.name} | ${data.rating}★ ${data.reviews}r — ${Date.now() - start}ms`);
            return { found: !!data.name, query, data, latency_ms: Date.now() - start };

        } catch (err) {
            log.error(`[MAPS] Error: ${err.message}`);
            return this._empty(query, start);
        } finally {
            await page.close().catch(() => {});
        }
    }

    /**
     * Navega directamente a una URL de Google Maps y extrae datos de la ficha.
     * @param {string} url - URL de Google Maps (CID, /maps/place/, etc.)
     */
    async scrapeByURL(url) {
        if (!this.context) await this.initialize();

        const start = Date.now();
        const page = await this.context.newPage();
        page.setDefaultTimeout(this.timeout);

        try {
            const targetURL = url.includes('hl=') ? url : url + (url.includes('?') ? '&' : '?') + 'hl=es';
            await page.goto(targetURL, { waitUntil: 'domcontentloaded', timeout: this.timeout });
            await page.waitForSelector('h1', { timeout: 15000 }).catch(() => {});

            // Si la URL redirigió a una página de resultados, navegar al primer resultado
            const h1Text = await page.evaluate(() => document.querySelector('h1')?.textContent?.trim() || '');
            if (h1Text === 'Resultados' || h1Text === 'Results') {
                log.info('[MAPS URL] Redirigido a lista — navegando al primer resultado');
                const firstHref = await page.evaluate(() => {
                    const links = Array.from(document.querySelectorAll('a[href*="/maps/place"]'));
                    return links[0]?.href || null;
                });
                if (!firstHref) return this._empty(url, start);
                await page.goto(firstHref + '&hl=es', { waitUntil: 'domcontentloaded', timeout: this.timeout });
                await page.waitForSelector('h1', { timeout: 10000 }).catch(() => {});
            }

            const data = await this._extractData(page);

            if (!data.name) {
                log.warn(`[MAPS URL] Ficha no encontrada para: ${url}`);
                return this._empty(url, start);
            }

            log.info(`[MAPS URL] OK: ${data.name} | ${data.rating}★ ${data.reviews}r — ${Date.now() - start}ms`);
            return { found: true, url, data, latency_ms: Date.now() - start };

        } catch (err) {
            log.error(`[MAPS URL] Error navegando a ${url}: ${err.message}`);
            return this._empty(url, start);
        } finally {
            await page.close().catch(() => {});
        }
    }

    /**
     * Extrae nombre, rating, reseñas, dirección, teléfono, web y CID de la página actual.
     * @param {import('playwright').Page} page
     * @returns {Promise<{ name: string|null, rating: number|null, reviews: number|null, address: string|null, phone: string|null, website: string|null, cid: string|null, url: string, breakdown: object }>}
     */
    async _extractData(page) {
        // Esperar a que cargue el bloque de rating/reseñas
        await page.waitForFunction(() => {
            return !!document.querySelector('[aria-label*="estrellas"], [aria-label*="stars"], [aria-label*="star"]');
        }, { timeout: 8000 }).catch(() => {});

        // Con sesión activa, esperar también a que aparezcan reseñas si están disponibles
        await page.waitForFunction(() => {
            const el = document.querySelector('[aria-label*="estrellas"], [aria-label*="stars"]');
            return el && (/reseñas|reviews/i.test(el.getAttribute('aria-label') || '') ||
                          !!document.querySelector('[aria-label*="reseñas"], [aria-label*="reviews"]'));
        }, { timeout: 5000 }).catch(() => {});

        // Scroll para cargar publicaciones del propietario (lazy-loaded)
        for (let i = 0; i < 6; i++) {
            await page.evaluate(() => {
                const panel = document.querySelector('[role="main"]') || document.body;
                panel.scrollBy(0, 350);
            });
            await page.waitForTimeout(400);
        }

        return await page.evaluate(() => {
            // Nombre
            const name = document.querySelector('h1')?.textContent?.trim() || null;

            // Rating + reseñas
            let rating = null, reviews = null;
            const allEl = document.querySelectorAll('[aria-label]');
            for (const el of allEl) {
                const label = el.getAttribute('aria-label') || '';

                // "4,5 estrellas" / "4,5 estrellas 3.427 reseñas"
                if (!rating && /estrellas|stars/i.test(label)) {
                    const rMatch = label.match(/([0-9]+[,.][0-9]+|[0-9]+)\s*(?:de\s*5\s*)?(?:estrellas|stars)/i);
                    if (rMatch) rating = parseFloat(rMatch[1].replace(',', '.'));
                    const revMatch = label.match(/([0-9][0-9.,\s]*)\s*(?:reseñas|reviews)/i);
                    if (revMatch && !reviews) reviews = parseInt(revMatch[1].replace(/[.,\s]/g, ''));
                }

                // Label dedicado: "3.427 reseñas"
                if (!reviews && /reseñas|reviews/i.test(label) && !/estrellas|stars/i.test(label)) {
                    const revMatch = label.match(/([0-9][0-9.,\s]*)\s*(?:reseñas|reviews)/i);
                    if (revMatch) reviews = parseInt(revMatch[1].replace(/[.,\s]/g, ''));
                }

                if (rating && reviews) break;
            }

            // Fallback 1: texto "3.427 reseñas" en span/button
            if (!reviews) {
                for (const s of document.querySelectorAll('span, button')) {
                    const txt = s.textContent?.trim() || '';
                    const m = txt.match(/^\(?([0-9][0-9.,]*)\)?\s*(reseñas|reviews)$/i);
                    if (m) {
                        const n = parseInt(m[1].replace(/[.,]/g, ''));
                        if (n > 0 && n < 1000000) { reviews = n; break; }
                    }
                }
            }

            // Fallback 2: "(3.427)" — número entre paréntesis > 10
            if (!reviews) {
                for (const s of document.querySelectorAll('span, button')) {
                    const txt = s.textContent?.trim() || '';
                    const m = txt.match(/^\(([0-9][0-9.,]*)\)$/);
                    if (m) {
                        const n = parseInt(m[1].replace(/[.,]/g, ''));
                        if (n > 10 && n < 1000000) { reviews = n; break; }
                    }
                }
            }

            // Dirección
            const address = document.querySelector('button[data-item-id="address"]')?.textContent?.trim() ||
                            document.querySelector('[data-tooltip="Copiar dirección"]')?.closest('button')?.textContent?.trim() || null;

            // Teléfono
            const phone = document.querySelector('button[data-item-id^="phone"]')?.textContent?.trim() || null;

            // Website (campo principal de GBP)
            const website = document.querySelector('a[data-item-id="authority"]')?.href || null;

            // Publicaciones del propietario — links externos en Google Posts (data-link)
            // El propietario puede publicar su tarjeta digital aquí: a[data-link] con jsaction localPost
            const ownerPostUrl = (() => {
                const postLinks = Array.from(document.querySelectorAll('a[data-link]'));
                const externalPost = postLinks.find(el => {
                    const link = el.getAttribute('data-link') || '';
                    return link.startsWith('http') && !link.includes('google.com') && !link.includes('goo.gl');
                });
                return externalPost ? externalPost.getAttribute('data-link') : null;
            })();

            // CID desde URL
            const url = window.location.href;
            let cid = null;
            const placeIdMatch = url.match(/!1s([^!?&]+)/);
            if (placeIdMatch) cid = placeIdMatch[1];
            const cidOldMatch = url.match(/!19s([^!?&]+)/);
            if (cidOldMatch) cid = cidOldMatch[1];
            // CID numérico en URL ?cid=
            const cidNumMatch = url.match(/[?&]cid=(\d+)/);
            if (cidNumMatch && !cid) cid = cidNumMatch[1];

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

            return { name, rating, reviews, address, phone, website, ownerPostUrl, cid, url, breakdown };
        });
    }

    /**
     * Devuelve un resultado vacío (not found) con latencia calculada.
     * @param {string} query - Query o URL que se intentó buscar
     * @param {number} start - Timestamp de inicio (Date.now())
     * @returns {{ found: false, query: string, data: object, latency_ms: number }}
     */
    _empty(query, start) {
        return { found: false, query, data: {}, latency_ms: Date.now() - start };
    }
}

module.exports = MapsScraper;
