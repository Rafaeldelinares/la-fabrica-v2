#!/usr/bin/env python3
"""
alimentador_reputacion.py
==========================

Recorre leads con `reputacion_at` viejo en operaciones.leads del VPS,
los refresca usando el wrapper ZFold8 (`http://100.79.58.49:8095`) y
actualiza la base de producción.

Uso:
    python3 scripts/alimentador_reputacion.py --vps --batch 100
    python3 scripts/alimentador_reputacion.py --dry-run --batch 10

Argumentos:
    --batch N        Procesa hasta N leads (default 100).
    --vps            Escribe en VPS vía SSH (default: dry-run).
    --max-age DAYS   Solo leads con reputacion_at más viejos que DAYS (default 180).
    --query-format F Formato de query: "{nombre} {localidad}" (default)
                                  o "nombre" para usar solo el nombre.
    --ssh HOST       Host SSH para VPS (default root@72.60.191.179).
    --psql-cmd CMD   Comando psql dentro del VPS (default
                     `docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness`).
    --wrapper URL    URL del wrapper ZFold8. Default http://127.0.0.1:8095 (loopback,
                   asume script corriendo en el mismo ZFold). Usar
                   http://100.79.58.49:8095 si corrés desde otra máquina.
    --depth N        Profundidad del scrape gosom (1-3, default 1).
    --timeout SEC    Timeout por lead (default 180s).

Variables de entorno (opcionales):
    VpsSSHUser       Usuario SSH (default root).
    VpsSSHHost       Host SSH (default 72.60.191.179).
    ZfoldWrapper     URL del wrapper ZFold8 (default http://100.79.58.49:8095).
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

# Por defecto, hablar con el wrapper en loopback (asumiendo que este script corre
# en el mismo dispositivo ZFold donde vive el wrapper gosom). Para ejecutarlo desde
# otra máquina (VPS, portátil), pasar --wrapper http://100.79.58.49:8095 o setear
# la variable de entorno ZfoldWrapper.
DEFAULT_ZFOLD_WRAPPER = os.environ.get('ZfoldWrapper', 'http://127.0.0.1:8095')


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


def scrape_via_zfold(query: str, wrapper: str, depth: int = 1, timeout: int = 180) -> dict:
    """Call ZFold8 gosom wrapper /run endpoint. Returns parsed JSON or {error: ...}.

    Wrapper contract (gosom_wrapper.py v3.1+):
      POST http://100.79.58.49:8095/run
      Body: {"query": "Hotel Posada ...", "depth": 1}
      Returns: {"ok": true, "rows": N, "data": [{...gosom row...}]}

    gosom row schema (subset we care about):
      {title, address, phone, web_site, review_rating, review_count, ...}
    """
    payload = json.dumps({'query': query, 'depth': depth}).encode('utf-8')
    req = urllib.request.Request(
        f'{wrapper.rstrip("/")}/run',
        data=payload,
        headers={'Content-Type': 'application/json'},
        method='POST',
    )
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            return json.loads(r.read())
    except (urllib.error.URLError, TimeoutError) as e:
        return {'ok': False, 'error': 'wrapper_unreachable', 'detail': str(e)}


def normalize_result(result: dict) -> list:
    """Map ZFold8 /run response to a flat list of {name, rating, reviews}.

    ZFold8 returns: {"ok": true, "rows": N, "data": [<row>, ...]} or {"ok": false, "error": ...}.
    Each row contains review_rating + review_count (gosom canonical names).
    """
    if not result.get('ok'):
        return []
    data = result.get('data') or []
    if not data and result.get('rows'):
        # Backward compatibility if wrapper uses "rows" key instead
        data = result.get('rows') if isinstance(result.get('rows'), list) else []
    out = []
    for row in data:
        if not isinstance(row, dict):
            continue
        out.append({
            'name': row.get('title') or row.get('name') or '',
            'rating': float(row.get('review_rating') or row.get('rating') or 0),
            'reviews': int(row.get('review_count') or row.get('reviews') or 0),
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


# Legacy aliases retained for downstream call sites that still pass motor=...
def scrape_via_motor(query: str, motor: str, depth: int = 5, timeout: int = 200) -> dict:
    """Deprecated: kept for backward compatibility. Routes old callers to ZFold wrapper."""
    return scrape_via_zfold(query, motor, depth=min(depth, 3), timeout=timeout)


def update_lead(lead_id: int, rating, reviews: int, categoria: str,
                  place_id: str, google_cid: str, google_maps_link: str,
                  direccion: str, host: str, user: str, psql_cmd: str) -> str:
    """Persist a scraped reputation snapshot on the lead.

    Every column is set only when a non-empty value is scraped — using
    COALESCE-style conditional SETs so we never wipe good existing data.

    Reputation fields are always overwritten (they are the whole point).
    """
    def q(value):
        """Quote a string for SQL; returns '' for empty."""
        if not value:
            return ""
        return "'" + str(value).replace("'", "''") + "'"

    set_parts = []
    for col, val in [
        ("categoria", categoria),
        ("place_id", place_id),
        ("google_cid", google_cid),
        ("google_maps_link", google_maps_link),
        ("direccion", direccion),
    ]:
        quoted = q(val)
        if quoted:
            set_parts.append("%s = %s" % (col, quoted))
    extra_sets = ", ".join(set_parts) + (", " if set_parts else "")

    sql = (
        "UPDATE operaciones.leads SET "
        "%s"
        "rating = %.2f, num_reseñas = %d, scoring = %.2f, reputacion_at = NOW() "
        "WHERE id = %d RETURNING id;" % (
            extra_sets,
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
    p = argparse.ArgumentParser(description='Refresca reputacion_at en leads stale vía ZFold8')
    p.add_argument('--batch', type=int, default=100)
    p.add_argument('--vps', action='store_true',
                   help='Aplicar updates en el VPS (sin esto, dry-run).')
    p.add_argument('--dry-run', action='store_true',
                   help='Alias explícito de no --vps. Solo imprime sin escribir.')
    p.add_argument('--max-age', type=int, default=180,
                   help='Solo leads con reputacion_at más viejo que N días (default 180).')
    p.add_argument('--query-format', choices=('full', 'name'),
                   default='full',
                   help='"full" = "{nombre} {localidad}"; "name" = solo el nombre.')
    p.add_argument('--ssh', default=DEFAULT_VPS_HOST)
    p.add_argument('--ssh-user', default=DEFAULT_VPS_USER)
    p.add_argument('--psql-cmd', default='docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness')
    p.add_argument('--wrapper', default=DEFAULT_ZFOLD_WRAPPER,
                   help='URL del wrapper ZFold8 (default http://100.79.58.49:8095).')
    p.add_argument('--depth', type=int, default=1,
                   help='Profundidad gosom (1-3, default 1 — mínimo razonable para leads).')
    p.add_argument('--timeout', type=int, default=180,
                   help='Timeout por lead (default 180s).')
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
            result = scrape_via_zfold(query, args.wrapper, depth=args.depth, timeout=args.timeout)
            items = normalize_result(result)
            elapsed = time.time() - t0
            if not result.get('ok'):
                print('   ZFold error: %s' % result.get('error', 'unknown'))
            else:
                # result['rows'] viene como lista; usamos len() para el count.
                rows_count = len(result.get('rows') or [])
                print('   ZFold %d items, %.1fs (rows=%d)' % (
                    len(items), elapsed, rows_count,
                ))

            match = find_best_match(items, lead['nombre'])
            if not match:
                stats['no_match'] += 1
                print('   sin coincidencia; saltado')
                continue
            rating = float(match.get('rating') or 0)
            reviews = int(match.get('reviews') or 0)
            categoria = match.get('category') or match.get('categoria') or ''
            # Golden fields: the data the operator needs and the workflow system reuses.
            # These come for free from every gosom scrape; we just persist them.
            place_id = match.get('place_id') or ''
            google_cid = match.get('cid') or match.get('google_cid') or ''
            # If gosom didn't include `link`, build a Maps place-URL from the place_id.
            link = match.get('link') or ''
            if not link and place_id:
                link = f'https://www.google.com/maps/place/?q=place_id:{place_id}'
            direccion = match.get('address') or match.get('direccion') or ''
            print('   match: "%s" rating=%.2f reviews=%d cat="%s" place_id=%r' % (
                match.get('name'), rating, reviews, categoria, place_id or None,
            ))

            if rating <= 0:
                stats['no_rating'] += 1
                print('   rating 0, saltado')
                continue

            if dry_run:
                print('   (dry-run) update lead %d' % lead['id'])
                stats['updated'] += 1
            else:
                out = update_lead(lead['id'], rating, reviews, categoria,
                                  place_id, google_cid, link, direccion,
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