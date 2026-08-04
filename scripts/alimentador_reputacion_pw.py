#!/usr/bin/env python3
"""
alimentador_reputacion_pw.py — Playwright-based reputation feeder.

Refresco tiered de reputacion via Google Maps. Cada lead se refresca a una
frecuencia proporcional a su probabilidad de ser llamado:

  Bucket A (1-3 dias):   llamada en ultimos 7d O cita/llamada_programada
                          en prox 7d  -> max_age = 3 dias
  Bucket B (7-14 dias):  cualquier actividad en ultimos 30d O
                          cita/llamada_programada en prox 30d
                          -> max_age = 14 dias
  Bucket C (30-90 dias): leads sin actividad reciente
                          -> max_age = 90 dias
  Bucket D (SKIP):        estado IN (lista_negra, vendido, no_interesa)
                          -> no se procesan

vs Gosom-based original:
  + datos siempre fresh (no contamination)
  + mas preciso (Google mismo elige el match)
  - ~10-15s por lead (vs 5-8s cached)
  - mas resource-intensive (Chromium process)
  - necesita manejar consent dialog la primera vez

Uso:
    python3 scripts/alimentador_reputacion_pw.py --vps --batch 10
    python3 scripts/alimentador_reputacion_pw.py --batch 25  # dry-run por defecto

Argumentos:
    --batch N        Procesa hasta N leads (default 20).
    --vps            Escribe en VPS (default: dry-run).
    --headless       Run browser headless (default True).
    --headed         Show browser window (for debugging).
    --persist        Use persistent context (saves cookies between runs).
    --ssh HOST       Host SSH para VPS (default root@72.60.191.179).
    --psql-cmd CMD   Comando psql dentro del VPS (default
                     `docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness`).

Nota: el max-age por lead se determina via bucket (A/B/C). Ya no se usa --max-age.
"""

# ─── Bucket thresholds ──────────────────────────────────────────────────────────
# Cuanto menor el max-age, mas frecuente el refresco.
#Bucket A: actividad reciente (llamada <7d O cita/próx 7d)        → refresco cada 3 dias
#Bucket B: alguna actividad en ultimos 30d O cita prox 30d       → refresco cada 14 dias
#Bucket C: leads fríos sin actividad reciente                    → refresco cada 90 dias
#Bucket D: estados que no se deben procesar                      → skip
BUCKET_A_MAX_AGE_DAYS = 3
BUCKET_B_MAX_AGE_DAYS = 14
BUCKET_C_MAX_AGE_DAYS = 90
BUCKET_D_SKIP_STATES = ['lista_negra', 'vendido', 'no_interesa']
import argparse
import json
import os
import re
import subprocess
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

DEFAULT_VPS_HOST = os.environ.get('VpsSSHHost', '72.60.191.179')
DEFAULT_VPS_USER = os.environ.get('VpsSSHUser', 'root')
DEFAULT_PSQL = ('docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness')
USER_AGENT = ('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) '
              'Chrome/120.0.0.0 Safari/537.36')
PERSIST_DIR = Path('/var/lib/fabrica/playwright-gmaps')


def ssh_psql(sql: str, host: str, user: str, psql_cmd: str, use_csv: bool = False) -> str:
    """Run a SQL statement on the VPS PostgreSQL via SSH + docker exec.
    When use_csv=True, psql outputs CSV format (needed for fields that may
    contain delimiters such as pipes in nombre_comercial)."""
    safe_sql = sql.replace("'", "'\\''")
    csv_flag = ' --csv' if use_csv else ''
    cmd = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
           f'{user}@{host}', f"{psql_cmd}{csv_flag} -c '{safe_sql}'"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f'ssh_psql failed: {r.stderr.strip()[:300]}')
    return r.stdout


