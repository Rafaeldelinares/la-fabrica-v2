#!/usr/bin/env python3
"""
seo_local_engine.py — Motor local de SEO Local para el CRM.

Lee job_queue de seo.job_queue en la DB del VPS via SSH tunnel,
ejecuta auditorias de fichas Google Maps por CID, escribe resultados
de vuelta a la DB (audit_runs, alerts, nap_baseline).

Phase 1: solo AUDIT_PROFILE esta implementado. PULL_REVIEWS y
RANKING_GRID vendran en phases 2 y 3.

Uso:
  python3 scripts/seo_local_engine.py --once     # corre 1 job y sale
  python3 scripts/seo_local_engine.py --loop     # corre continuamente
  python3 scripts/seo_local_engine.py --seed     # crea jobs iniciales
"""

import argparse
import json
import os
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import psycopg2
from urllib.parse import quote

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

try:
    from playwright_stealth import Stealth
    HAS_STEALTH = True
except ImportError:
    HAS_STEALTH = False
    Stealth = None

# ─── Configuration ─────────────────────────────────────────────────────────────
VPS_HOST = os.environ.get('VPS_HOST', '72.60.191.179')
VPS_USER = os.environ.get('VPS_USER', 'root')
VPS_DB_HOST = os.environ.get('VPS_DB_HOST', 'localhost')  # SSH tunnel port forward
VPS_DB_PORT = os.environ.get('VPS_DB_PORT', '5433')
VPS_DB_NAME = os.environ.get('VPS_DB_NAME', 'crm_bybusiness')
VPS_DB_USER = os.environ.get('VPS_DB_USER', 'rafael_admin')
VPS_DB_PASSWORD = os.environ.get('VPS_DB_PASSWORD', '')

USER_AGENT = (
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 '
    '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
)
PERSIST_DIR = Path('/var/lib/fabrica/playwright-seo')
LOOP_SLEEP_SECONDS = 30

# ─── DB connection via SSH tunnel ──────────────────────────────────────────────


def get_db_conn():
    """Return a psycopg2 connection to the VPS DB via SSH tunnel.
    Requires an active SSH tunnel: ssh -L 5433:localhost:5432 root@VPS_HOST"""
    conn = psycopg2.connect(
        host=VPS_DB_HOST,
        port=VPS_DB_PORT,
        dbname=VPS_DB_NAME,
        user=VPS_DB_USER,
        password=VPS_DB_PASSWORD,
        connect_timeout=10,
    )
    conn.autocommit = False
    return conn


# ─── Job management ────────────────────────────────────────────────────────────


def claim_job(conn):
    """Atomically claim the highest-priority pending job using FOR UPDATE SKIP LOCKED.
    Returns a dict with job fields or None if the queue is empty."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE seo.job_queue
            SET status = 'running', started_at = NOW()
            WHERE id = (
                SELECT id FROM seo.job_queue
                WHERE status = 'pending' AND scheduled_for <= NOW()
                ORDER BY priority ASC, scheduled_for ASC
                LIMIT 1
                FOR UPDATE SKIP LOCKED
            )
            RETURNING id, location_id, google_cid, job_type, priority,
                      scheduled_for, created_at;
        """)
        row = cur.fetchone()
        if row is None:
            return None
        conn.commit()
        return {
            'id': row[0],
            'location_id': row[1],
            'google_cid': row[2],
            'job_type': row[3],
            'priority': row[4],
            'scheduled_for': row[5],
            'created_at': row[6],
        }


def complete_job(conn, job_id, status, error=None, result_summary=None):
    """Mark a job as done/failed/skipped."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE seo.job_queue
            SET status = %s,
                completed_at = NOW(),
                error = %s,
                result_summary = %s
            WHERE id = %s;
        """, (status, error, json.dumps(result_summary) if result_summary else None, job_id))
        conn.commit()


