#!/usr/bin/env python3
"""
gbp_ficha_audit.py — Audit a Google Business Profile ficha via Playwright.

Extracts structured data from the GBP listing page for a checklist UI.
Supports both CLI mode and importable mode.

Uso (CLI):
    python3 gbp_ficha_audit.py <place_id>
    echo '{"place_id":"ChIJ..."}' | python3 gbp_ficha_audit.py --json

Import mode:
    from gbp_ficha_audit import scrape_full_audit
    result = scrape_full_audit(page, place_id)

Args:
    place_id   Google place_id (e.g. "ChIJ...") or hex CID (e.g. "0xd6e2bbafd04c977:0x23fb2f3c11167d8a")
    --json     Read place_id from stdin as JSON

Output (CLI): single JSON line on stdout.
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
REVIEWS_SCROLL_CAP = 50  # max review cards to load in deep mode


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


def _build_url(place_id: str):
    """Return (url, fmt) for a given place_id."""
    import re as _re
    if place_id.startswith("ChIJ"):
        return f"https://www.google.com/maps/place/?q=place_id:{place_id}", "place_id"
    elif _re.fullmatch(r"0x[0-9a-fA-F]+:0x[0-9a-fA-F]+", place_id):
        return f"https://www.google.com/maps/place/?cid={place_id}", "hex_cid"
    elif place_id.isdigit():
        return f"https://www.google.com/maps/place/?cid={place_id}", "decimal_cid"
    else:
        return None, "invalid_format"


def extract_limited_view(page, place_id) -> dict:
    """Extract fields available without clicking any tab.

    Returns a dict with these keys:
        place_id, format, categoria_principal, categorias_secundarias,
        descripcion, horarios_dias_cubiertos, atributos_seteados,
        atributos_total, rating_promedio, reviews_count,
        reviews_respondidas_pct, fotos_count, ultima_foto_fecha,
        posts_count, qa_count
    """
    import re as _re

    url, fmt = _build_url(place_id)
    if fmt == "invalid_format":
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

    # Detect CAPTCHA / blocked page
    visible_text = page.locator("body").inner_text()
    if "unusual traffic" in visible_text.lower():
        return {"error": "captcha"}
    if "no se encontro" in visible_text.lower() or "not found" in visible_text.lower():
        return {"error": "not_found"}

    # ── categoria_principal + categorias_secundarias ──────────────────────────
    try:
        cat_buttons = page.locator("button.DkEaL").all()
        if cat_buttons:
            cats = [b.inner_text(timeout=2000).strip() for b in cat_buttons
                    if b.is_visible(timeout=1000) and b.inner_text(timeout=1000).strip()]
            if cats:
                result["categoria_principal"] = cats[0]
                result["categorias_secundarias"] = [c for c in cats[1:] if c]
        if not result["categoria_principal"]:
            h1 = page.locator("h1").first
            if h1.is_visible(timeout=2000):
                parent = h1.locator("..").first
                try:
                    body_text = page.locator("body").inner_text()
                    for line in body_text.split("\n"):
                        line = line.strip()
                        if not line or line == h1.inner_text(timeout=500).strip():
                            continue
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
    try:
        desc_el = page.locator("div.WeS02d, .WeS02d").first
        if desc_el.is_visible(timeout=3000):
            text = desc_el.inner_text(timeout=3000).strip()
            if text and len(text) > 10:
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
                    if len(l) > 0 and sum(1 for c in l if ord(c) > 0xE000) > len(l) * 0.5:
                        continue
                    if l and len(l) > 10:
                        cleaned_lines.append(l)
                if cleaned_lines:
                    result["descripcion"] = " ".join(cleaned_lines)[:500]
    except Exception:
        pass

    # ── horarios ──────────────────────────────────────────────────────────────
    try:
        day_names = ["lunes", "martes", "miércoles", "jueves", "viernes", "sábado", "domingo",
                     "lun", "mar", "mié", "jue", "vie", "sáb", "dom",
                     "mon", "tue", "wed", "thu", "fri", "sat", "sun",
                     "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
        hrs_table = page.locator("table.eK4R0e")
        if hrs_table.count() > 0 and hrs_table.first.is_visible(timeout=3000):
            table_text = hrs_table.first.inner_text(timeout=3000)
            days_found = sum(1 for d in day_names if d.lower() in table_text.lower())
            result["horarios_dias_cubiertos"] = min(days_found, 7)
        else:
            body = page.locator("body").inner_text()
            days_found = sum(1 for d in day_names if d.lower() in body.lower())
            result["horarios_dias_cubiertos"] = min(days_found, 7)
    except Exception:
        pass

    # ── rating + reviews ─────────────────────────────────────────────────────
    try:
        for sel in [
            "[role='img'][aria-label*='estrel' i]",
            "[role='img'][aria-label*='star' i]",
        ]:
            try:
                el = page.locator(sel).first
                lbl = el.get_attribute("aria-label") or ""
                if not lbl:
                    continue
                m = re.search(r"(\d+[.,]\d+)", lbl.replace(",", "."))
                if m:
                    result["rating_promedio"] = float(m.group(1))
                    after_rating = lbl.split(m.group(1))[-1]
                    rev_m = re.search(r"(\d+)\s*(?:reseña|review)", after_rating, re.IGNORECASE)
                    if rev_m:
                        result["reviews_count"] = int(rev_m.group(1))
                    break
            except Exception:
                continue
        if result["rating_promedio"] is None:
            body = page.locator("body").inner_text()
            m = re.search(r"(\d+[.,]\d+)", body)
            if m:
                result["rating_promedio"] = float(m.group(1).replace(",", "."))
    except Exception:
        pass

    # ── fotos_count + ultima_foto_fecha ─────────────────────────────────────
    try:
        foto_sel = "[class*='gallery'] img, [class*='fotos'] img, [class*='photo'] img"
        foto_els = page.locator(foto_sel).all()
        result["fotos_count"] = len(foto_els)
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

    # ── posts_count ──────────────────────────────────────────────────────────
    try:
        post_sel = "[class*='post'] span, [class*='publicación'] span, [class*='update']"
        post_els = page.locator(post_sel).all()
        posts_visible = sum(1 for el in post_els
                           if el.is_visible(timeout=1000) if el.text_content())
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
    try:
        body = page.locator("body").inner_text()
        lines = body.split("\n")
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
            "Cajeros", "Transporte", "Descarga",
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

    # ── reviews respondidas (limited view — only visible ones) ───────────────
    try:
        total_reviews = result["reviews_count"]
        if total_reviews > 0:
            resp_patterns = [
                "[class*='respondida']", "[class*='respuesta']", "[class*='reply']",
                "[aria-label*='respondida' i]", "[aria-label*='respuesta' i]",
                "text=Respondida", "text=respondida",
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
    except Exception:
        pass

    return result


def _click_tab(page, label_pattern: str, timeout_ms=8000) -> bool:
    """Click a tab button whose aria-label or text contains label_pattern.
    Returns True if clicked successfully.
    """
    patterns = [
        f"button[aria-label*='{label_pattern}' i]",
        f"a[aria-label*='{label_pattern}' i]",
        f"button:has-text('{label_pattern}')",
        f"[role='tab'][aria-label*='{label_pattern}' i]",
    ]
    for sel in patterns:
        try:
            el = page.locator(sel).first
            if el.is_visible(timeout=2000):
                el.click()
                page.wait_for_timeout(2500)
                return True
        except Exception:
            continue
    return False


def extract_reviews(page, deep=False) -> dict:
    """Click Reviews tab and extract review stats.

    Returns:
        reviews_count: total reviews visible after scroll
        reviews_respondidas_count: how many have owner responses
        reviews_respondidas_pct: percentage
    """
    result = {
        "reviews_count": 0,
        "reviews_respondidas_count": 0,
        "reviews_respondidas_pct": 0.0,
    }
    try:
        clicked = _click_tab(page, "Reseñ")
        if not clicked:
            return result
        page.wait_for_timeout(2000)

        # Count review cards (Google renders them as divs with reviewer names)
        # Scroll to load more (cap at REVIEWS_SCROLL_CAP in deep mode)
        max_scrolls = 5 if deep else 2
        scroll_cap = REVIEWS_SCROLL_CAP if deep else 20

        for _ in range(max_scrolls):
            # Try to scroll the review list
            try:
                scroll_container = page.locator("[class*='section-scroll']").first
                if scroll_container.is_visible(timeout=2000):
                    scroll_container.evaluate("el => el.scrollBy(0, 500)")
                    page.wait_for_timeout(800)
            except Exception:
                # Fallback: scroll page
                page.evaluate("window.scrollBy(0, 500)")
                page.wait_for_timeout(800)

            # Count loaded review cards
            review_cards = page.locator("[class*='review']").all()
            loaded = len([c for c in review_cards if c.is_visible(timeout=500)])
            if loaded >= scroll_cap:
                break

        # Final count
        all_review_els = page.locator("[class*='review']").all()
        visible_reviews = [c for c in all_review_els if c.is_visible(timeout=500)]
        result["reviews_count"] = len(visible_reviews)

        # Count responses: look for "Respuesta del propietario" or similar
        resp_count = 0
        resp_selectors = [
            "[aria-label*='respuesta del propietario' i]",
            "[aria-label*='respuesta del owner' i]",
            "[class*='respondida']",
            "[class*='ownerResponse']",
            "text=Respuesta del propietario",
        ]
        for sel in resp_selectors:
            try:
                resp_els = page.locator(sel).all()
                resp_count = len([e for e in resp_els if e.is_visible(timeout=500)])
                if resp_count > 0:
                    break
            except Exception:
                continue

        result["reviews_respondidas_count"] = resp_count
        if result["reviews_count"] > 0:
            result["reviews_respondidas_pct"] = min(
                100.0,
                round(resp_count / result["reviews_count"] * 100, 1)
            )
    except Exception:
        pass
    return result


def extract_photos(page) -> dict:
    """Click Photos tab and extract photo stats.

    Returns:
        fotos_count: number of photos visible
        ultima_foto_fecha: date string if found in captions
    """
    result = {"fotos_count": 0, "ultima_foto_fecha": None}
    try:
        clicked = _click_tab(page, "Foto")
        if not clicked:
            return result
        page.wait_for_timeout(2000)

        # Count photo thumbnails
        photo_selectors = [
            "[class*='gallery'] img",
            "[class*='photo'] img",
            "[class*='fotos'] img",
            "[data-photo-id]",
        ]
        total = 0
        for sel in photo_selectors:
            try:
                els = page.locator(sel).all()
                visible = [e for e in els if e.is_visible(timeout=500)]
                total = max(total, len(visible))
            except Exception:
                continue

        result["fotos_count"] = total

        # Try to find date captions near photos
        date_selectors = [
            "[class*='caption']",
            "[class*='date']",
            "[class*='fecha']",
        ]
        for sel in date_selectors:
            try:
                els = page.locator(sel).all()
                for el in reversed(els):
                    if el.is_visible(timeout=1000):
                        text = el.inner_text(timeout=1000)
                        date_m = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
                        if date_m:
                            result["ultima_foto_fecha"] = date_m.group(1)
                            break
            except Exception:
                continue
    except Exception:
        pass
    return result


def extract_posts(page) -> dict:
    """Click Updates/Posts tab and extract post stats.

    Returns:
        posts_count: number of posts visible
        latest_post_date: date string if visible
    """
    result = {"posts_count": 0, "latest_post_date": None}
    try:
        # Try multiple label variants
        for label in ["Publicacione", "Actualizacione", "Post", "Novedad"]:
            clicked = _click_tab(page, label)
            if clicked:
                break
        if not clicked:
            return result
        page.wait_for_timeout(2000)

        # Count post items
        post_selectors = [
            "[class*='post']",
            "[class*='update']",
            "[class*='publicación']",
        ]
        total = 0
        for sel in post_selectors:
            try:
                els = page.locator(sel).all()
                visible = [e for e in els if e.is_visible(timeout=500)]
                total = max(total, len(visible))
            except Exception:
                continue
        result["posts_count"] = total

        # Try to find date of latest post
        date_selectors = ["[class*='time']", "[class*='date']", "[class*='fecha']"]
        for sel in date_selectors:
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=2000):
                    text = el.inner_text(timeout=2000)
                    date_m = re.search(r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})", text)
                    if date_m:
                        result["latest_post_date"] = date_m.group(1)
                        break
            except Exception:
                continue
    except Exception:
        pass
    return result


def extract_qa(page) -> dict:
    """Click Q&A tab and extract question count.

    Returns:
        qa_count: number of questions visible
    """
    result = {"qa_count": 0}
    try:
        clicked = _click_tab(page, "Pregunta")
        if not clicked:
            return result
        page.wait_for_timeout(2000)

        qa_selectors = [
            "[class*='question']",
            "[class*='pregunta']",
        ]
        total = 0
        for sel in qa_selectors:
            try:
                els = page.locator(sel).all()
                visible = [e for e in els if e.is_visible(timeout=500)]
                total = max(total, len(visible))
            except Exception:
                continue
        result["qa_count"] = total
    except Exception:
        pass
    return result


def scrape_full_audit(page, place_id: str, deep=False) -> dict:
    """Full GBP audit: limited view + all tab clicks.

    Args:
        page: Playwright page object (already on the ficha or will be navigated)
        place_id: Google place_id or hex CID
        deep: if True, scroll reviews to load more (slower)

    Returns:
        Merged dict with all available fields.
    """
    # Start with limited-view extraction (this navigates to the page)
    result = extract_limited_view(page, place_id)

    if result.get("error"):
        return result

    # Merge tab extracts
    try:
        reviews_data = extract_reviews(page, deep=deep)
        result.update(reviews_data)
    except Exception:
        pass

    try:
        photos_data = extract_photos(page)
        # Only update foto fields if tab returned better data
        if photos_data["fotos_count"] > result.get("fotos_count", 0):
            result["fotos_count"] = photos_data["fotos_count"]
        if photos_data["ultima_foto_fecha"]:
            result["ultima_foto_fecha"] = photos_data["ultima_foto_fecha"]
    except Exception:
        pass

    try:
        posts_data = extract_posts(page)
        if posts_data["posts_count"] > result.get("posts_count", 0):
            result["posts_count"] = posts_data["posts_count"]
        if posts_data.get("latest_post_date"):
            result["latest_post_date"] = posts_data["latest_post_date"]
    except Exception:
        pass

    try:
        qa_data = extract_qa(page)
        if qa_data["qa_count"] > result.get("qa_count", 0):
            result["qa_count"] = qa_data["qa_count"]
    except Exception:
        pass

    return result


# ── CLI mode ─────────────────────────────────────────────────────────────────

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
                result = scrape_full_audit(page, place_id)
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

    if "error" in result and len(result) == 2:
        result["place_id"] = place_id

    print(json.dumps(result, ensure_ascii=False))
    sys.stderr.flush()


if __name__ == "__main__":
    main()
