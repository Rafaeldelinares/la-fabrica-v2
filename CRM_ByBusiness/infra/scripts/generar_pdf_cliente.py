#!/usr/bin/env python3
"""
generar_pdf_cliente.py - Genera PDF minimo para UN cliente especifico.

Usado por el PDF HTTP server cuando un admin click "Ver informe"
sin tener un informe previo. Genera un PDF con:
- Datos basicos del cliente (nombre, direccion, categoria)
- Mensaje informativo (informe completo se genera cada 4 semanas)
- Sin comparativa con competencia (eso requiere el script completo)

Output: <output_path>  (parametro 1)
cliente_id:               (parametro 2)
"""
import sys
import os
import subprocess
import tempfile
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.backends.backend_pdf import PdfPages
from datetime import date

# Colores light
COLOR_BG = "#FFFFFF"
COLOR_PANEL = "#F8FAFC"
COLOR_TEXT = "#0F172A"
COLOR_MUTED = "#64748B"
COLOR_BORDER = "#CBD5E1"
COLOR_GOOD = "#059669"
COLOR_WARN = "#D97706"
COLOR_BAD = "#DC2626"
COLOR_ACCENT = "#D00000"

plt.rcParams.update({
    "figure.facecolor": COLOR_BG,
    "axes.facecolor": COLOR_PANEL,
    "axes.edgecolor": COLOR_BORDER,
    "axes.labelcolor": COLOR_TEXT,
    "text.color": COLOR_TEXT,
    "xtick.color": COLOR_MUTED,
    "ytick.color": COLOR_MUTED,
    "font.family": "DejaVu Sans",
    "font.size": 10,
})


