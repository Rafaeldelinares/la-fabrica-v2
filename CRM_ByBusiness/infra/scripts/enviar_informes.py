#!/usr/bin/env python3
"""
enviar_informes.py - Genera PDF y envia email con link de descarga.

Flujo:
1. Genera PDF con graficas (matplotlib)
2. Sube PDF a 0x0.st (publico, expira en 24h)
3. Envia email via SMTP con el link

SMTP se configura via env vars:
  SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
"""

import os
import sys
import json
import urllib.request
import urllib.parse
import subprocess
from datetime import date
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.application import MIMEApplication
from email.utils import formataddr
import smtplib

# Importar funciones del script de PDF
sys.path.insert(0, '/opt/fabrica/scripts')
from generar_pdf_informes import fetch_data, calc_score


def upload_0x0st(filepath, expires="24"):
    """Sube archivo a 0x0.st y devuelve URL."""
    with open(filepath, "rb") as f:
        files = {"file": f}
        data = urllib.parse.urlencode({"expires": expires}).encode()
        req = urllib.request.Request(
            "https://0x0.st",
            data=f.read(),
            headers={"Content-Type": "application/octet-stream", "User-Agent": "CRM-ByBusiness/1.0"},
            method="POST"
        )
    # 0x0.st espera el archivo directamente como body, no como multipart
    with open(filepath, "rb") as f:
        req = urllib.request.Request("https://0x0.st", data=f.read(),
                                      headers={"Content-Type": "application/octet-stream"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            url = resp.read().decode().strip()
    return url


def send_email(to_email, subject, body_text, attachment_path=None):
    """Envia email via SMTP con attachment opcional."""
    smtp_host = os.environ.get("SMTP_HOST", "smtp.ia-bybusiness.com")
    smtp_port = int(os.environ.get("SMTP_PORT", "465"))
    smtp_user = os.environ.get("SMTP_USER", "informacion@ia-bybusiness.com")
    smtp_pass = os.environ.get("SMTP_PASS", "")
    smtp_from = os.environ.get("SMTP_FROM", smtp_user)
    smtp_secure = os.environ.get("SMTP_SECURE", "ssl")  # ssl or starttls

    msg = MIMEMultipart()
    msg["From"] = formataddr(("CRM ByBusiness", smtp_from))
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body_text, "plain", "utf-8"))

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            part = MIMEApplication(f.read(), Name=os.path.basename(attachment_path))
            part["Content-Disposition"] = f'attachment; filename="{os.path.basename(attachment_path)}"'
            msg.attach(part)

    if smtp_secure == "ssl":
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(smtp_from, to_email, msg.as_string())


