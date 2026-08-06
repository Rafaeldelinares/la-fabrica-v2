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
import sys
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

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


# ── HTTP Handler ───────────────────────────────────────────────────────────────

class Handler(BaseHTTPRequestHandler):

    def send_json(self, obj, code=200):
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(json.dumps(obj, ensure_ascii=False).encode())

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
            save_cache(place_id, None, data, duration_ms)
            save_history(place_id, None, data, duration_ms, source)

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
