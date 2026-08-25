#!/usr/bin/env python3
"""
oneplus_health_server.py — Health and cleanup endpoint for OnePlus 10T.

Listens on port 18096. Provides:
  GET /health  — returns system status JSON
  GET /cleanup — kills stale locks and zombie wrapper processes

Used by n8n workflows to check OnePlus availability before scheduling a scrape.
"""

import fcntl
import http.server
import json
import os
import signal
import socketserver
import subprocess
import sys
import time
from urllib.parse import urlparse, parse_qs

PORT = 18096
LOCK_PATH = os.path.join(os.path.expanduser("~"), "oneplus_scraper.lock")
LOCK_MAX_AGE_SECONDS = 600  # 10 minutes


def get_cpu_load():
    """Return 1-minute load average or None if unavailable."""
    try:
        with open("/proc/loadavg") as f:
            return float(f.read().split()[0])
    except Exception:
        return None


def get_mem_used_pct():
    """Return memory usage percentage or None."""
    try:
        with open("/proc/meminfo") as f:
            lines = f.readlines()
        mem = {}
        for line in lines:
            parts = line.split()
            if len(parts) >= 2:
                mem[parts[0].rstrip(":")] = int(parts[1])
        total = mem.get("MemTotal", 0)
        available = mem.get("MemAvailable", mem.get("MemFree", 0))
        if total > 0:
            return round((1 - available / total) * 100, 1)
        return None
    except Exception:
        return None


def get_disk_used_pct():
    """Return root disk usage percentage or None."""
    try:
        result = subprocess.run(
            ["df", "-B1", "/"], capture_output=True, text=True, timeout=5
        )
        lines = result.stdout.strip().split("\n")
        if len(lines) >= 2:
            fields = lines[1].split()
            if len(fields) >= 5:
                total = int(fields[1])
                used = int(fields[2])
                if total > 0:
                    return round(used / total * 100, 1)
        return None
    except Exception:
        return None


def is_process_running(name):
    """Return True if a process with given name is running."""
    try:
        result = subprocess.run(
            ["pgrep", "-f", name],
            capture_output=True, text=True, timeout=5
        )
        return result.returncode == 0
    except Exception:
        return False


def is_lock_active():
    """Return True if the lock file is currently held by a process."""
    if not os.path.exists(LOCK_PATH):
        return False
    try:
        fd = open(LOCK_PATH, "w")
        try:
            fcntl.flock(fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
            fcntl.flock(fd.fileno(), fcntl.LOCK_UN)
            return False  # lock is free
        except BlockingIOError:
            return True  # lock is held
        finally:
            fd.close()
    except Exception:
        return False


def cleanup_orphans():
    """Kill locks older than LOCK_MAX_AGE_SECONDS and zombie wrapper processes."""
    actions = []
    # Clean stale lock files
    try:
        if os.path.exists(LOCK_PATH):
            age = time.time() - os.stat(LOCK_PATH).st_mtime
            if age > LOCK_MAX_AGE_SECONDS:
                fd = open(LOCK_PATH, "w")
                try:
                    fcntl.flock(fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
                    fcntl.flock(fd.fileno(), fcntl.LOCK_UN)
                    os.remove(LOCK_PATH)
                    actions.append(f"removed stale lock (age={age:.0f}s)")
                except BlockingIOError:
                    actions.append("lock is active, not removed")
                finally:
                    fd.close()
    except Exception as e:
        actions.append(f"lock cleanup error: {e}")

    # Kill zombie wrapper processes (PPID=1, leftover from crashed sessions)
    try:
        result = subprocess.run(
            ["pgrep", "-f", "competitive_analysis_oneplus"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for pid_str in result.stdout.strip().split("\n"):
                if not pid_str:
                    continue
                try:
                    pid = int(pid_str)
                    with open(f"/proc/{pid}/stat") as f:
                        stat = f.read()
                    ppid = int(stat.split()[3])
                    if ppid == 1:  # orphan
                        os.kill(pid, signal.SIGKILL)
                        actions.append(f"killed orphan wrapper pid={pid}")
                except (ValueError, FileNotFoundError, ProcessLookupError):
                    pass
    except Exception as e:
        actions.append(f"zombie cleanup error: {e}")

    return actions


class Handler(http.server.BaseHTTPRequestHandler):
    """HTTP request handler for health and cleanup endpoints."""

    def _send_json(self, status, data):
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path

        if path == "/health":
            wrapper_running = is_process_running("competitive_analysis_oneplus")
            lock_active = is_lock_active()
            # sshd and proot-distro are harder to check reliably in Termux
            # so we use a heuristic: if the wrapper isn't running, system is healthy
            healthy = not wrapper_running and not lock_active
            self._send_json(200, {
                "healthy": healthy,
                "cpu_load": get_cpu_load(),
                "mem_used_pct": get_mem_used_pct(),
                "disk_used_pct": get_disk_used_pct(),
                "wrapper_running": wrapper_running,
                "lock_active": lock_active,
                "sshd_running": True,  # assume true if we can reach this endpoint
                "proot_running": is_process_running("proot-distro"),
            })
        elif path == "/cleanup":
            actions = cleanup_orphans()
            self._send_json(200, {"cleaned": actions})
        else:
            self._send_json(404, {"error": "not found"})

    def log_message(self, format, *args):
        pass  # silence request logging


class ReuseAddrTCPServer(http.server.HTTPServer):
    def server_bind(self):
        self.allow_reuse_address = True
        super().server_bind()


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))
    signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
    with ReuseAddrTCPServer(("0.0.0.0", PORT), Handler) as httpd:
        print(f"OnePlus health server listening on port {PORT}", flush=True)
        httpd.serve_forever()