def main():
    to_email = sys.argv[1] if len(sys.argv) > 1 else "rafaeldelinares@gmail.com"
    today = date.today().isoformat()
    pdf_path = f"/tmp/informes_{today}.pdf"
    public_url = f"https://crm.ia-bybusiness.com/informes/informes_{today}.pdf"

    print("=" * 60)
    print(f"INFORME COMPETITIVO CRM - {today}")
    print("=" * 60)

    # 1. Generar PDF
    print("\n[1/3] Generando PDF con graficas...")
    subprocess.run(["python3", "/opt/fabrica/scripts/generar_pdf_informes.py", pdf_path], check=True)

    import os
    size = os.path.getsize(pdf_path)
    print(f"  PDF: {pdf_path} ({size:,} bytes)")

    # 2. Copiar a path publico (servido por nginx del CRM)
    print("\n[2/3] Publicando en CRM...")
    try:
        import shutil
        public_dir = "/var/www/crm.ia-bybusiness.com/informes"
        os.makedirs(public_dir, exist_ok=True)
        public_path = f"{public_dir}/informes_{today}.pdf"
        shutil.copy(pdf_path, public_path)
        # Verificar accesibilidad
        import urllib.request
        req = urllib.request.Request(public_url, method="HEAD")
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.status
        if status == 200:
            print(f"  Public URL: {public_url} (HTTP {status})")
            url = public_url
        else:
            print(f"  WARN: HTTP {status}, fallback")
            url = None
    except Exception as e:
        print(f"  ERROR: {e}")
        url = None

    # 3. Construir email
    print("\n[3/3] Enviando email...")
    data = fetch_data()
    n_clients = len(data)
    n_comps = sum(int(d.get("competitors_count", 0) or 0) for d in data)

    # Construir body texto con link destacado al PDF
    body_lines = [
        "=" * 60,
        "INFORME COMPETITIVO CRM ByBusiness",
        f"Fecha: {today}",
        f"Clientes: {n_clients}  |  Competidores scrapeados: {n_comps}",
        "=" * 60,
        "",
    ]

    if url:
        body_lines.append(f">>> DESCARGA EL PDF COMPLETO CON GRAFICAS: <<<")
        body_lines.append("")
        body_lines.append(f"  {url}")
        body_lines.append("")
        body_lines.append("(11 paginas con graficas de score, comparativas, top competidores, recomendaciones)")
        body_lines.append("")
        body_lines.append("=" * 60)
        body_lines.append("")

    # Top 5 clientes por score (top críticos primero)
    scored = [(calc_score(d), d) for d in data]
    scored.sort(key=lambda x: x[0])  # menor score primero (críticos)

    if scored:
        body_lines.append("RESUMEN (ordenado por criticidad):")
        body_lines.append("-" * 50)
        for score, d in scored[:5]:
            label = "CRITICO" if score < 40 else "MEJORABLE" if score < 70 else "OK"
            cr = float(d.get("client_rating", 0) or 0)
            ar = float(d.get("avg_rating", 0) or 0)
            crv = int(d.get("client_reviews", 0) or 0)
            arv = int(d.get("avg_reviews", 0) or 0)
            body_lines.append(f"[{label}] #{d.get('cliente_id')} {d.get('nombre', '?')[:40]}")
            body_lines.append(f"   Score {score}/100  Rating {cr} vs {ar}  Reviews {crv} vs {arv}")
            body_lines.append(f"   {d.get('localidad', '?')}")
            body_lines.append("")

    body_lines.append("=" * 50)
    if url:
        body_lines.append(f"DESCARGA EL PDF COMPLETO (con graficas):")
        body_lines.append(f"  {url}")
        body_lines.append("")
        body_lines.append("(link expira en 24h)")
    else:
        body_lines.append("PDF disponible en el VPS:")
        body_lines.append(f"  {pdf_path}")
        body_lines.append(f"  {size:,} bytes")
    body_lines.append("")
    body_lines.append("--")
    body_lines.append("CRM ByBusiness  ·  xiaomi-12 scraper")
    body_lines.append("BrightLocal 2026 ranking factors")

    body = "\n".join(body_lines)

    # 4. Enviar email
    subject = f"CRM Informes competitivos ({n_clients} clientes, {n_comps} competidores) - {today}"

    # Nota: SMTP creds son del n8n, no tenemos acceso directo
    # Por ahora usamos el path via n8n
    # Si SMTP_PASS no está configurado, intentamos via n8n webhook
    smtp_pass = os.environ.get("SMTP_PASS", "")
    if smtp_pass:
        send_email(to_email, subject, body, pdf_path)
        print(f"  Email enviado a {to_email}")
        print(f"  Subject: {subject}")
        print(f"  Attachment: {pdf_path} ({size:,} bytes)")
    else:
        # Trigger via n8n webhook V4 (sin PDF pero con resumen)
        print(f"  SMTP_PASS no configurado. Enviando via n8n webhook...")
        webhook_url = "https://n8n.ia-bybusiness.online/webhook/crm-informe-v4"
        try:
            req = urllib.request.Request(webhook_url,
                                         data=json.dumps({}).encode(),
                                         headers={"Content-Type": "application/json"})
            resp = urllib.request.urlopen(req, timeout=60)
            result = json.loads(resp.read())
            print(f"  Webhook response: {result.get('messageId', '?')}")
            print(f"  PDF local: {pdf_path}")
            print(f"  URL publica: {url}")
        except Exception as e:
            print(f"  ERROR webhook: {e}")

    print("\nDone!")


if __name__ == "__main__":
    main()
