#!/usr/bin/env python3
"""
PDF HTTP server using stdlib http.server — no external dependencies.
Receives POST with JSON body {"cliente_id": int} and returns PDF binary.

Flow:
  1. Check if cliente has a report in clientes.informes_competencia.
  2. If YES → generate PDF immediately (current behavior).
  3. If NO  → trigger scraping via SSH to Xiaomi (100.75.94.18:8022):
       - Execute generar-informe-competencia.sh {cliente_id}
       - Wait up to 180s for completion
       - Verify DB was written
       - Then generate the real PDF
     If scraping fails → return error 500 with detail.
  4. If Xiaomi returns NO_CID_FOUND → try Google search fallback
  5. If no CID found anywhere → return status: needs_cid JSON (200)

Lock: uses fcntl.flock on a per-cliente lock file to prevent duplicate
scraping triggers for the same cliente (race condition on concurrent clicks).

@since 2026-08-13 (Phase 3 — crm-informe-pdf + on-demand trigger)
@updated 2026-08-13 (Phase 8 — Manual CID + Google search fallback)
@updated 2026-08-13 (Phase 9 — Drive-by auditing: Xiaomi scrape also upserts gbp_audit_history)
"""
import json
import re
import subprocess
import sys
import os
import tempfile
import shutil
import fcntl
import time
import urllib.parse
import urllib.request
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse

SCRIPT_PDF = "/opt/fabrica/scripts/generar_pdf_informes.py"

# ── Drive-by auditing ────────────────────────────────────────────────────────

def _insert_audit_history(cliente_id, source, audit_data):
    """
    Save GBP audit snapshot to clientes.gbp_audit_history (drive-by auditing).

    pdf_http_server.py runs as a systemd service on the VPS host. It connects
    to the postgres container via the Docker internal network (172.19.0.4).

    Uses a CTE to DELETE existing rows for the same (place_id, source) and
    then INSERT the new snapshot — equivalent to an UPSERT without requiring
    a unique constraint on those columns.

    The audit_source CHECK constraint limits values to:
    'manual', 'cache-refresh', 'scheduled', 'pre-audit-v2', 'pre-audit-v2-resume',
    'backfill', 'cron_daily', 'cron_weekly', 'webhook'.
    We use 'webhook' as it is the closest semantic match for an on-demand
    scraping trigger initiated by the PDF server.

    Args:
        cliente_id: int
        source:     string tag — use 'webhook' (CHECK constraint compatible)
        audit_data: dict with GBP audit fields
    """
    try:
        import psycopg2
        import psycopg2.extras
    except ImportError:
        sys.stderr.write("[pdf-server] psycopg2 not available — audit history not saved\n")
        return

    # Use 'webhook' as source — CHECK constraint compatible
    effective_source = "webhook"
    password = os.environ.get("PGPASSWORD_VPS", "Fabrica_Industrial_2026_Secure!")
    db_host = "172.19.0.4"
    db_port = 5432

    try:
        conn = psycopg2.connect(
            host=db_host, port=db_port,
            dbname="crm_bybusiness",
            user="rafael_admin",
            password=password,
        )
        conn.autocommit = True
        cur = conn.cursor()

        # UPSERT via CTE: delete existing + insert new (avoids unique constraint requirement)
        cur.execute(
            """
            WITH deleted AS (
                DELETE FROM clientes.gbp_audit_history
                WHERE place_id = %s AND audit_source = %s
                RETURNING audit_id
            )
            INSERT INTO clientes.gbp_audit_history
                (place_id, cliente_id, audit_data, audit_source)
            VALUES (%s, %s, %s::jsonb, %s)
            """,
            (
                audit_data.get("place_id") or "",
                effective_source,
                audit_data.get("place_id") or "",
                int(cliente_id),
                psycopg2.extras.Json(audit_data),
                effective_source,
            )
        )
        cur.close()
        conn.close()
        sys.stderr.write(
            f"[pdf-server] insert_audit_history OK for cliente {cliente_id} "
            f"(place_id={audit_data.get('place_id', '')[:20]})\n"
        )
    except Exception as e:
        sys.stderr.write(f"[pdf-server] insert_audit_history FAILED: {e}\n")

