#!/usr/bin/env python3
"""
generar_pdf_informes.py - Genera PDF con graficas de informe competitivo.

Para cada cliente genera 1 pagina con:
- Gauge circular del score general
- Barras horizontales rating vs promedio
- Barras horizontales reviews vs promedio
- Top 5 competidores con barras
- Lista de recomendaciones

Output: /tmp/informes_YYYY-MM-DD.pdf
"""

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from matplotlib.patches import Wedge
import numpy as np
import json
import os
import subprocess
import sys
from datetime import date
from io import BytesIO

# Configuración de colores Navy Industrial (dark theme - default)
COLOR_BG = "#0a0e1a"
COLOR_PANEL = "#0f1424"
COLOR_TEXT = "#e2e8f0"
COLOR_MUTED = "#94a3b8"
COLOR_GOOD = "#10b981"
COLOR_WARN = "#f59e0b"
COLOR_BAD = "#ef4444"
COLOR_ACCENT = "#D00000"
COLOR_BORDER = "#334155"

plt.rcParams.update({
    "figure.facecolor": COLOR_BG,
    "axes.facecolor": COLOR_PANEL,
    "axes.edgecolor": COLOR_BORDER,
    "axes.labelcolor": COLOR_TEXT,
    "text.color": COLOR_TEXT,
    "xtick.color": COLOR_MUTED,
    "ytick.color": COLOR_MUTED,
    "font.family": "DejaVu Sans",
    "font.size": 9,
})


def fetch_data(cliente_id=None):
    """Lee informes de la DB.
    Si cliente_id=None: ultimos 10 informes (comportamiento original).
    Si cliente_id=N: solo el informe de ese cliente.
    Si corre en el VPS: usa docker exec directo.
    Si corre fuera: usa SSH al VPS.
    """
    import tempfile

    sql = """SELECT json_build_object(
      'cliente_id', i.cliente_id,
      'nombre', c.nombre_comercial,
      'localidad', c.localidad,
      'provincia', c.provincia,
      'client_rating', i.client_rating,
      'avg_rating', i.avg_competitor_rating,
      'client_reviews', i.client_reviews,
      'avg_reviews', i.avg_competitor_reviews,
      'rating_gap', i.rating_gap,
      'reviews_gap', i.reviews_gap,
      'competitors_count', i.competitors_count,
      'position_pct', i.client_position_pct,
      'competitors', i.raw_competitors,
      'recomendaciones', i.recomendaciones,
      'categoria', c.categoria,
      'generated_at', i.generated_at
    )::text
FROM clientes.informes_competencia i
JOIN clientes.clientes c ON c.id = i.cliente_id
"""
    if cliente_id is not None:
        sql += f"WHERE i.cliente_id = {int(cliente_id)} "
    sql += "ORDER BY i.generated_at DESC LIMIT 10;"""
    
    # Detectar si estamos en el VPS (hostname check)
    in_vps = subprocess.run(["hostname"], capture_output=True, text=True).stdout.strip().startswith("localhost")
    # O check por existencia de docker
    has_docker = subprocess.run(["which", "docker"], capture_output=True).returncode == 0
    
    if has_docker:
        # Estamos en el VPS - ejecutar directo via stdin
        cmd = ["docker", "exec", "-i", "fabrica-postgres-1",
               "psql", "-U", "rafael_admin", "-d", "crm_bybusiness",
               "-tA", "-F", "@@@"]
        result = subprocess.run(cmd, input=sql.encode("utf-8"),
                               capture_output=True, timeout=30)
    else:
        # Estamos fuera del VPS - usar SSH con stdin
        cmd = ["ssh", "-o", "ConnectTimeout=5", "-o", "BatchMode=yes",
               "root@72.60.191.179",
               "docker", "exec", "-i", "fabrica-postgres-1",
               "psql", "-U", "rafael_admin", "-d", "crm_bybusiness",
               "-tA", "-F", "@@@"]
        result = subprocess.run(cmd, input=sql.encode("utf-8"),
                               capture_output=True, timeout=30)
    
    if result.returncode != 0:
        print(f"ERROR: {result.stderr.decode()[:500]}", file=sys.stderr)
        return []
    
    data = []
    for line in result.stdout.decode().strip().split("\n"):
        line = line.strip()
        if not line:
            continue
        try:
            data.append(json.loads(line))
        except json.JSONDecodeError:
            continue
    return data


