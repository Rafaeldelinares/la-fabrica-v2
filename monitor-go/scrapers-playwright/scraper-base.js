const { chromium } = require('playwright');

class PlaywrightScraper {
    constructor(config) {
        this.config = {
            headless: true,
            timeout: config.timeout || 30000,
            userAgent: config.userAgent || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
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

        let context = null;
        try {
            // Crear contexto nuevo
            // Crear contexto nuevo
            context = await this.browser.newContext({
                userAgent: this.config.userAgent,
                // viewport: { width: 1280, height: 720 }, // Simplificando para debug
                // locale: 'es-ES',
                // timezoneId: 'Europe/Madrid',
                ...this.config.contextOptions
            });

            const page = await context.newPage();

            // Configurar timeouts
            page.setDefaultTimeout(this.config.timeout);

            // Navegar a Google Maps
            const url = `https://www.google.com/maps/search/${encodeURIComponent(query)}?hl=es&gl=ES`;
            console.log(`[${this.config.name}] Navegando a: ${url}`);
            
            // Añadir cookie de consentimiento por si acaso
            await context.addCookies([
                { name: 'CONSENT', value: 'YES+CB.20230220-10-p0.es+FX+266', domain: '.google.com', path: '/' },
                { name: 'SOCS', value: 'CAESAg==', domain: '.google.com', path: '/' }
            ]);

            await page.goto(url, { waitUntil: 'domcontentloaded' });

            // Esperar a que carguen resultados (con un selector clave de Maps)
            try {
                // Esperar selectores comunes de resultados o de "lugar único"
                await Promise.race([
                    page.waitForSelector('h1', { timeout: 10000 }), // Título del lugar (ficha única)
                    page.waitForSelector('a[href*="/maps/place"]', { timeout: 10000 }), // Lista de resultados
                    page.waitForSelector('div[role="feed"]', { timeout: 10000 }) // Lista infinita
                ]);
            } catch (e) {
                console.log(`[${this.config.name}] Timeout esperando selectores principales, continuando...`);
            }
            
            // DETECCIÓN DE LISTA VS FICHA ÚNICA
            const isList = await page.evaluate(() => {
                const hasMultiplePlaceLinks = document.querySelectorAll('a[href*="/maps/place"]').length > 1;
                const h1Text = document.querySelector('h1')?.textContent || "";
                const isGenericResult = h1Text === "Resultados" || h1Text === "Results";
                const hasFeed = !!document.querySelector('div[role="feed"]');
                
                return (hasMultiplePlaceLinks && !document.querySelector('button[data-item-id="address"]')) || isGenericResult || hasFeed;
            });

            if (isList) {
                console.log(`[${this.config.name}] Detectada lista/feed. Procesando items...`);
                const listItems = await this.extractListData(page);
                console.log(`[${this.config.name}] Capturados ${listItems.length} items de la lista.`);
                
                const latency = Date.now() - startTime;
                const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

                return {
                    query,
                    found: listItems.length > 0,
                    is_list: true,
                    level: this.config.level,
                    items: listItems,
                    latency_ms: latency,
                    memory_mb: memoryUsage.toFixed(2),
                    timestamp: new Date().toISOString()
                };
            }

            // Si es ficha única, extraer datos básicos y profundos como antes
            const basicData = await this.extractBasicData(page);
            let deepData = null;
            if (depth > 1 && basicData.found) {
                deepData = await this.extractDeepData(page, depth);
            }

            const latency = Date.now() - startTime;
            const memoryUsage = process.memoryUsage().heapUsed / 1024 / 1024;

            const result = {
                query,
                found: basicData.found,
                is_list: false,
                level: this.config.level,
                data: { ...basicData, ...deepData },
                latency_ms: latency,
                memory_mb: memoryUsage.toFixed(2),
                timestamp: new Date().toISOString()
            };

            console.log(`[${this.config.name}] ✓ Completado en ${latency}ms (Found: ${result.found})`);
            return result;

        } catch (error) {
            console.error(`[${this.config.name}] ✗ Error:`, error.message);
            // Tomar screenshot en error para debug en Docker
            if (context) {
               // await context.pages()[0].screenshot({ path: `/app/data/error-${Date.now()}.png` }).catch(() => {});
            }
            throw error;
        } finally {
            if (context) {
                await context.close().catch(() => {});
            }
        }
    }

    async extractListData(page) {
        return await page.evaluate(() => {
            const results = [];
            // Selectores variados de Google Maps para items de lista
            const cardSelectors = [
                'a[href*="/maps/place"]',
                '.hfpxzc', // Clase común de contenedor de link en listas
                'div[role="article"]'
            ];
            
            let cards = [];
            for (const s of cardSelectors) {
                const found = document.querySelectorAll(s);
                if (found.length > 2) { // Si hay más de 2, es muy probable que sea una lista real
                    cards = Array.from(found);
                    break;
                }
            }

            cards.forEach(card => {
                const container = card.closest('.nv2PK') || card.closest('.THL6V') || card.parentElement;
                if (!container) return;

                // Evitar duplicados (a veces hay varios links por item)
                const name = container.querySelector('.qBF1Pd')?.textContent;
                if (!name || results.find(r => r.name === name)) return;

                const ratingSpan = container.querySelector('[aria-label*="estrellas"][aria-label*="reseñas"], [aria-label*="stars"][aria-label*="reviews"]');
                let rating = null;
                let reviews = null;
                
                if (ratingSpan) {
                    const label = ratingSpan.getAttribute('aria-label');
                    const rMatch = label.match(/([0-9,.]+)/);
                    if (rMatch) rating = parseFloat(rMatch[1].replace(',', '.'));
                    
                    // Regex más flexible para reseñas en lista
                    const revMatch = label.match(/\(([0-9,.]+)\)/) || label.match(/([0-9,.]+)\s?(reseñas|reviews)/);
                    if (revMatch) reviews = parseInt(revMatch[1].replace(/[,.]/g, ''));
                }

                // Dirección: suele estar en la segunda o tercera línea de texto del contenedor
                const textNodes = Array.from(container.querySelectorAll('.W4P9ed, .fontBodyMedium'));
                const address = textNodes.length > 1 ? textNodes[1].textContent : (container.querySelector('.W4P9ed')?.textContent || "");
                const thumbnail = container.querySelector('img')?.src || "";

                results.push({
                    name,
                    rating,
                    review_count: reviews,
                    address: address.trim(),
                    thumbnail
                });
            });
            return results;
        });
    }

    async extractBasicData(page) {
        try {
            // Intentar detectar si estamos en una lista o en una ficha única
            const url = page.url();
            let placeId = null;

            // Extraer placeId de la URL si es posible
            const placeIdMatch = url.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
            if (placeIdMatch) {
                placeId = placeIdMatch[1];
            } else {
                 // Intentar extraer de enlaces en la página
                 const linkHref = await page.getAttribute('a[href*="/maps/place"]', 'href').catch(() => null);
                 if (linkHref) {
                     const match = linkHref.match(/!1s(0x[0-9a-f]+:0x[0-9a-f]+)/);
                     if (match) placeId = match[1];
                 }
            }
            
            // Extraer nombre del negocio
            let name = await page.textContent('h1').catch(() => null);
            if (name === 'Resultados' || name === 'Results') {
                // Si seguimos en resultados, intentar sacar el nombre del primer resultado de la lista (fallback)
                name = await page.evaluate(() => {
                    const firstTitle = document.querySelector('.qBF1Pd.fontHeadlineSmall');
                    return firstTitle ? firstTitle.textContent : null;
                }).catch(() => null);
            }
            
            // Extraer dirección
            const address = await page.evaluate(() => {
                const btn = document.querySelector('button[data-item-id="address"]');
                if (btn) return btn.textContent.trim();
                // Selectores alternativos
                const selectors = ['[aria-label*="estrellas"][aria-label*="reseñas"]', '.F7nice', '.F7nice', '.Io6YTe.fontBodyMedium.kR99db', '.LbwUeb.fontBodyMedium', '[data-item-id="address"]'];
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el && el.textContent) return el.textContent.trim();
                }
                return null;
            }).catch(() => null);

            // Extraer rating
            const rating = await page.evaluate(() => {
                 // Buscar por aria-label que contenga estrellas — formato: "4,9 estrellas 49 reseñas"
                 const span = document.querySelector('[aria-label*="estrellas"][aria-label*="reseñas"], [aria-label*="stars"][aria-label*="reviews"]');
                 if (span) {
                     const label = span.getAttribute('aria-label');
                     const match = label.match(/([0-9,.]+)/);
                     const val = match ? parseFloat(match[1].replace(',', '.')) : null;
                     if (val !== null && val <= 5) return val;
                 }
                 // Fallback: buscar texto puro con patrón X,X o X.X (máx 5.0)
                 const ratingText = document.querySelector('.F7nice, .ce4Yce')?.textContent;
                 if (ratingText) {
                     const match = ratingText.match(/\b([0-9],[0-9]|[1-5]\.[0-9])\b/);
                     if (match) return parseFloat(match[1].replace(',', '.'));
                 }
                 return null;
            }).catch(() => null);

             // Esperar hasta 4s a que cargue el review count (renderizado asíncrono)
             await page.waitForFunction(() => {
                const el = document.querySelector('[aria-label*="estrellas"]');
                return el && /reseñas|reviews/i.test(el.getAttribute('aria-label') || '');
             }, { timeout: 4000 }).catch(() => null); // no importa si no aparece

             // Extraer número de reseñas
             const reviewCount = await page.evaluate(() => {
                const selectors = [
                    // Ficha principal: aria-label con ambos datos
                    '[aria-label*="estrellas"][aria-label*="reseñas"]',
                    '[aria-label*="stars"][aria-label*="reviews"]',
                    // Botón nativo de reseñas Google Maps (clase jANrlb o button con jsaction reviews)
                    'button.jANrlb[data-value]',
                    'button[jsaction*="reviews"]',
                    // Texto combinado "4,2(74)" en primera clase de rating
                    '.F7nice',
                    // fontBodyMedium primera línea: "4,2(74)Google no verifica..."
                    '.fontBodyMedium',
                    // Botones/links con aria-label de reseñas
                    'button[aria-label*="reseñas"]',
                    'button[aria-label*="reviews"]',
                    '[aria-label*="reseñas"]',
                    '[aria-label*="reviews"]',
                    '.fontBodyMedium.dm7P8c span'
                ];
                for (const s of selectors) {
                    const el = document.querySelector(s);
                    if (el) {
                        const text = (el.getAttribute('aria-label') || el.textContent || '').trim();
                        if (!text) continue;
                        // P1: número antes de "reseñas/reviews/opiniones" — formato principal
                        const revMatch = text.match(/([0-9][0-9.,]*)\s*(?:reseñas|reviews|opiniones)/i);
                        if (revMatch) return parseInt(revMatch[1].replace(/[.,]/g, ''));
                        // P2: número entre paréntesis — formato "(284)"
                        const parenMatch = text.match(/\(([0-9,.]+)\)/);
                        if (parenMatch) return parseInt(parenMatch[1].replace(/[,.]/g, ''));
                        // P3: texto con 2+ números → el último es el conteo (el primero es el rating)
                        const allNums = [...text.matchAll(/\b([0-9][0-9,.]*)\b/g)];
                        if (allNums.length > 1) return parseInt(allNums[allNums.length - 1][1].replace(/[.,]/g, ''));
                        // P4: número puro en textContent (selector específico de conteo)
                        if (/^[0-9][0-9.,]*K?$/.test(text)) {
                            if (text.endsWith('K')) return Math.round(parseFloat(text) * 1000);
                            return parseInt(text.replace(/[.,]/g, ''));
                        }
                    }
                }
                return null;
           }).catch(() => null);

            // Si tenemos nombre o placeId, consideramos que hemos encontrado algo
            const found = !!(name && name !== 'Resultados' && name !== 'Results');

            return {
                found,
                place_id: placeId,
                name: (name === 'Resultados' || name === 'Results') ? null : name,
                address,
                rating,
                review_count: reviewCount,
                images_count: await page.evaluate(() => {
                    const btn = document.querySelector('button[aria-label*="Fotos"], button[aria-label*="Photos"]');
                    if (btn) {
                        const label = btn.getAttribute('aria-label');
                        const match = label.match(/([0-9,.]+)/);
                        return match ? parseInt(match[1].replace(/[,.]/g, '')) : 0;
                    }
                    return 0;
                }).catch(() => 0),
                is_owner_verified: await page.evaluate(() => {
                    return !!document.querySelector('button[aria-label*="Reclamar"], button[aria-label*="Claim"]') === false; // If "Claim this business" is NOT present, it might be verified.
                    // Better check: "Identificado como propietario"
                }).catch(() => false)
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

            // Si estamos en lista, hacer clic en el primer resultado
            if (!page.url().includes('/place/')) {
                 await page.click('a[href*="/maps/place"]', { timeout: 5000 }).catch(() => null);
                 await page.waitForTimeout(2000);
            }

            // Extraer metadatos extra
            const website = await page.getAttribute('a[data-item-id="authority"]', 'href').catch(() => null);
            const phone = await page.textContent('button[data-item-id*="phone"]').catch(() => null);

            // Extraer reseñas
            let reviews = [];
            if (depth >= 5) {
                reviews = await this.extractReviews(page, 5);
            }

            return {
                website,
                phone,
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
            // Ir a la pestaña de reseñas
            await page.click('button[aria-label*="Reseñas"]', { timeout: 5000 }).catch(() => {});
            await page.waitForTimeout(2000);

            // Scroll para cargar
            const reviewsContainer = await page.$('.m6QErb.DxyBCb.kA9KIf.dS8AEf');
            if (reviewsContainer) {
                await reviewsContainer.evaluate(el => el.scrollTop = el.scrollHeight);
                await page.waitForTimeout(1000);
            }

            const reviews = await page.evaluate((limit) => {
                const els = document.querySelectorAll('.jftiEf'); // Clase contenedor reseña
                const results = [];
                for (let i = 0; i < Math.min(els.length, limit); i++) {
                    const el = els[i];
                    results.push({
                        author: el.querySelector('.d4r55')?.textContent,
                        text: el.querySelector('.wiI7pd')?.textContent,
                        rating: el.querySelector('.kvMYJc')?.getAttribute('aria-label'),
                        date: el.querySelector('.rsqaWe')?.textContent
                    });
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
            rss_mb: (memory.rss / 1024 / 1024).toFixed(2)
        };
    }
}

module.exports = PlaywrightScraper;
