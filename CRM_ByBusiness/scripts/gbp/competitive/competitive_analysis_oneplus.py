#!/usr/bin/env python3
"""
competitive_analysis_oneplus.py — OnePlus wrapper for VPS-driven GBP scraping.

Runs ON the OnePlus (inside proot-distro Debian). Invoked via SSH from n8n on VPS.
Scrapes Google Maps via gms-browser and returns structured JSON to stdout.
VPS owns all DB writes; this script only outputs JSON.

Concurrency: uses flock-based lock file to prevent parallel executions.

Usage:
    python3 ~/competitive_analysis_oneplus.py --cliente-id 4 --mode cita
    python3 ~/competitive_analysis_oneplus.py --cliente-id 4 --mode mantenimiento

Exit codes:
    0 = success
    1 = scraping error
    2 = input / validation error
    3 = another scraper instance already running
"""

import argparse
import fcntl
import json
import os
import re
import signal
import subprocess
import sys
import time
import atexit
from datetime import datetime, timezone

LOCK_PATH = os.path.join(os.path.expanduser("~"), "oneplus_scraper.lock")
_lock_fd = None


def _acquire_lock():
    """Acquire exclusive flock lock or exit with error JSON."""
    global _lock_fd
    try:
        _lock_fd = open(LOCK_PATH, "w")
        fcntl.flock(_lock_fd.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        _lock_fd.write(f"pid={os.getpid()}\nstarted={time.time()}\n")
        _lock_fd.flush()
    except BlockingIOError:
        print(json.dumps({"success": False, "error": "another_scraper_running"}), file=sys.stdout)
        sys.exit(3)


def _release_lock():
    """Release flock lock on exit."""
    global _lock_fd
    if _lock_fd is not None:
        try:
            fcntl.flock(_lock_fd.fileno(), fcntl.LOCK_UN)
            _lock_fd.close()
            _lock_fd = None
        except Exception:
            pass


def _signal_handler(signum, frame):
    """Handle SIGTERM/SIGINT so atexit cleanup runs."""
    sys.exit(0)

# --- DB config REMOVED — wrapper does NOT touch DB ---
# VPS caller is responsible for fetching cliente data and passing it via CLI args.
# This keeps the wrapper pure (scraping only) and avoids requiring an SSH tunnel
# from OnePlus → VPS postgres just to read one row.

# --- Proot-distro paths ---
PROOT_ROOT = "/data/data/com.termux/files/usr/var/lib/proot-distro/containers/debian/rootfs"
GMS_BROWSER = f"{PROOT_ROOT}/root/gms-browser"

# --- Geo fallback map ---
GEO_MAP = {
    "Madrid": ("40.4168,-3.7038", "40.0,-4.0,40.8,-3.4"),
    "Barcelona": ("41.3851,2.1734", "41.0,2.0,41.8,2.4"),
    "Málaga": ("36.7213,-4.4214", "36.4,-4.7,37.0,-4.2"),
    "Sevilla": ("37.3886,-5.9823", "37.0,-6.3,37.7,-5.7"),
    "Valencia": ("39.4699,-0.3763", "39.2,-0.7,39.7,-0.1"),
    "Granada": ("37.1773,-3.5986", "36.9,-3.9,37.4,-3.3"),
    "Teguise": ("28.9611,-13.5499", "28.7,-13.8,29.2,-13.3"),
    "Las Palmas": ("28.1235,-15.4363", "27.9,-15.7,28.4,-15.2"),
    "Islas Baleares": ("39.5712,2.6466", "39.3,2.4,39.8,2.9"),
    "Cádiz": ("36.5298,-6.2924", "36.3,-6.5,36.7,-6.0"),
    "Cantabria": ("43.4623,-3.8100", "43.2,-4.0,43.7,-3.6"),
    "Sta. Cruz de Tenerife": ("28.4682,-16.2546", "28.2,-16.5,28.7,-16.0"),
    "Santa Cruz de Tenerife": ("28.4682,-16.2546", "28.2,-16.5,28.7,-16.0"),
    "Jaén": ("37.7796,-3.7849", "37.5,-4.0,38.0,-3.5"),
    "Córdoba": ("37.8882,-4.7794", "37.6,-5.0,38.1,-4.5"),
    "Huelva": ("37.2614,-6.9447", "37.0,-7.2,37.5,-6.7"),
    "Cáceres": ("39.4763,-6.3724", "39.2,-6.6,39.7,-6.1"),
    "Badajoz": ("38.8781,-6.9706", "38.6,-7.2,39.1,-6.7"),
    "Cuenca": ("40.0718,-2.1347", "39.8,-2.4,40.3,-1.9"),
    "Toledo": ("39.8561,-4.0236", "39.6,-4.3,40.1,-3.8"),
    "Girona": ("41.9794,2.8214", "41.7,2.6,42.2,3.1"),
    "Tarragona": ("41.1191,1.2454", "40.9,1.0,41.4,1.5"),
    "Lleida": ("41.6175,0.6200", "41.4,0.4,41.8,0.8"),
    "Navarra": ("42.8125,-1.6458", "42.6,-1.9,43.0,-1.4"),
    "Segovia": ("40.9429,-4.1085", "40.7,-4.3,41.2,-3.9"),
    "Avila": ("40.6567,-4.7003", "40.4,-4.9,40.9,-4.5"),
    "Salamanca": ("40.9701,-5.6635", "40.7,-5.9,41.2,-5.4"),
    "León": ("42.5987,-5.5671", "42.3,-5.8,42.9,-5.3"),
    "Valladolid": ("41.6521,-4.7245", "41.4,-4.9,41.9,-4.5"),
    "Palencia": ("42.0095,-4.5274", "41.8,-4.7,42.3,-4.3"),
    "Burgos": ("42.3406,-3.7065", "42.1,-3.9,42.6,-3.5"),
    "Soria": ("41.7665,-2.4790", "41.5,-2.7,42.0,-2.2"),
    "Zaragoza": ("41.6488,-0.8891", "41.4,-1.1,41.9,-0.6"),
    "Teruel": ("40.3456,-1.1064", "40.1,-1.3,40.6,-0.9"),
    "Huesca": ("42.1401,-0.4087", "41.9,-0.7,42.4,-0.2"),
    "Albacete": ("38.9943,-1.8585", "38.7,-2.1,39.3,-1.6"),
    "Ciudad Real": ("38.9848,-3.9274", "38.7,-4.2,39.3,-3.7"),
    "Almería": ("36.8402,-2.4681", "36.6,-2.7,37.1,-2.2"),
    "Murcia": ("37.9922,-1.1307", "37.7,-1.4,38.3,-0.9"),
    "Alicante": ("38.3452,-0.4811", "38.1,-0.7,38.6,-0.3"),
    "Castellon": ("39.9864,-0.0513", "39.7,-0.3,40.2,0.2"),
    "Bizkaia": ("43.2630,-2.9350", "43.0,-3.1,43.5,-2.7"),
}


def log(msg):
    """Print progress to stderr (never pollutes stdout JSON)."""
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{ts}] {msg}", flush=True, file=sys.stderr)


