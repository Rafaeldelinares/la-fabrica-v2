#!/usr/bin/env python3
"""Lightweight HTTP wrapper for gbp_ficha_audit.py.
Runs on port 8095 and executes the Playwright script, returning JSON.
Supports POST (body JSON) and GET (query param).
Usage: python3 /opt/fabrica/scripts/gbp_http_wrapper.py [--bind ADDR] [--port PORT]
"""
import argparse, json, subprocess, sys
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

SCRIPT = "/opt/fabrica/scripts/gbp_ficha_audit.py"
DEFAULT_PORT = 8095


class Handler(BaseHTTPRequestHandler):
    def _run_audit(self, place_id):
        """Execute the Playwright script and return JSON response."""
        try:
            result = subprocess.run(
                ["python3", SCRIPT, place_id],
                capture_output=True, text=True, timeout=35
            )
            output = result.stdout.strip()
            try:
                resp_data = json.loads(output)
            except json.JSONDecodeError:
                resp_data = {"raw": output, "stderr": result.stderr}
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Connection", "close")
            self.end_headers()
            self.wfile.write(json.dumps(resp_data, ensure_ascii=False).encode())
        except BrokenPipeError:
            pass  # Client closed connection, nothing to do
        except subprocess.TimeoutExpired:
            try:
                self.send_error(504, "Script timeout")
            except Exception:
                pass
        except Exception as e:
            try:
                self.send_error(500, str(e))
            except Exception:
                pass

    def do_GET(self):
        try:
            parsed = urlparse(self.path)
            if parsed.path != "/run":
                self.send_error(404, "Only /run endpoint")
                return
            qs = parse_qs(parsed.query)
            place_ids = qs.get("place_id", [])
            place_id = place_ids[0] if place_ids else ""
            if not place_id:
                self.send_error(400, "place_id required")
                return
            self._run_audit(place_id)
        except BrokenPipeError:
            pass

    def do_POST(self):
        try:
            parsed = urlparse(self.path)
            if parsed.path != "/run":
                self.send_error(404, "Only /run endpoint")
                return
            try:
                content_len = int(self.headers.get("Content-Length", 0) or 0)
                body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else ""
                data = json.loads(body) if body else {}
                place_id = data.get("place_id", "")
            except Exception:
                self.send_error(400, "Invalid JSON")
                return

            if not place_id:
                self.send_error(400, "place_id required")
                return

            self._run_audit(place_id)
        except BrokenPipeError:
            pass

    def log_message(self, format, *args):
        sys.stderr.write(f"[gbp_wrapper] {format % args}\n")


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--bind", default="0.0.0.0")
    p.add_argument("--port", type=int, default=DEFAULT_PORT)
    args = p.parse_args()
    addr = (args.bind, args.port)
    srv = HTTPServer(addr, Handler)
    sys.stderr.write(f"[gbp_wrapper] Starting on {args.bind}:{args.port}\n")
    srv.serve_forever()
