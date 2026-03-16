#!/usr/bin/env python3
"""
Micro-webhook local para reconstruir scrapers nano/heavy.
Escucha en :8099. Solo accesible desde localhost.
Uso: python3 /opt/fabrica/scripts/rebuild_scrapers_webhook.py
n8n llama: POST http://host.docker.internal:8099/rebuild
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import subprocess, json, logging, sys

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/rebuild_scrapers.log', encoding='utf-8')
    ]
)
log = logging.getLogger(__name__)

SCRAPER_DIR = '/opt/fabrica/monitor-go/scrapers-playwright'

STEPS = [
    ['docker', 'build', '-f', 'Dockerfile.nano', '-t', 'monitor-go-scraper-nano', '.'],
    ['docker', 'build', '-f', 'Dockerfile.heavy', '-t', 'monitor-go-scraper-heavy', '.'],
    ['docker', 'stop', 'scraper-nano-v2', 'scraper-heavy-v2'],
    ['docker', 'start', 'scraper-nano-v2', 'scraper-heavy-v2'],
]


def run_rebuild():
    results = []
    for cmd in STEPS:
        label = ' '.join(cmd[:3])
        log.info(f"Ejecutando: {' '.join(cmd)}")
        try:
            r = subprocess.run(
                cmd, cwd=SCRAPER_DIR,
                capture_output=True, text=True, timeout=300
            )
            ok = r.returncode == 0
            results.append({'cmd': label, 'ok': ok, 'output': (r.stdout + r.stderr)[-200:]})
            if not ok:
                log.error(f"FALLO: {label} — {r.stderr[-200:]}")
                return False, results
            log.info(f"OK: {label}")
        except subprocess.TimeoutExpired:
            results.append({'cmd': label, 'ok': False, 'output': 'TIMEOUT'})
            return False, results
        except Exception as e:
            results.append({'cmd': label, 'ok': False, 'output': str(e)})
            return False, results
    return True, results


class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/rebuild':
            self.send_response(404)
            self.end_headers()
            return

        log.info("=== REBUILD solicitado ===")
        ok, results = run_rebuild()
        body = json.dumps({'ok': ok, 'results': results}).encode()

        self.send_response(200 if ok else 500)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', len(body))
        self.end_headers()
        self.wfile.write(body)
        log.info(f"=== REBUILD {'OK' if ok else 'FALLO'} ===")

    def log_message(self, format, *args):
        pass  # Silenciar logs de acceso HTTP


if __name__ == '__main__':
    server = HTTPServer(('0.0.0.0', 8099), Handler)
    log.info("Rebuild webhook escuchando en :8099")
    server.serve_forever()