def fetch_stale_leads(batch: int, host: str, user: str, psql_cmd: str) -> tuple:
    """Returns (leads_list, bucket_counts) where bucket_counts = {bucket: count}.
    Leads are ordered by bucket priority (A > B > C); Bucket D is excluded.
    Each lead dict includes: id, nombre, localidad, telefono, categoria, bucket_max_age_days."""
    import csv
    import io

    sql = f"""
    WITH lead_activity AS (
      SELECT
        l.id,
        l.estado,
        l.reputacion_at,
        EXISTS (SELECT 1 FROM operaciones.historial_llamadas hl
                WHERE hl.lead_id = l.id AND hl.created_at > NOW() - INTERVAL '7 days')
          AS recent_call,
        EXISTS (SELECT 1 FROM operaciones.llamadas_programadas lp
                WHERE lp.lead_id = l.id
                  AND lp.fecha_programada BETWEEN NOW() AND NOW() + INTERVAL '7 days')
          AS upcoming_7d,
        EXISTS (SELECT 1 FROM operaciones.historial_llamadas hl
                WHERE hl.lead_id = l.id AND hl.created_at > NOW() - INTERVAL '30 days')
          AS call_30d,
        EXISTS (SELECT 1 FROM operaciones.llamadas_programadas lp
                WHERE lp.lead_id = l.id
                  AND lp.fecha_programada BETWEEN NOW() AND NOW() + INTERVAL '30 days')
          AS upcoming_30d
      FROM operaciones.leads l
      WHERE l.es_simulacion = false
        AND l.estado = 'pendiente'
    ),
    classified AS (
      SELECT
        id, estado, reputacion_at,
        CASE
          WHEN estado IN ('lista_negra', 'vendido', 'no_interesa') THEN 'D'
          WHEN recent_call OR upcoming_7d THEN 'A'
          WHEN call_30d OR upcoming_30d THEN 'B'
          ELSE 'C'
        END AS bucket,
        CASE
          WHEN estado IN ('lista_negra', 'vendido', 'no_interesa') THEN NULL
          WHEN recent_call OR upcoming_7d THEN {BUCKET_A_MAX_AGE_DAYS}
          WHEN call_30d OR upcoming_30d THEN {BUCKET_B_MAX_AGE_DAYS}
          ELSE {BUCKET_C_MAX_AGE_DAYS}
        END AS bucket_max_age_days
      FROM lead_activity
    )
    SELECT
      l.id,
      COALESCE(l.nombre_comercial, ''),
      COALESCE(l.localidad, ''),
      COALESCE(l.telefono, ''),
      COALESCE(l.categoria, ''),
      c.bucket,
      c.bucket_max_age_days
    FROM classified c
    JOIN operaciones.leads l ON l.id = c.id
    WHERE c.bucket != 'D'
      AND l.telefono IS NOT NULL AND l.telefono <> ''
      AND l.nombre_comercial IS NOT NULL AND l.nombre_comercial <> ''
      AND (c.reputacion_at IS NULL
           OR c.reputacion_at < NOW() - (c.bucket_max_age_days || ' days')::interval)
    ORDER BY
      c.bucket = 'A' DESC,
      c.bucket = 'B' DESC,
      c.bucket = 'C' DESC,
      c.reputacion_at NULLS FIRST,
      l.scoring DESC NULLS LAST
    LIMIT {batch};
    """
    raw = ssh_psql(sql, host, user, psql_cmd, use_csv=True)

    # Counters para el resumen de buckets (solo los que cumplen condicion de edad)
    bucket_counts = {'A': 0, 'B': 0, 'C': 0, 'D': 0}

    leads = []
    reader = csv.reader(io.StringIO(raw.strip()))
    header_skipped = False
    for row in reader:
        if len(row) < 7:
            continue
        if not header_skipped:
            # First row is the CSV header (id,nombre,localidad,...)
            header_skipped = True
            continue
        bucket = row[5]
        bucket_counts[bucket] = bucket_counts.get(bucket, 0) + 1
        leads.append({
            'id': int(row[0]),
            'nombre': row[1],
            'localidad': row[2],
            'telefono': row[3],
            'categoria': row[4],
            'bucket': bucket,
            'bucket_max_age_days': int(row[6]) if row[6] else BUCKET_C_MAX_AGE_DAYS,
        })
    return leads, bucket_counts


def handle_consent(page):
    """Click the consent dialog if it appears. Returns True if handled."""
    for sel in ['button:has-text("Aceptar todo")', 'button:has-text("Accept all")',
                'button:has-text("Rechazar todo")', 'button:has-text("Reject all")',
                'form button']:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1000):
                btn.click()
                page.wait_for_timeout(2000)
                return True
        except Exception:
            pass
    return False