def calc_score(d):
    """Score heuristico 0-100."""
    score = 50
    cr = float(d.get('client_rating', 0) or 0)
    ar = float(d.get('avg_rating', 0) or 0)
    crv = int(d.get('client_reviews', 0) or 0)
    arv = int(d.get('avg_reviews', 0) or 0)
    if ar > 0:
        score = int((cr / ar) * 60)
        if crv >= arv:
            score += 15
        if cr >= 4.5:
            score += 10
    return max(0, min(100, score))


def score_color(score):
    if score >= 70:
        return COLOR_GOOD
    if score >= 40:
        return COLOR_WARN
    return COLOR_BAD


def score_label(score):
    if score >= 70:
        return "BUENO"
    if score >= 40:
        return "MEJORABLE"
    return "CRITICO"


def draw_score_gauge(ax, score):
    """Donut chart con score."""
    color = score_color(score)
    size = 0.3
    # Background arc
    ax.add_patch(Wedge((0.5, 0.5), 0.4, 0, 360, width=0.08, facecolor=COLOR_BORDER, transform=ax.transAxes))
    # Score arc
    end_angle = 360 * score / 100
    ax.add_patch(Wedge((0.5, 0.5), 0.4, 0, end_angle, width=0.08, facecolor=color, transform=ax.transAxes))
    # Text
    ax.text(0.5, 0.55, f"{score}", ha="center", va="center", fontsize=36, fontweight="bold", color=COLOR_TEXT, transform=ax.transAxes)
    ax.text(0.5, 0.30, score_label(score), ha="center", va="center", fontsize=11, color=color, transform=ax.transAxes)
    ax.text(0.5, 0.18, "de 100", ha="center", va="center", fontsize=8, color=COLOR_MUTED, transform=ax.transAxes)
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.axis("off")


def draw_comparison_bar(ax, label, client_val, avg_val, max_val, unit=""):
    """Barra horizontal: cliente vs promedio."""
    ax.set_xlim(0, 1.1)
    ax.set_ylim(0, 1)
    ax.axis("off")
    ax.text(0, 0.85, label, fontsize=10, color=COLOR_TEXT, fontweight="bold", transform=ax.transAxes)
    
    # Cliente bar
    pct = client_val / max_val if max_val > 0 else 0
    color = score_color(80 if pct >= 0.7 else (50 if pct >= 0.4 else 20))
    ax.add_patch(plt.Rectangle((0.15, 0.55), 0.7 * pct, 0.18, facecolor=color, transform=ax.transAxes))
    ax.text(0.15 + 0.7 * pct + 0.02, 0.64, f"{client_val}{unit}", fontsize=9, color=COLOR_TEXT, va="center", transform=ax.transAxes)
    
    # Promedio bar
    pct_avg = avg_val / max_val if max_val > 0 else 0
    ax.add_patch(plt.Rectangle((0.15, 0.30), 0.7 * pct_avg, 0.18, facecolor=COLOR_BORDER, transform=ax.transAxes))
    ax.text(0.15 + 0.7 * pct_avg + 0.02, 0.39, f"prom {avg_val}{unit}", fontsize=8, color=COLOR_MUTED, va="center", transform=ax.transAxes)
    
    # Labels
    ax.text(0.0, 0.64, "Cliente", fontsize=8, color=COLOR_MUTED, ha="right", va="center", transform=ax.transAxes)
    ax.text(0.0, 0.39, "Comp.", fontsize=8, color=COLOR_MUTED, ha="right", va="center", transform=ax.transAxes)


