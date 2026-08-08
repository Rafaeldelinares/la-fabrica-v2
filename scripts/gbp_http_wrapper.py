#!/usr/bin/env python3
"""
gbp_http_wrapper.py — Persistent-session HTTP wrapper for gbp_ficha_audit.

Launches Chromium ONCE on startup and reuses the browser context across requests.
DB cache avoids re-scraping the same place_id within 24 hours.
Cache is optional — if DB is unreachable, falls back to always scraping.

Endpoints:
    GET  /run?place_id=X              → cache hit or fresh scrape
    GET  /run?place_id=X&refresh=true  → force fresh scrape
    GET  /run?place_id=X&deep=true    → force scrape with reviews pagination
    GET  /healthz                     → uptime + browser status

Cache TTL: 24 hours.  Cache table: clientes.gbp_audit_cache (postgres-vps).
On the VPS, cache operations use SSH + docker exec to the postgres container.
On local dev, uses psycopg2 direct connection.
"""

import argparse
import json
import os
import re as _extract_re
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

# ── Google Maps URL regex patterns ─────────────────────────────────────────────
PLACE_ID_RE = _extract_re.compile(r'1s(ChIJ[A-Za-z0-9_-]+)')
HEX_CID_RE  = _extract_re.compile(r'1s(0x[0-9a-fA-F]+:0x[0-9a-fA-F]+)')
DEC_CID_RE  = _extract_re.compile(r'1s(\d{10,20})')

# ── Config ────────────────────────────────────────────────────────────────────
CACHE_TTL_SECONDS = 86400  # 24 hours
SCRAPE_TIMEOUT_SEC = 60
DEFAULT_AUDIT_SOURCE = 'manual'

# Load scrape functions from sibling script
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
from gbp_ficha_audit import scrape_full_audit, _stealth, handle_consent

# ── Global browser state ───────────────────────────────────────────────────────
_pw = None
_browser = None
_context = None
_start_time = time.time()
_user_agent = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)


def load_cookies(cookies_path="/opt/fabrica/scripts/google_session.json"):
    """Load EditThisCookie JSON and add to browser context. Returns True on success."""
    global _context
    import os
    if not os.path.exists(cookies_path):
        sys.stderr.write(f"[init] No cookies file at {cookies_path} — limited-view mode\n")
        return False

    try:
        with open(cookies_path) as f:
            data = json.load(f)

        # Handle both formats
        if isinstance(data, list):
            cookies = data
        elif isinstance(data, dict) and 'cookies' in data:
            cookies = data['cookies']
        else:
            sys.stderr.write(f"[init] Unknown cookies file format: {type(data)}\n")
            return False

        # Convert EditThisCookie → Playwright format
        pw_cookies = []
        for c in cookies:
            ss = c.get('sameSite', 'unspecified')
            # Map to Playwright's enum (Strict/Lax/None)
            if ss not in ('Strict', 'Lax', 'None'):
                ss = 'None'

            expires = c.get('expirationDate')
            # Playwright: omit expires entirely for session cookies (None/-1/0)
            if expires is None or expires <= 0:
                expires = None

            cookie = {
                'name': c['name'],
                'value': c['value'],
                'domain': c['domain'],
                'path': c.get('path', '/'),
                'httpOnly': c.get('httpOnly', False),
                'secure': c.get('secure', False),
                'sameSite': ss,
            }
            if expires is not None:
                cookie['expires'] = expires

            pw_cookies.append(cookie)

        _context.add_cookies(pw_cookies)
        sys.stderr.write(f"[init] Loaded {len(pw_cookies)} cookies from {cookies_path}\n")
        return True
    except Exception as e:
        sys.stderr.write(f"[init] Failed to load cookies: {e}\n")
        return False


def init_browser():
    """Launch Chromium once. Pre-warm with Maps to set cookies."""
    global _pw, _browser, _context

    _pw = sync_playwright().start()
    _browser = _pw.chromium.launch(
        headless=True,
        args=[
            "--no-sandbox",
            "--disable-blink-features=AutomationControlled",
            "--disable-dev-shm-usage",
        ],
    )
    _context = _browser.new_context(
        user_agent=_user_agent,
        viewport={"width": 1280, "height": 900},
        locale="es-ES",
    )

    # Load session cookies if available
    load_cookies()

    # Pre-warm: visit Maps once to set cookies / pass consent
    page = _context.new_page()
    try:
        page.goto("https://www.google.com/maps/", timeout=15000, wait_until="domcontentloaded")
        time.sleep(2)
        handle_consent(page)
        time.sleep(1)
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] browser warmup: {e}\n")
    page.close()
    sys.stderr.write("[gbp_wrapper] browser initialized\n")