def search_gmaps(page, nombre, localidad):
    """Navigate to Google Maps search for {nombre} {localidad}.
    Return (name, rating, reviews) of best matching result, or None.

    The algorithm:
    1. Search for the query
    2. Read all results (name, rating, reviews)
    3. Pick the one with best name token overlap to the target
    4. Click that one to get full detail (or skip if no good match)
    """
    query = f'{nombre} {localidad}'.replace(' ', '+').replace('&', '%26').replace('"', '%22')
    url = f'https://www.google.com/maps/search/{query}'
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=20000)
    except PWTimeout:
        return None
    page.wait_for_timeout(3000)
    if 'consent' in page.url or 'Antes de ir a Google Maps' in page.title():
        handle_consent(page)
        page.wait_for_timeout(3000)
    try:
        page.wait_for_selector('[role="article"]', timeout=10000)
    except PWTimeout:
        return None
    # Read all results to find best match
    results = page.evaluate(r"""() => {
        const cards = document.querySelectorAll('[role="article"]');
        const out = [];
        for (const card of cards) {
            const nameEl = card.querySelector('.qBF1Pd, .fontHeadlineSmall, .NrDZNS, .hfpxzc');
            if (!nameEl) continue;
            const name = nameEl.textContent.trim();
            // Busca "4,6(168)" o "4.6 (168)" en el card
            const txt = card.innerText;
            const m = txt.match(/(\d+[,.]\d+)\s*[(\[【](\d+)[)\]】]/);
            if (!m) continue;
            out.push({name: name, rating: m[1].replace(',', '.'), reviews: m[2]});
        }
        return out;
    }""") or []
    if not results:
        return None
    # Pick best match by name token overlap
    norm_target = re.sub(r'\s+', ' ', nombre.lower()).strip()
    target_tokens = set(norm_target.split())
    def score(r):
        name = re.sub(r'\s+', ' ', r['name'].lower()).strip()
        name_tokens = set(name.split())
        if not name_tokens:
            return -1
        if name == norm_target:
            return 100
        return len(target_tokens & name_tokens)
    best = max(results, key=score)
    if score(best) < 1:
        return None
    return best


def update_lead(lead_id: int, rating, reviews: int, host: str, user: str, psql_cmd: str) -> str:
    sql = (
        "UPDATE operaciones.leads SET "
        "rating = %.2f, num_reseñas = %d, scoring = %.2f, reputacion_at = NOW() "
        "WHERE id = %d RETURNING id;" % (
            float(rating or 0), int(reviews or 0), float(rating or 0), int(lead_id),
        )
    )
    return ssh_psql(sql, host, user, psql_cmd)


def log_evento_cron(stats: dict, batch_size: int,
                    dry_run: bool, host: str, user: str, psql_cmd: str,
                    leads: list = None, bucket_counts: dict = None) -> str:
    detalles = {
        'cron': 'alimentador_reputacion_pw',
        'batch_size': batch_size,
        'bucket_counts': bucket_counts or {},
        'processed': stats.get('processed', 0),
        'updated': stats.get('updated', 0),
        'no_match': stats.get('no_match', 0),
        'no_rating': stats.get('no_rating', 0),
        'errors': stats.get('errors', 0),
        'dry_run': dry_run,
    }
    if leads is not None:
        detalles['leads'] = leads
    sql = (
        "INSERT INTO sistema.eventos_sistema (tipo_evento, detalles, fecha_evento) "
        "VALUES ('CRON_RUN', '%s'::jsonb, NOW()) RETURNING id;" % (
            json.dumps(detalles).replace("'", "''"),
        )
    )
    return ssh_psql(sql, host, user, psql_cmd)