def get_geo(provincia):
    """Return (geo, bbox) for a given province."""
    if provincia:
        for key, (g, b) in GEO_MAP.items():
            if key.lower() in provincia.lower():
                return g, b
    return "40.4168,-3.7038", "40.0,-4.0,40.8,-3.4"


def safe_float(value):
    """Convert value to float or return None."""
    if not value or str(value).strip() in ("", "null", "NULL"):
        return None
    try:
        return float(value)
    except (ValueError, TypeError):
        return None


def safe_int(value):
    """Convert value to int or return None."""
    if not value or str(value).strip() in ("", "null", "NULL"):
        return None
    try:
        return int(float(value))
    except (ValueError, TypeError):
        return None


def parse_jsonl_objects(content):
    """Parse gms-browser JSONL output into a list of dicts."""
    objects = []
    for line in content.split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            obj = json.loads(line)
            if isinstance(obj, dict):
                objects.append(obj)
        except json.JSONDecodeError:
            continue
    return objects


def scrape_gms(input_query, output_path, geo, bbox, depth=1, extra_flags=""):
    """Run gms-browser inside proot-distro and return parsed JSONL objects."""
    # Write query to proot tmp
    proot_tmp_input = f"{PROOT_ROOT}/tmp/q_{os.getpid()}.txt"
    with open(proot_tmp_input, "w", encoding="utf-8") as f:
        f.write(input_query + "\n")

    cmd = (
        f"proot-distro login debian -- "
        f"/root/gms-browser "
        f"-input {proot_tmp_input} "
        f"-results {output_path} "
        f"-geo '{geo}' "
        f"-grid-bbox '{bbox}' "
        f"-grid-cell 5 -radius 8000 -zoom 14 "
        f"-depth {depth} -c 2 -browser-pool-size 2 -pages-per-browser 1 "
        f"-json "
        f"-exit-on-inactivity 60s "
        f"{extra_flags}"
    )
    try:
        subprocess.run(cmd, shell=True, timeout=600, capture_output=True, text=True)
    except subprocess.TimeoutExpired:
        return []

    # Read result
    if os.path.exists(output_path) and os.path.getsize(output_path) > 0:
        with open(output_path, encoding="utf-8") as f:
            content = f.read()
        return parse_jsonl_objects(content)
    return []


