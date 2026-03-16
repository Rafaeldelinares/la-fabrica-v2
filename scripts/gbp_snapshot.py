#!/usr/bin/env python3
"""
GBP Snapshot — Batch automático de Google Business Profile
Escribe en clientes.gmaps_fichas (tabla normalizada) + mantiene campos legacy en clientes.
Estrategias de búsqueda (orden de prioridad):
  0. Slug de bybusiness_url  (más fiable — gestionado por ByBusiness)
  1. Nombre + localidad_negocio/comercial
  2. Teléfono
  3. Dirección + localidad
  4. Dominio web/email + localidad
  5. Nombre normalizado (sin acentos/ñ)
  6. Google Maps directo (scraper modo usuario real — último recurso)
"""
import psycopg2, requests, json, time, re, logging, sys, unicodedata
from datetime import datetime

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/var/log/gbp_snapshot.log', encoding='utf-8')
    ]
)
log = logging.getLogger(__name__)

DB_DSN      = "host=localhost port=5432 dbname=crm_bybusiness user=postgres password=postgres"
SCRAPER_URL = "http://localhost:8092/webhook/scraper/go"
MAPS_URL    = "http://localhost:8094/api/v1/maps/search"
TIMEOUT_S   = 90
DEPTH       = 3
SLEEP_S     = 0.5


# ──────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────

def extract_review_url(gmaps_url):
    if not gmaps_url:
        return None
    m = re.search(r'!19s([^?&]+)', gmaps_url)
    return f"https://search.google.com/local/writereview?placeid={m.group(1)}" if m else None


def normalizar(texto):
    nfkd = unicodedata.normalize('NFKD', texto)
    return ''.join(c for c in nfkd if not unicodedata.combining(c))


def nombre_desde_dominio(web, email):
    dominio = None
    if web:
        dominio = re.sub(r'^https?://', '', web).split('/')[0]
    elif email and '@' in email:
        dominio = email.split('@')[1]
    if not dominio:
        return None
    partes = dominio.split('.')
    base = partes[1] if len(partes) > 2 and partes[0] == 'www' else partes[0]
    return re.sub(r'[-_]', ' ', base).strip()


def slug_desde_bybusiness_url(url):
    """Extrae el slug legible de https://bybusiness.es/mi-negocio/ → 'mi negocio'."""
    if not url:
        return None
    m = re.search(r'bybusiness\.es/([^/?#]+)', url)
    if not m:
        return None
    slug = m.group(1).strip('/')
    return re.sub(r'[-_]', ' ', slug).strip()


def es_nombre_negocio(nombre):
    """Devuelve False si el nombre parece una dirección en vez de un nombre de negocio."""
    if not nombre:
        return False
    patrones_dir = [
        r'^(C\.|Calle|Av\.|Avda\.|Avd\.|Plaza|Pl\.|Paseo|Pza\.|Rda\.|Ronda|Camino|Carretera|C/)',
        r'^\d+\s+\w',
        r'^[A-Z]\.\s',
    ]
    for p in patrones_dir:
        if re.match(p, nombre.strip(), re.IGNORECASE):
            return False
    return True


# ──────────────────────────────────────────────
# Buscadores
# ──────────────────────────────────────────────

def _normalizar_item(item, query):
    """Valida y normaliza un item del motor Go. Devuelve (item, pendiente) o (None, False)."""
    has_metrics  = item.get("rating") or item.get("reviews")
    has_identity = item.get("cid") or item.get("url") or item.get("gmaps_url")
    if not has_metrics and not has_identity:
        return None, False
    nombre_resultado = (item.get("name") or "").strip().lower()
    if nombre_resultado and nombre_resultado == query.strip().lower():
        return None, False
    nombre_parece_dir = not es_nombre_negocio(item.get("name") or "")
    pendiente = bool((has_identity and not has_metrics) or nombre_parece_dir)
    return item, pendiente


