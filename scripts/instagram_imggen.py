#!/usr/bin/env python3
"""
Generador de imágenes 1080x1080 para posts de Instagram ByBusiness
Estética: ia-bybusiness.es (Light mode, azul #2563eb, fuente Outfit)
Fondos: capturas difuminadas de secciones reales de la web
"""
from flask import Flask, request, jsonify
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import os, subprocess, uuid, json, random
from datetime import datetime

app = Flask(__name__)

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
FONT_DIR   = os.path.join(BASE_DIR, 'fonts')
BG_DIR     = os.path.join(BASE_DIR, 'bg')
LOGO_PATH  = '/opt/fabrica/CRM_ByBusiness/public/bybusiness-logo.png'
OUTPUT_DIR = '/tmp/instagram_posts'
VPS_DIR    = '/var/www/crm.ia-bybusiness.com/media/instagram'
VPS_HOST   = 'root@72.60.191.179'
PUBLIC_URL = 'https://crm.ia-bybusiness.com/media/instagram'

os.makedirs(OUTPUT_DIR, exist_ok=True)

# ─── Fondos disponibles ───
BG_FILES = [
    'bg_servicios.png',
    'bg_stack.png',
    'bg_procesos.png',
    'bg_posicionamiento.png',
    'bg_hero.png',
]

# ─── Colores ia-bybusiness.es ───
BLUE     = (37, 99, 235)     # #2563eb
BLUE_L   = (59, 130, 246)    # #3b82f6 claro
WHITE    = (255, 255, 255)
SLATE_9  = (15, 23, 42)      # texto oscuro
SLATE_6  = (71, 85, 105)     # texto secundario
SLATE_2  = (226, 232, 240)   # borde suave

# ─── Fuentes Outfit ───
def font(variant, size):
    names = {
        'extrabold': 'Outfit-ExtraBold.ttf',
        'bold':      'Outfit-Bold.ttf',
        'semibold':  'Outfit-SemiBold.ttf',
        'medium':    'Outfit-Medium.ttf',
        'regular':   'Outfit-Regular.ttf',
    }
    return ImageFont.truetype(os.path.join(FONT_DIR, names[variant]), size)

def wrap_text(text, font_obj, max_width, draw):
    words = text.split()
    lines, line = [], []
    for word in words:
        test = ' '.join(line + [word])
        bbox = draw.textbbox((0, 0), test, font=font_obj)
        if bbox[2] <= max_width:
            line.append(word)
        else:
            if line:
                lines.append(' '.join(line))
            line = [word]
    if line:
        lines.append(' '.join(line))
    return lines

def load_background(bg_name=None):
    """Carga un fondo de la web difuminado. Fallback a blanco si no existe."""
    if bg_name is None:
        available = [f for f in BG_FILES if os.path.exists(os.path.join(BG_DIR, f))]
        bg_name = random.choice(available) if available else None

    if bg_name:
        bg_path = os.path.join(BG_DIR, bg_name)
        if os.path.exists(bg_path):
            return Image.open(bg_path).convert('RGB')

    # Fallback: degradado blanco a azul muy suave
    img = Image.new('RGB', (1080, 1080), WHITE)
    draw = ImageDraw.Draw(img)
    for y in range(1080):
        r = int(255 - (y / 1080) * 20)
        g = int(255 - (y / 1080) * 15)
        b = int(255 - (y / 1080) * 5)
        draw.line([(0, y), (1080, y)], fill=(r, g, b))
    return img

