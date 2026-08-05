#!/usr/bin/env python3
"""
gbp_ficha_audit.py — Audit a Google Business Profile ficha via Playwright.

Extracts structured data from the GBP listing page for a checklist UI.

Uso:
    python3 gbp_ficha_audit.py <place_id>
    echo '{"place_id":"ChIJ..."}' | python3 gbp_ficha_audit.py --json

Args:
    place_id   Google place_id (e.g. "ChIJN1...")
    --json     Read place_id from stdin as JSON

Output: single JSON line on stdout.
Errors  → {"error": "captcha"|"timeout"|"partial_scrape"|"..."}
"""

import argparse
import json
import re
import sys
import time
from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

USER_AGENT = (
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
)

# Stealth: override webdriver flag
STEALTH_JS = """
() => {
    Object.defineProperty(navigator, 'webdriver', {get: () => undefined});
}
"""

TOTAL_TIMEOUT_MS = 30_000


def _stealth(page):
    """Apply stealth patches to a page."""
    page.add_init_script(STEALTH_JS)


def handle_consent(page):
    """Click the consent dialog if it appears. Returns True if handled."""
    for sel in [
        "button:has-text('Aceptar todo')", "button:has-text('Accept all')",
        "button:has-text('Rechazar todo')", "button:has-text('Reject all')",
        "form button",
    ]:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=2000):
                btn.click()
                page.wait_for_timeout(2000)
                return True
        except Exception:
            pass
    return False