def main():
    p = argparse.ArgumentParser(description='Refresca reputacion via Playwright (Google Maps directo) — modo tiered')
    p.add_argument('--batch', type=int, default=20)
    p.add_argument('--vps', action='store_true',
                   help='Aplicar updates en el VPS (sin esto, dry-run).')
    p.add_argument('--headless', action='store_true', default=True)
    p.add_argument('--headed', action='store_true', help='Show browser window (for debugging).')
    p.add_argument('--persist', action='store_true',
                   help='Use persistent context (saves cookies between runs).')
    p.add_argument('--ssh', default=DEFAULT_VPS_HOST)
    p.add_argument('--ssh-user', default=DEFAULT_VPS_USER)
    p.add_argument('--psql-cmd', default=DEFAULT_PSQL)
    args = p.parse_args()

    headless = not args.headed
    dry_run = not args.vps

    print(f'=== MODO: {"PRODUCCIÓN" if args.vps else "DRY-RUN"} (batch={args.batch}, headless={headless}, persist={args.persist}) ===')
    print(f'Leyendo leads stale (bucket tiered)...')
    leads, bucket_counts = fetch_stale_leads(args.batch, args.ssh, args.ssh_user, args.psql_cmd)
    n_a = bucket_counts.get('A', 0)
    n_b = bucket_counts.get('B', 0)
    n_c = bucket_counts.get('C', 0)
    n_d = bucket_counts.get('D', 0)
    print(f'Buckets: A={n_a}, B={n_b}, C={n_c}, D={n_d} (skipped)')
    print(f'Leads para procesar: {len(leads)}')
    if not leads:
        print('Sin leads para procesar')
        return

    stats = {'processed': 0, 'updated': 0, 'no_match': 0, 'no_rating': 0, 'errors': 0}
    resultados = []  # per-lead detail list for the 'leads' JSONB field

    if args.persist:
        PERSIST_DIR.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as p:
        launch_kwargs = {'headless': headless, 'args': ['--no-sandbox', '--disable-blink-features=AutomationControlled']}
        browser = p.chromium.launch(**launch_kwargs)
        if args.persist:
            ctx = browser.new_context(user_agent=USER_AGENT, viewport={'width': 1280, 'height': 800},
                                      locale='es-ES', storage_state=str(PERSIST_DIR / 'storage.json') if (PERSIST_DIR / 'storage.json').exists() else None)
        else:
            ctx = browser.new_context(user_agent=USER_AGENT, viewport={'width': 1280, 'height': 800}, locale='es-ES')
        page = ctx.new_page()

        try:
            for lead in leads:
                bucket_label = lead.get('bucket', '?')
                print(f'-- Lead {lead["id"]} [B={bucket_label}]: "{lead["nombre"]}" (loc="{lead["localidad"]}")')
                stats['processed'] += 1
                t0 = time.time()
                lead_result = {
                    'id': lead['id'],
                    'nombre_comercial': lead['nombre'],
                    'sector': lead['categoria'],
                    'telefono': lead['telefono'],
                    'localidad': lead['localidad'],
                    'bucket': bucket_label,
                    'match_status': None,
                    'rating_nuevo': None,
                    'reviews_nuevo': None,
                }
                try:
                    info = search_gmaps(page, lead['nombre'], lead['localidad'])
                    elapsed = time.time() - t0
                    if not info:
                        stats['no_match'] += 1
                        lead_result['match_status'] = 'no_match'
                        print(f'   sin resultado ({elapsed:.1f}s)')
                        resultados.append(lead_result)
                        continue
                    name = info['name']
                    rating = float(info['rating'])  # parseFloat desde JS devuelve number, pero por si acaso
                    reviews = int(info['reviews'])
                    print(f'   "{name}" {rating} ({reviews}) [{elapsed:.1f}s]')
                    if rating <= 0 or reviews <= 0:
                        stats['no_rating'] += 1
                        lead_result['match_status'] = 'no_rating'
                        print(f'   rating 0, saltado')
                        resultados.append(lead_result)
                        continue
                    if dry_run:
                        print(f'   (dry-run) update lead {lead["id"]} con {rating}/{reviews}')
                        stats['updated'] += 1
                        lead_result['match_status'] = 'updated'
                        lead_result['rating_nuevo'] = rating
                        lead_result['reviews_nuevo'] = reviews
                        resultados.append(lead_result)
                    else:
                        out = update_lead(lead['id'], rating, reviews, args.ssh, args.ssh_user, args.psql_cmd)
                        if out.strip():
                            stats['updated'] += 1
                            lead_result['match_status'] = 'updated'
                            lead_result['rating_nuevo'] = rating
                            lead_result['reviews_nuevo'] = reviews
                            print(f'   ✓ actualizado')
                        else:
                            stats['errors'] += 1
                            lead_result['match_status'] = 'error'
                            print(f'   ✗ update no devolvió nada')
                        resultados.append(lead_result)
                except Exception as e:
                    stats['errors'] += 1
                    lead_result['match_status'] = 'error'
                    print(f'   ERROR: {e}')
                    resultados.append(lead_result)
                time.sleep(1)  # rate limit politeness
        finally:
            if args.persist:
                ctx.storage_state(path=str(PERSIST_DIR / 'storage.json'))
            browser.close()

    print('\n=== RESUMEN ===')
    for k, v in stats.items():
        print(f'  {k}: {v}')
    try:
        log_evento_cron(stats, args.batch, dry_run, args.ssh, args.ssh_user, args.psql_cmd, resultados, bucket_counts)
        print(f'  evento CRON_RUN registrado en sistema.eventos_sistema')
    except Exception as e:
        print(f'  WARN no pude registrar evento CRON_RUN: {e}')


if __name__ == '__main__':
    main()
