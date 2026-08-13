#!/usr/bin/env python3
"""
enviar_informes.py - Genera PDF en memoria y envia email con attachment.
Sin guardar PDF en disco. Pipeline: memoria -> base64 -> n8n webhook -> email.
"""

import os
import sys
import io
import json
import base64
import urllib.request
import subprocess
from datetime import date

sys.path.insert(0, '/opt/fabrica/scripts')
from generar_pdf_informes import fetch_data, calc_score


def generate_pdf_bytes():
    """Genera PDF en memoria (BytesIO). NO guarda a disco."""
    import matplotlib
    matplotlib.use("Agg")
    from matplotlib.backends.backend_pdf import PdfPages
    import matplotlib.pyplot as plt
    from matplotlib.patches import Wedge
    import numpy as np

    # Color scheme Navy Industrial
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

    def score_color(s):
        return COLOR_GOOD if s >= 70 else COLOR_WARN if s >= 40 else COLOR_BAD
    def score_label(s):
        return "BUENO" if s >= 70 else "MEJORABLE" if s >= 40 else "CRITICO"

    def draw_gauge(ax, score):
        color = score_color(score)
        ax.add_patch(Wedge((0.5, 0.5), 0.4, 0, 360, width=0.08,
                          facecolor=COLOR_BORDER, transform=ax.transAxes))
        ax.add_patch(Wedge((0.5, 0.5), 0.4, 0, 360 * score / 100, width=0.08,
                          facecolor=color, transform=ax.transAxes))
        ax.text(0.5, 0.55, f"{score}", ha="center", va="center",
                fontsize=36, fontweight="bold", color=COLOR_TEXT, transform=ax.transAxes)
        ax.text(0.5, 0.30, score_label(score), ha="center", va="center",
                fontsize=11, color=color, transform=ax.transAxes)
        ax.text(0.5, 0.18, "de 100", ha="center", va="center",
                fontsize=8, color=COLOR_MUTED, transform=ax.transAxes)
        ax.set_xlim(0, 1); ax.set_ylim(0, 1); ax.axis("off")

    def draw_compare(ax, label, cv, av, max_v, unit=""):
        ax.set_xlim(0, 1.1); ax.set_ylim(0, 1); ax.axis("off")
        ax.text(0, 0.85, label, fontsize=10, color=COLOR_TEXT,
                fontweight="bold", transform=ax.transAxes)
        pct = cv / max_v if max_v > 0 else 0
        col = score_color(80 if pct >= 0.7 else 50 if pct >= 0.4 else 20)
        ax.add_patch(plt.Rectangle((0.15, 0.55), 0.7 * pct, 0.18, facecolor=col, transform=ax.transAxes))
        ax.text(0.15 + 0.7 * pct + 0.02, 0.64, f"{cv}{unit}", fontsize=9,
                color=COLOR_TEXT, va="center", transform=ax.transAxes)
        pct_avg = av / max_v if max_v > 0 else 0
        ax.add_patch(plt.Rectangle((0.15, 0.30), 0.7 * pct_avg, 0.18, facecolor=COLOR_BORDER, transform=ax.transAxes))
        ax.text(0.15 + 0.7 * pct_avg + 0.02, 0.39, f"prom {av}{unit}", fontsize=8,
                color=COLOR_MUTED, va="center", transform=ax.transAxes)
        ax.text(0.0, 0.64, "Cliente", fontsize=8, color=COLOR_MUTED, ha="right", va="center", transform=ax.transAxes)
        ax.text(0.0, 0.39, "Comp.", fontsize=8, color=COLOR_MUTED, ha="right", va="center", transform=ax.transAxes)

    def draw_comps(ax, comps):
        if not comps:
            ax.text(0.5, 0.5, "Sin datos", ha="center", va="center", fontsize=10, color=COLOR_MUTED, transform=ax.transAxes)
            ax.axis("off"); return
        sorted_c = sorted(comps, key=lambda c: c.get("rating", 0) or 0, reverse=True)[:5]
        names = [c.get("name", "?")[:25] for c in sorted_c]
        ratings = [c.get("rating", 0) or 0 for c in sorted_c]
        reviews = [c.get("reviews_count", 0) or 0 for c in sorted_c]
        y = np.arange(len(names))
        cols = [score_color(r * 20) for r in ratings]
        bars = ax.barh(y, ratings, color=cols, height=0.6)
        ax.set_yticks(y); ax.set_yticklabels(names, fontsize=8)
        ax.set_xlim(0, 5.2); ax.set_xlabel("Rating", fontsize=8)
        ax.invert_yaxis()
        ax.grid(axis="x", alpha=0.3, linestyle="--", color=COLOR_BORDER)
        ax.spines["top"].set_visible(False); ax.spines["right"].set_visible(False)
        for bar, r, rev in zip(bars, ratings, reviews):
            ax.text(bar.get_width() + 0.1, bar.get_y() + bar.get_height() / 2,
                    f"{r:.1f} ({rev})", va="center", fontsize=8, color=COLOR_TEXT)

    def draw_recs(ax, recs):
        if not recs:
            ax.text(0.5, 0.5, "Sin recomendaciones", ha="center", va="center", fontsize=10, color=COLOR_MUTED, transform=ax.transAxes)
            ax.axis("off"); return
        ax.axis("off"); ax.set_xlim(0, 1); ax.set_ylim(0, 1)
        ax.text(0.0, 0.97, "RECOMENDACIONES", fontsize=10, fontweight="bold",
                color=COLOR_ACCENT, transform=ax.transAxes)
        y = 0.85
        for r in recs[:4]:
            tipo = r.get("tipo", "")
            mensaje = r.get("mensaje", "")
            if len(mensaje) > 80:
                mensaje = mensaje[:77] + "..."
            ax.text(0.0, y, f"> {tipo}", fontsize=9, color=COLOR_WARN,
                    fontweight="bold", transform=ax.transAxes)
            ax.text(0.0, y - 0.10, mensaje, fontsize=8, color=COLOR_TEXT, transform=ax.transAxes, wrap=True)
            if r.get("accion"):
                ax.text(0.0, y - 0.20, f"-> {r['accion'][:70]}", fontsize=7,
                        color=COLOR_MUTED, style="italic", transform=ax.transAxes)
            y -= 0.30
            if y < 0.05: break

    def render_client(pdf, d):
        score = calc_score(d)
        cr = float(d.get("client_rating", 0) or 0)
        ar = float(d.get("avg_rating", 0) or 0)
        crv = int(d.get("client_reviews", 0) or 0)
        arv = int(d.get("avg_reviews", 0) or 0)
        comps = d.get("competitors", [])

        fig = plt.figure(figsize=(11, 8.5))
        fig.text(0.05, 0.95, d.get("nombre", "?"), fontsize=18, fontweight="bold", color=COLOR_TEXT)
        fig.text(0.05, 0.91, f"{d.get('localidad', '?')}, {d.get('provincia', '?')}  -  ID {d.get('cliente_id')}",
                 fontsize=10, color=COLOR_MUTED)
        fig.text(0.95, 0.93, date.today().isoformat(), ha="right", fontsize=9, color=COLOR_MUTED)

        ax_g = fig.add_axes([0.05, 0.65, 0.25, 0.20])
        draw_gauge(ax_g, score)

        ax_r = fig.add_axes([0.35, 0.75, 0.55, 0.10])
        draw_compare(ax_r, "Rating", cr, ar, 5.0, " /5")
        ax_rev = fig.add_axes([0.35, 0.63, 0.55, 0.10])
        draw_compare(ax_rev, "Reseñas", crv, arv, max(arv * 2, 100))

        ax_c = fig.add_axes([0.05, 0.32, 0.55, 0.27])
        ax_c.set_title("Top 5 competidores por rating", fontsize=11, color=COLOR_TEXT, loc="left", pad=8)
        draw_comps(ax_c, comps)

        ax_recs = fig.add_axes([0.65, 0.32, 0.30, 0.55])
        draw_recs(ax_recs, d.get("recomendaciones", []))

        fig.text(0.5, 0.02, f"{len(comps)} competidores analizados  -  CRM ByBusiness",
                 ha="center", fontsize=8, color=COLOR_MUTED, style="italic")
        pdf.savefig(fig, facecolor=COLOR_BG)
        plt.close(fig)

    def render_cover(pdf, n_clients, total_comps):
        fig = plt.figure(figsize=(11, 8.5))
        fig.text(0.5, 0.7, "INFORME COMPETITIVO", fontsize=32, fontweight="bold", color=COLOR_TEXT, ha="center")
        fig.text(0.5, 0.62, "CRM ByBusiness  -  Google Business Profile",
                 fontsize=14, color=COLOR_ACCENT, ha="center", fontweight="bold")
        fig.text(0.5, 0.50, date.today().strftime("%d de %B de %Y"),
                 fontsize=18, color=COLOR_TEXT, ha="center")
        fig.text(0.5, 0.42, f"{n_clients} clientes analizados", fontsize=14, color=COLOR_MUTED, ha="center")
        fig.text(0.5, 0.38, f"{total_comps} competidores scrapeados", fontsize=11, color=COLOR_MUTED, ha="center")
        fig.text(0.5, 0.08, "Xiaomi-12 worker  -  BrightLocal 2026  -  Auto-generated",
                 ha="center", fontsize=9, color=COLOR_MUTED, style="italic")
        pdf.savefig(fig, facecolor=COLOR_BG)
        plt.close(fig)

    # PDF en memoria (no disco)
    pdf_buffer = io.BytesIO()
    data = fetch_data()
    if not data:
        return None
    total_comps = sum(int(d.get('competitors_count', 0) or 0) for d in data)

    with PdfPages(pdf_buffer) as pdf:
        render_cover(pdf, len(data), total_comps)
        for d in data:
            render_client(pdf, d)

    pdf_buffer.seek(0)
    return pdf_buffer.getvalue(), data


