import os
import json
import paramiko
import psycopg2
from dotenv import load_dotenv

def load_config():
    # Cargar variables de entorno desde .env
    env_path = os.path.join(os.path.dirname(__file__), '.env')
    load_dotenv(dotenv_path=env_path)

def get_db_connection():
    return psycopg2.connect(
        host=os.getenv('DB_HOST', 'localhost'),
        port=os.getenv('DB_PORT', '5432'),
        dbname=os.getenv('DB_NAME', 'fabrica'),
        user=os.getenv('DB_USER', 'rafael'),
        password=os.getenv('DB_PASSWORD', '')
    )

def get_ssh_client():
    host = os.getenv('VPS_HOST')
    user = os.getenv('VPS_USER')
    key_path = os.getenv('VPS_SSH_KEY_PATH')

    if not host or not user or not key_path:
        raise Exception("Falta configuración VPS en archivo .env")

    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    # Autenticación SSH
    try:
        key = paramiko.RSAKey.from_private_key_file(key_path)
        client.connect(hostname=host, username=user, pkey=key)
    except Exception as e:
        # Fallback for dev without right keys
        print(f"No se pudo usar la llave SSH: {e}. Asegúrate de configurar VPS_SSH_KEY_PATH correctamente.")
        raise
    return client

def run_remote_command(ssh_client, command):
    stdin, stdout, stderr = ssh_client.exec_command(command)
    err = stderr.read().decode('utf-8').strip()
    return stdout.read().decode('utf-8').strip()