def seed_jobs(conn):
    """Create AUDIT_PROFILE jobs for all monitored locations that are due."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seo.job_queue (location_id, google_cid, job_type, priority, scheduled_for)
            SELECT l.id, l.google_cid, 'AUDIT_PROFILE', 5, NOW()
            FROM seo.locations l
            WHERE l.is_monitored = TRUE
              AND (l.last_audit_at IS NULL
                   OR l.last_audit_at < NOW() - (l.audit_frequency_hours || ' hours')::interval)
            ON CONFLICT (location_id, job_type, scheduled_for) DO NOTHING
            RETURNING id;
        """)
        rows = cur.fetchall()
        conn.commit()
        return len(rows)


# ─── Location helpers ─────────────────────────────────────────────────────────


def update_location_audit_time(conn, location_id):
    """Update last_audit_at after a successful audit."""
    with conn.cursor() as cur:
        cur.execute("""
            UPDATE seo.locations
            SET last_audit_at = NOW(), updated_at = NOW()
            WHERE id = %s;
        """, (location_id,))
        conn.commit()


# ─── Playwright helpers (reused from alimentador_reputacion_pw.py) ─────────────


def handle_consent(page):
    """Click the consent dialog if it appears. Returns True if handled."""
    for sel in [
        'button:has-text("Aceptar todo")', 'button:has-text("Accept all")',
        'button:has-text("Rechazar todo")', 'button:has-text("Reject all")',
        'form button',
    ]:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1000):
                btn.click()
                page.wait_for_timeout(2000)
                return True
        except Exception:
            pass
    return False


CID_REGEX = re.compile(r'0x([0-9a-f]+):0x([0-9a-f]+)', re.IGNORECASE)


def safe_cid_filename(cid: str) -> str:
    """Make CID safe for use as a filename."""
    return cid.replace(':', '_').replace('0x', '')


# ─── Domain matching helpers ───────────────────────────────────────────────────


def normalize_domain(url):
    """Extract hostname from URL, stripping www. prefix."""
    if not url:
        return ''
    url = url.strip()
    if not url.startswith('http'):
        url = 'http://' + url
    try:
        from urllib.parse import urlparse
        host = urlparse(url).hostname or ''
        if host.startswith('www.'):
            host = host[4:]
        return host.lower()
    except Exception:
        return ''


def domain_matches(url1, url2):
    """True if both URLs share the same normalized hostname."""
    d1 = normalize_domain(url1)
    d2 = normalize_domain(url2)
    return bool(d1) and bool(d2) and d1 == d2


# ─── Profile audit ─────────────────────────────────────────────────────────────


