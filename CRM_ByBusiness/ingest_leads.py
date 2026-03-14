
import csv
import json
import psycopg2
import os

# Database connection details
DB_CONFIG = {
    "host": "localhost",
    "port": 5432, # Port mapped in Docker for Postgres
    "database": "n8n",
    "user": "postgres",
    "password": "postgres"
}

CSV_FILE_PATH = r"C:\Users\Rafael\.gemini\antigravity\brain\9e2eb073-319f-43c1-b7c0-1a893c2fd992\.system_generated\steps\703\output.txt"

def ingest():
    # Read the JSON output from notebooklm tool
    with open(CSV_FILE_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        csv_content = data['content']

    # Connect to database
    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    # Parse CSV
    lines = csv_content.strip().split('\n')
    reader = csv.DictReader(lines)

    categories = set()
    localities = [] # (provincia, localidad)

    leads_data = []

    for row in reader:
        if not row: continue
        
        def safe_get(key, default=''):
            val = row.get(key)
            return val.strip() if val else default

        # Category
        cat = safe_get('category', 'General')
        categories.add(cat)
        
        # Locality
        city = "Desconocido"
        state = "Desconocido"
        ca_raw = row.get('complete_address')
        if ca_raw and ca_raw != "null":
            try:
                ca_clean = ca_raw.replace('""', '"')
                ca = json.loads(ca_clean)
                city = ca.get('city', 'Desconocido')
                state = ca.get('state', 'Desconocido')
            except:
                pass
        
        localities.append((state, city))

        # Scoring
        scoring_val = row.get('review_rating')
        scoring_raw = scoring_val.replace('.', '').replace(',', '.') if scoring_val else '0'
        try:
            scoring = float(scoring_raw) / 1000000.0 if float(scoring_raw) > 10 else float(scoring_raw)
        except:
            scoring = 0.0

        leads_data.append({
            'nombre': safe_get('title', 'Sin Nombre'),
            'telefono': safe_get('phone').replace(' ', ''),
            'direccion': safe_get('address'),
            'link': safe_get('link'),
            'scoring': scoring,
            'category': cat,
            'city': city,
            'state': state
        })

    # Insert Categories
    cat_map = {}
    for cat in categories:
        cur.execute("INSERT INTO categorias (nombre) VALUES (%s) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id;", (cat,))
        cat_map[cat] = cur.fetchone()[0]

    # Insert Localities
    loc_map = {}
    for state, city in set(localities):
        cur.execute("INSERT INTO localidades (provincia, localidad) VALUES (%s, %s) ON CONFLICT (provincia, localidad) DO UPDATE SET provincia = EXCLUDED.provincia RETURNING id;", (state, city))
        loc_map[(state, city)] = cur.fetchone()[0]

    # Insert Leads
    count = 0
    for lead in leads_data:
        cur.execute("""
            INSERT INTO leads (nombre_comercial, telefono, direccion, google_maps_link, scoring, estado, categoria_id, localidad_id)
            VALUES (%s, %s, %s, %s, %s, 'PENDIENTE', %s, %s);
        """, (
            lead['nombre'],
            lead['telefono'],
            lead['direccion'],
            lead['link'],
            lead['scoring'],
            cat_map.get(lead['category']),
            loc_map.get((lead['state'], lead['city']))
        ))
        count += 1

    conn.commit()
    print(f"Ingestion complete: {count} leads inserted.")
    cur.close()
    conn.close()

if __name__ == "__main__":
    ingest()
