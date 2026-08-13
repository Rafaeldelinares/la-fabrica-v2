#!/usr/bin/env python3
"""
PDF HTTP server using stdlib http.server — no external dependencies.
Receives POST with JSON body {"cliente_id": int} and returns PDF binary.
"""
import json
import subprocess
import sys
import os
import tempfile
import shutil
import socketserver
from http.server import HTTPServer, BaseHTTPRequestHandler
from urllib.parse import parse_qs, urlparse, unquote

SCRIPT_PATH = "/opt/fabrica/scripts/generar_pdf_informes.py"


class PDFHandler(BaseHTTPRequestHandler):
    def _send_json(self, data, status=400):
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
        # Check query params first
        parsed = urlparse(self.path)
        query_params = parse_qs(parsed.query)
        if "cliente_id" in query_params:
            val = query_params["cliente_id"][0]
            try:
                return int(val)
            except ValueError:
                self._send_json({"error": "cliente_id debe ser entero"}, 400)
                return None

        # Fall back to POST body
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

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path != "/pdf/cliente":
            self._send_json({"error": "Not Found"}, 404)
            return

        cliente_id = self._parse_cliente_id()
        if cliente_id is None:
            return  # error already sent

        # Temp file for PDF output
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tmp.close()
        output_path = tmp.name

        try:
            cmd = ["python3", SCRIPT_PATH, f"--cliente-id={cliente_id}", output_path]
            result = subprocess.run(cmd, capture_output=True, timeout=120)

            if result.returncode != 0:
                stderr = result.stderr.decode("utf-8", errors="replace")
                self._send_json({"error": "Error generando PDF", "detail": stderr[:500]}, 500)
                return

            if not os.path.exists(output_path):
                self._send_json({"error": "PDF no generado"}, 500)
                return

            with open(output_path, "rb") as f:
                pdf_bytes = f.read()

            self._send_pdf(pdf_bytes, cliente_id)

        except subprocess.TimeoutExpired:
            self._send_json({"error": "Timeout generando PDF (>120s)"}, 500)
        finally:
            shutil.unlink(output_path)

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path
        if path != "/pdf/cliente":
            self._send_json({"error": "Not Found"}, 404)
            return

        cliente_id = self._parse_cliente_id()
        if cliente_id is None:
            return  # error already sent

        # Temp file for PDF output
        tmp = tempfile.NamedTemporaryFile(suffix=".pdf", delete=False)
        tmp.close()
        output_path = tmp.name

        try:
            cmd = ["python3", SCRIPT_PATH, f"--cliente-id={cliente_id}", output_path]
            result = subprocess.run(cmd, capture_output=True, timeout=120)

            if result.returncode != 0:
                stderr = result.stderr.decode("utf-8", errors="replace")
                self._send_json({"error": "Error generando PDF", "detail": stderr[:500]}, 500)
                return

            if not os.path.exists(output_path):
                self._send_json({"error": "PDF no generado"}, 500)
                return

            with open(output_path, "rb") as f:
                pdf_bytes = f.read()

            self._send_pdf(pdf_bytes, cliente_id)

        except subprocess.TimeoutExpired:
            self._send_json({"error": "Timeout generando PDF (>120s)"}, 500)
        finally:
            shutil.unlink(output_path)

    def log_message(self, format, *args):
        sys.stderr.write(f"[pdf-server] {args[0]}\n")


if __name__ == "__main__":
    port = 8093
    server = HTTPServer(("0.0.0.0", port), PDFHandler)
    print(f"PDF server listening on :{port}")
    sys.stdout.flush()
    server.serve_forever()