# Xiaomi SSH config
XIAOMI_HOST = "100.75.94.18"
XIAOMI_PORT = 8022
XIAOMI_SCRIPT = "/data/data/com.termux/files/home/xiaomi-gb-scape/cron/generar-informe-competencia.sh"
XIAOMI_TIMEOUT = 180  # seconds — scraping can take 30-90s

# Lock directory
LOCK_DIR = "/tmp/pdf_server_locks"

# CID validation regex (case-insensitive)
CID_REGEX = re.compile(r'^0x[a-f0-9]+:0x[a-f0-9]+$', re.I)


def _ensure_lock_dir():
    os.makedirs(LOCK_DIR, exist_ok=True)


def _acquire_lock(cliente_id):
    """Acquire exclusive lock for this cliente. Returns the lock file object."""
    _ensure_lock_dir()
    lock_path = os.path.join(LOCK_DIR, f"cliente_{cliente_id}.lock")
    lock_file = open(lock_path, "w")
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)  # blocking exclusive
    return lock_file


def _release_lock(lock_file):
    """Release and close the lock file."""
    fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)
    lock_file.close()


def _db_has_informe(cliente_id):
    """Check if cliente has at least one informe in the DB."""
    sql = f"SELECT 1 FROM clientes.informes_competencia WHERE cliente_id = {int(cliente_id)} LIMIT 1;"
    cmd = [
        "docker", "exec", "-i", "fabrica-postgres-1",
        "psql", "-U", "rafael_admin", "-d", "crm_bybusiness",
        "-tA", "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=15)
    return result.returncode == 0 and bool(result.stdout.strip())


def _db_get_cliente(cliente_id):
    """Get cliente nombre and direccion for a cliente_id."""
    sql = f"SELECT nombre, COALESCE(direccion, '') FROM clientes.clientes WHERE id = {int(cliente_id)} LIMIT 1;"
    cmd = [
        "docker", "exec", "-i", "fabrica-postgres-1",
        "psql", "-U", "rafael_admin", "-d", "crm_bybusiness",
        "-tA", "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=15)
    if result.returncode == 0 and result.stdout.strip():
        parts = result.stdout.strip().split('|')
        if len(parts) >= 2:
            return parts[0], parts[1]
    return None, ''


def _db_update_cid(cliente_id, google_cid):
    """UPDATE clientes.clientes SET google_cid = X WHERE id = N. Returns bool."""
    sql = f"UPDATE clientes.clientes SET google_cid = '{google_cid}' WHERE id = {int(cliente_id)}"
    cmd = [
        "docker", "exec", "-i", "fabrica-postgres-1",
        "psql", "-U", "rafael_admin", "-d", "crm_bybusiness",
        "-tA", "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=15)
    return result.returncode == 0


def _validate_cid(google_cid):
    """Validate CID format. Returns (bool, error_message or None)."""
    if not google_cid or not isinstance(google_cid, str):
        return False, "google_cid es requerido"
    if not CID_REGEX.match(google_cid):
        return False, "CID inválido. Formato esperado: 0xHASH:0xHASH (ej: 0xabc123:0xdef456)"
    return True, None


def _search_cid_google(cliente_nombre, cliente_direccion=None):
    """
    Fallback: search Google web search for the CID using a simple HTTP request.
    Returns (cid string or None)
    """
    query = f"{cliente_nombre} {cliente_direccion or ''} Google Maps".strip()
    encoded_q = urllib.parse.quote(query)
    url = f"https://www.google.com/search?q={encoded_q}"

    req = urllib.request.Request(url, headers={
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    })

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            html = resp.read().decode('utf-8', errors='replace')

        # Search for Google Maps CID pattern — appears in URLs like /maps/place/...!1s0xHASH:0xHASH!...
        matches = re.findall(r'0x[a-f0-9]+:0x[a-f0-9]+', html, re.I)
        if matches:
            cid = matches[0].lower()  # normalize to lowercase
            sys.stderr.write(f"[pdf-server] Google search found CID: {cid}\n")
            return cid
        else:
            sys.stderr.write(f"[pdf-server] Google search: no CID found in response\n")
    except Exception as e:
        sys.stderr.write(f"[pdf-server] Google search failed: {e}\n")

    return None


def _trigger_xiaomi_scrape(cliente_id):
    """
    SSH to Xiaomi and run the scraping script for this cliente.
    Blocks until completion (up to XIAOMI_TIMEOUT seconds).

    After successful scrape, extracts AUDIT_JSON from Xiaomi output and
    upserts it into clientes.gbp_audit_history (drive-by auditing).

    Returns (success: bool, message: str)
    """
    # Capture full output (not just tail) so we can parse AUDIT_JSON block
    cmd = [
        "ssh", "-o", "StrictHostKeyChecking=no",
        "-o", f"Port={XIAOMI_PORT}",
        "-o", "ConnectTimeout=10",
        "-o", "BatchMode=yes",
        f"root@{XIAOMI_HOST}",
        f"cd /data/data/com.termux/files/home/xiaomi-gb-scape && "
        f"timeout {XIAOMI_TIMEOUT} bash cron/generar-informe-competencia.sh {cliente_id} 2>&1"
    ]
    sys.stderr.write(f"[pdf-server] Triggering Xiaomi scrape for cliente {cliente_id}...\n")
    sys.stderr.flush()
    result = subprocess.run(cmd, capture_output=True, timeout=XIAOMI_TIMEOUT + 30)

    if result.returncode == 124:
        return False, "Xiaomi script timed out (>180s)"

    if result.returncode != 0:
        stderr = result.stderr.decode("utf-8", errors="replace")
        if "cookies" in stderr.lower() or "auth" in stderr.lower() or "login" in stderr.lower():
            return False, "Google cookies expired on Xiaomi — renew manually via Android app"
        return False, f"Xiaomi script failed (exit {result.returncode}): {stderr[:300]}"

    stdout = result.stdout.decode("utf-8", errors="replace")
    stderr_lower = stderr.lower()
    combined = stdout.lower() + stderr_lower

    if ("cid" in combined and ("not found" in combined or "no cid" in combined or "0 results" in combined)) or \
       ("no results" in combined and "competitor" in combined):
        sys.stderr.write(f"[pdf-server] Xiaomi scrape: no CID found for cliente {cliente_id}\n")
        sys.stderr.flush()
        return False, "NO_CID_FOUND"

    time.sleep(2)
    if not _db_has_informe(cliente_id):
        if "no results" in stdout.lower() or "skip" in stdout.lower():
            return False, "Xiaomi found no competitors for this cliente — category/location may be missing in DB"
        return False, "Xiaomi script appeared to succeed but no informe was written to DB"

    # ── Drive-by auditing: extract AUDIT_JSON block ────────────────────────
    audit_json_str = _extract_audit_json(stdout)
    if audit_json_str:
        try:
            import json as _json
            audit_data = _json.loads(audit_json_str)
            # Source is set inside _insert_audit_history (uses 'webhook' per CHECK constraint)
            _insert_audit_history(cliente_id, "webhook", audit_data)
            sys.stderr.write(f"[pdf-server] Drive-by audit upserted for cliente {cliente_id}\n")
        except Exception as e:
            sys.stderr.write(f"[pdf-server] Drive-by audit parse/upsert failed: {e}\n")
    else:
        sys.stderr.write(f"[pdf-server] No AUDIT_JSON block in Xiaomi output for cliente {cliente_id}\n")
    # ── End drive-by auditing ────────────────────────────────────────────────

    sys.stderr.write(f"[pdf-server] Xiaomi scrape OK for cliente {cliente_id}\n")
    sys.stderr.flush()
    return True, "OK"


def _extract_audit_json(full_output):
    """
    Extract the AUDIT_JSON block from Xiaomi script stdout.

    The Xiaomi script prints a markers-based block:
        ===AUDIT_JSON_START===
        { ... complete JSON ... }
        ===AUDIT_JSON_END===

    Returns the JSON string (without markers) or None if not found.
    """
    import re
    marker_start = "===AUDIT_JSON_START==="
    marker_end = "===AUDIT_JSON_END==="
    start_idx = full_output.find(marker_start)
    end_idx = full_output.find(marker_end)
    if start_idx == -1 or end_idx == -1:
        return None
    json_str = full_output[start_idx + len(marker_start):end_idx].strip()
    return json_str if json_str else None


class PDFHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def _send_pdf(self, pdf_bytes, cliente_id):
        filename = f"informe_competitivo_{cliente_id}.pdf"
        self.send_response(200)
        self.send_header("Content-Type", "application/pdf")
        self.send_header("Content-Disposition", f"attachment; filename={filename}")
        self.send_header("Content-Length", str(len(pdf_bytes)))
        self.end_headers()
        self.wfile.write(pdf_bytes)

    def _parse_cliente_id(self):
        """Extract cliente_id from query string or POST body."""
        parsed = urlparse(self.path)
        query_params = parse_qs(parsed.query)
        if "cliente_id" in query_params:
            val = query_params["cliente_id"][0]
            try:
                return int(val)
            except ValueError:
                self._send_json({"error": "cliente_id debe ser entero"}, 400)
                return None

        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._send_json({"error": "Body vacío"}, 400)
            return None

        body = self.rfile.read(content_length)
        try:
            data = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "JSON inválido"}, 400)
            return None

        cliente_id = data.get("cliente_id")
        if not cliente_id:
            self._send_json({"error": "cliente_id requerido"}, 400)
            return None

        try:
            return int(cliente_id)
        except (TypeError, ValueError):
            self._send_json({"error": "cliente_id debe ser entero"}, 400)
            return None

    def _generate_pdf(self, cliente_id, output_path):
        """Generate PDF using generar_pdf_informes.py (full format for single client).

        The PDF has: score gauge, rating/reviews comparisons, top 5 competitors chart,
        and recommendations — 1 cover + 1 client page.
        """
        cmd = ["python3", SCRIPT_PDF, f"--cliente-id={cliente_id}", output_path]
        result = subprocess.run(cmd, capture_output=True, timeout=120)
        if result.returncode != 0:
            stderr = result.stderr.decode("utf-8", errors="replace")
            raise RuntimeError(stderr[:500])
        if not os.path.exists(output_path):
            raise RuntimeError("PDF not produced")

    def _needs_cid_response(self, cliente_id, cliente_nombre):
        """Return the needs_cid JSON response (200 status)."""
        return {
            "status": "needs_cid",
            "message": "No se pudo encontrar el CID automáticamente",
            "instructions": [
                "1. Ve a https://www.google.com/maps y busca el negocio por nombre",
                "2. Click en el resultado correcto",
                "3. Copia el CID de la URL (después de '!1s' hasta el siguiente '!')",
                "4. Pega el CID en el campo de abajo"
            ],
            "cliente_id": cliente_id,
            "cliente_nombre": cliente_nombre or f"Cliente {cliente_id}"
        }

    def _handle_request(self, cliente_id):
        """
        Full request handler for GET and POST /pdf/cliente.
        Lock per-cliente to prevent duplicate scraping triggers.
        Tries Xiaomi scrape first, then Google search fallback if NO_CID_FOUND,
        then returns needs_cid if all else fails.
        """
        # Acquire lock to prevent duplicate scraping triggers
        lock_file = _acquire_lock(cliente_id)

        try:
            # Step 1: Check if report exists in DB
            has_informe = _db_has_informe(cliente_id)

            if not has_informe:
                sys.stderr.write(f"[pdf-server] No informe for cliente {cliente_id} — triggering Xiaomi scrape\n")
                sys.stderr.flush()

                # Step 2: Trigger scraping on Xiaomi
                ok, msg = _trigger_xiaomi_scrape(cliente_id)

                if msg == "NO_CID_FOUND":
                    # Xiaomi couldn't find CID — try Google search fallback
                    sys.stderr.write(f"[pdf-server] Xiaomi returned NO_CID_FOUND — trying Google search fallback\n")
                    sys.stderr.flush()

                    cliente_nombre, cliente_direccion = _db_get_cliente(cliente_id)
                    google_cid = _search_cid_google(cliente_nombre, cliente_direccion)

                    if google_cid:
                        # Found CID via Google — update DB and proceed
                        sys.stderr.write(f"[pdf-server] Google fallback found CID {google_cid} — updating DB and retrying scrape\n")
                        sys.stderr.flush()
                        _db_update_cid(cliente_id, google_cid)

                        # Retry Xiaomi scrape with the new CID
                        ok2, msg2 = _trigger_xiaomi_scrape(cliente_id)
                        if not ok2:
                            # Even with CID from Google, scraping failed — return needs_cid
                            if msg2 == "NO_CID_FOUND":
                                cliente_nombre2, _ = _db_get_cliente(cliente_id)
                                self._send_json(self._needs_cid_response(cliente_id, cliente_nombre2))
                                return
                            self._send_json({"error": "Scraping failed", "detail": msg2}, 500)
                            return
                    else:
                        # Google also didn't find CID — return needs_cid to frontend
                        sys.stderr.write(f"[pdf-server] Google fallback also failed for cliente {cliente_id} — returning needs_cid\n")
                        sys.stderr.flush()
                        cliente_nombre, _ = _db_get_cliente(cliente_id)
                        self._send_json(self._needs_cid_response(cliente_id, cliente_nombre))
                        return

                elif not ok:
                    self._send_json({"error": "Scraping failed", "detail": msg}, 500)
                    return

                sys.stderr.write(f"[pdf-server] Scraping complete for cliente {cliente_id} — generating PDF\n")
                sys.stderr.flush()

            # Step 3: Generate PDF
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp.close()
            output_path = tmp.name

            try:
                self._generate_pdf(cliente_id, output_path)
                with open(output_path, "rb") as f:
                    pdf_bytes = f.read()
                self._send_pdf(pdf_bytes, cliente_id)
            finally:
                shutil.unlink(output_path)

        finally:
            _release_lock(lock_file)

    def _handle_cid_manual(self):
        """
        POST /cid-manual — receives manually-entered CID from admin,
        updates DB, triggers scraping, and returns PDF.
        """
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self._send_json({"error": "Body vacío"}, 400)
            return

        body = self.rfile.read(content_length)
        try:
            data = json.loads(body.decode("utf-8"))
        except json.JSONDecodeError:
            self._send_json({"error": "JSON inválido"}, 400)
            return

        cliente_id = data.get("cliente_id")
        google_cid = data.get("google_cid")

        if not cliente_id:
            self._send_json({"error": "cliente_id requerido"}, 400)
            return
        if not google_cid:
            self._send_json({"error": "google_cid requerido"}, 400)
            return

        # Validate cliente_id
        try:
            cliente_id = int(cliente_id)
        except (TypeError, ValueError):
            self._send_json({"error": "cliente_id debe ser entero"}, 400)
            return

        # Validate CID format
        valid, err = _validate_cid(google_cid)
        if not valid:
            self._send_json({"error": err}, 400)
            return

        # UPDATE DB with the CID
        ok = _db_update_cid(cliente_id, google_cid)
        if not ok:
            self._send_json({"error": "No se pudo actualizar el CID en la DB"}, 500)
            return

        sys.stderr.write(f"[pdf-server] CID {google_cid} saved for cliente {cliente_id} — triggering scraping\n")
        sys.stderr.flush()

        # Trigger scraping with lock
        lock_file = _acquire_lock(cliente_id)
        try:
            ok, msg = _trigger_xiaomi_scrape(cliente_id)
            if not ok:
                self._send_json({"error": "Scraping falló", "detail": msg}, 500)
                return

            # Generate PDF
            tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
            tmp.close()
            output_path = tmp.name
            try:
                self._generate_pdf(cliente_id, output_path)
                with open(output_path, "rb") as f:
                    pdf_bytes = f.read()
                self._send_pdf(pdf_bytes, cliente_id)
            finally:
                shutil.unlink(output_path)
        finally:
            _release_lock(lock_file)

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == '/cid-manual':
            self._handle_cid_manual()
            return
        if parsed.path == '/pdf/cliente':
            cliente_id = self._parse_cliente_id()
            if cliente_id is None:
                return
            try:
                self._handle_request(cliente_id)
            except Exception as e:
                sys.stderr.write(f"[pdf-server] Unexpected error: {e}\n")
                self._send_json({"error": "Internal server error", "detail": str(e)[:200]}, 500)
            return
        self._send_json({"error": "Not Found"}, 404)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path != "/pdf/cliente":
            self._send_json({"error": "Not Found"}, 404)
            return

        cliente_id = self._parse_cliente_id()
        if cliente_id is None:
            return

        try:
            self._handle_request(cliente_id)
        except Exception as e:
            sys.stderr.write(f"[pdf-server] Unexpected error: {e}\n")
            self._send_json({"error": "Internal server error", "detail": str(e)[:200]}, 500)

    def log_message(self, format, *args):
        sys.stderr.write(f"[pdf-server] {args[0]}\n")


if __name__ == "__main__":
    port = 8093
    server = HTTPServer(("0.0.0.0", port), PDFHandler)
    print(f"PDF server listening on :{port}")
    sys.stdout.flush()
    server.serve_forever()