def _get_db_conn():
    """Return a psycopg2 connection to the VPS postgres via tunnel (localhost:5433)."""
    import psycopg2
    return psycopg2.connect(
        host="localhost",
        port=5433,
        dbname="crm_bybusiness",
        user="rafael_admin",
        password="Fabrica_Industrial_2026_Secure!",
    )


def get_cache(place_id: str):
    """Query cache. Returns (data_dict, cached_at_timestamp) or (None, None)."""
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT audit_data, cached_at FROM clientes.gbp_audit_cache "
            "WHERE place_id = %s AND cached_at > NOW() - INTERVAL '24 hours'",
            (place_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return row[0], row[1]
        return None, None
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] cache get error: {e}\n")
        return None, None


def save_cache(place_id: str, cliente_id, audit_data: dict, duration_ms: int):
    """UPSERT into cache table."""
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO clientes.gbp_audit_cache (place_id, cliente_id, audit_data, cached_at, scrape_duration_ms)
            VALUES (%s, %s, %s, NOW(), %s)
            ON CONFLICT (place_id) DO UPDATE
              SET audit_data = EXCLUDED.audit_data,
                  cached_at  = EXCLUDED.cached_at,
                  scrape_duration_ms = EXCLUDED.scrape_duration_ms
            """,
            (place_id, cliente_id, json.dumps(audit_data), duration_ms)
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] cache save error: {e}\n")


def save_history(place_id: str, cliente_id, audit_data: dict, duration_ms: int,
                 audit_source: str = DEFAULT_AUDIT_SOURCE):
    """INSERT append-only row into clientes.gbp_audit_history."""
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO clientes.gbp_audit_history "
            "(place_id, cliente_id, audit_data, scrape_duration_ms, audit_source) "
            "VALUES (%s, %s, %s, %s, %s)",
            (place_id, cliente_id, json.dumps(audit_data), duration_ms, audit_source),
        )
        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] history save error: {e}\n")


def get_recent_history(place_id: str):
    """Return the latest history row if audited_at < 24h ago, else None."""
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute(
            "SELECT audit_data, audited_at FROM clientes.gbp_audit_history "
            "WHERE place_id = %s AND audited_at > NOW() - INTERVAL '24 hours' "
            "ORDER BY audited_at DESC LIMIT 1",
            (place_id,)
        )
        row = cur.fetchone()
        cur.close()
        conn.close()
        if row:
            return row[0], row[1]
        return None, None
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] history get error: {e}\n")
        return None, None


def probe_db_connection():
    """Startup probe: verify both cache and history tables are reachable."""
    try:
        conn = _get_db_conn()
        cur = conn.cursor()
        cur.execute("SELECT 1 FROM clientes.gbp_audit_cache LIMIT 1")
        cur.execute("SELECT MAX(audited_at) FROM clientes.gbp_audit_history")
        last_hist = cur.fetchone()[0]
        cur.close()
        conn.close()
        sys.stderr.write(
            f"[gbp_wrapper] probe OK — history rows exist, last at {last_hist}\n"
        )
        return True
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] probe FAILED (WARN, non-fatal): {e}\n")
        return False


def do_scrape(place_id: str, deep: bool = False) -> dict:
    """Scrape using the persistent browser context. Returns audit dict."""
    page = _context.new_page()
    try:
        result = scrape_full_audit(page, place_id, deep=deep)
        return result
    except Exception as e:
        sys.stderr.write(f"[gbp_wrapper] scrape error: {e}\n")
        return {"error": "scrape_exception", "place_id": place_id}
    finally:
        page.close()


# ── Place ID extraction ─────────────────────────────────────────────────────────

def extract_place_id_from_url(url: str):
    """Parse a Google Maps URL and return (place_id, format)."""
    if not url:
        return None, 'empty_url'
    for pattern, fmt in [
        (PLACE_ID_RE, 'place_id'),
        (HEX_CID_RE,  'hex_cid'),
        (DEC_CID_RE,  'decimal_cid'),
    ]:
        m = pattern.search(url)
        if m:
            return m.group(1), fmt
    return None, 'unrecognized'


# ── HTTP Handler ───────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def send_json(self, obj, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode())

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/extract-place-id':
            return self._extract_place_id()
        if parsed.path == '/search-by-name':
            return self._search_by_name()
        return self.send_json({"error": "not_found"}, 404)

    def _extract_place_id(self):
        """Parse place_id from a Google Maps URL."""
        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else ''
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            return self.send_json({"error": "invalid_json"}, 400)
        url = payload.get('url', '').strip()
        place_id, fmt = extract_place_id_from_url(url)
        if not place_id:
            return self.send_json({"error": fmt or "unrecognized", "url_received": url[:200]}, 400)
        return self.send_json({"place_id": place_id, "format": fmt})

    def _search_by_name(self):
        """Search Google Maps by business name + location, return top 5 candidates.

        Strategy: Google Maps auto-redirects to the best match when confident.
        We detect this redirect via wait_for_url and extract place_id from the URL.
        """
        import re as _re

        length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(length).decode('utf-8') if length else ''
        try:
            payload = json.loads(body) if body else {}
        except Exception:
            return self.send_json({"error": "invalid_json"}, 400)

        name = (payload.get('name') or '').strip()
        locality = (payload.get('locality') or '').strip()
        provincia = (payload.get('provincia') or '').strip()
        address = (payload.get('address') or '').strip()

        if not name:
            return self.send_json({"error": "name is required"}, 400)

        # Build search query
        parts = [name]
        if locality:
            parts.append(locality)
        if provincia and provincia.lower() not in (locality or '').lower():
            parts.append(provincia)
        if address:
            parts.append(address)
        query = ' '.join(parts)
        encoded = query.replace(' ', '+')
        search_url = f"https://www.google.com/maps/search/{encoded}"

        page = _context.new_page()
        try:
            page.goto(search_url, timeout=30000, wait_until='domcontentloaded')

            # Wait for either redirect to /place/ OR for search results to load
            # Google Maps redirects when it has a strong single match
            try:
                page.wait_for_url(lambda url: '/place/' in url, timeout=8000)
                redirected = True
            except Exception:
                redirected = False
                # Give search results time to render
                time.sleep(3)

            final_url = page.url
            candidates = []

            if redirected:
                # ── Case 1: Direct redirect to place page ────────────────────────
                # Extract place_id: the URL pattern is
                # /place/Name/@lat,lng,z/data=!...!...!1sPLACE_ID!...
                place_id = None
                m = _re.search(r'!1s([^!]+)', final_url)
                if m:
                    place_id = m.group(1)
                else:
                    m = _re.search(r'/place/[^/]+/([A-Za-z0-9_-]+)', final_url)
                    if m:
                        place_id = m.group(1)

                page_title = page.title().replace(' - Google Maps', '').strip()

                # Try to get rating
                rating = None
                try:
                    rating_el = page.query_selector('.aMPvhf, [class*="rating"] span, [aria-label*="star"]')
                    if rating_el:
                        rating_text = rating_el.get_attribute('aria-label') or rating_el.inner_text()
                        rating_m = _re.search(r'(\d[.,]?\d)', rating_text)
                        if rating_m:
                            rating = float(rating_m.group(1).replace(',', '.'))
                except Exception:
                    pass

                # Try to get reviews count
                reviews = None
                try:
                    reviews_el = page.query_selector('[aria-label*="opinión"], [aria-label*="review"]')
                    if reviews_el:
                        reviews_text = reviews_el.get_attribute('aria-label') or ''
                        reviews_m = _re.search(r'([\d.,]+)\s*(?:opinión|review)', reviews_text)
                        if reviews_m:
                            reviews = int(reviews_m.group(1).replace('.', '').replace(',', ''))
                except Exception:
                    pass

                # Try to get address (only on direct place page, not redirected)
                address_text = ''
                try:
                    addr_el = page.query_selector('[data-item-id="address"] .Io6YTe, button[data-item-id="address"] .Io6YTe, [aria-label*="Dirección"] .Io6YTe, .rogA2c .Io6YTe')
                    if addr_el:
                        address_text = addr_el.inner_text().strip()
                except Exception:
                    pass

                if place_id:
                    candidates.append({
                        'name': page_title,
                        'place_id': place_id,
                        'address': address_text,
                        'rating': rating,
                        'reviews': reviews,
                        'score': None,
                    })

                return self.send_json({'candidates': candidates, '_redirected': True})

            # ── Case 2: Multiple results — parse the search feed ───────────────
            # These pages show results without redirecting
            try:
                page.wait_for_selector('[role="feed"]', timeout=8000)
            except Exception:
                time.sleep(2)

            # Get all place links from the feed
            cards = page.query_selector_all('[data-result-index]')
            if not cards:
                feed = page.query_selector('[role="feed"]')
                if feed:
                    cards = feed.query_selector_all('a[href*="/place/"]')

            for card in cards[:5]:
                try:
                    href = card.get_attribute('href') or ''

                    # Extract place_id from href
                    place_id = None
                    m = _re.search(r'!1s([^!]+)', href)
                    if m:
                        place_id = m.group(1)
                    else:
                        m = _re.search(r'/place/[^/]+/([A-Za-z0-9_-]+)', href)
                        if m:
                            place_id = m.group(1)
                        else:
                            m = _re.search(r'ftid=([A-Za-z0-9_-]+)', href)
                            if m:
                                place_id = m.group(1)

                    # Get name
                    candidate_name = (card.get_attribute('aria-label') or '').strip()
                    if not candidate_name:
                        name_el = card.query_selector('.qBF1Pd, .fontHeadlineSmall, [class*="title"]')
                        if name_el:
                            candidate_name = name_el.inner_text().strip()

                    if not candidate_name:
                        continue

                    # Get address
                    address_text = ''
                    addr_el = card.query_selector('.rllt__address, [class*="address"]')
                    if addr_el:
                        address_text = addr_el.inner_text().strip()

                    # Get rating and reviews
                    rating = None
                    reviews = None
                    try:
                        rating_el = card.query_selector('[aria-label*="star"], [aria-label*="estrel"]')
                        if rating_el:
                            rating_text = rating_el.get_attribute('aria-label') or ''
                            rating_m = _re.search(r'(\d[.,]?\d)', rating_text)
                            if rating_m:
                                rating = float(rating_m.group(1).replace(',', '.'))
                            reviews_m = _re.search(r'([\d.,]+)\s*(?:opinión|review)', rating_text)
                            if reviews_m:
                                reviews = int(reviews_m.group(1).replace('.', '').replace(',', ''))
                    except Exception:
                        pass

                    candidates.append({
                        'name': candidate_name,
                        'place_id': place_id,
                        'address': address_text,
                        'rating': rating,
                        'reviews': reviews,
                        'score': None,
                    })
                except Exception as e:
                    sys.stderr.write(f"[search-by-name] card parse error: {e}\n")
                    continue

            return self.send_json({'candidates': candidates})

        except Exception as e:
            sys.stderr.write(f"[search-by-name] error: {e}\n")
            return self.send_json({'error': str(e), 'candidates': []}, 500)
        finally:
            page.close()

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/healthz":
            uptime = int(time.time() - _start_time)
            return self.send_json({
                "ok": True,
                "browser_alive": _browser is not None,
                "uptime_seconds": uptime,
            })

        if parsed.path == "/history":
            params = parse_qs(parsed.query)
            place_id = params.get("place_id", [None])[0]
            limit = int(params.get("limit", ["10"])[0])
            return self._history_response(place_id, limit)

        if parsed.path == "/drift":
            params = parse_qs(parsed.query)
            place_id = params.get("place_id", [None])[0]
            return self._drift_response(place_id)

        if parsed.path != "/run":
            return self.send_json({"error": "not_found"}, 404)

        params = parse_qs(parsed.query)
        place_id = params.get("place_id", [None])[0]
        if not place_id:
            return self.send_json({"error": "place_id required"}, 400)

        refresh = params.get("refresh", ["false"])[0] == "true"
        deep = params.get("deep", ["false"])[0] == "true"
        source = params.get("source", [DEFAULT_AUDIT_SOURCE])[0]
        # cliente_id is optional — pass it from the caller so save_history can link the audit to the cliente
        cliente_id_raw = params.get("cliente_id", [None])[0]
        cliente_id = int(cliente_id_raw) if cliente_id_raw and str(cliente_id_raw).isdigit() else None

        # ── Cache check via history table (skip if refresh=true) ───────────────
        if not refresh:
            cached_data, cached_at = get_recent_history(place_id)
            if cached_data:
                age_seconds = time.time() - cached_at.timestamp()
                return self.send_json({
                    **cached_data,
                    "_cached": True,
                    "_cached_at": cached_at.isoformat(),
                    "_cache_age_seconds": int(age_seconds),
                })

        # ── Scrape ─────────────────────────────────────────────────────────────
        t0 = time.time()
        data = do_scrape(place_id, deep=deep)
        duration_ms = int((time.time() - t0) * 1000)

        if "error" not in data:
            save_cache(place_id, cliente_id, data, duration_ms)
            save_history(place_id, cliente_id, data, duration_ms, source)

        return self.send_json({
            **data,
            "_cached": False,
            "_scrape_duration_ms": duration_ms,
        })

    def _history_response(self, place_id: str, limit: int = 10):
        """Return last N history rows for place_id as JSON array."""
        if not place_id:
            return self.send_json({"error": "place_id required"}, 400)
        try:
            conn = _get_db_conn()
            cur = conn.cursor()
            cur.execute(
                "SELECT audit_id, place_id, cliente_id, audit_data, audit_source, "
                "scrape_duration_ms, audited_at "
                "FROM clientes.gbp_audit_history "
                "WHERE place_id = %s "
                "ORDER BY audited_at DESC LIMIT %s",
                (place_id, limit)
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()
            result = [
                {
                    "audit_id": r[0],
                    "place_id": r[1],
                    "cliente_id": r[2],
                    "audit_data": r[3],
                    "audit_source": r[4],
                    "scrape_duration_ms": r[5],
                    "audited_at": r[6].isoformat() if r[6] else None,
                }
                for r in rows
            ]
            return self.send_json({"ok": True, "place_id": place_id, "history": result})
        except Exception as e:
            sys.stderr.write(f"[gbp_wrapper] history response error: {e}\n")
            return self.send_json({"error": str(e)}, 500)

    def _drift_response(self, place_id: str):
        """Compute drift between last two history rows for place_id."""
        if not place_id:
            return self.send_json({"error": "place_id required"}, 400)
        try:
            conn = _get_db_conn()
            cur = conn.cursor()
            cur.execute(
                "SELECT audit_id, audit_data, audited_at FROM clientes.gbp_audit_history "
                "WHERE place_id = %s ORDER BY audited_at DESC LIMIT 2",
                (place_id,)
            )
            rows = cur.fetchall()
            cur.close()
            conn.close()

            if len(rows) < 2:
                return self.send_json({
                    "place_id": place_id,
                    "has_previous": False,
                })

            prev_row, curr_row = rows[1], rows[0]
            prev_data = prev_row[1]
            curr_data = curr_row[1]

            def safe_int(getter, key, default=0):
                v = getter(key)
                return int(v) if v is not None else default

            fotos_delta = safe_int(lambda k: curr_data.get(k), 'fotos_count') - \
                          safe_int(lambda k: prev_data.get(k), 'fotos_count')
            reviews_delta = safe_int(lambda k: curr_data.get(k), 'reviews_count') - \
                            safe_int(lambda k, d=0: prev_data.get(k, d), 'reviews_count')
            rating_delta = round(
                (float(curr_data.get('rating') or 0) - float(prev_data.get('rating') or 0)), 2
            )
            qa_delta = safe_int(lambda k: curr_data.get(k), 'qa_count') - \
                       safe_int(lambda k: prev_data.get(k), 'qa_count')
            desc_changed = (curr_data.get('descripcion') or '') != (prev_data.get('descripcion') or '')

            return self.send_json({
                "place_id": place_id,
                "audits_compared": 2,
                "periodo": {
                    "from": prev_row[2].isoformat(),
                    "to": curr_row[2].isoformat(),
                },
                "fotos_added": max(0, fotos_delta),
                "reviews_count_delta": reviews_delta,
                "rating_delta": rating_delta,
                "reviews_respondidas_delta": qa_delta,
                "descripcion_changed": desc_changed,
                "has_previous": True,
            })
        except Exception as e:
            sys.stderr.write(f"[gbp_wrapper] drift response error: {e}\n")
            return self.send_json({"error": str(e)}, 500)

    def log_message(self, format, *args):
        sys.stderr.write(f"[gbp_wrapper] {format % args}\n")


# ── Entry point ────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    from playwright.sync_api import sync_playwright

    parser = argparse.ArgumentParser(description="GBP HTTP wrapper (persistent session)")
    parser.add_argument("--bind", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=8095)
    args = parser.parse_args()

    sys.stderr.write("[gbp_wrapper] Initializing browser...\n")
    init_browser()
    probe_db_connection()
    sys.stderr.write(f"[gbp_wrapper] Starting server on {args.bind}:{args.port}\n")
    HTTPServer((args.bind, args.port), Handler).serve_forever()
