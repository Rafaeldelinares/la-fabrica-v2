
import csv
import json
import psycopg2
import io

# Database connection details
DB_CONFIG = {
    "host": "localhost",
    "port": 5432,
    "database": "n8n",
    "user": "postgres",
    "password": "postgres"
}

# Master base de datos
CSV_PATH = r"C:\Users\Rafael\.gemini\antigravity\brain\9e2eb073-319f-43c1-b7c0-1a893c2fd992\.system_generated\steps\703\output.txt"

def ingest_protocol_v2():
    # 1. READ AND FILTER
    with open(CSV_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)
        csv_content = data['content'].strip()

    conn = psycopg2.connect(**DB_CONFIG)
    cur = conn.cursor()

    reader = csv.DictReader(io.StringIO(csv_content))
    
    total_processed = 0
    valid_inserted = 0
    example_record = None

    # We need to ensure categories and localities exist for the foreign keys
    # I will use the same logic as before but with strict protocol
    
    cat_map = {}
    loc_map = {}

    for row in reader:
        total_processed += 1
        
        # PROTOCOL RULE 1: Filter if no phone
        phone_raw = row.get('phone')
        if not phone_raw or not phone_raw.strip():
            continue
            
        # 2. TRANSFORMATION
        # Phone: No spaces
        phone = phone_raw.replace(' ', '').strip()
        
        # Scoring: Standardization
        scoring_val = row.get('review_rating')
        if scoring_val:
            try:
                # Remove common separators from some formats
                cleaned_rating = scoring_val.replace('.', '').replace(',', '.')
                scoring = float(cleaned_rating)
                if scoring > 10:
                    scoring = scoring / 1000000.0
            except:
                scoring = 0.0
        else:
            scoring = 0.0
            
        # Field Mapping
        nombre = row.get('title', 'Sin Nombre').strip()
        direccion = row.get('address', '').strip()
        gmaps_link = row.get('link', '').strip()
        
        # Priority logic
        prioridad = 'ALTA' if scoring > 4.5 else 'NORMAL'
        
        # Related Data (Categories/Localities) - Minimalist approach for this protocol
        cat_name = row.get('category', 'General').strip()
        if cat_name not in cat_map:
            cur.execute("INSERT INTO crm_bybusiness.categorias (nombre) VALUES (%s) ON CONFLICT (nombre) DO UPDATE SET nombre = EXCLUDED.nombre RETURNING id;", (cat_name,))
            cat_map[cat_name] = cur.fetchone()[0]
            
        city = "Desconocido"
        state = "Desconocido"
        ca_raw = row.get('complete_address')
        if ca_raw and ca_raw != "null":
            try:
                ca = json.loads(ca_raw.replace('""', '"'))
                city = ca.get('city', 'Desconocido')
                state = ca.get('state', 'Desconocido')
            except: pass
            
        if (state, city) not in loc_map:
            cur.execute("INSERT INTO crm_bybusiness.localidades (provincia, localidad) VALUES (%s, %s) ON CONFLICT (provincia, localidad) DO UPDATE SET provincia = EXCLUDED.provincia RETURNING id;", (state, city))
            loc_map[(state, city)] = cur.fetchone()[0]

        # 3. LOAD (INSERT)
        cur.execute("""
            INSERT INTO crm_bybusiness.leads (nombre_comercial, telefono, direccion, google_maps_link, scoring, estado, prioridad, categoria_id, localidad_id)
            VALUES (%s, %s, %s, %s, %s, 'PENDIENTE', %s, %s, %s)
            RETURNING id;
        """, (
            nombre, phone, direccion, gmaps_link, scoring, prioridad, cat_map[cat_name], loc_map[(state, city)]
        ))
        
        valid_inserted += 1
        if valid_inserted == 1:
            example_record = {
                "nombre_comercial": nombre,
                "telefono": phone,
                "scoring": scoring,
                "prioridad": prioridad
            }

    conn.commit()
    print(f"REPORT:")
    print(f"1. Total líneas procesadas: {total_processed}")
    print(f"2. Número de leads válidos insertados: {valid_inserted}")
    print(f"3. Ejemplo de registro:")
    print(json.dumps(example_record, indent=2))
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    ingest_protocol_v2()