def buscar(query):
    r = requests.post(
        SCRAPER_URL,
        json={"query": {"q": query, "depth": DEPTH, "preload": False}},
        timeout=TIMEOUT_S
    )
    data = r.json()
    item = data.get("data", {})
    if data.get("type") == "list":
        items = item if isinstance(item, list) else []
        item  = items[0] if items else {}
    elif data.get("type") != "detail":
        return None, False
    return _normalizar_item(item, query)


def buscar_maps(query):
    """Último recurso: abre maps.google.com directamente como usuario real."""
    try:
        r = requests.post(MAPS_URL, json={"query": query}, timeout=120)
        data = r.json()
        if not data.get("found"):
            return None, False
        d = data["data"]
        if not d.get("name"):
            return None, False
        if d["name"].strip().lower() == query.strip().lower():
            return None, False
        item = {
            "name":      d.get("name"),
            "rating":    d.get("rating"),
            "reviews":   d.get("reviews"),
            "address":   d.get("address"),
            "phone":     d.get("phone"),
            "url":       d.get("url"),
            "cid":       d.get("cid"),
            "breakdown": d.get("breakdown"),
            "sentiment": None,
        }
        has_metrics  = item["rating"] or item["reviews"]
        has_identity = item["cid"] or item["url"]
        pendiente = bool(has_identity and not has_metrics)
        return item, pendiente
    except Exception as e:
        log.warning(f"[maps] Error en buscar_maps('{query}'): {e}")
        return None, False


# ──────────────────────────────────────────────
# Persistencia
# ──────────────────────────────────────────────

def guardar(cur, cliente_id, item, pendiente=False, via_bybusiness=False):
    rating     = item.get("rating")
    reviews    = item.get("reviews")
    url        = item.get("url") or item.get("gmaps_url")
    gcid       = item.get("cid") or None
    address    = item.get("address")
    nombre_gm  = item.get("name")
    sentiment  = item.get("sentiment")
    breakdown  = item.get("breakdown")
    sentiment_json = json.dumps({"sentiment": sentiment, "breakdown": breakdown}) if sentiment else None
    review_url = extract_review_url(url)

    # ── gmaps_fichas (tabla normalizada) ──
    cur.execute("""
        INSERT INTO clientes.gmaps_fichas
            (cliente_id, tipo, gmaps_nombre, gmaps_url, google_cid,
             gmaps_rating, gmaps_reseñas, gmaps_address, gmaps_review_url,
             gmaps_sentiment, gmaps_pendiente_validar, gestionada_por_bybusiness,
             gmaps_last_updated)
        VALUES (%s, 'principal', %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
        ON CONFLICT (cliente_id, tipo) DO UPDATE SET
            gmaps_nombre             = EXCLUDED.gmaps_nombre,
            gmaps_url                = COALESCE(NULLIF(EXCLUDED.gmaps_url,''), clientes.gmaps_fichas.gmaps_url),
            google_cid               = COALESCE(NULLIF(EXCLUDED.google_cid,''), clientes.gmaps_fichas.google_cid),
            gmaps_rating             = EXCLUDED.gmaps_rating,
            gmaps_reseñas            = EXCLUDED.gmaps_reseñas,
            gmaps_address            = EXCLUDED.gmaps_address,
            gmaps_review_url         = COALESCE(NULLIF(EXCLUDED.gmaps_review_url,''), clientes.gmaps_fichas.gmaps_review_url),
            gmaps_sentiment          = EXCLUDED.gmaps_sentiment,
            gmaps_pendiente_validar  = EXCLUDED.gmaps_pendiente_validar,
            gestionada_por_bybusiness = EXCLUDED.gestionada_por_bybusiness,
            gmaps_last_updated       = NOW()
    """, (cliente_id, nombre_gm, url, gcid, rating, reviews,
          address, review_url, sentiment_json, pendiente, via_bybusiness))

    # ── clientes (campos legacy — mantener compatibilidad con frontend actual) ──
    cur.execute("""
        UPDATE clientes.clientes SET
            gmaps_rating             = %s,
            gmaps_reseñas            = %s,
            gmaps_url                = COALESCE(NULLIF(%s,''), gmaps_url),
            google_cid               = COALESCE(NULLIF(%s,''), google_cid),
            gmaps_address            = %s,
            gmaps_sentiment          = %s,
            gmaps_nombre             = %s,
            gmaps_review_url         = COALESCE(NULLIF(%s,''), gmaps_review_url),
            gmaps_pendiente_validar  = %s,
            gmaps_last_updated       = NOW()
        WHERE id = %s
    """, (rating, reviews, url, gcid, address, sentiment_json,
          nombre_gm, review_url, pendiente, cliente_id))

    # ── gmaps_historico (serie temporal) ──
    cur.execute("""
        INSERT INTO clientes.gmaps_historico
            (cliente_id, fecha_snapshot, gmaps_rating, gmaps_reseñas, gmaps_url,
             google_cid, gmaps_address, gmaps_sentiment, gmaps_nombre)
        VALUES (%s, CURRENT_DATE, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (cliente_id, fecha_snapshot) DO UPDATE SET
            gmaps_rating    = EXCLUDED.gmaps_rating,
            gmaps_reseñas   = EXCLUDED.gmaps_reseñas,
            gmaps_url       = COALESCE(EXCLUDED.gmaps_url, clientes.gmaps_historico.gmaps_url),
            google_cid      = COALESCE(EXCLUDED.google_cid, clientes.gmaps_historico.google_cid),
            gmaps_address   = EXCLUDED.gmaps_address,
            gmaps_sentiment = EXCLUDED.gmaps_sentiment,
            gmaps_nombre    = EXCLUDED.gmaps_nombre
    """, (cliente_id, rating, reviews, url, gcid, address, sentiment_json, nombre_gm))


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────