def audit_profile(page, cid):
    """Navigate to Google Maps place via CID and extract full NAP + metadata.
    Returns a dict with keys: name, rating, reviews, phone, address, website,
    category, success, consent_clicked, exit_reason, error, fields_scraped,
    pages_visited, duration_seconds."""
    started_at = datetime.now(timezone.utc)
    result = {
        'name': None,
        'rating': None,
        'reviews': None,
        'phone': None,
        'address': None,
        'website': None,
        'category': None,
        'success': False,
        'consent_clicked': False,
        'exit_reason': None,
        'error': None,
        'fields_scraped': [],
        'pages_visited': 1,
        'duration_seconds': 0,
    }

    url = f'https://www.google.com/maps/place/?cid={cid}'
    try:
        page.goto(url, wait_until='domcontentloaded', timeout=20000)
    except PWTimeout:
        result['exit_reason'] = 'timeout'
        result['error'] = 'Page load timeout'
        return result

    page.wait_for_timeout(5000)

    # Handle consent dialog
    if 'consent' in page.url or 'Antes de ir a Google Maps' in page.title():
        if handle_consent(page):
            result['consent_clicked'] = True
            page.wait_for_timeout(5000)

    # Wait for the rating element
    try:
        page.wait_for_selector('[role="img"][aria-label*="estrellas"]', timeout=10000)
    except PWTimeout:
        result['exit_reason'] = 'not_found'
        result['error'] = 'Rating element not found'
        return result

    # Extract all fields using a single evaluate call
    data = page.evaluate(r"""() => {
        const results = {};

        // Name (h1)
        const h1 = document.querySelector('h1');
        results.name = h1 ? h1.textContent.trim() : null;

        // Rating and reviews (role="img" with aria-label containing stars/resenas)
        const ratingEl = document.querySelector('[role="img"][aria-label*="estrellas"], [role="img"][aria-label*="stars"]');
        const reviewsEl = document.querySelector('[role="img"][aria-label*="reseñas"], [role="img"][aria-label*="reviews"]');
        results.rating_label = ratingEl ? ratingEl.getAttribute('aria-label') : null;
        results.reviews_label = reviewsEl ? reviewsEl.getAttribute('aria-label') : null;

        // Phone — data-item-id="phone" or aria-label containing "Telefono"
        const phoneBtn = document.querySelector('[data-item-id="phone"]');
        const phoneAlt = document.querySelector('[aria-label*="Teléfono"], [aria-label*="telefono"], [aria-label*="Phone"]');
        results.phone = phoneBtn
            ? phoneBtn.textContent.trim()
            : (phoneAlt ? phoneAlt.getAttribute('aria-label') : null);

        // Address — data-item-id="address" or aria-label containing "Direccion"
        const addrBtn = document.querySelector('[data-item-id="address"]');
        const addrAlt = document.querySelector('[aria-label*="Dirección"], [aria-label*="Direccion"], [aria-label*="Address"]');
        results.address = addrBtn
            ? addrBtn.textContent.trim()
            : (addrAlt ? addrAlt.getAttribute('aria-label') : null);

        // Website — data-item-id="authority"
        const webLink = document.querySelector('[data-item-id="authority"]');
        results.website = webLink ? webLink.href : null;

        // Category — button with jsaction containing "category"
        const catBtn = document.querySelector('[jsaction*="category"]');
        results.category = catBtn ? catBtn.textContent.trim() : null;

        return results;
    }""") or {}

    # Parse rating
    rating_label = data.get('rating_label') or ''
    reviews_label = data.get('reviews_label') or ''
    rating_match = re.search(r'(\d+[.,]\d+)', rating_label)
    reviews_match = re.search(r'(\d+)', reviews_label)
    if rating_match:
        try:
            result['rating'] = float(rating_match.group(1).replace(',', '.'))
            result['fields_scraped'].append('rating')
        except ValueError:
            pass
    if reviews_match:
        try:
            result['reviews'] = int(reviews_match.group(1))
            result['fields_scraped'].append('reviews')
        except ValueError:
            pass

    if data.get('name'):
        result['name'] = data['name']
        result['fields_scraped'].append('name')
    if data.get('phone'):
        result['phone'] = data['phone']
        result['fields_scraped'].append('phone')
    if data.get('address'):
        result['address'] = data['address']
        result['fields_scraped'].append('address')
    if data.get('website'):
        result['website'] = data['website']
        result['fields_scraped'].append('website')
    if data.get('category'):
        result['category'] = data['category']
        result['fields_scraped'].append('category')

    elapsed = (datetime.now(timezone.utc) - started_at).total_seconds()
    result['duration_seconds'] = int(elapsed)
    result['success'] = True
    result['exit_reason'] = 'success'
    return result


# ─── NAP comparison ───────────────────────────────────────────────────────────


def get_nap_baseline(conn, location_id):
    """Return the most recent NAP baseline for a location, or None."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT name, address, phone, website
            FROM seo.nap_baseline
            WHERE location_id = %s
            ORDER BY captured_at DESC
            LIMIT 1;
        """, (location_id,))
        row = cur.fetchone()
        if row:
            return {'name': row[0], 'address': row[1], 'phone': row[2], 'website': row[3]}
        return None