def generate_image(titulo, cuerpo, bg_name=None):
    SIZE = 1080
    PAD  = 60

    # ─── Fondo difuminado de la web ───
    img = load_background(bg_name)
    img = img.resize((SIZE, SIZE), Image.LANCZOS)

    # Overlay blanco semitransparente — ligeramente más transparente para ver fondo
    overlay = Image.new('RGBA', (SIZE, SIZE), (255, 255, 255, 195))
    img = img.convert('RGBA')
    img = Image.alpha_composite(img, overlay).convert('RGB')

    draw = ImageDraw.Draw(img)

    # ─── Barra azul superior ───
    draw.rectangle([(0, 0), (SIZE, 7)], fill=BLUE)

    # ─── Card central con sombra ───
    card_margin  = 44
    card_y_start = 80
    card_y_end   = SIZE - 68
    # Sombra
    for i in range(8, 0, -1):
        alpha = int(255 * 0.04 * i)
        shadow = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
        sd = ImageDraw.Draw(shadow)
        sd.rounded_rectangle(
            [(card_margin + i, card_y_start + i), (SIZE - card_margin + i, card_y_end + i)],
            radius=24, fill=(37,99,235,alpha)
        )
        img = Image.alpha_composite(img.convert('RGBA'), shadow).convert('RGB')
        draw = ImageDraw.Draw(img)
    # Card blanca
    draw.rounded_rectangle(
        [(card_margin, card_y_start), (SIZE - card_margin, card_y_end)],
        radius=24, fill=(255, 255, 255), outline=SLATE_2, width=1
    )

    x_left = card_margin + PAD
    max_w  = SIZE - x_left * 2 + card_margin
    y      = card_y_start + PAD

    # ─── Logo a todo color (grande) ───
    logo_loaded = False
    if os.path.exists(LOGO_PATH):
        try:
            logo   = Image.open(LOGO_PATH).convert('RGBA')
            logo_h = 76
            ratio  = logo_h / logo.height
            logo_w = int(logo.width * ratio)
            logo   = logo.resize((logo_w, logo_h), Image.LANCZOS)
            img.paste(logo, (x_left, y), logo)
            logo_loaded = True
            y += logo_h + 16
        except:
            pass

    if not logo_loaded:
        draw.text((x_left, y), 'BYBUSINESS', font=font('bold', 22), fill=BLUE)
        y += 38

    # ─── Etiqueta "Únete al equipo" ───
    f_tag    = font('semibold', 16)
    tag_text = '🚀  ÚNETE AL EQUIPO · TELETRABAJO 100%'
    tag_bbox = draw.textbbox((0,0), tag_text, font=f_tag)
    tag_w    = tag_bbox[2] + 28
    draw.rounded_rectangle([(x_left, y), (x_left + tag_w, y + 32)], radius=7, fill=(239, 246, 255))
    draw.text((x_left + 14, y + 8), tag_text, font=f_tag, fill=BLUE)
    y += 52

    # ─── Título ───
    f_title = font('extrabold', 58)
    lines   = wrap_text(titulo, f_title, max_w, draw)
    for line in lines[:3]:
        draw.text((x_left, y), line, font=f_title, fill=SLATE_9)
        y += 70
    y += 10

    # ─── Línea divisora azul ───
    draw.rectangle([(x_left, y), (x_left + 56, y + 4)], fill=BLUE)
    y += 26

    # ─── Cuerpo ───
    f_body = font('regular', 30)
    for para in cuerpo.split('\n'):
        if not para.strip():
            y += 14
            continue
        body_lines = wrap_text(para.strip(), f_body, max_w, draw)
        for bl in body_lines:
            draw.text((x_left, y), bl, font=f_body, fill=SLATE_6)
            y += 44
    y += 20

    # ─── Puntos clave con checkmarks (4 bullets) ───
    f_bullet = font('medium', 27)
    bullets = [
        ('✓', 'Teletrabajo 100% desde cualquier lugar'),
        ('✓', 'Formación a cargo de la empresa'),
        ('✓', 'Más de 16.000 empresas potenciales'),
        ('✓', 'Sin experiencia previa necesaria'),
    ]
    for check, text in bullets:
        draw.text((x_left, y), check, font=font('bold', 27), fill=BLUE)
        draw.text((x_left + 30, y), text, font=f_bullet, fill=SLATE_9)
        y += 46
    y += 24

    # ─── Dos botones: DM + Llamada ───
    f_cta  = font('bold', 22)
    f_sub  = font('semibold', 16)
    btn_h  = 54
    gap    = 16   # espacio entre botones

    dm_text   = '📩  ESCRÍBENOS POR DM'
    tel_text  = '📞  LLÁMANOS AHORA'

    dm_bbox  = draw.textbbox((0,0), dm_text,  font=f_cta)
    tel_bbox = draw.textbbox((0,0), tel_text, font=f_cta)

    dm_w  = dm_bbox[2]  - dm_bbox[0]  + 56
    tel_w = tel_bbox[2] - tel_bbox[0] + 56

    total_btns = dm_w + gap + tel_w
    btn_x0 = (SIZE - total_btns) // 2

    # Sombra botón DM
    shadow_btn = Image.new('RGBA', (SIZE, SIZE), (0,0,0,0))
    sd2 = ImageDraw.Draw(shadow_btn)
    sd2.rounded_rectangle([(btn_x0+3, y+3), (btn_x0+dm_w+3, y+btn_h+3)], radius=12, fill=(37,99,235,80))
    # Sombra botón llamada
    tel_x0 = btn_x0 + dm_w + gap
    sd2.rounded_rectangle([(tel_x0+3, y+3), (tel_x0+tel_w+3, y+btn_h+3)], radius=12, fill=(16,185,129,80))
    img = Image.alpha_composite(img.convert('RGBA'), shadow_btn).convert('RGB')
    draw = ImageDraw.Draw(img)

    # Botón DM — azul
    draw.rounded_rectangle([(btn_x0, y), (btn_x0+dm_w, y+btn_h)], radius=12, fill=BLUE)
    draw.text((btn_x0 + 28, y + 15), dm_text, font=f_cta, fill=WHITE)

    # Botón Llamada — verde esmeralda
    EMERALD = (5, 150, 105)
    draw.rounded_rectangle([(tel_x0, y), (tel_x0+tel_w, y+btn_h)], radius=12, fill=EMERALD)
    draw.text((tel_x0 + 28, y + 15), tel_text, font=f_cta, fill=WHITE)

    y += btn_h + 12

    # Sub-línea con handle + teléfono
    sub_text = '@iabybusiness  ·  +34 679 591 583'
    sub_bbox = draw.textbbox((0,0), sub_text, font=f_sub)
    sub_w    = sub_bbox[2] - sub_bbox[0]
    sub_x    = (SIZE - sub_w) // 2
    draw.text((sub_x, y), sub_text, font=f_sub, fill=SLATE_6)

    # ─── Barra azul inferior ───
    draw.rectangle([(0, SIZE - 7), (SIZE, SIZE)], fill=BLUE)

    return img

@app.route('/generate', methods=['POST'])
def generate():
    data    = request.get_json(force=True)
    titulo  = data.get('titulo', '¿Quieres trabajar desde casa?')
    cuerpo  = data.get('cuerpo', 'Únete al equipo ByBusiness como operador comercial en remoto.')
    bg_name = data.get('bg', None)  # None = aleatorio

    filename   = f"byb_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:6]}.png"
    local_path = os.path.join(OUTPUT_DIR, filename)

    img = generate_image(titulo, cuerpo, bg_name)
    img.save(local_path, 'PNG', quality=95)

    try:
        subprocess.run(
            ['rsync', '-az', local_path, f'{VPS_HOST}:{VPS_DIR}/{filename}'],
            timeout=30, check=True, capture_output=True
        )
        url    = f'{PUBLIC_URL}/{filename}'
        synced = True
    except Exception as e:
        url    = f'file://{local_path}'
        synced = False

    return jsonify({'ok': True, 'url': url, 'filename': filename, 'synced': synced})

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'ok': True, 'service': 'instagram-imggen', 'backgrounds': len(BG_FILES)})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8093, debug=False)
