const express = require('express');
const bodyParser = require('body-parser');
const NanoScraper = require('./scraper-nano');
const HeavyScraper = require('./scraper-heavy');
const MapsScraper = require('./scraper-maps');
const log = require('./logger');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// Mapa de trabajos en memoria (para simular API asíncrona)
const jobs = new Map();

// Instancias globales (Lazy init)
let nanoScraper  = null;
let heavyScraper = null;
let mapsScraper  = null;

/** Devuelve la instancia singleton del NanoScraper, inicializándola si es necesario. */
async function getNano() {
    if (!nanoScraper) { nanoScraper = new NanoScraper(); await nanoScraper.initialize(); }
    return nanoScraper;
}
/** Devuelve la instancia singleton del HeavyScraper, inicializándola si es necesario. */
async function getHeavy() {
    if (!heavyScraper) { heavyScraper = new HeavyScraper(); await heavyScraper.initialize(); }
    return heavyScraper;
}
/** Devuelve la instancia singleton del MapsScraper, inicializándola si es necesario. */
async function getMaps() {
    if (!mapsScraper) { mapsScraper = new MapsScraper(); await mapsScraper.initialize(); }
    return mapsScraper;
}

// ----------------------------------------------------
// API COMPATIBLE (V1) - Para integrarse con Backend Go
// ----------------------------------------------------

// POST /api/v1/jobs - Crear trabajo asíncrono
app.post('/api/v1/jobs', async (req, res) => {
    log.info(`[API] POST /api/v1/jobs: ${JSON.stringify(req.body)}`);
    try {
        const { keywords, depth } = req.body;
        const queryFull = keywords[0] || "";

        // Separar Negocio y Ciudad (simple split por último espacio o heurística)
        const lastSpace = queryFull.lastIndexOf(' ');
        const negocio = lastSpace > -1 ? queryFull.substring(0, lastSpace) : queryFull;
        const ciudad = lastSpace > -1 ? queryFull.substring(lastSpace + 1) : "";

        const jobId = uuidv4();
        const job = {
            id: jobId,
            status: 'running',
            created_at: new Date().toISOString(),
            query: queryFull,
            result: null,
            error: null
        };
        jobs.set(jobId, job);

        // Responder ID inmediatamente (Async Pattern)
        res.json({ id: jobId, status: 'running' });

        // Ejecutar en background
        (async () => {
            try {
                const type = process.env.SCRAPER_TYPE || (depth > 5 ? 'heavy' : 'nano');
                log.info(`[Job ${jobId}] Iniciando tipo: ${type} para '${queryFull}'`);

                let result = null;
                if (type === 'heavy') {
                    const scraper = await getHeavy();
                    result = await scraper.scrapeGoogleMaps(negocio, ciudad, depth);
                } else if (type === 'maps') {
                    const scraper = await getMaps();
                    const scraperResult = await scraper.scrape(queryFull);
                    result = { query: queryFull, found: scraperResult.found, is_list: false, level: 4, data: scraperResult.data, latency_ms: scraperResult.latency_ms, timestamp: new Date().toISOString() };
                } else {
                    const scraper = await getNano();
                    result = await scraper.scrapeGoogleMaps(negocio, ciudad, depth);
                }

                job.result = result;
                job.status = 'finished';
                jobs.set(jobId, job);
                log.info(`[Job ${jobId}] Finalizado con éxito`);

            } catch (e) {
                log.error(`[Job ${jobId}] Error: ${e.message}`);
                job.status = 'failed';
                job.error = e.message;
                jobs.set(jobId, job);
            }
        })();

    } catch (e) {
        log.error(`[API] Error al crear job: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/v1/jobs/:id - Estado del trabajo
app.get('/api/v1/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    res.json({
        id: job.id,
        status: job.status,
        error: job.error
    });
});

// GET /api/v1/jobs/:id/results/csv - Descargar resultados como CSV
// El backend Go espera CSV para mantener compatibilidad con parseScraperCSV.
app.get('/api/v1/jobs/:id/results/csv', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'finished') {
        return res.status(404).send('Not ready or not found');
    }

    // CSV Header
    let csv = `title,review_rating,review_count,reviews_per_rating,address,phone,website,thumbnail,cid,images_count,is_owner_verified\n`;
    const escape = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

    if (job.result.is_list && Array.isArray(job.result.items)) {
        job.result.items.forEach(item => {
            const breakdown = JSON.stringify({ "1": 0, "2": 0, "3": 0, "4": 0, "5": item.review_count || 0 });
            csv += `${escape(item.name)},${item.rating || 0},${item.review_count || 0},${escape(breakdown)},${escape(item.address)},"","","${item.thumbnail || ""}",0,${item.images_count || 0},false\n`;
        });
    } else {
        const d = job.result.data || {};
        const breakdown = { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 };
        if (d.review_count > 0) {
            const mainStar = Math.round(d.rating) || 5;
            breakdown[mainStar.toString()] = d.review_count;
        }
        const reviewsPerRatingJson = JSON.stringify(breakdown);
        csv += `${escape(d.name || job.query)},${d.rating || 0},${d.review_count || 0},${escape(reviewsPerRatingJson)},${escape(d.address)},${escape(d.phone)},${escape(d.website)},"",0,${d.images_count || 0},${d.is_owner_verified || false}\n`;
    }

    res.header('Content-Type', 'text/csv');
    res.send(csv);
});


// ----------------------------------------------------
// API NUEVA (Directa) - Por si queremos saltarnos el polling
// ----------------------------------------------------

// POST /api/v1/maps/search — Búsqueda directa en Google Maps (síncrona)
app.post('/api/v1/maps/search', async (req, res) => {
    const { query } = req.body;
    if (!query) return res.status(400).json({ error: 'query required' });
    try {
        const scraper = await getMaps();
        const result  = await scraper.scrape(query);
        res.json(result);
    } catch (e) {
        log.error(`[API] /maps/search error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

// POST /api/v1/maps/url — Navegación directa por URL GBP (sin búsqueda por texto)
app.post('/api/v1/maps/url', async (req, res) => {
    const { url } = req.body;
    if (!url) return res.status(400).json({ error: 'url required' });
    try {
        const scraper = await getMaps();
        const result  = await scraper.scrapeByURL(url);
        res.json(result);
    } catch (e) {
        log.error(`[API] /maps/url error: ${e.message}`);
        res.status(500).json({ error: e.message });
    }
});

app.get('/health', async (req, res) => {
    res.json({
        status: 'ok',
        jobs_memory: jobs.size,
        scrapers: {
            nano:  nanoScraper  ? 'up' : 'down',
            heavy: heavyScraper ? 'up' : 'down',
            maps:  mapsScraper  ? 'up' : 'down',
        }
    });
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    log.info(`Servidor Playwright corriendo en puerto ${PORT}`);
});