def upsert_nap_baseline(conn, location_id, audit_result):
    """Insert a new NAP baseline from audit data. Returns True if inserted."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seo.nap_baseline (location_id, name, address, phone, website)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            location_id,
            audit_result.get('name'),
            audit_result.get('address'),
            audit_result.get('phone'),
            audit_result.get('website'),
        ))
        row = cur.fetchone()
        conn.commit()
        return row is not None


def nap_changed(baseline, audit_result):
    """Return True if any NAP field differs from the baseline."""
    if baseline is None:
        return False
    for field in ('name', 'address', 'phone', 'website'):
        b_val = (baseline.get(field) or '').strip()
        a_val = (audit_result.get(field) or '').strip()
        if b_val != a_val:
            return True
    return False


def insert_alert(conn, location_id, google_cid, alert_type, message):
    """Insert an admin alert."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seo.admin_alerts (location_id, google_cid, alert_type, message)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
        """, (location_id, google_cid, alert_type, message))
        row = cur.fetchone()
        conn.commit()
        return row[0] if row else None


# ─── Audit run recording ───────────────────────────────────────────────────────


def insert_audit_run(conn, location_id, google_cid, started_at, audit_result):
    """Insert a row into seo.audit_runs."""
    with conn.cursor() as cur:
        cur.execute("""
            INSERT INTO seo.audit_runs
              (location_id, google_cid, started_at, finished_at,
               fields_scraped, pages_visited, duration_seconds,
               consent_clicked, exit_reason, error, raw_data)
            VALUES (%s, %s, %s, NOW(), %s, %s, %s, %s, %s, %s, %s)
            RETURNING id;
        """, (
            location_id,
            google_cid,
            started_at,
            audit_result.get('fields_scraped', []),
            audit_result.get('pages_visited', 1),
            audit_result.get('duration_seconds', 0),
            audit_result.get('consent_clicked', False),
            audit_result.get('exit_reason'),
            audit_result.get('error'),
            json.dumps({'data': audit_result}),
        ))
        row = cur.fetchone()
        conn.commit()
        return row[0] if row else None


# ─── SERP scraping ─────────────────────────────────────────────────────────────


def scrape_serp_for_keyword(page, keyword, target_domain):
    """Scrape Google SERP for keyword, return position of target_domain (1-20) or None.

    Strategy: navigate to Google with personalization disabled, parse top 10 results,
    look for target_domain, then fetch page 2 if not found in top 10.
    """
    positions = []  # list of (position, url, title)

    for page_num in [1, 2]:
        start = (page_num - 1) * 10
        url = (
            f'https://www.google.com/search?q={quote(keyword)}'
            f'&gl=es&hl=es&pws=0&num=10&start={start}'
        )
        try:
            page.goto(url, wait_until='domcontentloaded', timeout=20000)
            page.wait_for_timeout(2500)  # let results load
        except PWTimeout:
            continue

        # Handle consent if appears
        if 'consent' in page.url or 'consent.google.com' in page.url:
            try:
                consent_btn = page.locator(
                    'button:has-text("Aceptar todo"), button:has-text("Accept all")'
                ).first
                if consent_btn.is_visible(timeout=2000):
                    consent_btn.click()
                    page.wait_for_timeout(2000)
                    page.goto(url, wait_until='domcontentloaded', timeout=20000)
                    page.wait_for_timeout(2500)
            except Exception:
                pass

        # Extract organic results
        results = page.evaluate(r"""() => {
            const out = [];
            // Multiple selector strategies for resilience
            const containers = document.querySelectorAll('div.g, div[data-snf], div.MjjYud, div[jscontroller]');
            containers.forEach((c) => {
                const link = c.querySelector('a[href^="http"]:not([href*="google.com"]):not([href*="youtube.com"])');
                if (!link) return;
                const href = link.href;
                // Skip ads, knowledge panels, etc.
                if (href.includes('google.com/aclk') || href.includes('googleadservices')) return;
                const titleEl = c.querySelector('h3');
                out.push({
                    position: out.length + 1,
                    url: href,
                    title: titleEl ? titleEl.textContent.trim() : null
                });
            });
            return out;
        }""") or []

        for r in results:
            positions.append({
                'position': r['position'] + start,
                'page': page_num,
                'url': r['url'],
                'title': r['title']
            })

        # If we found target_domain on this page, no need to fetch page 2
        if any(domain_matches(r['url'], target_domain) for r in results):
            break

    # Find target_domain in results
    for r in positions:
        if domain_matches(r['url'], target_domain):
            return r

    return None  # not in top 20


# ─── SERP alert detection ───────────────────────────────────────────────────────


def check_serp_alerts(conn, keyword_id, current_position, client_id, keyword):
    """Two-tier alert detection. Returns list of created alert dicts.

    Critical: drop >5 in 1 day OR position > 20 (not in top 20 — implies was in)
    Warning: drop >3 vs 7-day average
    """
    alerts = []

    # 1. CRITICAL: drop >5 in 1 day
    with conn.cursor() as cur:
        cur.execute("""
            SELECT position FROM seo.serp_positions
            WHERE keyword_id = %s AND scraped_at < NOW() - INTERVAL '1 day'
            ORDER BY scraped_at DESC LIMIT 1;
        """, (keyword_id,))
        yesterday = cur.fetchone()

        if yesterday and yesterday[0] is not None:
            dropped = yesterday[0] - current_position  # positive = dropped (worse)
            if dropped > 5:
                msg = (
                    f"[CRITICAL] '{keyword}' dropped {dropped} positions in 1 day "
                    f"(yesterday: {yesterday[0]}, today: {current_position})"
                )
                cur.execute("""
                    INSERT INTO seo.admin_alerts (client_id, google_cid, alert_type, message)
                    SELECT %s, l.google_cid, 'RANK_DROP', %s
                    FROM seo.locations l
                    WHERE l.id = (SELECT location_id FROM seo.keywords WHERE id = %s LIMIT 1);
                """, (client_id, msg, keyword_id))
                conn.commit()
                alerts.append({'type': 'RANK_DROP', 'level': 'critical', 'message': msg})

    # 2. CRITICAL: salió del top 20 (current_position > 20)
    if current_position > 20:
        with conn.cursor() as cur:
            msg = (
                f"[CRITICAL] '{keyword}' dropped out of top 20 "
                f"(now at position {current_position})"
            )
            cur.execute("""
                INSERT INTO seo.admin_alerts (client_id, google_cid, alert_type, message)
                SELECT %s, l.google_cid, 'RANK_DROP', %s
                FROM seo.locations l
                WHERE l.id = (SELECT location_id FROM seo.keywords WHERE id = %s LIMIT 1);
            """, (client_id, msg, keyword_id))
            conn.commit()
            alerts.append({'type': 'RANK_DROP', 'level': 'critical', 'message': msg})

    # 3. WARNING: drop >3 vs 7-day average
    with conn.cursor() as cur:
        cur.execute("""
            SELECT AVG(position) AS avg_pos FROM seo.serp_positions
            WHERE keyword_id = %s
              AND scraped_at BETWEEN NOW() - INTERVAL '7 days' AND NOW() - INTERVAL '1 day'
              AND position IS NOT NULL;
        """, (keyword_id,))
        avg_row = cur.fetchone()
        if avg_row and avg_row[0] is not None:
            avg = float(avg_row[0])
            dropped = avg - current_position
            if dropped > 3:
                msg = (
                    f"[WARNING] '{keyword}' dropped {dropped:.1f} positions "
                    f"vs 7-day avg ({avg:.1f} → {current_position})"
                )
                cur.execute("""
                    INSERT INTO seo.admin_alerts (client_id, google_cid, alert_type, message)
                    SELECT %s, l.google_cid, 'RANK_DROP', %s
                    FROM seo.locations l
                    WHERE l.id = (SELECT location_id FROM seo.keywords WHERE id = %s LIMIT 1);
                """, (client_id, msg, keyword_id))
                conn.commit()
                alerts.append({'type': 'RANK_DROP', 'level': 'warning', 'message': msg})

    return alerts


# ─── Job executor ──────────────────────────────────────────────────────────────


def run_job(conn, job, browser):
    """Execute a single job. Returns (status, error, result_summary)."""
    job_id = job['id']
    location_id = job['location_id']
    cid = job['google_cid']
    job_type = job['job_type']
    started_at = datetime.now(timezone.utc)

    print(f'  exit_reason=start')

    if job_type == 'AUDIT_PROFILE':
        return run_audit_profile(conn, job_id, location_id, cid, started_at, browser)
    elif job_type == 'SERP_KEYWORD':
        return run_serp_keyword_job(conn, job_id, location_id, browser)
    else:
        return 'skipped', f'Job type {job_type} not implemented in Phase 1', {}


def run_audit_profile(conn, job_id, location_id, cid, started_at, browser):
    """Run an AUDIT_PROFILE job."""
    safe_name = safe_cid_filename(cid)
    storage_file = PERSIST_DIR / f'cid_{safe_name}.json'

    PERSIST_DIR.mkdir(parents=True, exist_ok=True)

    # Per-CID persistent context (anti-ban)
    ctx = browser.new_context(
        user_agent=USER_AGENT,
        viewport={'width': 1280, 'height': 800},
        locale='es-ES',
        storage_state=str(storage_file) if storage_file.exists() else None,
    )
    page = ctx.new_page()
    try:
        audit_result = audit_profile(page, cid)
    finally:
        # Save persistent state for next run
        try:
            ctx.storage_state(path=str(storage_file))
        except Exception:
            pass
        ctx.close()

    run_id = insert_audit_run(conn, location_id, cid, started_at, audit_result)
    alert_count = 0

    if audit_result['success']:
        # Update location last_audit_at
        update_location_audit_time(conn, location_id)

        # NAP comparison
        baseline = get_nap_baseline(conn, location_id)
        if baseline is None:
            # First audit — silently set baseline
            upsert_nap_baseline(conn, location_id, audit_result)
        elif nap_changed(baseline, audit_result):
            # NAP changed — insert alert
            changes = []
            for field in ('name', 'address', 'phone', 'website'):
                b_val = (baseline.get(field) or '').strip()
                a_val = (audit_result.get(field) or '').strip()
                if b_val != a_val:
                    changes.append(f'{field}: "{b_val}" → "{a_val}"')
            msg = 'NAP change detected: ' + '; '.join(changes)
            insert_alert(conn, location_id, cid, 'NAP_CHANGE', msg)
            alert_count += 1
            # Update baseline to new values
            upsert_nap_baseline(conn, location_id, audit_result)

    result_summary = {
        'run_id': run_id,
        'exit_reason': audit_result.get('exit_reason'),
        'fields_scraped': audit_result.get('fields_scraped', []),
        'alerts_created': alert_count,
    }

    status = 'done' if audit_result.get('exit_reason') == 'success' else 'failed'
    error = audit_result.get('error')
    complete_job(conn, job_id, status, error, result_summary)

    return status, error, result_summary


def run_serp_keyword_job(conn, job_id, location_id, browser):
    """Run a SERP_KEYWORD job: scrape Google for keyword, store position, check alerts."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT k.id, k.keyword, k.target_domain, k.client_id
            FROM seo.keywords k
            WHERE k.location_id = %s AND k.is_active = TRUE
            LIMIT 1;
        """, (location_id,))
        kw = cur.fetchone()

    if not kw:
        complete_job(conn, job_id, 'skipped', error='no active keyword for this location')
        return 'skipped', 'no active keyword for this location', {}

    kw_id, keyword, target_domain, client_id = kw

    PERSIST_DIR.mkdir(parents=True, exist_ok=True)
    storage_file = PERSIST_DIR / f'serp_{kw_id}.json'

    ctx = browser.new_context(
        user_agent=USER_AGENT,
        viewport={'width': 1280, 'height': 800},
        locale='es-ES',
        storage_state=str(storage_file) if storage_file.exists() else None,
    )
    if HAS_STEALTH and Stealth is not None:
        stealth = Stealth()
        stealth.apply_stealth_sync(ctx)

    page = ctx.new_page()
    new_id = None
    position = None
    result_page = None
    exit_reason = 'error'

    try:
        start = time.time()
        result = scrape_serp_for_keyword(page, keyword, target_domain)
        duration = int(time.time() - start)

        with conn.cursor() as cur:
            if result:
                cur.execute("""
                    INSERT INTO seo.serp_positions
                    (keyword_id, client_id, position, page, url_found, title, scraped_at)
                    VALUES (%s, %s, %s, %s, %s, %s, NOW()) RETURNING id;
                """, (kw_id, client_id, result['position'], result['page'],
                      result['url'], result.get('title')))
                new_id = cur.fetchone()[0]
                position = result['position']
                result_page = result['page']
                job_status = 'done'
            else:
                # Not found in top 20 — store NULL position with page=2
                cur.execute("""
                    INSERT INTO seo.serp_positions
                    (keyword_id, client_id, position, page, scraped_at)
                    VALUES (%s, %s, NULL, 2, NOW()) RETURNING id;
                """, (kw_id, client_id))
                new_id = cur.fetchone()[0]
                result_page = 2
                job_status = 'done'  # scrape succeeded (not_found is exit_reason, not job status)
        conn.commit()  # commit serp_positions before alerts check

        # Alert detection (skip for not_found — no meaningful comparison)
        if position is not None:
            alerts = check_serp_alerts(conn, kw_id, position, client_id, keyword)
        else:
            alerts = []

        complete_job(conn, job_id, job_status,
                     result_summary={'serp_id': new_id, 'position': position,
                                    'duration': duration, 'alerts': len(alerts)})
        print(f'  → serp_id={new_id}, position={position}, page={result_page}, '
              f'duration={duration}s, alerts={len(alerts)}', flush=True)

        ctx.storage_state(path=str(storage_file))
        return job_status, None, {'position': position, 'alerts': len(alerts)}

    except Exception as e:
        complete_job(conn, job_id, 'error', error=str(e))
        print(f'  → SERP_KEYWORD ERROR: {e}', flush=True)
        return 'error', str(e), {}
    finally:
        ctx.close()


def process_one_job(browser):
    """Claim and process a single job. Returns True if a job was processed."""
    conn = get_db_conn()
    try:
        job = claim_job(conn)
        if job is None:
            return False
        print(f'[{job["id"]}] {job["job_type"]} for CID {job["google_cid"]}')
        status, error, result = run_job(conn, job, browser)
        if job['job_type'] == 'SERP_KEYWORD':
            print(f'  → serp_id={result.get("serp_id")}, position={result.get("position")}, exit={status}, alerts={result.get("alerts", 0)}')
        else:
            print(f'  → run_id={result.get("run_id")}, exit={result.get("exit_reason")}, alerts={result.get("alerts_created", 0)}')
        return True
    finally:
        conn.close()


def main():
    parser = argparse.ArgumentParser(description='SEO Local engine — Phase 1: AUDIT_PROFILE')
    parser.add_argument('--once', action='store_true', help='Process one job and exit')
    parser.add_argument('--loop', action='store_true', help='Run continuously')
    parser.add_argument('--seed', action='store_true', help='Seed job queue from due locations')
    parser.add_argument('--headless', action='store_true', default=True)
    parser.add_argument('--headed', action='store_true', help='Show browser window')
    args = parser.parse_args()

    headless = not args.headed

    if args.seed:
        conn = get_db_conn()
        try:
            count = seed_jobs(conn)
            print(f'Seeded {count} jobs')
        finally:
            conn.close()
        return

    with sync_playwright() as pw:
        launch_kwargs = {
            'headless': headless,
            'args': ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
        }
        browser = pw.chromium.launch(**launch_kwargs)

        if args.once:
            processed = process_one_job(browser)
            if not processed:
                print('No pending jobs')
            else:
                print('Done (1 job processed)')

        elif args.loop:
            print(f'Looping (sleep={LOOP_SLEEP_SECONDS}s between iterations)...')
            while True:
                try:
                    processed = process_one_job(browser)
                    if not processed:
                        print(f'[{datetime.now().isoformat(timespec="seconds")}] '
                              f'No pending jobs, sleeping...')
                    else:
                        print(f'[{datetime.now().isoformat(timespec="seconds")}] '
                              f'Job processed')
                except Exception as e:
                    print(f'Error in loop: {e}')
                time.sleep(LOOP_SLEEP_SECONDS)

        browser.close()


if __name__ == '__main__':
    main()