def extract_ficha_metrics(obj):
    """Extract key metrics from a gms-browser ficha result object."""
    return {
        "title": obj.get("title") or obj.get("name") or "",
        "address": obj.get("address") or "",
        "rating": safe_float(obj.get("reviewRating") or obj.get("review_rating") or obj.get("rating")),
        "num_resenas": safe_int(obj.get("reviewCount") or obj.get("review_count") or obj.get("reviews")),
        "category": obj.get("category") or "",
        "phone": obj.get("phone") or "",
        "place_id": obj.get("place_id") or obj.get("placeId") or "",
        "website": obj.get("website") or "",
        "latitude": safe_float(obj.get("latitude") or obj.get("lat")),
        "longitude": safe_float(obj.get("longitude") or obj.get("lng")),
    }


def compute_sentiment_score(ficha_obj):
    """Compute a sentiment-like score (0.0-1.0) from ficha data.

    Uses rating / 5.0 as a proxy when sentiment data is not available.
    """
    rating = safe_float(ficha_obj.get("rating"))
    if rating is not None:
        return round(min(1.0, rating / 5.0), 4)
    return None


def build_rank_position(cliente_title, competitors):
    """Compute the client's rank position among competitors by rating desc."""
    if not cliente_title:
        return None

    all_biz = []
    if cliente_title:
        cliente_rating = None
        for c in competitors:
            if c.get("title", "").lower() == cliente_title.lower():
                cliente_rating = c.get("rating")
                break
        if cliente_rating is not None:
            all_biz = [(cliente_title, cliente_rating, True)]
            for c in competitors:
                if c.get("title", "").lower() != cliente_title.lower():
                    all_biz.append((c.get("title", ""), c.get("rating", 0), False))

    all_biz.sort(key=lambda x: (-(x[1] or 0), x[2]), reverse=True)

    rank = None
    for i, (title, rating, is_client) in enumerate(all_biz, 1):
        if is_client:
            rank = i
            break

    if rank is not None and len(all_biz) > 0:
        return {
            "rank": rank,
            "total": len(all_biz),
            "client_rating": cliente_rating,
        }
    return None