def fetch_cliente_basico(cliente_id):
    """Query basica del cliente: nombre, direccion, categoria, etc."""
    sql = f"""
    SELECT
      id, nombre_comercial, localidad, provincia, categoria,
      google_cid, estado, rating, num_reseñas, direccion
    FROM clientes.clientes
    WHERE id = {int(cliente_id)};
    """
    cmd = [
        "docker", "exec", "-i", "fabrica-postgres-1",
        "psql", "-U", "rafael_admin", "-d", "crm_bybusiness", "-tA", "-F", "@@@",
        "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=10)
    if result.returncode != 0 or not result.stdout:
        return None
    parts = result.stdout.decode().strip().split("@@@")
    if len(parts) < 9:
        return None
    return {
        "id": int(parts[0]) if parts[0] else None,
        "nombre": parts[1] or "(sin nombre)",
        "localidad": parts[2] or "",
        "provincia": parts[3] or "",
        "categoria": parts[4] or "",
        "google_cid": parts[5] or "",
        "estado": parts[6] or "",
        "rating": float(parts[7]) if parts[7] else None,
        "num_reseñas": int(parts[8]) if parts[8] else None,
        "direccion": parts[9] if len(parts) > 9 else "",
    }


def fetch_ultimo_informe(cliente_id):
    """Busca el informe mas reciente del cliente."""
    sql = f"""
    SELECT
      client_rating, avg_competitor_rating, client_reviews, avg_competitor_reviews,
      competitors_count, rating_gap, reviews_gap, generated_at
    FROM clientes.informes_competencia
    WHERE cliente_id = {int(cliente_id)}
    ORDER BY generated_at DESC
    LIMIT 1;
    """
    cmd = [
        "docker", "exec", "-i", "fabrica-postgres-1",
        "psql", "-U", "rafael_admin", "-d", "crm_bybusiness", "-tA", "-F", "@@@",
        "-c", sql
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=10)
    if result.returncode != 0 or not result.stdout:
        return None
    parts = result.stdout.decode().strip().split("@@@")
    if len(parts) < 8:
        return None
    return {
        "client_rating": float(parts[0]) if parts[0] else None,
        "avg_competitor_rating": float(parts[1]) if parts[1] else None,
        "client_reviews": int(parts[2]) if parts[2] else None,
        "avg_competitor_reviews": int(parts[3]) if parts[3] else None,
        "competitors_count": int(parts[4]) if parts[4] else 0,
        "rating_gap": float(parts[5]) if parts[5] else None,
        "reviews_gap": int(parts[6]) if parts[6] else None,
        "generated_at": parts[7] if len(parts) > 7 else "",
    }


def render_simple(pdf, cliente, informe):
    """Una pagina con la info basica del cliente."""
    fig = plt.figure(figsize=(11, 8.5))
    today = date.today().isoformat()

    # Header
    fig.text(0.5, 0.95, cliente.get("nombre", "?"), fontsize=22,
             fontweight="bold", color=COLOR_TEXT, ha="center")
    fig.text(0.5, 0.91, f"ID {cliente.get('id', '?')}  ·  {cliente.get('localidad', '')}  ·  Estado: {cliente.get('estado', '')}",
             fontsize=11, color=COLOR_MUTED, ha="center")

    # Caja 1: Datos del cliente
    box1_y = (0.72, 0.86)
    from matplotlib.patches import FancyBboxPatch
    fig.patches.append(FancyBboxPatch((0.04, box1_y[0]), 0.92, box1_y[1] - box1_y[0],
                                       boxstyle="round,pad=0.005,rounding_size=0.01",
                                       facecolor=COLOR_PANEL, edgecolor=COLOR_BORDER,
                                       linewidth=0.8, transform=fig.transFigure, zorder=0))
    fig.text(0.07, 0.83, "DATOS DEL CLIENTE", fontsize=11, color=COLOR_TEXT,
             fontweight="bold", transform=fig.transFigure)
    fig.text(0.07, 0.79, f"Categoria GBP: {cliente.get('categoria', '(sin definir)')}",
             fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
    fig.text(0.07, 0.76, f"Direccion: {cliente.get('direccion', '(sin direccion)')}",
             fontsize=10, color=COLOR_MUTED, transform=fig.transFigure)
    if cliente.get("google_cid"):
        fig.text(0.07, 0.73, f"Google CID: {cliente.get('google_cid')}",
                 fontsize=10, color=COLOR_MUTED, transform=fig.transFigure)

    # Caja 2: Status del informe
    box2_y = (0.50, 0.68)
    fig.patches.append(FancyBboxPatch((0.04, box2_y[0]), 0.92, box2_y[1] - box2_y[0],
                                       boxstyle="round,pad=0.005,rounding_size=0.01",
                                       facecolor=COLOR_PANEL, edgecolor=COLOR_BORDER,
                                       linewidth=0.8, transform=fig.transFigure, zorder=0))
    fig.text(0.07, 0.65, "STATUS DEL INFORME COMPLETO", fontsize=11, color=COLOR_TEXT,
             fontweight="bold", transform=fig.transFigure)

    if informe:
        # Hay informe - mostrar resumen
        fig.text(0.07, 0.61, f"Ultimo informe: {informe['generated_at'][:10]}",
                 fontsize=10, color=COLOR_GOOD, transform=fig.transFigure)
        fig.text(0.07, 0.58, f"Rating cliente: {informe.get('client_rating', '?')} vs "
                 f"competencia {informe.get('avg_competitor_rating', '?')} "
                 f"(gap: {informe.get('rating_gap', '?')})",
                 fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
        fig.text(0.07, 0.55, f"Reseñas: {informe.get('client_reviews', '?')} vs "
                 f"{informe.get('avg_competitor_reviews', '?')} "
                 f"(gap: {informe.get('reviews_gap', '?')})",
                 fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
        fig.text(0.07, 0.52, f"Competidores analizados: {informe.get('competitors_count', 0)}",
                 fontsize=10, color=COLOR_MUTED, transform=fig.transFigure)
        fig.text(0.07, 0.47, "El informe completo con graficas se envia por email cada 4 semanas.",
                 fontsize=9, color=COLOR_MUTED, style="italic", transform=fig.transFigure)
    else:
        # No hay informe - explicar cuando se genera
        fig.text(0.07, 0.61, "Aun no hay informe competitivo generado para este cliente.",
                 fontsize=10, color=COLOR_WARN, transform=fig.transFigure)
        fig.text(0.07, 0.58, "El informe completo se genera automaticamente cada 4 semanas",
                 fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
        fig.text(0.07, 0.55, "via cron en el VPS y se envia por email.",
                 fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
        fig.text(0.07, 0.52, "Tambien puedes generarlo manualmente desde el CRM (proximamente).",
                 fontsize=10, color=COLOR_TEXT, transform=fig.transFigure)
        fig.text(0.07, 0.47, "Proximo informe automatico: ~4 semanas desde el ultimo.",
                 fontsize=9, color=COLOR_MUTED, style="italic", transform=fig.transFigure)

    # Footer
    fig.text(0.5, 0.08, f"Generado el {today}  ·  CRM ByBusiness",
             ha="center", fontsize=9, color=COLOR_MUTED, style="italic")

    pdf.savefig(fig, facecolor=COLOR_BG)
    plt.close(fig)


def main():
    if len(sys.argv) < 3:
        print("Uso: generar_pdf_cliente.py <output_path> <cliente_id>", file=sys.stderr)
        sys.exit(1)

    output_path = sys.argv[1]
    try:
        cliente_id = int(sys.argv[2])
    except ValueError:
        print(f"cliente_id invalido: {sys.argv[2]}", file=sys.stderr)
        sys.exit(1)

    print(f"Generando PDF para cliente {cliente_id} en {output_path}")

    cliente = fetch_cliente_basico(cliente_id)
    if not cliente:
        print(f"ERROR: No se encontraron datos para cliente_id={cliente_id}", file=sys.stderr)
        sys.exit(1)

    informe = fetch_ultimo_informe(cliente_id)
    print(f"  Cliente: {cliente.get('nombre', '?')}")
    print(f"  Informe previo: {'si' if informe else 'no'}")

    with PdfPages(output_path) as pdf:
        render_simple(pdf, cliente, informe)

    size = os.path.getsize(output_path)
    print(f"  PDF generado: {output_path} ({size:,} bytes)")


if __name__ == "__main__":
    main()