def build_email_body(data, today):
    """Construye texto plano del email con resumen."""
    n_clients = len(data)
    n_comps = sum(int(d.get("competitors_count", 0) or 0) for d in data)

    scored = [(calc_score(d), d) for d in data]
    scored.sort(key=lambda x: x[0])

    body_lines = [
        "=" * 60,
        "INFORME COMPETITIVO CRM ByBusiness",
        f"Fecha: {today}",
        f"Clientes: {n_clients}  |  Competidores: {n_comps}",
        "=" * 60,
        "",
        ">>> PDF ADJUNTO con graficas de cada cliente <<<",
        "   (score, comparativa rating/reviews, top 5 competidores, recomendaciones)",
        "",
        "=" * 60,
        "",
        "RESUMEN (ordenado por criticidad):",
        "-" * 50,
    ]

    for score, d in scored:
        label = "CRITICO" if score < 40 else "MEJORABLE" if score < 70 else "OK"
        cr = float(d.get("client_rating", 0) or 0)
        ar = float(d.get("avg_rating", 0) or 0)
        crv = int(d.get("client_reviews", 0) or 0)
        arv = int(d.get("avg_reviews", 0) or 0)
        body_lines.append(f"[{label}] #{d.get('cliente_id')} {d.get('nombre', '?')[:40]}")
        body_lines.append(f"   Score {score}/100  Rating {cr} vs {ar}  Reviews {crv} vs {arv}")
        body_lines.append(f"   {d.get('localidad', '?')}")
        body_lines.append("")

    body_lines.append("=" * 60)
    body_lines.append("")
    body_lines.append("CRM ByBusiness - xiaomi-12 scraper")
    body_lines.append("BrightLocal 2026 ranking factors")

    return "\n".join(body_lines)