def draw_competitors_chart(ax, competitors):
    """Top 5 competidores con barras de rating."""
    if not competitors:
        ax.text(0.5, 0.5, "Sin datos", ha="center", va="center", fontsize=10, color=COLOR_MUTED, transform=ax.transAxes)
        ax.axis("off")
        return
    
    sorted_comps = sorted(competitors, key=lambda c: c.get("rating", 0) or 0, reverse=True)[:5]
    names = [c.get("name", "?")[:25] for c in sorted_comps]
    ratings = [c.get("rating", 0) or 0 for c in sorted_comps]
    reviews = [c.get("reviews_count", 0) or 0 for c in sorted_comps]
    
    y = np.arange(len(names))
    colors = [score_color(r * 20) for r in ratings]
    bars = ax.barh(y, ratings, color=colors, height=0.6)
    ax.set_yticks(y)
    ax.set_yticklabels(names, fontsize=8)
    ax.set_xlim(0, 5.2)
    ax.set_xlabel("Rating", fontsize=8)
    ax.invert_yaxis()
    ax.grid(axis="x", alpha=0.3, linestyle="--", color=COLOR_BORDER)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    # Value labels
    for bar, r, rev in zip(bars, ratings, reviews):
        ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                f"{r:.1f} ({rev})", va="center", fontsize=8, color=COLOR_TEXT)


def draw_recommendations(ax, recomendaciones):
    """Lista de recomendaciones."""
    if not recomendaciones:
        ax.text(0.5, 0.5, "Sin recomendaciones", ha="center", va="center", fontsize=10, color=COLOR_MUTED, transform=ax.transAxes)
        ax.axis("off")
        return
    ax.axis("off")
    ax.set_xlim(0, 1)
    ax.set_ylim(0, 1)
    ax.text(0.0, 0.97, "RECOMENDACIONES", fontsize=10, fontweight="bold", color=COLOR_ACCENT, transform=ax.transAxes)
    
    recs = recomendaciones[:4]
    y = 0.85
    for r in recs:
        tipo = r.get("tipo", "")
        mensaje = r.get("mensaje", "")
        accion = r.get("accion", "")
        # Tipo label
        ax.text(0.0, y, f"> {tipo}", fontsize=9, color=COLOR_WARN, fontweight="bold", transform=ax.transAxes)
        # Mensaje
        if len(mensaje) > 80:
            mensaje = mensaje[:77] + "..."
        ax.text(0.0, y - 0.10, mensaje, fontsize=8, color=COLOR_TEXT, transform=ax.transAxes, wrap=True)
        if accion:
            ax.text(0.0, y - 0.20, f"-> {accion[:70]}", fontsize=7, color=COLOR_MUTED, style="italic", transform=ax.transAxes)
        y -= 0.30
        if y < 0.05:
            break


