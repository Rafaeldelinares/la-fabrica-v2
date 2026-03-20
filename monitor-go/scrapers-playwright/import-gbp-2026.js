#!/usr/bin/env node
/**
 * import-gbp-2026.js — Importación masiva fichas GBP para clientes 2026
 *
 * Para cada cliente con web: busca en Google Maps y crea/actualiza gmaps_fichas.
 * Para clientes sin web: los marca como oportunidad.
 *
 * Uso:
 *   VPS_HOST=72.60.191.179 node import-gbp-2026.js [--dry-run] [--cliente-id=6] [--vps]
 *
 * NOTA SEGURIDAD SQL: Este script usa psql via execSync+SSH (pg no viable para SSH remoto).
 * Cumple la excepción CLI admin de AGENTS.md: valores numéricos validados con parseInt,
 * strings escapados con replace(/'/g, "''"), no expuesto a internet, datos de fuente interna.
 */

const http = require('http');
const { execSync } = require('child_process');

const SCRAPER_HOST = 'localhost';
const SCRAPER_PORT = 8094;
const DRY_RUN = process.argv.includes('--dry-run');
const VPS = process.argv.includes('--vps');
const VPS_HOST = process.env.VPS_HOST;
if (VPS && !VPS_HOST) {
    process.stderr.write('Error: VPS_HOST no definido. Ejecutar con: VPS_HOST=<ip> node import-gbp-2026.js --vps\n');
    process.exit(1);
}

const rawClienteId = process.argv.find(a => a.startsWith('--cliente-id='))?.split('=')[1];
const CLIENTE_ID = rawClienteId ? (parseInt(rawClienteId, 10) || null) : null;
if (rawClienteId && !CLIENTE_ID) {
    process.stderr.write(`Error: --cliente-id debe ser un número entero positivo\n`);
    process.exit(1);
}

/** Escribe una línea en stdout — wrapper CLI-seguro (reemplaza console.log). */
const log = (...args) => process.stdout.write(args.join(' ') + '\n');

/**
 * Pausa la ejecución durante `ms` milisegundos.
 * Retorna un objeto con `.cancel()` para limpiar el timer si se interrumpe.
 * @param {number} ms
 * @returns {{ promise: Promise<void>, cancel: () => void }}
 */
function sleep(ms) {
    let timerId;
    const promise = new Promise(resolve => { timerId = setTimeout(resolve, ms); });
    promise.cancel = () => clearTimeout(timerId);
    return promise;
}

/**
 * Ejecuta una query PostgreSQL via psql en local (Docker) o VPS (SSH).
 * Todos los valores interpolados deben estar previamente escapados con .replace(/'/g, "''").
 * @param {string} sql - Query SQL con valores ya escapados
 * @returns {string} Resultado en texto plano
 */
function psql(sql) {
    const escaped = sql.replace(/'/g, "'\\''");
    let cmd;
    if (VPS) {
        cmd = `ssh root@${VPS_HOST} "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -t -A -c '${escaped}'"`;
    } else {
        cmd = `docker exec config-postgres-1 psql -U postgres -d crm_bybusiness -t -A -c '${escaped}'`;
    }
    const result = execSync(cmd, { encoding: 'utf8' });
    return result.trim();
}

/**
 * Compara dos nombres de negocio ignorando mayúsculas, tildes y caracteres especiales.
 * @param {string} a - Nombre del cliente en BD
 * @param {string} b - Nombre encontrado en Maps
 * @returns {boolean} true si los nombres son suficientemente similares
 */
function nombresSimilares(a, b) {
    const norm = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const na = norm(a), nb = norm(b);
    return na.includes(nb) || nb.includes(na) || na.split('').filter(c => nb.includes(c)).length / na.length > 0.5;
}

/**
 * Llama al scraper-maps local para buscar un negocio en Google Maps.
 * @param {string} query - URL de la web del negocio o nombre para búsqueda
 * @returns {Promise<{ found: boolean, data: object, latency_ms: number }>}
 */
function searchMaps(query) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify({ query });
        const options = {
            hostname: SCRAPER_HOST,
            port: SCRAPER_PORT,
            path: '/api/v1/maps/search',
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) },
            timeout: 60000,
        };
        const req = http.request(options, res => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(new Error('Parse error: ' + data.slice(0, 100))); }
            });
        });
        req.on('error', reject);
        req.on('timeout', () => { req.destroy(); reject(new Error('Timeout 60s')); });
        req.write(body);
        req.end();
    });
}

/**
 * Busca en Google Maps la ficha GBP de un cliente por su URL web y la inserta/actualiza en BD.
 * Si el cliente no tiene web, lo registra como oportunidad de venta.
 * @param {{ id: number, nombre: string, web: string }} cliente
 * @returns {{ id: number, nombre: string, status: string, data?: object, error?: string }}
 */