def scrape_place_id(page, place_id: str) -> dict:
    """Navigate to GBP ficha and extract structured audit data."""
    import re as _re

    # Determine format and construct URL
    if place_id.startswith("ChIJ"):
        # Standard Google place_id (e.g. ChIJEUY459_PEQ0R0Q72g_Jrlq0)
        url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
        fmt = "place_id"
    elif _re.fullmatch(r"0x[0-9a-fA-F]+:0x[0-9a-fA-F]+", place_id):
        # Hex colon CID format stored in clientes.gmaps_fichas.google_cid
        # e.g. 0xd6e2bbafd04c977:0x23fb2f3c11167d8a (Maquinaria Tenorio)
        url = f"https://www.google.com/maps/place/?cid={place_id}"
        fmt = "hex_cid"
    elif place_id.isdigit():
        # Decimal CID (legacy/alternative)
        url = f"https://www.google.com/maps/place/?cid={place_id}"
        fmt = "decimal_cid"
    else:
        return {"error": "invalid_format", "place_id": place_id}

    result = {
        "place_id": place_id,
        "format": fmt,
        "categoria_principal": None,
        "categorias_secundarias": [],
        "descripcion": None,
        "horarios_dias_cubiertos": 0,
        "atributos_seteados": 0,
        "atributos_total": 15,
        "fotos_count": 0,
        "ultima_foto_fecha": None,
        "posts_count": 0,
        "rating_promedio": None,
        "reviews_count": 0,
        "reviews_respondidas_pct": 0.0,
        "qa_count": 0,
    }

    try:
        page.goto(url, wait_until="domcontentloaded", timeout=20_000)
    except PWTimeout:
        return {"error": "timeout"}

    page.wait_for_timeout(3000)

    if "captcha" in page.url.lower() or "consent" in page.url.lower():
        handle_consent(page)
        page.wait_for_timeout(3000)

    # Detect CAPTCHA / blocked page — check visible text, NOT raw HTML
    # (Google's JS may contain "Object Not Found Matching Id" in the HTML)
    visible_text = page.locator("body").inner_text()
    if "unusual traffic" in visible_text.lower():
        return {"error": "captcha"}
    if "no se encontro" in visible_text.lower() or "not found" in visible_text.lower():
        return {"error": "not_found"}

    # ── categoria_principal + categorias_secundarias ──────────────────────────
    # Primary selector: button.DkEaL (confirmed working in 2026 GBP DOM)
    # Fallback: text nodes after h1 containing category-like content
    try:
        cat_buttons = page.locator("button.DkEaL").all()
        if cat_buttons:
            cats = [b.inner_text(timeout=2000).strip() for b in cat_buttons if b.is_visible(timeout=1000) and b.inner_text(timeout=1000).strip()]
            if cats:
                result["categoria_principal"] = cats[0]
                result["categorias_secundarias"] = [c for c in cats[1:] if c]
        if not result["categoria_principal"]:
            # Fallback: text content near h1 that looks like a category
            h1 = page.locator("h1").first
            if h1.is_visible(timeout=2000):
                parent = h1.locator("..").first
                try:
                    parent_text = parent.inner_text(timeout=1000)
                    # Look for category text after h1 (typically after rating)
                    parts = parent_text.split()
                    # Find "Ferretería" or similar category words near the h1
                    body_text = page.locator("body").inner_text()
                    for line in body_text.split("\n"):
                        line = line.strip()
                        if line and line != h1.inner_text(timeout=500).strip():
                            # Skip known non-category lines
                            skip_words = ["Abierto", "Cerrado", "Confirmado", "Guardado", "Cercano",
                                          "Cómo llegar", "Compartir", "Teléfono", "Dirección",
                                          "Añadir", "Escribir", "Sugerir", "Ver fotos"]
                            if not any(sw in line for sw in skip_words) and len(line) < 80:
                                result["categoria_principal"] = line
                                break
                except Exception:
                    pass
    except Exception:
        pass

    # ── descripcion ───────────────────────────────────────────────────────────
    # Confirmed selector: div.WeS02d (fontBodyMedium) — contains full description text
    # Service options like "Compra en tienda", "Brunch" may trail the description
    # NOTE: Google only shows description in the DOM when the ficha is NOT in limited view.
    # In limited view (most fichas), the description element is not present → returns None.
    try:
        desc_el = page.locator("div.WeS02d, .WeS02d").first
        if desc_el.is_visible(timeout=3000):
            text = desc_el.inner_text(timeout=3000).strip()
            if text and len(text) > 10:
                # Filter out service option lines and icon-heavy lines
                lines = [l.strip() for l in text.split("\n") if l.strip()]
                skip_phrases = [
                    "Compra en tienda", "Recogida en tienda", "A domicilio",
                    "Brunch", "Comida en el local", "Servicios del restaurante",
                    "Tipos de servicio", "Opciones del servicio",
                ]
                cleaned_lines = []
                for l in lines:
                    if any(s in l for s in skip_phrases):
                        continue
                    # Skip lines that are mostly unicode icon characters
                    if len(l) > 0 and sum(1 for c in l if ord(c) > 0xE000) > len(l) * 0.5:
                        continue
                    if l and len(l) > 10:
                        cleaned_lines.append(l)
                if cleaned_lines:
                    result["descripcion"] = " ".join(cleaned_lines)[:500]
    except Exception:
        pass

    # ── horarios: dias cubiertos (simplified — 0-7) ─────────────────────────
    # Confirmed: table.eK4R0e contains hours with day names in the cells
    try:
        day_names = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
                     "lun", "mar", "mié", "jue", "vie", "sáb", "dom",
                     "mon", "tue", "wed", "thu", "fri", "sat", "sun",
                     "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        # Primary: hours table
        hrs_table = page.locator("table.eK4R0e")
        if hrs_table.count() > 0 and hrs_table.first.is_visible(timeout=3000):
            table_text = hrs_table.first.inner_text(timeout=3000)
            days_found = sum(1 for d in day_names if d.lower() in table_text.lower())
            result["horarios_dias_cubiertos"] = min(days_found, 7)
        else:
            # Fallback: count day names in body text
            body = page.locator("body").inner_text()
            days_found = sum(1 for d in day_names if d.lower() in body.lower())
            result["horarios_dias_cubiertos"] = min(days_found, 7)
    except Exception:
        pass

    # ── rating + reviews ─────────────────────────────────────────────────────
    # Confirmed working: aria-label containing "estrel" / "star" (e.g. "4,3 estrellas ")
    # Google shows review count ONLY in the aria-label (e.g. "4,3 estrellas 47 reseñas")
    # The body text does NOT contain review counts in the limited view
    try:
        for sel in [
            # Try combined label first (contains both rating and review count)
            "[role='img'][aria-label*='estrel' i]",
            "[role='img'][aria-label*='star' i]",
        ]:
            try:
                el = page.locator(sel).first
                lbl = el.get_attribute("aria-label") or ""
                if not lbl:
                    continue
                # Match rating number (e.g. "4,3" or "4.3")
                m = re.search(r"(\d+[.,]\d+)", lbl.replace(",", "."))
                if m:
                    result["rating_promedio"] = float(m.group(1))
                    # Try to extract review count from same aria-label
                    # e.g. "4,3 estrellas 47 reseñas" or "4.3 stars 47 reviews"
                    after_rating = lbl.split(m.group(1))[-1]
                    rev_m = re.search(r"(\d+)\s*(?:reseña|review)", after_rating, re.IGNORECASE)
                    if rev_m:
                        result["reviews_count"] = int(rev_m.group(1))
                    break
            except Exception:
                continue
        # Fallback: look for rating in body text (near h1)
        if result["rating_promedio"] is None:
            body = page.locator("body").inner_text()
            m = re.search(r"(\d+[.,]\d+)", body)
            if m:
                result["rating_promedio"] = float(m.group(1).replace(",", "."))
    except Exception:
        pass

    # ── fotos_count + ultima_foto_fecha ────────────────────────────────────
    try:
        foto_sel = "[class*='gallery'] img, [class*='fotos'] img, [class*='photo'] img"
        foto_els = page.locator(foto_sel).all()
        result["fotos_count"] = len(foto_els)
        # Try to get last photo date from alt text or title
        for el in reversed(foto_els):
            try:
                alt = el.get_attribute("alt") or ""
                title = el.get_attribute("title") or ""
                date_m = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", alt + title)
                if date_m:
                    result["ultima_foto_fecha"] = date_m.group(1)
                    break
            except Exception:
                continue
    except Exception:
        pass

    # ── posts_count ─────────────────────────────────────────────────────────
    try:
        post_sel = "[class*='post'] span, [class*='publicación'] span, [class*='update']"
        post_els = page.locator(post_sel).all()
        # Filter to visible post-like items
        posts_visible = sum(1 for el in post_els if el.is_visible(timeout=1000) if el.text_content())
        result["posts_count"] = posts_visible
    except Exception:
        pass

    # ── Q&A count ────────────────────────────────────────────────────────────
    try:
        qa_sel = "[class*='question'], [class*='pregunta']"
        qa_els = page.locator(qa_sel).all()
        result["qa_count"] = len(qa_els)
    except Exception:
        pass

    # ── atributos ────────────────────────────────────────────────────────────
    # Google exposes business attributes as text in the ficha:
    # e.g. "Se identifica como de propietarias mujeres", accessibility features
    # These appear in the main panel, not in the sidebar/UI chrome.
    # Count only clear attribute lines (not action buttons or UI elements).
    try:
        body = page.locator("body").inner_text()
        lines = body.split("\n")
        # High-confidence attribute indicators (clearly business attributes, not UI)
        attr_indicators = [
            "se identifica", "propietarias", "mujeres", "hombres",
            "acceso para sillas", "aparcamiento adaptado", "accesibilidad",
            "reservas", "reserva", "domicilio", "recogida",
            "terraza", "mascotas", "wi-fi", "wifi", "comida para llevar",
            "entrega a domicilio", "vegetariano", "vegano", "sin gluten",
            "desayuno", "almuerzo", "cena", "café", "bar", "restaurante",
            "gama", "precio", "veterano", "empresa pequeña",
            "family-friendly", "children", "kids", "highchair",
            "gender-neutral", "LGBTQ", "owned by", "women-owned",
        ]
        skip_words = [
            "Añadir", "Escribir", "Sugerir", "Guardar", "Compartir", "Cercano",
            "Teléfono", "Dirección", "Cómo llegar", "Ver fotos", "Reseña",
            "Fotos y vídeos", "Añadir fotos", "Mostrar", "Ocultar",
            "Iniciar sesión", "vista limitada", "Google Maps", "Maps",
            "Términos", "Privacidad", "Restaurantes", "Hoteles", "Bares",
            "Cafeterías", "Qué hacer", "Aparcamientos", "Farmacias",
            "Cajeros", "Transporte", "Descarga", "Maquinaria Tenorio",
            "Bar Restaurante", "Carretera", "C.", "dirección", "llamar",
        ]
        attr_count = 0
        for line in lines:
            line = line.strip()
            if not line or len(line) < 5 or len(line) > 120:
                continue
            if any(sw.lower() in line.lower() for sw in skip_words):
                continue
            line_lower = line.lower()
            matches = sum(1 for ind in attr_indicators if ind.lower() in line_lower)
            if matches > 0:
                attr_count += 1
        result["atributos_seteados"] = attr_count
    except Exception:
        pass

    # ── reviews respondidas ──────────────────────────────────────────────────
    # Strategy: if reviews_count > 0, look for "Respondida" badges in the reviews
    # The percentage requires opening the reviews section
    try:
        total_reviews = result["reviews_count"]
        if total_reviews > 0:
            # Look for response badges near review entries
            # Google shows "Respondida por el propietario" or similar badge
            resp_patterns = [
                "[class*='respondida']",
                "[class*='respuesta']",
                "[class*='reply']",
                "[aria-label*='respondida' i]",
                "[aria-label*='respuesta' i]",
                "text=Respondida",
                "text=respondida",
            ]
            resp_count = 0
            for pat in resp_patterns:
                try:
                    els = page.locator(pat)
                    resp_count = len([e for e in els.all() if e.is_visible(timeout=500)])
                    if resp_count > 0:
                        break
                except Exception:
                    continue
            result["reviews_respondidas_pct"] = min(100.0, round(resp_count / total_reviews * 100, 1))
        # If reviews_count is 0, leave at 0.0 (Google doesn't expose count in limited view)
    except Exception:
        pass

    return result


