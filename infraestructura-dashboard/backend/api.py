import os
from flask import Flask, jsonify, request
from flask_cors import CORS
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)
CORS(app)

def get_db():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        dbname=os.getenv('DB_NAME', 'fabrica'),
        user=os.getenv('DB_USER', 'rafael'),
        password=os.getenv('DB_PASSWORD', '')
    )

@app.route('/api/infraestructura/contenedores', methods=['GET'])
def get_contenedores():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM infraestructura.inventario_contenedores")
        rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/infraestructura/recursos', methods=['GET'])
def get_recursos():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM infraestructura.recursos_servidor ORDER BY timestamp DESC LIMIT 1")
        row = cur.fetchone()
        return jsonify(dict(row) if row else {})
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/infraestructura/endpoints', methods=['GET'])
def get_endpoints():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM infraestructura.servicios_endpoints WHERE activo = true")
        rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/infraestructura/imagenes', methods=['GET'])
def get_imagenes():
    try:
        conn = get_db()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM infraestructura.imagenes_disponibles")
        rows = cur.fetchall()
        return jsonify([dict(r) for r in rows])
    except Exception as e:
        return jsonify({'error': str(e)}), 500
    finally:
        if 'conn' in locals():
            conn.close()

@app.route('/api/infraestructura/workflows', methods=['GET'])
def get_workflows():
    """Obtiene workflows de n8n desde la BD local"""
    try:
        conn = get_db()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT workflow_id, nombre, activo, updated_at, webhook_urls
            FROM infraestructura.workflows_n8n
            ORDER BY nombre
        """)
        
        workflows = []
        for row in cursor.fetchall():
            workflows.append({
                'workflow_id': row[0],
                'nombre': row[1],
                'activo': row[2],
                'updated_at': row[3].isoformat() if row[3] else None,
                'webhook_urls': row[4]
            })
        
        cursor.close()
        conn.close()
        return jsonify(workflows)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/infraestructura/sync', methods=['POST'])
def run_sync():
    try:
        import subprocess
        script_path = os.path.join(os.path.dirname(__file__), 'sync_servidor.py')
        subprocess.Popen(['python', script_path])
        return jsonify({'status': 'sincronización iniciada en segundo plano'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print("API de Infraestructura Dashboard Iniciada en puerto 5000")
    app.run(port=5000, debug=True)
