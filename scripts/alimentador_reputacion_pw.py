#!/usr/bin/env python3
"""
alimentador_reputacion_pw.py — Playwright-based reputation feeder.

Busca Google Maps directamente via Chromium headless (bypassing gosom y su
problema de cache contamination). Para cada lead stale, lee rating y
review count actuales de Google Maps y hace UPDATE en la DB VPS.

vs gosom-based original:
  + datos siempre fresh (no contamination)
  + mas preciso (Google mismo elige el match)
  - ~10-15s por lead (vs 5-8s cached)
  - mas resource-intensive (Chromium process)
  - necesita manejar consent dialog la primera vez

Uso:
    python3 scripts/alimentador_reputacion_pw.py --vps --batch 10
    python3 scripts/alimentador_reputacion_pw.py --dry-run --batch 5

Argumentos:
    --batch N        Procesa hasta N leads (default 20).
    --vps            Escribe en VPS (default: dry-run).
    --max-age DAYS   Solo leads con reputacion_at mas viejos que DAYS (default 90).
    --headless       Run browser headless (default True).
    --headed         Show browser window (for debugging).
    --persist        Use persistent context (saves cookies between runs).
    --ssh HOST       Host SSH para VPS (default root@72.60.191.179).
    --psql-cmd CMD   Comando psql dentro del VPS (default
                     `docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness`).
"""
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


def ssh_psql(sql: str, host: str, user: str, psql_cmd: str) -> str:
    """Run a SQL statement on the VPS PostgreSQL via SSH + docker exec."""
    safe_sql = sql.replace("'", "'\\''")
    cmd = ['ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
           f'{user}@{host}', f"{psql_cmd} -Atc '{safe_sql}'"]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f'ssh_psql failed: {r.stderr.strip()[:300]}')
    return r.stdout


def fetch_stale_leads(batch: int, max_age_days: int, host: str, user: str, psql_cmd: str) -> list:
    # `leads` array contract (stored in sistema.eventos_sistema.detalles JSONB as 'leads'):
    #   id, nombre_comercial, sector (=categoria), telefono, localidad,
    #   match_status, rating_nuevo, reviews_nuevo
    sql = (
        "SELECT id, COALESCE(nombre_comercial,''), COALESCE(localidad,''), "
        "       COALESCE(telefono,''), COALESCE(categoria,'') "
        "FROM operaciones.leads "
        "WHERE es_simulacion = false AND estado = 'pendiente' "
        "  AND telefono IS NOT NULL AND telefono <> '' "
        "  AND nombre_comercial IS NOT NULL AND nombre_comercial <> '' "
        "  AND (reputacion_at IS NULL "
        "       OR reputacion_at < NOW() - INTERVAL '%d days') "
        "ORDER BY reputacion_at NULLS FIRST, scoring DESC NULLS LAST "
        "LIMIT %d;" % (max_age_days, batch)
    )
    raw = ssh_psql(sql, host, user, psql_cmd)
    leads = []
    for line in raw.splitlines():
        line = line.strip()
        if not line:
            continue
        parts = line.split('|', 5)
        if len(parts) >= 5:
            leads.append({
                'id': int(parts[0]),
                'nombre': parts[1],
                'localidad': parts[2],
                'telefono': parts[3],
                'categoria': parts[4],
            })
    return leads


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


def log_evento_cron(stats: dict, batch_size: int, max_age: int,
                    dry_run: bool, host: str, user: str, psql_cmd: str,
                    leads: list = None) -> str:
    detalles = {
        'cron': 'alimentador_reputacion_pw',
        'batch_size': batch_size,
        'max_age_days': max_age,
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
    p = argparse.ArgumentParser(description='Refresca reputacion via Playwright (Google Maps directo)')
    p.add_argument('--batch', type=int, default=20)
    p.add_argument('--vps', action='store_true',
                   help='Aplicar updates en el VPS (sin esto, dry-run).')
    p.add_argument('--max-age', type=int, default=90,
                   help='Solo leads con reputacion_at mas viejos que DAYS (default 90).')
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

    print(f'=== MODO: {"PRODUCCIÓN" if args.vps else "DRY-RUN"} (batch={args.batch}, max-age={args.max_age}d, headless={headless}, persist={args.persist}) ===')
    print(f'Leyendo leads stale...')
    leads = fetch_stale_leads(args.batch, args.max_age, args.ssh, args.ssh_user, args.psql_cmd)
    print(f'Leads encontrados: {len(leads)}')
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
                print(f'-- Lead {lead["id"]}: "{lead["nombre"]}" (loc="{lead["localidad"]}")')
                stats['processed'] += 1
                t0 = time.time()
                lead_result = {
                    'id': lead['id'],
                    'nombre_comercial': lead['nombre'],
                    'sector': lead['categoria'],
                    'telefono': lead['telefono'],
                    'localidad': lead['localidad'],
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
        log_evento_cron(stats, args.batch, args.max_age, dry_run, args.ssh, args.ssh_user, args.psql_cmd, resultados)
        print(f'  evento CRON_RUN registrado en sistema.eventos_sistema')
    except Exception as e:
        print(f'  WARN no pude registrar evento CRON_RUN: {e}')


if __name__ == '__main__':
    main()