def main():
    parser = argparse.ArgumentParser(description="GBP Ficha Audit via Playwright")
    parser.add_argument("place_id", nargs="?", default=None,
                        help="Google place_id to audit")
    parser.add_argument("--json", action="store_true",
                        help="Read place_id from stdin as JSON")
    args = parser.parse_args()

    place_id = None

    if args.json:
        try:
            data = json.loads(sys.stdin.read().strip())
            place_id = data.get("place_id")
        except Exception:
            print(json.dumps({"error": "invalid_stdin_json"}))
            sys.exit(1)
    elif args.place_id:
        place_id = args.place_id.strip()
    else:
        print(json.dumps({"error": "place_id_required"}))
        sys.exit(1)

    if not place_id:
        print(json.dumps({"error": "place_id_required"}))
        sys.exit(1)

    result = {}
    start = time.time()

    try:
        with sync_playwright() as pw:
            browser = pw.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-blink-features=AutomationControlled",
                    "--disable-dev-shm-usage",
                ],
            )
            ctx = browser.new_context(
                user_agent=USER_AGENT,
                viewport={"width": 1280, "height": 800},
                locale="es-ES",
            )
            page = ctx.new_page()
            _stealth(page)

            try:
                result = scrape_place_id(page, place_id)
            except Exception as e:
                elapsed = time.time() - start
                sys.stderr.write(f"scrape error after {elapsed:.1f}s: {e}\n")
                result = {"error": "partial_scrape"}

            browser.close()

    except Exception as e:
        sys.stderr.write(f"browser launch error: {e}\n")
        result = {"error": "browser_error"}

    elapsed = time.time() - start
    sys.stderr.write(f"done place_id={place_id} elapsed={elapsed:.1f}s\n")

    if not result.get("place_id"):
        result["place_id"] = place_id
    elif result.get("error") and "place_id" not in result:
        result["place_id"] = place_id

    # If we have error but no partial data, ensure place_id is present
    if "error" in result and len(result) == 2:
        result["place_id"] = place_id

    print(json.dumps(result, ensure_ascii=False))
    sys.stderr.flush()


if __name__ == "__main__":
    main()
