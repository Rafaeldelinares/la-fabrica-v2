#!/usr/bin/env python3
"""
Parsea notas_internas de clientes con Gemini y:
1. Inserta última interacción en clientes.interacciones
2. Actualiza proxima_accion_fecha + proxima_accion_nota
Solo procesa clientes que aún no tienen interacciones registradas.
"""
import psycopg2, requests, json, time, logging, sys, re
from datetime import datetime, date

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('/tmp/notas_interacciones.log', encoding='utf-8')
    ]
)
log = logging.getLogger(__name__)

DB_DSN      = "host=localhost port=5432 dbname=crm_bybusiness user=postgres password=postgres"
GEMINI_KEY  = "AIzaSyApj0Fw98PlAkIJkZsPGsSXKfciDeJ1L0A"
GEMINI_URL  = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
HOY         = date.today().isoformat()
SLEEP_S     = 0.4  # respetar rate limit Gemini


def gemini(nota):
    prompt = f"""Analiza estas notas de un gestor comercial sobre un cliente (fecha actual: {HOY}).
Extrae SOLO en JSON válido sin markdown:
{{
  "ultima_fecha": "YYYY-MM-DD o null si no hay fecha clara",
  "ultimo_resumen": "resumen breve de la última interacción en 1 frase",
  "tipo": "llamada|email|reunion|nota|acuerdo",
  "proxima_fecha": "YYYY-MM-DD o null si no hay próxima acción mencionada",
  "proxima_nota": "descripción de la próxima acción o null"
}}

Reglas:
- Si dice "RENOVACIÓN DD-MM-YYYY POR X MESES" → proxima_fecha = esa fecha
- Si dice "Llamar en X días" → calcula la fecha desde la última mención
- Si hay varias fechas, toma la MÁS RECIENTE como ultima_fecha
- Fechas pueden estar en formato DD-MM-YYYY, DD/MM/YYYY, DD de mes YYYY
- Si "proxima_fecha" es anterior a hoy ({HOY}), ponla a null

NOTAS:
{nota[:1500]}"""

    try:
        r = requests.post(GEMINI_URL,
            json={"contents": [{"parts": [{"text": prompt}]}],
                  "generationConfig": {
                      "temperature": 0,
                      "maxOutputTokens": 300,
                      "thinking_config": {"thinking_budget": 0}
                  }},
            timeout=30)
        text = r.json()['candidates'][0]['content']['parts'][0]['text']
        clean = re.sub(r'```json\n?|```\n?', '', text).strip()
        # Extraer primer objeto JSON válido (maneja estructuras anidadas)
        idx = clean.find('{')
        if idx >= 0:
            decoder = json.JSONDecoder()
            obj, _ = decoder.raw_decode(clean, idx)
            return obj
        return json.loads(clean)
    except Exception as e:
        log.warning(f"Gemini error: {e}")
        return None


def parse_fecha(s):
    if not s:
        return None
    for fmt in ('%Y-%m-%d', '%d-%m-%Y', '%d/%m/%Y'):
        try:
            return datetime.strptime(s, fmt).date()
        except:
            pass
    return None


def main():
    log.info("=== Notas → Interacciones iniciado ===")
    db  = psycopg2.connect(DB_DSN)
    cur = db.cursor()

    cur.execute("""
        SELECT c.id, c.nombre_comercial, c.notas_internas, c.gestor_id
        FROM clientes.clientes c
        WHERE c.estado = 'activo'
          AND c.notas_internas IS NOT NULL
          AND LENGTH(c.notas_internas) > 30
          AND c.notas_internas NOT ILIKE '%FANTASMA%'
          AND NOT EXISTS (
              SELECT 1 FROM clientes.interacciones i
              WHERE i.cliente_id = c.id AND i.tipo = 'importado_notas'
          )
        ORDER BY c.id
    """)
    clientes = cur.fetchall()
    total = len(clientes)
    log.info(f"Clientes a procesar: {total}")

    ok, sin_fecha, errores = 0, 0, 0

    for i, (cid, nombre, notas, gestor_id) in enumerate(clientes):
        try:
            result = gemini(notas)
            if not result:
                errores += 1
                continue

            ultima_fecha = parse_fecha(result.get('ultima_fecha'))
            resumen      = result.get('ultimo_resumen') or 'Importado de notas históricas'
            tipo         = result.get('tipo') or 'nota'
            prox_fecha   = parse_fecha(result.get('proxima_fecha'))
            prox_nota    = result.get('proxima_nota')

            # Insertar interacción
            if ultima_fecha:
                cur.execute("""
                    INSERT INTO clientes.interacciones
                        (cliente_id, gestor_id, tipo, fecha, resumen, proxima_accion, created_at)
                    VALUES (%s, %s, 'importado_notas', %s, %s, %s, NOW())
                    ON CONFLICT DO NOTHING
                """, (cid, gestor_id, ultima_fecha,
                      f"[IMPORTADO] {resumen}"[:500],
                      prox_nota))
                ok += 1
                flag = ''
            else:
                sin_fecha += 1
                flag = ' [sin fecha]'

            # Actualizar próxima acción si no tiene ya una
            if prox_fecha and prox_nota:
                cur.execute("""
                    UPDATE clientes.clientes SET
                        proxima_accion_fecha = %s,
                        proxima_accion_nota  = %s
                    WHERE id = %s
                      AND proxima_accion_fecha IS NULL
                """, (prox_fecha, prox_nota[:500], cid))

            db.commit()
            log.info(f"[{i+1}/{total}] {nombre[:35]}{flag} | {ultima_fecha} | prox: {prox_fecha}")

        except Exception as e:
            errores += 1
            db.rollback()
            log.error(f"[{i+1}/{total}] ERROR {nombre[:30]}: {e}")

        if (i + 1) % 50 == 0:
            log.info(f"=== [{i+1}/{total}] ok={ok} sin_fecha={sin_fecha} err={errores} ===")

        time.sleep(SLEEP_S)

    log.info(f"=== FIN: {ok} interacciones | {sin_fecha} sin fecha | {errores} errores ===")
    cur.close()
    db.close()


if __name__ == '__main__':
    main()