def main():
    today = date.today().isoformat()
    print("=" * 60)
    print(f"INFORME COMPETITIVO CRM - {today}")
    print("=" * 60)

    # 1. Generar PDF en memoria
    print("\n[1/3] Generando PDF en memoria...")
    result = generate_pdf_bytes()
    if not result:
        print("ERROR: no se pudo generar el PDF")
        sys.exit(1)
    pdf_bytes, data = result
    pdf_size = len(pdf_bytes)
    print(f"  PDF: {pdf_size:,} bytes (en memoria, NO en disco)")

    # 2. Construir body
    print("\n[2/3] Construyendo email...")
    body = build_email_body(data, today)

    # 3. Enviar via n8n (que tiene SMTP cred)
    # Pasamos PDF en base64 en el body del webhook
    print("\n[3/3] Enviando email via n8n con PDF adjunto...")
    pdf_b64 = base64.b64encode(pdf_bytes).decode("ascii")
    payload = {
        "to": "rafaeldelinares@gmail.com",
        "subject": f"CRM Informes competitivos ({len(data)} clientes, {sum(int(d.get('competitors_count',0)or 0) for d in data)} competidores) - {today}",
        "body": body,
        "pdf_b64": pdf_b64,
        "pdf_filename": f"informe_competitivo_{today}.pdf",
        "pdf_size": pdf_size,
    }

    # Llamar al webhook que adjunta el PDF
    webhook_url = "https://n8n.ia-bybusiness.online/webhook/crm-informe-with-pdf"
    try:
        req = urllib.request.Request(
            webhook_url,
            data=json.dumps(payload).encode(),
            headers={"Content-Type": "application/json"}
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            result = json.loads(resp.read())
        print(f"  Email enviado! messageId: {result.get('messageId', '?')}")
    except Exception as e:
        print(f"  ERROR webhook: {e}")
        print("  Fallback: webhook V4 (sin adjunto)")
        # Fallback al V4 que ya funciona
        v4_url = "https://n8n.ia-bybusiness.online/webhook/crm-informe-v4"
        try:
            req = urllib.request.Request(v4_url, data=b"{}",
                                         headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=60) as resp:
                result = json.loads(resp.read())
            print(f"  V4 OK: {result.get('messageId', '?')}")
        except Exception as e2:
            print(f"  V4 también falló: {e2}")

    print(f"\nDone! PDF nunca tocó el disco (todo en memoria).")


if __name__ == "__main__":
    main()