def render_client_page(pdf, data):
    """Una pagina por cliente."""
    score = calc_score(data)
    cr = float(data.get("client_rating", 0) or 0)
    ar = float(data.get("avg_rating", 0) or 0)
    crv = int(data.get("client_reviews", 0) or 0)
    arv = int(data.get("avg_reviews", 0) or 0)
    comps = data.get("competitors", [])
    
    fig = plt.figure(figsize=(11, 8.5))
    
    # Title
    fig.text(0.05, 0.95, data.get("nombre", "?"), fontsize=18, fontweight="bold", color=COLOR_TEXT)
    fig.text(0.05, 0.91, f"{data.get('localidad', '?')}, {data.get('provincia', '?')}  ·  ID {data.get('cliente_id')}",
             fontsize=10, color=COLOR_MUTED)
    fig.text(0.95, 0.93, date.today().isoformat(), ha="right", fontsize=9, color=COLOR_MUTED)
    
    # Score gauge (top-left)
    ax_gauge = fig.add_axes([0.05, 0.65, 0.25, 0.20])
    draw_score_gauge(ax_gauge, score)
    
    # Comparison bars (top-center)
    ax_rating = fig.add_axes([0.35, 0.75, 0.55, 0.10])
    draw_comparison_bar(ax_rating, "Rating", cr, ar, 5.0, " /5")
    
    ax_reviews = fig.add_axes([0.35, 0.63, 0.55, 0.10])
    draw_comparison_bar(ax_reviews, "Reseñas", crv, arv, max(arv * 2, 100))
    
    # Competitors chart (mid)
    ax_comps = fig.add_axes([0.05, 0.32, 0.55, 0.27])
    ax_comps.set_title("Top 5 competidores por rating", fontsize=11, color=COLOR_TEXT, loc="left", pad=8)
    draw_competitors_chart(ax_comps, comps)
    
    # Recommendations (right side)
    ax_recs = fig.add_axes([0.65, 0.32, 0.30, 0.55])
    draw_recommendations(ax_recs, data.get("recomendaciones", []))
    
    # Footer
    fig.text(0.5, 0.02, f"{len(comps)} competidores analizados  ·  CRM ByBusiness",
             ha="center", fontsize=8, color=COLOR_MUTED, style="italic")
    
    pdf.savefig(fig, facecolor=COLOR_BG)
    plt.close(fig)


def render_cover_page(pdf, n_clients, total_comps):
    """Pagina de portada."""
    fig = plt.figure(figsize=(11, 8.5))
    fig.text(0.5, 0.7, "INFORME COMPETITIVO", fontsize=32, fontweight="bold",
             color=COLOR_TEXT, ha="center")
    fig.text(0.5, 0.62, "CRM ByBusiness  ·  Google Business Profile",
             fontsize=14, color=COLOR_ACCENT, ha="center", fontweight="bold")
    fig.text(0.5, 0.50, date.today().strftime("%d de %B de %Y"),
             fontsize=18, color=COLOR_TEXT, ha="center")
    fig.text(0.5, 0.42, f"{n_clients} clientes analizados",
             fontsize=14, color=COLOR_MUTED, ha="center")
    fig.text(0.5, 0.38, f"{total_comps} competidores scrapeados",
             fontsize=11, color=COLOR_MUTED, ha="center")
    # Footer
    fig.text(0.5, 0.08, "Xiaomi-12 worker  ·  BrightLocal 2026 ranking factors  ·  Auto-generated",
             ha="center", fontsize=9, color=COLOR_MUTED, style="italic")
    pdf.savefig(fig, facecolor=COLOR_BG)
    plt.close(fig)


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generar PDF informe competitivo")
    parser.add_argument("--cliente-id", type=int, default=None,
                        help="Si se especifica, genera PDF solo para ese cliente (full format)")
    parser.add_argument("output", nargs="?", default=None,
                        help="Path de salida del PDF")
    args = parser.parse_args()

    cliente_id = args.cliente_id
    output = args.output or f"/tmp/informes_{date.today().isoformat()}.pdf"

    print("Leyendo datos de la DB...")
    data = fetch_data(cliente_id=cliente_id)
    if not data:
        print("ERROR: No se pudieron leer datos de la DB", file=sys.stderr)
        sys.exit(1)
    print(f"Clientes a procesar: {len(data)}")

    total_comps = sum(int(d.get('competitors_count', 0) or 0) for d in data)
    print(f"Total competidores analizados: {total_comps}")

    print(f"Generando PDF: {output}")
    with PdfPages(output) as pdf:
        render_cover_page(pdf, len(data), total_comps)
        for d in data:
            render_client_page(pdf, d)

    # Verificar
    import os
    size = os.path.getsize(output)
    print(f"PDF generado: {output} ({size:,} bytes)")


if __name__ == "__main__":
    main()
