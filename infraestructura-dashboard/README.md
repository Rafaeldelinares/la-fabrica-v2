# Infraestructura Dashboard

Sistema de monitorización y documentación del servidor VPS (72.60.191.179) para La Fábrica.

## 🎯 Objetivo
1. Escanear el servidor remotamente vía SSH.
2. Guardar la información en la BD local `fabrica` (esquema `infraestructura`).
3. Presentar un dashboard web (Navy Industrial) para consultar el estado del servidor.
4. Proporcionar endpoints/webhooks para uso en desarrollo.

## 📋 Estructura de Proyecto
```
infraestructura-dashboard/
├── backend/
│   ├── sync_servidor.py      # Script principal de sincronización
│   ├── requirements.txt      # Dependencias Python
│   └── .env
├── frontend/
│   ├── dashboard.html        # Dashboard Navy Industrial
│   ├── assets/
│   │   └── styles.css        # Estilos personalizados
│   └── js/
│       └── app.js            # Lógica del dashboard
└── sql/
    └── schema.sql            # Script de creación de esquema
```

## 🚀 Despliegue y Ejecución

1. **Crear esquema en BD**
```bash
psql -U rafael -d fabrica -f sql/schema.sql
```

2. **Instalar dependencias**
```bash
pip install -r backend/requirements.txt
```

3. **Configurar el entorno**
Revisar y editar el archivo `backend/.env` con la ruta correcta a la clave SSH (`VPS_SSH_KEY_PATH`).

4. **Primera sincronización**
```bash
python backend/sync_servidor.py
```

5. **Abrir dashboard**
```bash
open frontend/dashboard.html
```
