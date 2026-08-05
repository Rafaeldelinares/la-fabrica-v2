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
    # Determine format and construct URL
    if place_id.startswith("ChIJ"):
        url = f"https://www.google.com/maps/place/?q=place_id:{place_id}"
        fmt = "place_id"
    elif place_id.isdigit():
        url = f"https://www.google.com/maps/place/?cid={place_id}"
        fmt = "cid"
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

    # Detect CAPTCHA / blocked page
    page_text = page.content()
    if "unusual traffic" in page_text.lower() or "captcha" in page_text.lower():
        return {"error": "captcha"}
    if "no se encontro" in page_text.lower() or "not found" in page_text.lower():
        return {"error": "not_found"}

    # ── categoria_principal ──────────────────────────────────────────────────
    try:
        cat_sel = "[class*='DqWL'] span, [class*='category'] span, .垂qML span"
        cats = page.locator(cat_sel).all_text_contents()
        if cats:
            result["categoria_principal"] = cats[0].strip()
            result["categorias_secundarias"] = [c.strip() for c in cats[1:] if c.strip()]
    except Exception:
        pass

    # ── descripcion ───────────────────────────────────────────────────────────
    try:
        desc_sel = "[class*='We818b'] span, [class*='description'], div[class*='fontBody']"
        for sel in desc_sel.split(", "):
            try:
                el = page.locator(sel).first
                if el.is_visible(timeout=2000):
                    result["descripcion"] = el.text_content(timeout=2000).strip()[:500] or None
                    if result["descripcion"]:
                        break
            except Exception:
                continue
    except Exception:
        pass

    # ── horarios: dias cubiertos (simplified — 0-7) ─────────────────────────
    try:
        # Look for day-of-week indicators
        day_names = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom",
                     "mon", "tue", "wed", "thu", "fri", "sat", "sun"]
        # Try to find open hours section
        hrs_sel = "[class*='hours'] span, [class*='Horario'] span, [class*='GpqB']"
        hrs_text = ""
        try:
            hrs_el = page.locator(hrs_sel).first
            if hrs_el.is_visible(timeout=2000):
                hrs_text = hrs_el.text_content(timeout=2000) or ""
        except Exception:
            pass
        # Count days that appear to have schedules
        days_found = 0
        for day in day_names[:7]:
            if day.lower() in page.content().lower():
                days_found += 1
        result["horarios_dias_cubiertos"] = min(days_found, 7)
    except Exception:
        pass

    # ── rating + reviews ─────────────────────────────────────────────────────
    try:
        rating_sel = "[role='img'][aria-label*='estrellas'], [role='img'][aria-label*='stars'], span[class*='aMPvhf']"
        for sel in rating_sel.split(", "):
            try:
                el = page.locator(sel).first
                lbl = el.get_attribute("aria-label") or ""
                if lbl:
                    m = re.search(r"(\d+[.,]\d+)", lbl.replace(",", "."))
                    if m:
                        result["rating_promedio"] = float(m.group(1))
                        rev_m = re.search(r"(\d+)", lbl.split(str(m.group(1)))[-1])
                        if rev_m:
                            result["reviews_count"] = int(rev_m.group(1))
                        break
            except Exception:
                continue
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
    try:
        attr_sel = "[class*='attribute'], [class*='atributo'], [class*='Amenity']"
        attr_els = page.locator(attr_sel).all()
        result["atributos_seteados"] = len([el for el in attr_els if el.is_visible(timeout=1000)])
    except Exception:
        pass

    # ── reviews respondidas ──────────────────────────────────────────────────
    try:
        # Look for "Respondida" / "Responded" badges
        resp_sel = "[class*='reply'], [class*='respondida'], [class*='respuesta']"
        resp_els = page.locator(resp_sel).all()
        total_reviews = result["reviews_count"]
        if total_reviews > 0:
            result["reviews_respondidas_pct"] = min(100.0, round(len(resp_els) / total_reviews * 100, 1))
        else:
            result["reviews_respondidas_pct"] = 0.0
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