def main():
    parser = argparse.ArgumentParser(
        description="OnePlus wrapper for VPS-driven GBP scraping."
    )
    parser.add_argument(
        "--cliente-id",
        type=int,
        required=True,
        help="Cliente ID to scrape",
    )
    parser.add_argument(
        "--mode",
        choices=["cita", "mantenimiento"],
        required=True,
        help="cita=full scraping (ficha+competitors+rank), mantenimiento=ficha only",
    )
    parser.add_argument(
        "--nombre-fiscal",
        required=True,
        help="Cliente nombre fiscal (used as primary Google Maps query)",
    )
    parser.add_argument(
        "--actividad",
        default="",
        help="Cliente actividad (used for competitor query, optional)",
    )
    parser.add_argument(
        "--localidad",
        default="",
        help="Cliente ciudad (used for geo + competitor query)",
    )
    parser.add_argument(
        "--provincia",
        default="",
        help="Cliente provincia (used for geo fallback)",
    )
    args = parser.parse_args()

    # --- Concurrency lock (before any scraping) ---
    _acquire_lock()
    atexit.register(_release_lock)
    signal.signal(signal.SIGTERM, _signal_handler)
    signal.signal(signal.SIGINT, _signal_handler)

    started_at = datetime.now(timezone.utc).isoformat()
    log(f"Starting scrape: cliente_id={args.cliente_id}, mode={args.mode}")

    # --- Step 1: cliente data passed via CLI args (no DB lookup) ---
    nombre = args.nombre_fiscal
    actividad = args.actividad
    localidad = args.localidad
    provincia = args.provincia

    log(f"Cliente: {nombre} | actividad={actividad} | ciudad={localidad}, {provincia}")

    # --- Step 2: determine geo ---
    geo, bbox = get_geo(provincia)
    if localidad:
        geo, bbox = get_geo(localidad)

    # --- Step 3: scrape ficha (both modes) ---
    ficha_query = nombre
    proot_tmp_result = f"{PROOT_ROOT}/tmp/ficha_{args.cliente_id}.json"

    log(f"Scraping ficha: {ficha_query[:50]}...")
    ficha_objects = scrape_gms(
        input_query=ficha_query,
        output_path=proot_tmp_result,
        geo=geo,
        bbox=bbox,
        depth=1,
    )

    ficha_raw = None
    ficha_metrics = None
    if ficha_objects:
        # Use the first object as the ficha
        ficha_raw = ficha_objects[0]
        ficha_metrics = extract_ficha_metrics(ficha_raw)
        log(f"Ficha scraped: title={ficha_metrics['title'][:40]}, "
            f"rating={ficha_metrics['rating']}, reviews={ficha_metrics['num_resenas']}")
    else:
        log("WARNING: No ficha results returned (rate-limited or not found)")

    # --- Step 4: scrape competitors (cita mode only) ---
    competitive_data = None
    rank_position = None

    if args.mode == "cita":
        comp_query = f"{actividad} {localidad}".strip()
        proot_tmp_comp = f"{PROOT_ROOT}/tmp/comp_{args.cliente_id}.json"

        if comp_query.strip():
            log(f"Scraping competitors: {comp_query}...")
            comp_objects = scrape_gms(
                input_query=comp_query,
                output_path=proot_tmp_comp,
                geo=geo,
                bbox=bbox,
                depth=1,
            )

            if comp_objects:
                competitive_data = [
                    extract_ficha_metrics(obj) for obj in comp_objects[:20]
                ]
                log(f"Competitors scraped: {len(competitive_data)} results")

                # Compute rank position
                rank_position = build_rank_position(
                    ficha_metrics["title"] if ficha_metrics else "",
                    competitive_data,
                )
                if rank_position:
                    log(f"Rank position: #{rank_position['rank']}/{rank_position['total']}")

    # --- Step 5: compute sentiment score ---
    sentiment_score = None
    if ficha_metrics:
        sentiment_score = compute_sentiment_score(ficha_metrics)

    # --- Step 6: compute duration ---
    duration_seconds = None  # caller computes from started_at

    # --- Step 7: build output ---
    result = {
        "success": True,
        "cliente_id": args.cliente_id,
        "mode": args.mode,
        "started_at": started_at,
        "duration_seconds": duration_seconds,
        "raw_json": ficha_raw,
        "rating": (ficha_metrics["rating"] if ficha_metrics else None),
        "num_resenas": (ficha_metrics["num_resenas"] if ficha_metrics else None),
        "sentiment_score": sentiment_score,
        "competitive_data": competitive_data,
        "rank_position": rank_position,
        "error": None,
    }

    print(json.dumps(result), file=sys.stdout)
    log("Scrape completed successfully")
    sys.exit(0)


if __name__ == "__main__":
    main()