def sync_containers(ssh, cursor):
    print("Sincronizando contenedores...")
    cmd = 'docker ps --format "{{.ID}}|{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}"'
    output = run_remote_command(ssh, cmd)
    
    cursor.execute("TRUNCATE TABLE infraestructura.inventario_contenedores RESTART IDENTITY")
    
    if not output: return
        
    for line in output.split('\n'):
        if not line: continue
        parts = line.split('|')
        if len(parts) >= 5:
            cid, name, img, status, ports = parts[0], parts[1], parts[2], parts[3], parts[4]
            uptime = status
            estado = 'UP' if status.startswith('Up') else 'DOWN'
            
            # Recuperar network y labels vía inspect (ligero)
            inspect_cmd = f'docker inspect {cid}'
            inspect_out = run_remote_command(ssh, inspect_cmd)
            labels = {}
            network = ''
            
            try:
                if inspect_out:
                    inspect_json = json.loads(inspect_out)[0]
                    labels = inspect_json.get('Config', {}).get('Labels', {})
                    networks = inspect_json.get('NetworkSettings', {}).get('Networks', {})
                    if networks:
                        network = list(networks.keys())[0]
            except Exception:
                pass
            
            cursor.execute("""
                INSERT INTO infraestructura.inventario_contenedores 
                (container_id, nombre, imagen, estado, puertos, red, uptime, labels)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (cid, name, img, estado, ports, network, uptime, json.dumps(labels)))

def sync_images(ssh, cursor):
    print("Sincronizando imágenes...")
    cmd = 'docker images --format "{{.Repository}}|{{.Tag}}|{{.Size}}"'
    output = run_remote_command(ssh, cmd)
    
    cursor.execute("TRUNCATE TABLE infraestructura.imagenes_disponibles RESTART IDENTITY")
    
    if not output: return
        
    for line in output.split('\n'):
        if not line: continue
        parts = line.split('|')
        if len(parts) >= 3:
            repo, tag, size_str = parts[0], parts[1], parts[2]
            
            # Calcular MB aproximados
            size_mb = 0.0
            size_upper = size_str.upper()
            try:
                if 'GB' in size_upper:
                    size_mb = float(size_upper.replace('GB','').strip()) * 1024
                elif 'MB' in size_upper:
                    size_mb = float(size_upper.replace('MB','').strip())
                elif 'KB' in size_upper:
                    size_mb = float(size_upper.replace('KB','').strip()) / 1024
            except:
                pass
            
            cursor.execute("""
                INSERT INTO infraestructura.imagenes_disponibles (nombre, tag, size_mb)
                VALUES (%s, %s, %s)
                ON CONFLICT (nombre, tag) DO UPDATE SET size_mb = EXCLUDED.size_mb
            """, (repo, tag, size_mb))

def sync_resources(ssh, cursor):
    print("Sincronizando recursos...")
    # RAM via free (MB)
    free_out = run_remote_command(ssh, "free -m | awk 'NR==2{print $2,$3}'").split()
    ram_total_gb, ram_usado_gb, ram_porcentaje = 0, 0, 0
    if len(free_out) >= 2:
        try:
            ram_total_gb = float(free_out[0]) / 1024
            ram_usado_gb = float(free_out[1]) / 1024
            ram_porcentaje = int((float(free_out[1]) / float(free_out[0])) * 100)
        except: pass
            
    # Disco root
    df_out = run_remote_command(ssh, "df -m / | awk 'NR==2{print $2,$3,$5}'").split()
    disco_total_gb, disco_usado_gb, disco_porcentaje = 0, 0, 0
    if len(df_out) >= 3:
        try:
            disco_total_gb = float(df_out[0]) / 1024
            disco_usado_gb = float(df_out[1]) / 1024
            disco_porcentaje = int(df_out[2].replace('%',''))
        except: pass

    # Uptime & Load
    uptime_out = run_remote_command(ssh, "uptime")
    load = 0.0
    try:
        load = float(uptime_out.split('load average:')[1].split(',')[0].strip())
    except: pass
        
    cursor.execute("""
        INSERT INTO infraestructura.recursos_servidor 
        (ram_total_gb, ram_usado_gb, ram_porcentaje, disco_total_gb, disco_usado_gb, disco_porcentaje, cpu_load, uptime)
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    """, (ram_total_gb, ram_usado_gb, ram_porcentaje, disco_total_gb, disco_usado_gb, disco_porcentaje, load, uptime_out))

def sync_n8n_workflows(ssh, cursor):
    """
    Sincroniza workflows de n8n de PRODUCCIÓN usando su API REST.
    """
    print("Sincronizando workflows de n8n (producción)...")
    
    # Obtener API key del .env
    api_key = os.getenv('N8N_API_KEY', '')
    if not api_key:
        print("⚠️ N8N_API_KEY no configurada en .env")
        return
    
    # Comando curl con autenticación vía API key
    # Acceso externo a la API de n8n
    cmd = f"""curl -s -X GET 'https://n8n.ia-bybusiness.online/api/v1/workflows' \\
-H 'Accept: application/json' \\
-H 'X-N8N-API-KEY: {api_key}' """
    
    try:
        output = run_remote_command(ssh, cmd)
        
        if not output or output.strip() == '':
            print("No se pudo obtener respuesta de la API de n8n")
            return
        
        # Parsear JSON
        import json
        try:
            data = json.loads(output)
            
            # n8n devuelve los workflows directamente en un array
            # o dentro de data.data según la versión
            if isinstance(data, dict) and 'data' in data:
                workflows = data['data']
            elif isinstance(data, list):
                workflows = data
            else:
                print(f"Formato inesperado: {type(data)}")
                return
                
        except json.JSONDecodeError as e:
            print(f"Error parseando respuesta de n8n: {e}")
            print(f"Respuesta: {output[:500]}")
            return
        
        # Limpiar tabla local
        cursor.execute("DELETE FROM infraestructura.workflows_n8n")
        
        # Procesar cada workflow
        for workflow in workflows:
            workflow_id = str(workflow.get('id', ''))
            nombre = workflow.get('name', 'Sin nombre')
            activo = workflow.get('active', False)
            
            # Extraer webhooks si existen
            webhooks = []
            nodes = workflow.get('nodes', [])
            for node in nodes:
                if node.get('type') == 'n8n-nodes-base.webhook':
                    webhook_path = node.get('parameters', {}).get('path', '')
                    if webhook_path:
                        webhook_url = f"https://n8n.ia-bybusiness.online/webhook/{webhook_path}"
                        webhooks.append(webhook_url)
            
            # Guardar en BD LOCAL de La Fábrica
            cursor.execute("""
                INSERT INTO infraestructura.workflows_n8n 
                (workflow_id, nombre, activo, webhook_urls)
                VALUES (%s, %s, %s, %s)
            """, (workflow_id, nombre, activo, webhooks if webhooks else None))
            
        print(f"✅ {len(workflows)} workflows sincronizados correctamente")
        
    except Exception as e:
        print(f"❌ Error al sincronizar workflows de n8n: {e}")
        import traceback
        traceback.print_exc()

def main():
    load_config()
    print("Iniciando sincronización con VPS...")
    conn = None
    ssh = None
    try:
        conn = get_db_connection()
        conn.autocommit = False
        cursor = conn.cursor()
        print("Conectado a la base de datos.")
        
        try:
            ssh = get_ssh_client()
            print("Conexión SSH establecida.")
            
            sync_containers(ssh, cursor)
            sync_images(ssh, cursor)
            sync_resources(ssh, cursor)
            sync_n8n_workflows(ssh, cursor)
            
            cursor.execute("""
                INSERT INTO infraestructura.historial_auditorias (tipo, descripcion)
                VALUES ('sync', 'Sincronización completa con éxito')
            """)
            
            conn.commit()
            print("Sincronización guardada exitosamente.")
            
        except Exception as e:
            conn.rollback()
            try:
                cursor.execute("""
                    INSERT INTO infraestructura.historial_auditorias (tipo, descripcion, datos)
                    VALUES ('sync', 'Error en sincronización', %s)
                """, (json.dumps({'error': str(e)}),))
                conn.commit()
            except: pass
            print(f"Error durante conexión SSH/comandos: {e}")
            
    except Exception as e:
        print(f"Error general: {e}")
    finally:
        if ssh: ssh.close()
        if conn: conn.close()
            
if __name__ == "__main__":
    main()