def main():
    log.info("=== GBP Snapshot iniciado ===")
    db  = psycopg2.connect(DB_DSN)
    cur = db.cursor()

    cur.execute("""
        SELECT id, nombre_comercial,
               COALESCE(localidad_negocio, localidad)   AS localidad,
               COALESCE(provincia_negocio, provincia)   AS provincia,
               telefono, direccion, email, web, bybusiness_url
        FROM clientes.clientes
        WHERE estado = 'activo'
          AND nombre_comercial IS NOT NULL
          AND gmaps_rating IS NULL
          AND fecha_alta >= '2024-01-01' AND fecha_alta < '2025-01-01'
        ORDER BY fecha_alta DESC NULLS LAST
    """)
    clientes = cur.fetchall()
    total = len(clientes)
    log.info(f"Clientes pendientes: {total}")

    ok_bybusiness, ok_nombre, ok_tel, ok_dir, ok_web, ok_maps, sin_resultado, errores = \
        0, 0, 0, 0, 0, 0, 0, 0

    for i, (cid, nombre, localidad, provincia, telefono, direccion, email, web, bybusiness_url) in enumerate(clientes):
        try:
            item, pendiente, via, via_bybusiness = None, False, None, False

            # Estrategia 0: slug de bybusiness_url (más fiable)
            slug = slug_desde_bybusiness_url(bybusiness_url)
            if slug:
                query = slug
                if localidad: query += f" {localidad}"
                item, pendiente = buscar(query)
                if item is None:
                    item, pendiente = buscar(slug)  # sin localidad como fallback
                if item:
                    via, via_bybusiness = "bybusiness", True

            # Estrategia 1: nombre + localidad comercial (o fiscal)
            if item is None:
                partes = [nombre]
                if localidad: partes.append(localidad)
                if provincia and provincia != localidad: partes.append(provincia)
                item, pendiente = buscar(" ".join(partes))
                if item: via = "nombre"

            # Estrategia 2: teléfono
            if item is None and telefono:
                item, pendiente = buscar(telefono.strip())
                if item: via = "telefono"

            # Estrategia 3: dirección + localidad
            if item is None and direccion and localidad:
                item, pendiente = buscar(f"{direccion} {localidad}")
                if item: via = "direccion"

            # Estrategia 4: dominio web/email + localidad
            if item is None:
                nombre_web = nombre_desde_dominio(web, email)
                if nombre_web and localidad:
                    item, pendiente = buscar(f"{nombre_web} {localidad}")
                    if item: via = "web"

            # Estrategia 5: nombre normalizado sin acentos/ñ
            if item is None and localidad:
                nombre_norm = normalizar(nombre)
                if nombre_norm != nombre:
                    partes_norm = [nombre_norm, localidad]
                    if provincia and provincia != localidad:
                        partes_norm.append(normalizar(provincia))
                    item, pendiente = buscar(" ".join(partes_norm))
                    if item: via = "normalizado"

            # Estrategia 6: Google Maps directo (usuario real)
            if item is None:
                query_maps = nombre
                if localidad: query_maps += f" {localidad}"
                item, pendiente = buscar_maps(query_maps)
                if item is None and telefono:
                    item, pendiente = buscar_maps(telefono.strip())
                if item: via = "maps"

            # ── Guardar o reportar ──
            if item is None:
                sin_resultado += 1
                log.info(f"[{i+1}/{total}] SIN FICHA  — {nombre[:40]} ({localidad})")
            else:
                guardar(cur, cid, item, pendiente, via_bybusiness=via_bybusiness)
                db.commit()
                r = item.get('rating', '?')
                v = item.get('reviews', '?')
                g = (item.get('name') or nombre)[:28]
                flag = " [VALIDAR]" if pendiente else ""
                byflag = " [ByBusiness]" if via_bybusiness else ""

                if via == "bybusiness":
                    ok_bybusiness += 1
                    log.info(f"[{i+1}/{total}] BYBUSINESS — {nombre[:28]} → {g} | {r}★ {v}r{flag}")
                elif via == "nombre":
                    ok_nombre += 1
                    log.info(f"[{i+1}/{total}] NOMBRE    — {nombre[:35]} | {r}★ {v}r{flag}")
                elif via == "telefono":
                    ok_tel += 1
                    log.info(f"[{i+1}/{total}] TELEFONO  — {nombre[:25]} → {g} | {r}★ {v}r{flag}")
                elif via == "direccion":
                    ok_dir += 1
                    log.info(f"[{i+1}/{total}] DIRECCION — {nombre[:25]} → {g} | {r}★ {v}r{flag}")
                elif via == "web":
                    ok_web += 1
                    log.info(f"[{i+1}/{total}] WEB/EMAIL — {nombre[:25]} → {g} | {r}★ {v}r{flag}")
                elif via == "normalizado":
                    ok_web += 1
                    log.info(f"[{i+1}/{total}] NORMALIZ  — {nombre[:25]} → {g} | {r}★ {v}r{flag}")
                elif via == "maps":
                    ok_maps += 1
                    log.info(f"[{i+1}/{total}] MAPS      — {nombre[:25]} → {g} | {r}★ {v}r{flag}")

        except requests.exceptions.Timeout:
            sin_resultado += 1
            log.warning(f"[{i+1}/{total}] TIMEOUT   — {nombre[:40]}")
        except Exception as e:
            errores += 1
            db.rollback()
            log.error(f"[{i+1}/{total}] ERROR     — {nombre[:30]}: {e}")

        if (i + 1) % 50 == 0:
            log.info(
                f"=== RESUMEN [{i+1}/{total}] "
                f"bybusiness={ok_bybusiness} nombre={ok_nombre} tel={ok_tel} "
                f"dir={ok_dir} web={ok_web} maps={ok_maps} "
                f"sin={sin_resultado} err={errores} ==="
            )

        time.sleep(SLEEP_S)

    log.info(
        f"=== FIN: {ok_bybusiness} bybusiness | {ok_nombre} nombre | {ok_tel} tel | "
        f"{ok_dir} dir | {ok_web} web | {ok_maps} maps | "
        f"{sin_resultado} sin match | {errores} errores ==="
    )
    cur.close()
    db.close()


if __name__ == "__main__":
    main()
