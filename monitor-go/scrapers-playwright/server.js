const express = require('express');
const bodyParser = require('body-parser');
const NanoScraper = require('./scraper-nano');
const HeavyScraper = require('./scraper-heavy');
const MapsScraper = require('./scraper-maps');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(bodyParser.json());

// Mapa de trabajos en memoria (para simular API asíncrona)
const jobs = new Map();

// Instancias globales (Lazy init)
let nanoScraper  = null;
let heavyScraper = null;
let mapsScraper  = null;

async function getNano() {
    if (!nanoScraper) { nanoScraper = new NanoScraper(); await nanoScraper.initialize(); }
    return nanoScraper;
}
async function getHeavy() {
    if (!heavyScraper) { heavyScraper = new HeavyScraper(); await heavyScraper.initialize(); }
    return heavyScraper;
}
async function getMaps() {
    if (!mapsScraper) { mapsScraper = new MapsScraper(); await mapsScraper.initialize(); }
    return mapsScraper;
}

// ----------------------------------------------------
// API COMPATIBLE (V1) - Para integrarse con Backend Go
// ----------------------------------------------------

// POST /api/v1/jobs - Crear trabajo asíncrono
app.post('/api/v1/jobs', async (req, res) => {
    console.log(`[API] Recibida petición POST /api/v1/jobs. Body:`, JSON.stringify(req.body));
    try {
        const { keywords, depth, lang } = req.body;
        const queryFull = keywords[0] || ""; // "Negocio Ciudad"
        
        // Separar Negocio y Ciudad (simple split por último espacio o heurística)
        // En V2 Go enviamos "Negocio Ciudad" todo junto en keyword[0]
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
                 // Decidir Scraper según profundidad o Variable Entorno
                 // Si depth <= 5 -> Nano, sino Heavy.
                 // O si SCRAPER_TYPE=nano forzamos Nano.
                 
                 const type = process.env.SCRAPER_TYPE || (depth > 5 ? 'heavy' : 'nano');
                 console.log(`[Job ${jobId}] Iniciando tipo: ${type} para '${queryFull}'`);

                 let result = null;
                 if (type === 'heavy') {
                     const scraper = await getHeavy();
                     result = await scraper.scrapeGoogleMaps(negocio, ciudad, depth);
                 } else if (type === 'maps') {
                     const scraper = await getMaps();
                     const r = await scraper.scrape(queryFull);
                     // Adaptar formato maps → formato estándar job result
                     result = { query: queryFull, found: r.found, is_list: false, level: 4, data: r.data, latency_ms: r.latency_ms, timestamp: new Date().toISOString() };
                 } else {
                     const scraper = await getNano();
                     result = await scraper.scrapeGoogleMaps(negocio, ciudad, depth);
                 }

                 // Guardar resultado
                 job.result = result;
                 job.status = 'finished';
                 jobs.set(jobId, job);
                 console.log(`[Job ${jobId}] Finalizado con éxito.`);

             } catch (e) {
                 console.error(`[Job ${jobId}] Error: ${e.message}`);
                 job.status = 'failed';
                 job.error = e.message;
                 jobs.set(jobId, job);
             }
        })();

    } catch (e) {
        console.error("Error al crear job:", e);
        res.status(500).json({ error: e.message });
    }
});

// GET /api/v1/jobs/:id - Estado del trabajo
app.get('/api/v1/jobs/:id', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    
    // Devolvemos estructura compatible con lo que espera Go
    res.json({
        id: job.id,
        status: job.status,
        error: job.error
    });
});

// GET /api/v1/jobs/:id/results/csv - Descargar resultados (Simulado JSON como CSV o JSON directo adaptado)
// El backend Go espera un CSV... ¡Qué dolor!
// Pero espera: parseScraperCSV lee CSV.
// Tocar el backend Go para que lea JSON es mejor, pero prometí compatibilidad.
// Voy a generar un CSV al vuelo desde el JSON.

app.get('/api/v1/jobs/:id/results/csv', (req, res) => {
    const job = jobs.get(req.params.id);
    if (!job || job.status !== 'finished') {
        return res.status(404).send('Not ready or not found');
    }

    // CSV Header
    let csv = `title,review_rating,review_count,reviews_per_rating,address,phone,website,thumbnail,cid,images_count,is_owner_verified\n`;
    const escape = (txt) => `"${(txt || '').toString().replace(/"/g, '""')}"`;

    if (job.result.is_list && Array.isArray(job.result.items)) {
        // Generar múltiples filas para el listado
        job.result.items.forEach(item => {
            const breakdown = JSON.stringify({ "1": 0, "2": 0, "3": 0, "4": 0, "5": item.review_count || 0 });
            csv += `${escape(item.name)},${item.rating || 0},${item.review_count || 0},${escape(breakdown)},${escape(item.address)},"","","${item.thumbnail || ""}",0,${item.images_count || 0},false\n`;
        });
    } else {
        // Un solo resultado (Detalle)
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
    console.log(`✓ Servidor Playwright Emulator corriendo en puerto ${PORT}`);
    console.log(`  - API Compatible: POST /api/v1/jobs`);
});