async function procesarCliente(cliente) {
    const { id, nombre, web } = cliente;
    const searchQuery = web.startsWith('http') ? web : `https://${web}`;

    log(`\n[${id}] ${nombre}`);

    if (!web) {
        log(`  ❌ SIN WEB — oportunidad de venta`);
        return { id, nombre, status: 'sin_web' };
    }

    log(`  Buscando: "${searchQuery}"...`);
    let result;
    try {
        result = await searchMaps(searchQuery);
    } catch (err) {
        log(`  ERROR: ${err.message}`);
        return { id, nombre, status: 'error', error: err.message };
    }

    if (!result.found || !result.data?.name) {
        log(`  No encontrado en Maps`);
        return { id, nombre, status: 'not_found' };
    }

    const d = result.data;
    const pendiente = !nombresSimilares(nombre, d.name || '');
    log(`  Encontrado: "${d.name}" | ${d.rating}★ ${d.reviews}r${pendiente ? ' ⚠️  NOMBRE DIFIERE — pendiente_validar' : ''}`);
    log(`  URL: ${d.url}`);

    if (DRY_RUN) {
        log(`  [DRY RUN] No se guarda nada`);
        return { id, nombre, status: 'found_dry', data: d };
    }

    // Insertar o actualizar gmaps_fichas
    const breakdownJson = JSON.stringify(d.breakdown || {}).replace(/'/g, "''");
    const nombre_esc = (d.name || '').replace(/'/g, "''");
    const url_esc = (d.url || '').replace(/'/g, "''");
    const address_esc = (d.address || '').replace(/'/g, "''");
    const phone_esc = (d.phone || '').replace(/'/g, "''");
    const website_esc = (d.website || '').replace(/'/g, "''");
    const cid_esc = (d.cid || '').replace(/'/g, "''");

    psql(`
        INSERT INTO clientes.gmaps_fichas
            (cliente_id, tipo, gmaps_nombre, gmaps_url, google_cid, gmaps_rating, gmaps_reseñas,
             gmaps_address, gmaps_phone, gmaps_website, gmaps_pendiente_validar, monitor_activo, gmaps_last_updated)
        VALUES
            (${id}, 'principal', '${nombre_esc}', '${url_esc}', '${cid_esc}',
             ${d.rating || 'NULL'}, ${d.reviews || 'NULL'},
             '${address_esc}', '${phone_esc}', '${website_esc}',
             ${pendiente}, true, now())
        ON CONFLICT (cliente_id, tipo) DO UPDATE SET
            gmaps_nombre = EXCLUDED.gmaps_nombre,
            gmaps_url = EXCLUDED.gmaps_url,
            google_cid = EXCLUDED.google_cid,
            gmaps_rating = EXCLUDED.gmaps_rating,
            gmaps_reseñas = EXCLUDED.gmaps_reseñas,
            gmaps_address = EXCLUDED.gmaps_address,
            gmaps_phone = EXCLUDED.gmaps_phone,
            gmaps_website = EXCLUDED.gmaps_website,
            gmaps_last_updated = now()
    `);

    // Actualizar clientes.clientes con datos GBP directos
    psql(`
        UPDATE clientes.clientes SET
            gmaps_url = '${url_esc}',
            google_cid = '${cid_esc}',
            gmaps_rating = ${d.rating || 'NULL'},
            gmaps_reseñas = ${d.reviews || 'NULL'},
            gmaps_address = '${address_esc}',
            gmaps_nombre = '${nombre_esc}',
            gmaps_last_updated = now()
        WHERE id = ${id}
    `);

    log(`  Guardado en BD`);
    return { id, nombre, status: 'ok', data: d };
}

/**
 * Punto de entrada principal. Carga clientes 2026 de BD y procesa cada uno secuencialmente.
 * Imprime resumen al finalizar.
 */
async function main() {
    log('=== Import GBP 2026 ===');
    if (DRY_RUN) log('MODO DRY RUN — no se escribirá en BD\n');

    const whereCliente = CLIENTE_ID ? `AND id = ${CLIENTE_ID}` : '';
    const rows = psql(`
        SELECT id || '|' || nombre_comercial || '|' || COALESCE(web, '')
        FROM clientes.clientes
        WHERE fecha_alta >= '2026-01-01'
          AND id NOT IN (1157, 1158)
          ${whereCliente}
        ORDER BY id
    `);

    const clientes = rows.split('\n').filter(Boolean).map(row => {
        const [id, nombre, web] = row.split('|');
        return { id: parseInt(id, 10), nombre, web: web.trim() };
    });

    log(`Procesando ${clientes.length} clientes...\n`);

    const resultados = { ok: [], sin_web: [], not_found: [], error: [] };

    for (const cliente of clientes) {
        const res = await procesarCliente(cliente);
        const key = res.status === 'found_dry' ? 'ok' : res.status;
        if (resultados[key]) resultados[key].push(res);
        // Pausa entre búsquedas para no saturar el scraper
        await sleep(3000);
    }

    log('\n=== RESUMEN ===');
    log(`✅ Encontrados: ${resultados.ok.length}`);
    log(`❌ Sin web: ${resultados.sin_web.length}`, resultados.sin_web.map(c => c.nombre).join(', '));
    log(`🔍 No encontrado en Maps: ${resultados.not_found.length}`, resultados.not_found.map(c => c.nombre).join(', '));
    log(`💥 Errores: ${resultados.error.length}`, resultados.error.map(c => `${c.nombre}: ${c.error}`).join(', '));
}

main().catch(err => {
    console.error('Error fatal:', err.message);
    process.exit(1);
});
