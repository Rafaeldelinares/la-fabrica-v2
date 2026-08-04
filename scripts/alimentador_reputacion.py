#!/usr/bin/env python3
"""
alimentador_reputacion.py
==========================

Recorre leads con `reputacion_at` viejo en operaciones.leads del VPS,
los refresca usando el motor Go local (`localhost:8092`) y actualiza la
base de producción.

Uso:
    python3 scripts/alimentador_reputacion.py --vps --scraper gosom --batch 100
    python3 scripts/alimentador_reputacion.py --dry-run --batch 10

Argumentos:
    --batch N        Procesa hasta N leads (default 100).
    --vps            Escribe en VPS vía SSH (default: dry-run).
    --scraper TYPE   Tipo de scraper para el motor Go (gosom|nano|heavy).
    --max-age DAYS   Solo leads con reputacion_at más viejos que DAYS (default 180).
    --query-format F Formato de query: "{nombre} {localidad}" (default)
                                  o "nombre" para usar solo el nombre.
    --ssh HOST       Host SSH para VPS (default root@72.60.191.179).
    --psql-cmd CMD   Comando psql dentro del VPS (default
                     `docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness`).

Variables de entorno (opcionales):
    VpsSSHUser       Usuario SSH (default root).
    VpsSSHHost       Host SSH (default 72.60.191.179).
    MotorEndpoint    URL del motor Go (default http://localhost:8092).
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
import urllib.request
import urllib.error

DEFAULT_VPS_HOST = os.environ.get('VpsSSHHost', '72.60.191.179')
DEFAULT_VPS_USER = os.environ.get('VpsSSHUser', 'root')
DEFAULT_MOTOR = os.environ.get('MotorEndpoint', 'http://localhost:8092')


def ssh_psql(sql: str, host: str, user: str, psql_cmd: str) -> str:
    """Run a SQL statement on the VPS PostgreSQL via SSH + docker exec.

    Returns the combined stdout. Raises on failure.
    """
    # Single-quote-escape for SQL: replace ' with '\''
    safe_sql = sql.replace("'", "'\\''")
    cmd = [
        'ssh', '-o', 'BatchMode=yes', '-o', 'ConnectTimeout=10',
        f'{user}@{host}',
        f"{psql_cmd} -Atc '{safe_sql}'"
    ]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if r.returncode != 0:
        raise RuntimeError(f'ssh_psql failed: {r.stderr.strip()[:300]}')
    return r.stdout


def fetch_stale_leads(batch: int, max_age_days: int, host: str, user: str, psql_cmd: str) -> list:
    sql = (
        "SELECT id, COALESCE(nombre_comercial,''), COALESCE(localidad,''), "
        "COALESCE(provincia,'') FROM operaciones.leads "
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
        parts = line.split('|', 3)
        if len(parts) != 4:
            continue
        leads.append({
            'id': int(parts[0]),
            'nombre': parts[1],
            'localidad': parts[2],
            'provincia': parts[3],
        })
    return leads


def scrape_via_motor(query: str, motor: str, depth: int = 5, timeout: int = 200) -> dict:
    payload = json.dumps({
        'query': {
            'q': query,
            'depth': depth,
            'preload': False,
            'scraper': 'gosom',
        }
    }).encode('utf-8')
    req = urllib.request.Request(
        f'{motor.rstrip("/")}/webhook/scraper/go',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return json.loads(r.read())


def normalize_result(result: dict) -> list:
    """The motor returns either `items` (list mode) or `data` (detail mode).

    We always want a flat list of {name, rating, reviews}.
    """
    out = []
    items = result.get('items') or []
    for it in items:
        out.append({
            'name': it.get('name') or it.get('title') or '',
            'rating': it.get('rating') or 0,
            'reviews': it.get('reviews') or it.get('review_count') or 0,
        })
    data = result.get('data')
    if isinstance(data, dict) and data:
        out.append({
            'name': data.get('name') or data.get('title') or '',
            'rating': data.get('rating') or 0,
            'reviews': data.get('reviews') or data.get('review_count') or 0,
        })
    return out


def find_best_match(items: list, target_nombre: str) -> dict:
    """Pick the item whose name best matches the target by normalized token overlap."""
    if not items:
        return None
    norm_target = re.sub(r'\s+', ' ', target_nombre.lower()).strip()
    target_tokens = set(norm_target.split())
    if not target_tokens:
        return items[0]

    def score(item):
        name = re.sub(r'\s+', ' ', (item.get('name') or '').lower()).strip()
        item_tokens = set(name.split())
        if not item_tokens:
            return -1
        # Bonus si el nombre coincide con el target (caso detail mode)
        if name == norm_target:
            return 100
        return len(target_tokens & item_tokens)

    return max(items, key=score)


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
                    dry_run: bool, host: str, user: str, psql_cmd: str) -> str:
    """Inserta un evento CRON_RUN en sistema.eventos_sistema.

    El campo `detalles` (jsonb) lleva el resumen de la corrida para que el
    admin lo vea en la Agenda Global.
    """
    detalles = {
        'cron':           'alimentador_reputacion',
        'batch_size':     batch_size,
        'max_age_days':   max_age,
        'processed':      stats.get('processed', 0),
        'updated':        stats.get('updated', 0),
        'no_match':       stats.get('no_match', 0),
        'no_rating':      stats.get('no_rating', 0),
        'errors':         stats.get('errors', 0),
        'dry_run':        dry_run,
    }
    sql = (
        "INSERT INTO sistema.eventos_sistema (tipo_evento, detalles, fecha_evento) "
        "VALUES ('CRON_RUN', '%s'::jsonb, NOW()) RETURNING id;" % (
            json.dumps(detalles).replace("'", "''"),
        )
    )
    return ssh_psql(sql, host, user, psql_cmd)


def main():
    p = argparse.ArgumentParser(description='Refresca reputacion_at en leads stale')
    p.add_argument('--batch', type=int, default=100)
    p.add_argument('--vps', action='store_true',
                   help='Aplicar updates en el VPS (sin esto, dry-run).')
    p.add_argument('--dry-run', action='store_true',
                   help='Alias explícito de no --vps. Solo imprime sin escribir.')
    p.add_argument('--scraper', default='gosom')
    p.add_argument('--max-age', type=int, default=180,
                   help='Solo leads con reputacion_at más viejo que N días (default 180).')
    p.add_argument('--query-format', choices=('full', 'name'),
                   default='full',
                   help='"full" = "{nombre} {localidad}"; "name" = solo el nombre.')
    p.add_argument('--ssh', default=DEFAULT_VPS_HOST)
    p.add_argument('--ssh-user', default=DEFAULT_VPS_USER)
    p.add_argument('--psql-cmd', default='docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness')
    p.add_argument('--motor', default=DEFAULT_MOTOR)
    p.add_argument('--depth', type=int, default=5)
    args = p.parse_args()

    dry_run = not args.vps
    if dry_run:
        print('=== DRY RUN (no se aplican cambios) ===')
    else:
        print('=== MODO PRODUCCIÓN: VPS = %s ===' % args.ssh)

    print('Leyendo leads stale (batch=%d, max-age=%dd) ...' % (args.batch, args.max_age))
    leads = fetch_stale_leads(args.batch, args.max_age, args.ssh, args.ssh_user, args.psql_cmd)
    print('Leads encontrados: %d' % len(leads))

    stats = {
        'processed': 0,
        'updated': 0,
        'no_match': 0,
        'no_rating': 0,
        'errors': 0,
    }

    for lead in leads:
        if args.query_format == 'full':
            parts = [lead['nombre']]
            if lead['localidad']:
                parts.append(lead['localidad'])
            query = ' '.join(parts)
        else:
            query = lead['nombre']

        print('-- Lead %d: "%s" (q="%s")' % (lead['id'], lead['nombre'], query))
        stats['processed'] += 1

        try:
            t0 = time.time()
            result = scrape_via_motor(query, args.motor, depth=args.depth)
            latency_ms = result.get('response_time', 0)
            items = normalize_result(result)
            elapsed = time.time() - t0
            print('   scraper %d items (type=%s), latency %.1fs (motor %.0fms) cached=%s' % (
                len(items), result.get('type'), elapsed, latency_ms, result.get('cached'),
            ))

            match = find_best_match(items, lead['nombre'])
            if not match:
                stats['no_match'] += 1
                print('   sin coincidencia; saltado')
                continue
            rating = float(match.get('rating') or 0)
            reviews = int(match.get('reviews') or 0)
            print('   match: "%s" rating=%.2f reviews=%d' % (
                match.get('name'), rating, reviews,
            ))

            # FIX cache contamination: si el match viene de cache (cached=True) y
            # tiene rating=0, es muy probable que el cache esté contaminado (otro
            # business con key similar). Reintentamos con cache-bust (nonce en q)
            # para forzar una consulta fresca y detectar el false-negative.
            if rating <= 0 and result.get('cached'):
                import uuid as _uuid
                bust_query = f"{query} __bust={_uuid.uuid4().hex[:8]}"
                print('   match cached con rating=0 — retry sin cache (nonce)...')
                result2 = scrape_via_motor(bust_query, args.motor, depth=args.depth)
                items2 = normalize_result(result2)
                match2 = find_best_match(items2, lead['nombre'])
                if match2 and float(match2.get('rating') or 0) > 0:
                    print(f'   retry OK: match2="{match2.get("name")}" rating={match2.get("rating")} reviews={match2.get("reviews")} cached={result2.get("cached")}')
                    match = match2
                    rating = float(match2.get('rating') or 0)
                    reviews = int(match2.get('reviews') or 0)
                else:
                    print(f'   retry sigue rating=0 — genuine, no es cache bug')

            if rating <= 0:
                stats['no_rating'] += 1
                print('   rating 0, saltado')
                continue

            if dry_run:
                print('   (dry-run) update lead %d' % lead['id'])
                stats['updated'] += 1
            else:
                out = update_lead(lead['id'], rating, reviews,
                                  args.ssh, args.ssh_user, args.psql_cmd)
                if out.strip():
                    stats['updated'] += 1
                    print('   ✓ actualizado')
                else:
                    stats['errors'] += 1
                    print('   ✗ update no devolvió nada')

        except (urllib.error.URLError, TimeoutError) as e:
            stats['errors'] += 1
            print('   ERROR red/scraper: %s' % e)
            time.sleep(2)
        except subprocess.SubprocessError as e:
            stats['errors'] += 1
            print('   ERROR ssh/psql: %s' % e)
        except Exception as e:
            stats['errors'] += 1
            print('   ERROR: %s' % e)

        time.sleep(0.3)

    print('\n=== RESUMEN ===')
    for k, v in stats.items():
        print('  %s: %d' % (k, v))

    # Loggear el run en sistema.eventos_sistema para que aparezca en la
    # Agenda Global del admin. Solo si NO es dry-run (en dry-run no tocamos
    # la DB de eventos para no contaminar el histórico).
    if not dry_run:
        try:
            out = log_evento_cron(
                stats, args.batch, args.max_age, dry_run,
                args.ssh, args.ssh_user, args.psql_cmd,
            )
            if out.strip():
                print('  evento CRON_RUN registrado en sistema.eventos_sistema (id=%s)' % out.strip())
            else:
                print('  ⚠️ no se pudo registrar el evento de cron')
        except subprocess.SubprocessError as e:
            print('  ⚠️ fallo al registrar el evento de cron: %s' % e)

        # Auto-reparación: si hay errores o tasa de actualización muy baja,
        # registrar un evento REPAIR_GBP para que el admin lo vea en la agenda.
        processed = stats.get('processed', 0)
        updated   = stats.get('updated', 0)
        errors    = stats.get('errors', 0)
        no_rating = stats.get('no_rating', 0)
        update_rate = (updated / processed) if processed > 0 else 0.0
        repair_reasons = []
        if errors > 0:
            repair_reasons.append('errors=%d' % errors)
        if processed > 0 and update_rate < 0.3:
            repair_reasons.append('low_rate=%.0f%%' % (update_rate * 100))
        if processed > 0 and no_rating > processed * 0.7:
            repair_reasons.append('too_many_no_rating=%d/%d' % (no_rating, processed))
        if repair_reasons:
            try:
                sql = (
                    "INSERT INTO sistema.eventos_sistema (tipo_evento, detalles, fecha_evento) "
                    "VALUES ('REPAIR_GBP', '%s'::jsonb, NOW()) RETURNING id;"
                    % json.dumps({
                        'source': 'alimentador_reputacion',
                        'reasons': repair_reasons,
                        'processed': processed,
                        'updated': updated,
                        'errors': errors,
                        'no_rating': no_rating,
                        'update_rate': update_rate,
                    }).replace("'", "''")
                )
                r = ssh_psql(sql, args.ssh, args.ssh_user, args.psql_cmd)
                if r.strip():
                    print('  ⚙️ evento REPAIR_GBP registrado (id=%s) por: %s' % (r.strip(), ', '.join(repair_reasons)))
            except subprocess.SubprocessError as e:
                print('  ⚠️ fallo al registrar REPAIR_GBP: %s' % e)


if __name__ == '__main__':
    sys.exit(main())