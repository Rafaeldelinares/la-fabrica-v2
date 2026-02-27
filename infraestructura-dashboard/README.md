# 🏭 Infraestructura Dashboard

Sistema de monitorización de infraestructura VPS para **La Fábrica IA**.

![Estado](https://img.shields.io/badge/Estado-OPERATIVO-success)
![Versión](https://img.shields.io/badge/Versión-1.0-blue)
![Python](https://img.shields.io/badge/Python-3.12-blue)
![License](https://img.shields.io/badge/License-Privado-red)

## 📋 Descripción

Dashboard de monitorización que corre **localmente en La Fábrica** y consulta el estado del servidor VPS de producción (72.60.191.179) vía SSH.

### ¿Qué monitoriza?

- ✅ **Contenedores Docker** activos en el VPS
- ✅ **Recursos del servidor** (RAM, CPU, disco)
- ✅ **Workflows de n8n** en producción
- ✅ **Webhooks** extraídos automáticamente
- ✅ **Imágenes Docker** disponibles

### Filosofía Zero Trust

Este sistema **NO consume recursos del VPS**. Todo corre localmente y consulta remotamente.

---

## 🚀 Instalación

### Requisitos

- Python 3.12+
- PostgreSQL (contenedor `config-postgres-1`)
- SSH configurado sin contraseña al VPS
- n8n API key de producción

### Paso 1: Clonar el repositorio
```bash
git clone git@github.com:Rafaeldelinares/la-fabrica.git
cd la-fabrica/infraestructura-dashboard
```

### Paso 2: Crear entorno virtual
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

### Paso 3: Configurar variables de entorno

Crear archivo `backend/.env`:
```env
# Base de datos LOCAL (La Fábrica)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=fabrica
DB_USER=rafael
DB_PASSWORD=TU_PASSWORD

# Servidor VPS (remoto)
VPS_HOST=72.60.191.179
VPS_USER=fabrica
VPS_SSH_KEY_PATH=/home/rafael/.ssh/id_rsa

# n8n Producción
N8N_URL=https://n8n.ia-bybusiness.online
N8N_API_KEY=TU_API_KEY
```

### Paso 4: Crear schema en PostgreSQL
```bash
docker exec -it config-postgres-1 psql -U rafael -d fabrica < backend/schema.sql
```

### Paso 5: Configurar SSH sin contraseña
```bash
# Generar clave SSH (si no existe)
ssh-keygen -t rsa -b 4096

# Copiar al servidor
ssh-copy-id fabrica@72.60.191.179

# Verificar
ssh fabrica@72.60.191.179 "echo OK"
```

### Paso 6: Primera sincronización
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

### Paso 7: Instalar servicios systemd
```bash
sudo ./instalar_servicios.sh
```

---

## 🎯 Uso

### Dashboard Web

Abrir en navegador:
```
http://localhost:8000/dashboard.html
```

### API REST

Consultar endpoints:
```bash
# Contenedores activos
curl http://localhost:5000/api/infraestructura/contenedores | jq '.'

# Workflows de n8n
curl http://localhost:5000/api/infraestructura/workflows | jq '.'

# Recursos del servidor
curl http://localhost:5000/api/infraestructura/recursos | jq '.'

# Endpoints documentados
curl http://localhost:5000/api/infraestructura/endpoints | jq '.'

# Imágenes Docker
curl http://localhost:5000/api/infraestructura/imagenes | jq '.'
```

### Sincronización manual
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

### Ver logs
```bash
# Logs de la API
sudo journalctl -u infraestructura-api -f

# Logs del dashboard
sudo journalctl -u infraestructura-dashboard -f

# Logs de sincronización
tail -f /var/log/infraestructura-sync.log
```

---

## 📊 Arquitectura
```
┌─────────────────────────────────────────────────────────┐
│           LA FÁBRICA (Local)                            │
│                                                         │
│  ┌──────────────┐      ┌─────────────────┐            │
│  │  Dashboard   │◄─────┤   API Flask     │            │
│  │  (Port 8000) │      │   (Port 5000)   │            │
│  └──────────────┘      └────────┬────────┘            │
│                                  │                      │
│                         ┌────────▼────────┐            │
│                         │   PostgreSQL    │            │
│                         │   (fabrica DB)  │            │
│                         │ Schema:         │            │
│                         │ infraestructura │            │
│                         └────────▲────────┘            │
│                                  │                      │
│                         ┌────────┴────────┐            │
│                         │  sync_servidor  │            │
│                         │  (Python SSH)   │            │
│                         └────────┬────────┘            │
└──────────────────────────────────┼──────────────────────┘
                                   │ SSH
                                   ▼
                        ┌──────────────────┐
                        │  VPS PRODUCCIÓN  │
                        │  72.60.191.179   │
                        │                  │
                        │  - n8n           │
                        │  - Docker        │
                        │  - PostgreSQL    │
                        └──────────────────┘
```

---

## 🗄️ Base de Datos

### Schema: `infraestructura`

| Tabla | Descripción |
|-------|-------------|
| `inventario_contenedores` | Contenedores Docker activos |
| `servicios_endpoints` | URLs de webhooks y APIs |
| `workflows_n8n` | Workflows de n8n con webhooks |
| `imagenes_disponibles` | Imágenes Docker disponibles |
| `recursos_servidor` | Métricas históricas (RAM, CPU, disco) |
| `historial_auditorias` | Log de sincronizaciones |

### Consultas útiles
```sql
-- Ver workflows activos
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true;

-- Ver recursos actuales
SELECT * FROM infraestructura.recursos_servidor 
ORDER BY timestamp DESC LIMIT 1;

-- Ver contenedores
SELECT nombre, estado, puertos 
FROM infraestructura.inventario_contenedores;
```

---

## 🔄 Automatización

### Servicios systemd

- `infraestructura-api.service` - API Flask en puerto 5000
- `infraestructura-dashboard.service` - Frontend en puerto 8000
```bash
# Gestión de servicios
sudo systemctl status infraestructura-*
sudo systemctl restart infraestructura-api
sudo systemctl stop infraestructura-dashboard
```

### Cron

Sincronización automática:
- **Cada hora** (en punto)
- **Al arrancar** el sistema (60 segundos después del boot)
```bash
# Ver configuración cron
crontab -l | grep sync_cron
```

---

## 🛠️ Desarrollo

### Estructura del proyecto
```
infraestructura-dashboard/
├── backend/
│   ├── sync_servidor.py      # Script de sincronización SSH
│   ├── api.py                 # API Flask
│   ├── schema.sql             # Schema de la BD
│   └── .env                   # Configuración (no en Git)
├── frontend/
│   ├── dashboard.html         # Dashboard principal
│   ├── assets/
│   │   └── styles.css         # Estilos Navy Industrial
│   └── js/
│       └── app.js             # Lógica del dashboard
├── infraestructura-api.service       # Servicio systemd API
├── infraestructura-dashboard.service # Servicio systemd Dashboard
├── instalar_servicios.sh             # Script de instalación
└── README.md                          # Este archivo
```

### Añadir nuevo endpoint a la API

Editar `backend/api.py`:
```python
@app.route('/api/infraestructura/nuevo-endpoint', methods=['GET'])
def nuevo_endpoint():
    # Tu lógica aquí
    return jsonify({"data": "ejemplo"})
```

### Añadir nueva sección al dashboard

Editar `frontend/dashboard.html` y `frontend/js/app.js`.

---

## 🎨 Estilo Navy Industrial

El dashboard sigue el sistema de diseño **Navy Industrial**:

- **Fondo:** `bg-slate-950` (casi negro)
- **Acentos:** `#D00000` (rojo ByBusiness)
- **Tipografía:** Monoespaciada
- **Badges:** Verde para activo, gris para inactivo

---

## 🐛 Troubleshooting

### Dashboard no carga
```bash
sudo systemctl restart infraestructura-dashboard
curl -I http://localhost:8000/dashboard.html
```

### API no responde
```bash
sudo systemctl restart infraestructura-api
sudo journalctl -u infraestructura-api -n 50
```

### Datos desactualizados
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

### Error de conexión SSH
```bash
# Verificar SSH
ssh fabrica@72.60.191.179 "echo OK"

# Regenerar clave si es necesario
ssh-keygen -t rsa -b 4096
ssh-copy-id fabrica@72.60.191.179
```

### Error de permisos PostgreSQL
```bash
docker exec -it config-postgres-1 psql -U postgres -d fabrica -c "
ALTER TABLE infraestructura.inventario_contenedores OWNER TO rafael;
ALTER TABLE infraestructura.workflows_n8n OWNER TO rafael;
"
```

---

## 📚 Documentación Completa

Ver documentación detallada en:
```
/opt/fabrica/knowledge/06_infraestructura/sys_infraestructura_dashboard.md
```

Incluye:
- Arquitectura completa del sistema
- Flujo de trabajo Development → Production
- Proceso de implantación paso a paso
- Checklist de operación
- Reglas de oro para implantaciones
- Comandos rápidos

---

## 🔐 Seguridad

- ✅ API key de n8n almacenada en `.env` (no en Git)
- ✅ Contraseñas de BD en `.env` (no en Git)
- ✅ SSH con clave pública/privada
- ✅ Dashboard solo accesible localmente (localhost)
- ✅ API solo accesible localmente (localhost)

---

## 📝 Changelog

### [1.0] - 2026-02-27

#### Añadido
- Sistema completo de monitorización de infraestructura
- Integración con API de n8n para workflows
- Extracción automática de webhooks
- Dashboard Navy Industrial
- Servicios systemd para arranque automático
- Sincronización automática vía cron
- Documentación completa (1,308 líneas)

---

## 👨‍💻 Autor

**Rafael De Linares Martin**  
ByBusiness - La Fábrica IA  
📧 rafaeldelinares@gmail.com

---

## 📄 Licencia

Privado - © 2026 ByBusiness

---

## 🤝 Soporte

Para soporte técnico o preguntas:
- Consultar documentación en `/opt/fabrica/knowledge/`
- Revisar logs del sistema
- Verificar estado de servicios systemd
