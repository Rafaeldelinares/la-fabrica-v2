#!/usr/bin/env python3
"""
Captura secciones de ia-bybusiness.es como fondos para posts de Instagram.
Genera imágenes 1080x1080 con efecto blur y las guarda en /opt/fabrica/scripts/bg/
"""
from playwright.sync_api import sync_playwright
from PIL import Image, ImageFilter
import os, time

OUTPUT_DIR = '/opt/fabrica/scripts/bg'
os.makedirs(OUTPUT_DIR, exist_ok=True)

# Secciones a capturar con su scroll position (px) y descripción
SECTIONS = [
    {'name': 'hero',           'scroll': 0,     'desc': 'Hero principal'},
    {'name': 'servicios',      'scroll': 900,   'desc': 'Servicios / automatizaciones'},
    {'name': 'stack',          'scroll': 1800,  'desc': 'Stack tecnológico'},
    {'name': 'procesos',       'scroll': 2700,  'desc': 'Procesos'},
    {'name': 'posicionamiento','scroll': 3600,  'desc': 'SEO / Posicionamiento'},
]

def capture_backgrounds():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={'width': 1200, 'height': 1200})

        print("Cargando ia-bybusiness.es...")
        page.goto('https://ia-bybusiness.es', wait_until='networkidle', timeout=30000)
        time.sleep(3)

        for s in SECTIONS:
            print(f"  Capturando: {s['desc']}...")
            # Scroll a la sección
            page.evaluate(f"window.scrollTo(0, {s['scroll']})")
            time.sleep(1.5)

            # Captura screenshot 1200x1200
            tmp_path = f"/tmp/bg_{s['name']}_raw.png"
            page.screenshot(path=tmp_path, clip={'x': 0, 'y': 0, 'width': 1200, 'height': 1200})

            # Procesar con Pillow: recortar a 1080x1080 centrado + blur fuerte
            img = Image.open(tmp_path).convert('RGB')
            # Recortar centrado 1080x1080
            w, h = img.size
            left = (w - 1080) // 2
            top  = (h - 1080) // 2
            img  = img.crop((left, top, left + 1080, top + 1080))
            # Blur fuerte para que sea fondo difuminado
            img  = img.filter(ImageFilter.GaussianBlur(radius=18))
            # Oscurecer ligeramente para que el texto resalte
            overlay = Image.new('RGB', (1080, 1080), (255, 255, 255))
            img = Image.blend(img, overlay, alpha=0.35)

            out_path = os.path.join(OUTPUT_DIR, f"bg_{s['name']}.png")
            img.save(out_path, 'PNG')
            print(f"  ✓ Guardado: {out_path}")

        browser.close()
    print(f"\n✅ {len(SECTIONS)} fondos generados en {OUTPUT_DIR}")

if __name__ == '__main__':
    capture_backgrounds()
