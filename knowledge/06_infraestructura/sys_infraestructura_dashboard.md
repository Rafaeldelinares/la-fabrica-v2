# [SYS] INFRAESTRUCTURA DASHBOARD - MONITOR VPS

**Clasificación:** Sistema / Monitorización Local  
**Ubicación:** `/opt/fabrica/infraestructura-dashboard/`  
**Estado:** OPERATIVO  
**Versión:** 1.0

---

## 1. PROPÓSITO CRÍTICO

El **Infraestructura Dashboard** es el sistema de conocimiento del servidor VPS. **ESENCIAL para desarrollo y deploy**.

### ¿Por qué existe?
- **Durante el desarrollo:** Los desarrolladores necesitan saber qué endpoints usar (webhooks n8n, APIs)
- **Durante el deploy:** Verificar estado del servidor antes de desplegar
- **Monitorización:** Ver recursos disponibles (RAM, disco, CPU)
- **Documentación viva:** Inventario actualizado de servicios y contenedores

### Filosofía Zero Trust
Este sistema NO consume recursos del VPS. Opera desde La Fábrica y consulta remotamente.

---

## 2. ACCESO RÁPIDO

### URLs del Sistema:
- **Dashboard:** http://localhost:8000/dashboard.html
- **API Base:** http://localhost:5000/api/infraestructura/

### Endpoints API disponibles:
```bash
# Contenedores Docker activos
curl http://localhost:5000/api/infraestructura/contenedores

# Endpoints y webhooks documentados
curl http://localhost:5000/api/infraestructura/endpoints

# Recursos del servidor (RAM, CPU, disco)
curl http://localhost:5000/api/infraestructura/recursos

# Imágenes Docker disponibles
curl http://localhost:5000/api/infraestructura/imagenes
```

### Base de Datos:
- **DB:** `fabrica`
- **Schema:** `infraestructura`
- **Host:** `localhost:5432` (contenedor `config-postgres-1`)

### Servicios Systemd:
```bash
# Estado
sudo systemctl status infraestructura-api
sudo systemctl status infraestructura-dashboard

# Logs
sudo journalctl -u infraestructura-api -f
tail -f /var/log/infraestructura-sync.log

# Reiniciar
sudo systemctl restart infraestructura-api
sudo systemctl restart infraestructura-dashboard
```

---

## 3. USO EN DESARROLLO

### Cuando desarrollas una nueva aplicación:

**PASO 1:** Abre el dashboard
```bash
firefox http://localhost:8000/dashboard.html
```

**PASO 2:** Consulta endpoints disponibles
```bash
# Vía API
curl http://localhost:5000/api/infraestructura/endpoints | jq '.'

# O vía BD
docker exec -it config-postgres-1 psql -U rafael -d fabrica -c "
SELECT servicio, url, tipo, descripcion 
FROM infraestructura.servicios_endpoints 
WHERE activo = true;
"
```

**PASO 3:** Configura tu `.env.local`
```env
# Ejemplo: Formulario de contacto
NEXT_PUBLIC_WEBHOOK_CONTACTO=https://n8n.ia-bybusiness.online/webhook/contacto

# Ejemplo: API WhatsApp
WAHA_API_URL=https://waha.ia-bybusiness.online
```

**PASO 4:** Usa en tu código
```javascript
const response = await fetch(process.env.NEXT_PUBLIC_WEBHOOK_CONTACTO, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(formData)
});
```

---

## 4. USO EN DEPLOY

### Antes de hacer deploy:

**PASO 1:** Sincroniza el estado del servidor
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

**PASO 2:** Verifica recursos disponibles
```bash
# Consultar recursos vía API
curl http://localhost:5000/api/infraestructura/recursos | jq '.'

# O abrir el dashboard
firefox http://localhost:8000/dashboard.html

# Verificar:
# - RAM disponible (debe tener >30% libre)
# - Disco disponible (debe tener >20% libre)
# - CPU load (debe ser <2.0)
```

**PASO 3:** Verifica que los servicios necesarios estén UP
```bash
# Vía API
curl http://localhost:5000/api/infraestructura/contenedores | jq '.[] | {nombre, estado}'

# Confirma que:
# - Traefik está UP (proxy)
# - n8n está UP (si usas webhooks)
# - PostgreSQL está UP (si usas BD)
```

**PASO 4:** Procede con el deploy
```bash
# Ahora sí, haz tu deploy sabiendo que el servidor está saludable
```

---

## 5. ESTRUCTURA DE BASE DE DATOS

### Esquema: `infraestructura`

#### Tablas principales:

**`inventario_contenedores`** - Contenedores Docker activos
```sql
SELECT nombre, imagen, estado, puertos 
FROM infraestructura.inventario_contenedores;
```

**`servicios_endpoints`** - URLs y webhooks documentados
```sql
SELECT servicio, tipo, url, descripcion 
FROM infraestructura.servicios_endpoints 
WHERE activo = true;
```

**`imagenes_disponibles`** - Imágenes Docker listas para deploy
```sql
SELECT nombre, tag, en_uso 
FROM infraestructura.imagenes_disponibles;
```

**`recursos_servidor`** - Métricas históricas
```sql
SELECT timestamp, ram_porcentaje, disco_porcentaje, cpu_load 
FROM infraestructura.recursos_servidor 
ORDER BY timestamp DESC LIMIT 10;
```

**`historial_auditorias`** - Log de sincronizaciones
```sql
SELECT timestamp, tipo, descripcion 
FROM infraestructura.historial_auditorias 
ORDER BY timestamp DESC LIMIT 20;
```

---

## 6. DOCUMENTAR NUEVOS ENDPOINTS

### Cuando creas un nuevo webhook en n8n:
```bash
# Conectar a la BD
docker exec -it config-postgres-1 psql -U rafael -d fabrica
```
```sql
-- Añadir el endpoint
INSERT INTO infraestructura.servicios_endpoints 
(servicio, tipo, url, metodo, descripcion, ejemplo_payload) 
VALUES 
(
  'Newsletter Subscription',
  'webhook',
  'https://n8n.ia-bybusiness.online/webhook/newsletter',
  'POST',
  'Suscripción a newsletter desde web',
  '{"email": "user@example.com", "nombre": "Juan"}'::jsonb
);
```

Ahora este endpoint aparecerá automáticamente en:
- El dashboard web
- La API en `/api/infraestructura/endpoints`
- Disponible para todo el equipo

---

## 7. SINCRONIZACIÓN AUTOMÁTICA

### Sistema configurado:
- ✅ **Cada hora** (en punto): sincronización automática vía cron
- ✅ **Al arrancar**: sincronización 60 segundos después del boot
- ✅ **Manual**: ejecutar script cuando sea necesario

### Verificar sincronización automática:
```bash
# Ver el cron configurado
crontab -l

# Ver logs de sincronización
tail -f /var/log/infraestructura-sync.log
```

### Sincronización manual:
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

---

## 8. API ENDPOINTS COMPLETOS

### Rutas disponibles:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/infraestructura/contenedores` | GET | Lista contenedores activos |
| `/api/infraestructura/endpoints` | GET | Lista endpoints y webhooks |
| `/api/infraestructura/recursos` | GET | Estado actual de recursos |
| `/api/infraestructura/imagenes` | GET | Imágenes Docker disponibles |

### Ejemplos de uso:
```bash
# Contenedores activos
curl http://localhost:5000/api/infraestructura/contenedores | jq '.[] | {nombre, estado, imagen}'

# Endpoints disponibles (para desarrollo)
curl http://localhost:5000/api/infraestructura/endpoints | jq '.[] | {servicio, url, tipo}'

# Recursos actuales
curl http://localhost:5000/api/infraestructura/recursos | jq '.'

# Imágenes disponibles para deploy
curl http://localhost:5000/api/infraestructura/imagenes | jq '.[] | {nombre, tag, en_uso}'
```

### Usar en scripts de CI/CD:
```bash
#!/bin/bash
# Verificar estado antes de deploy

RECURSOS=$(curl -s http://localhost:5000/api/infraestructura/recursos)
RAM=$(echo $RECURSOS | jq -r '.ram_porcentaje')

if [ "$RAM" -gt 80 ]; then
  echo "❌ RAM alta ($RAM%). Deploy cancelado."
  exit 1
fi

echo "✅ Servidor saludable. Procediendo con deploy..."
```

---

## 9. TROUBLESHOOTING RÁPIDO

### Dashboard no carga:
```bash
sudo systemctl restart infraestructura-dashboard
sudo journalctl -u infraestructura-dashboard -n 50
```

### API no responde:
```bash
sudo systemctl restart infraestructura-api
sudo journalctl -u infraestructura-api -n 50
```

### Datos desactualizados:
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

### Error "Address already in use":
```bash
# Detener servicios
sudo systemctl stop infraestructura-api infraestructura-dashboard

# Matar procesos en los puertos
sudo lsof -ti:5000 | xargs -r sudo kill -9
sudo lsof -ti:8000 | xargs -r sudo kill -9

# Reiniciar servicios
sudo systemctl start infraestructura-api infraestructura-dashboard
```

### Error de permisos PostgreSQL:
```bash
docker exec -it config-postgres-1 psql -U postgres -d fabrica -c "
ALTER TABLE infraestructura.inventario_contenedores OWNER TO rafael;
ALTER TABLE infraestructura.servicios_endpoints OWNER TO rafael;
ALTER TABLE infraestructura.imagenes_disponibles OWNER TO rafael;
ALTER TABLE infraestructura.recursos_servidor OWNER TO rafael;
ALTER TABLE infraestructura.historial_auditorias OWNER TO rafael;
"
```

---

## 10. CHECKLIST DE OPERACIÓN

### Al iniciar el día:
- [ ] Abrir dashboard: http://localhost:8000/dashboard.html
- [ ] Verificar que todos los servicios estén UP
- [ ] Revisar uso de recursos (RAM, disco)
- [ ] Confirmar que los servicios systemd están activos

### Al desarrollar:
- [ ] Consultar endpoints necesarios en dashboard o API
- [ ] Copiar URLs exactas para configuración
- [ ] Verificar que servicios dependientes estén UP
- [ ] Documentar nuevos endpoints si se crean

### Antes de deploy:
- [ ] Sincronizar datos (`python backend/sync_servidor.py`)
- [ ] Verificar recursos disponibles (>30% RAM, >20% disco)
- [ ] Confirmar servicios dependientes UP
- [ ] Verificar uptime del servidor
- [ ] Revisar logs recientes por errores

### Después de deploy:
- [ ] Sincronizar para ver nuevo contenedor
- [ ] Verificar que el nuevo servicio esté UP
- [ ] Documentar nuevos endpoints en la BD
- [ ] Verificar logs del nuevo servicio
- [ ] Confirmar que el dashboard muestra el cambio

---

## 11. INTEGRACIÓN CON ANTIGRAVITY

Antigravity puede consultar la BD directamente para obtener endpoints:
```javascript
// En Antigravity, consultar endpoints disponibles
const { rows } = await postgres.query(`
  SELECT servicio, url, descripcion, ejemplo_payload
  FROM infraestructura.servicios_endpoints 
  WHERE activo = true
  ORDER BY servicio
`);

// Usar en generación de código
const webhookContacto = rows.find(r => r.servicio.includes('Contacto'));
console.log('Webhook URL:', webhookContacto.url);
```

---

## 12. COMANDOS ESENCIALES
```bash
# ===== DASHBOARD Y API =====
firefox http://localhost:8000/dashboard.html
curl http://localhost:5000/api/infraestructura/contenedores | jq '.'

# ===== SINCRONIZACIÓN MANUAL =====
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# ===== GESTIÓN DE SERVICIOS =====
sudo systemctl status infraestructura-*
sudo systemctl restart infraestructura-api infraestructura-dashboard
sudo systemctl stop infraestructura-api infraestructura-dashboard
sudo systemctl start infraestructura-api infraestructura-dashboard

# ===== LOGS =====
sudo journalctl -u infraestructura-api -f
sudo journalctl -u infraestructura-dashboard -f
tail -f /var/log/infraestructura-sync.log

# ===== BASE DE DATOS =====
docker exec -it config-postgres-1 psql -U rafael -d fabrica
\dt infraestructura.*
SELECT * FROM infraestructura.inventario_contenedores;
SELECT * FROM infraestructura.servicios_endpoints WHERE activo = true;

# ===== VERIFICAR ESTADO =====
# Servicios corriendo
sudo systemctl is-active infraestructura-api infraestructura-dashboard

# Puertos en uso
sudo netstat -tlnp | grep -E ':5000|:8000'

# Procesos activos
ps aux | grep -E 'api.py|http.server'
```

---

## 13. ARQUITECTURA DEL SISTEMA
```
┌─────────────────────────────────────────────────────┐
│           LA FÁBRICA (Local)                        │
│                                                     │
│  ┌──────────────┐      ┌─────────────────┐        │
│  │  Dashboard   │◄─────┤   API Flask     │        │
│  │  (Port 8000) │      │   (Port 5000)   │        │
│  └──────────────┘      └────────┬────────┘        │
│                                  │                  │
│                         ┌────────▼────────┐        │
│                         │   PostgreSQL    │        │
│                         │   (fabrica DB)  │        │
│                         │ Schema:         │        │
│                         │ infraestructura │        │
│                         └────────▲────────┘        │
│                                  │                  │
│                         ┌────────┴────────┐        │
│                         │  sync_servidor  │        │
│                         │  (Python SSH)   │        │
│                         └────────┬────────┘        │
└──────────────────────────────────┼──────────────────┘
                                   │ SSH
                                   ▼
                        ┌──────────────────┐
                        │  VPS PRODUCCIÓN  │
                        │  72.60.191.179   │
                        │                  │
                        │  Solo consultas  │
                        │  No ejecuta nada │
                        └──────────────────┘

Servicios Systemd:
- infraestructura-api.service (arranque automático)
- infraestructura-dashboard.service (arranque automático)

Cron Jobs:
- Sincronización cada hora (0 * * * *)
- Sincronización al boot (@reboot sleep 60)
```

---

## 14. REFERENCIAS

**Documentación relacionada:**
- Sistema de Despliegue: `06_infraestructura/sys_despliegue_fabrica_nueva.md`
- Arquitectura de Datos: `01_arquitectura/arquitectura_datos.md`
- Constitución Maestra: `01_arquitectura/constitucion_maestra.md`

**Servidor VPS:**
- IP: 72.60.191.179
- Usuario SSH: fabrica
- Dominio: ia-bybusiness.online

**Ubicación física del proyecto:**
- `/opt/fabrica/infraestructura-dashboard/`

**URLs de acceso:**
- Dashboard: http://localhost:8000/dashboard.html
- API: http://localhost:5000/api/infraestructura/

---

**Última actualización:** 27 de Febrero de 2026  
**Mantenedor:** La Fábrica IA  
**Estado:** OPERATIVO - SISTEMA CRÍTICO - 100% FUNCIONAL

---

## 15. WORKFLOWS DE N8N - MONITORIZACIÓN

### ¿Qué se sincroniza?

El dashboard ahora muestra **todos los workflows activos de n8n en producción**:

- ✅ Nombre del workflow
- ✅ Estado (ACTIVO/INACTIVO)
- ✅ URLs de webhooks extraídos automáticamente
- ✅ Última actualización

### Consultas útiles
```sql
-- Ver workflows activos con webhooks
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true 
ORDER BY nombre;

-- Buscar un webhook específico
SELECT nombre, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE webhook_urls::text LIKE '%chat-web%';

-- Contar workflows activos vs inactivos
SELECT 
  activo,
  COUNT(*) as total
FROM infraestructura.workflows_n8n
GROUP BY activo;
```

### ¿Cómo se extraen los webhooks?

El script:
1. Consulta la API de n8n: `https://n8n.ia-bybusiness.online/api/v1/workflows`
2. Recorre cada workflow
3. Busca nodos de tipo `n8n-nodes-base.webhook`
4. Extrae el `path` del webhook
5. Construye la URL completa
6. Guarda en la BD local

### Ejemplo de uso en desarrollo
```javascript
// Consultar webhooks disponibles antes de codificar
const { rows } = await postgres.query(`
  SELECT nombre, webhook_urls 
  FROM infraestructura.workflows_n8n 
  WHERE activo = true
`);

// Usar en tu aplicación
const chatWebhook = rows.find(r => r.nombre.includes('Chat_Web'));
const webhookUrl = chatWebhook.webhook_urls[0];

console.log('Webhook a usar:', webhookUrl);
// https://n8n.ia-bybusiness.online/webhook/chat-web-router
```

---

## 16. FLUJO DE TRABAJO: DESARROLLO → PRODUCCIÓN

### 🏭 LA FÁBRICA (Local) - Entorno de Desarrollo

**n8n Local:** `http://localhost:5678`
- Aquí desarrollas y pruebas workflows
- Experimentas con lógica de negocio
- Validas que todo funcione

**Base de datos Local:** `fabrica` (PostgreSQL en `config-postgres-1`)
- Schemas de prueba
- Datos de desarrollo
- Testing de queries

### 🚀 SERVIDOR VPS (Producción) - Entorno Live

**n8n Producción:** `https://n8n.ia-bybusiness.online`
- Workflows que atienden clientes reales
- APIs y webhooks públicos
- Integraciones productivas

**Base de datos Producción:** `fabrica` (PostgreSQL en `fabrica-postgres-1`)
- Datos reales de clientes
- CRM, leads, candidatos
- Información crítica del negocio

---

## 17. PROCESO DE IMPLANTACIÓN PASO A PASO

### 🔄 Workflow: Desarrollo → Producción

**FASE 1: DESARROLLO EN LA FÁBRICA**
```bash
# 1. Crear workflow en n8n local
# Acceder a: http://localhost:5678
# Crear y probar el workflow

# 2. Validar con datos de prueba
# Ejecutar el workflow manualmente
# Verificar logs y resultados

# 3. Exportar el workflow
# En n8n: Settings → Download
# Guarda el .json del workflow
```

**FASE 2: DESPLIEGUE A PRODUCCIÓN**
```bash
# 1. Acceder a n8n de producción
firefox https://n8n.ia-bybusiness.online

# 2. Importar el workflow
# En n8n: + → Import from File
# Seleccionar el .json exportado

# 3. Configurar credenciales de producción
# Actualizar:
# - URLs de base de datos (fabrica-postgres-1)
# - API keys de producción
# - Webhooks externos

# 4. IMPORTANTE: NO activar todavía
# Dejar el workflow en estado INACTIVO

# 5. Sincronizar el dashboard
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# 6. Verificar en el dashboard local
firefox http://localhost:8000/dashboard.html
# Confirmar que el nuevo workflow aparece como INACTIVO

# 7. Activar en producción
# En n8n producción: Toggle ON
# Sincronizar de nuevo
python backend/sync_servidor.py

# 8. Verificar que está ACTIVO en el dashboard
# Badge debe aparecer verde
```

**FASE 3: VALIDACIÓN**
```bash
# 1. Probar el webhook en producción
curl -X POST https://n8n.ia-bybusiness.online/webhook/tu-nuevo-webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# 2. Revisar ejecuciones en n8n
# Ir a: Executions → Ver logs

# 3. Monitorizar en el dashboard
# Verificar que no haya errores
```

---

## 18. CHECKLIST DE IMPLANTACIÓN

### ✅ Antes de desplegar

- [ ] Workflow probado en La Fábrica (local)
- [ ] Exportado el .json del workflow
- [ ] Credenciales de producción preparadas
- [ ] Base de datos de producción lista (si es necesario)
- [ ] Dashboard sincronizado y funcionando

### ✅ Durante el despliegue

- [ ] Workflow importado en n8n producción
- [ ] Credenciales configuradas (producción)
- [ ] URLs actualizadas (endpoints de producción)
- [ ] Webhook path configurado correctamente
- [ ] Workflow **SIN activar** todavía

### ✅ Después del despliegue

- [ ] Dashboard sincronizado (`python backend/sync_servidor.py`)
- [ ] Workflow visible en dashboard como INACTIVO
- [ ] Activar workflow en n8n producción
- [ ] Sincronizar de nuevo
- [ ] Verificar badge ACTIVO en dashboard
- [ ] Probar webhook con curl
- [ ] Revisar logs de ejecución
- [ ] Documentar webhook en `servicios_endpoints`

---

## 19. DOCUMENTAR NUEVO WEBHOOK

Cuando despliegues un nuevo workflow con webhook:
```sql
-- Añadir el webhook a la documentación
docker exec -it config-postgres-1 psql -U rafael -d fabrica

INSERT INTO infraestructura.servicios_endpoints 
(servicio, tipo, url, metodo, descripcion, ejemplo_payload) 
VALUES 
(
  'Nombre del Servicio',
  'webhook',
  'https://n8n.ia-bybusiness.online/webhook/tu-path',
  'POST',
  'Descripción de lo que hace',
  '{"campo": "valor", "ejemplo": "payload"}'::jsonb
);
```

Ahora aparecerá en:
- Dashboard web (sección ENDPOINTS)
- API en `/api/infraestructura/endpoints`
- Documentación centralizada

---

## 20. REGLAS DE ORO PARA IMPLANTACIONES

### 🚨 NUNCA:
- ❌ Desarrollar directamente en producción
- ❌ Activar workflows sin probar
- ❌ Usar credenciales de desarrollo en producción
- ❌ Modificar workflows activos sin backup
- ❌ Olvidar sincronizar el dashboard después de cambios

### ✅ SIEMPRE:
- ✅ Desarrollar en La Fábrica primero
- ✅ Exportar el workflow completo
- ✅ Importar en producción INACTIVO
- ✅ Configurar credenciales de producción
- ✅ Sincronizar dashboard antes y después
- ✅ Probar con datos reales pero controlados
- ✅ Documentar el webhook en la BD

---

## 21. COMANDOS RÁPIDOS PARA IMPLANTACIONES
```bash
# ========== SINCRONIZACIÓN ==========
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# ========== VERIFICACIÓN ==========
# Ver workflows de producción
curl http://localhost:5000/api/infraestructura/workflows | jq '.[] | {nombre, activo}'

# Ver workflows activos con webhooks
docker exec -it config-postgres-1 psql -U rafael -d fabrica -c "
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true;
"

# ========== DASHBOARD ==========
firefox http://localhost:8000/dashboard.html

# ========== PRODUCCIÓN ==========
firefox https://n8n.ia-bybusiness.online
```

---

**Última actualización:** 27 de Febrero de 2026  
**Mantenedor:** La Fábrica IA  
**Estado:** OPERATIVO - WORKFLOWS N8N INTEGRADOS ✅

---

## 15. WORKFLOWS DE N8N - MONITORIZACIÓN

### ¿Qué se sincroniza?

El dashboard ahora muestra **todos los workflows activos de n8n en producción**:

- ✅ Nombre del workflow
- ✅ Estado (ACTIVO/INACTIVO)
- ✅ URLs de webhooks extraídos automáticamente
- ✅ Última actualización

### Consultas útiles
```sql
-- Ver workflows activos con webhooks
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true 
ORDER BY nombre;

-- Buscar un webhook específico
SELECT nombre, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE webhook_urls::text LIKE '%chat-web%';

-- Contar workflows activos vs inactivos
SELECT 
  activo,
  COUNT(*) as total
FROM infraestructura.workflows_n8n
GROUP BY activo;
```

### ¿Cómo se extraen los webhooks?

El script:
1. Consulta la API de n8n: `https://n8n.ia-bybusiness.online/api/v1/workflows`
2. Recorre cada workflow
3. Busca nodos de tipo `n8n-nodes-base.webhook`
4. Extrae el `path` del webhook
5. Construye la URL completa
6. Guarda en la BD local

### Ejemplo de uso en desarrollo
```javascript
// Consultar webhooks disponibles antes de codificar
const { rows } = await postgres.query(`
  SELECT nombre, webhook_urls 
  FROM infraestructura.workflows_n8n 
  WHERE activo = true
`);

// Usar en tu aplicación
const chatWebhook = rows.find(r => r.nombre.includes('Chat_Web'));
const webhookUrl = chatWebhook.webhook_urls[0];

console.log('Webhook a usar:', webhookUrl);
// https://n8n.ia-bybusiness.online/webhook/chat-web-router
```

---

## 16. FLUJO DE TRABAJO: DESARROLLO → PRODUCCIÓN

### 🏭 LA FÁBRICA (Local) - Entorno de Desarrollo

**n8n Local:** `http://localhost:5678`
- Aquí desarrollas y pruebas workflows
- Experimentas con lógica de negocio
- Validas que todo funcione

**Base de datos Local:** `fabrica` (PostgreSQL en `config-postgres-1`)
- Schemas de prueba
- Datos de desarrollo
- Testing de queries

### 🚀 SERVIDOR VPS (Producción) - Entorno Live

**n8n Producción:** `https://n8n.ia-bybusiness.online`
- Workflows que atienden clientes reales
- APIs y webhooks públicos
- Integraciones productivas

**Base de datos Producción:** `fabrica` (PostgreSQL en `fabrica-postgres-1`)
- Datos reales de clientes
- CRM, leads, candidatos
- Información crítica del negocio

---

## 17. PROCESO DE IMPLANTACIÓN PASO A PASO

### 🔄 Workflow: Desarrollo → Producción

**FASE 1: DESARROLLO EN LA FÁBRICA**
```bash
# 1. Crear workflow en n8n local
# Acceder a: http://localhost:5678
# Crear y probar el workflow

# 2. Validar con datos de prueba
# Ejecutar el workflow manualmente
# Verificar logs y resultados

# 3. Exportar el workflow
# En n8n: Settings → Download
# Guarda el .json del workflow
```

**FASE 2: DESPLIEGUE A PRODUCCIÓN**
```bash
# 1. Acceder a n8n de producción
firefox https://n8n.ia-bybusiness.online

# 2. Importar el workflow
# En n8n: + → Import from File
# Seleccionar el .json exportado

# 3. Configurar credenciales de producción
# Actualizar:
# - URLs de base de datos (fabrica-postgres-1)
# - API keys de producción
# - Webhooks externos

# 4. IMPORTANTE: NO activar todavía
# Dejar el workflow en estado INACTIVO

# 5. Sincronizar el dashboard
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# 6. Verificar en el dashboard local
firefox http://localhost:8000/dashboard.html
# Confirmar que el nuevo workflow aparece como INACTIVO

# 7. Activar en producción
# En n8n producción: Toggle ON
# Sincronizar de nuevo
python backend/sync_servidor.py

# 8. Verificar que está ACTIVO en el dashboard
# Badge debe aparecer verde
```

**FASE 3: VALIDACIÓN**
```bash
# 1. Probar el webhook en producción
curl -X POST https://n8n.ia-bybusiness.online/webhook/tu-nuevo-webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# 2. Revisar ejecuciones en n8n
# Ir a: Executions → Ver logs

# 3. Monitorizar en el dashboard
# Verificar que no haya errores
```

---

## 18. CHECKLIST DE IMPLANTACIÓN

### ✅ Antes de desplegar

- [ ] Workflow probado en La Fábrica (local)
- [ ] Exportado el .json del workflow
- [ ] Credenciales de producción preparadas
- [ ] Base de datos de producción lista (si es necesario)
- [ ] Dashboard sincronizado y funcionando

### ✅ Durante el despliegue

- [ ] Workflow importado en n8n producción
- [ ] Credenciales configuradas (producción)
- [ ] URLs actualizadas (endpoints de producción)
- [ ] Webhook path configurado correctamente
- [ ] Workflow **SIN activar** todavía

### ✅ Después del despliegue

- [ ] Dashboard sincronizado (`python backend/sync_servidor.py`)
- [ ] Workflow visible en dashboard como INACTIVO
- [ ] Activar workflow en n8n producción
- [ ] Sincronizar de nuevo
- [ ] Verificar badge ACTIVO en dashboard
- [ ] Probar webhook con curl
- [ ] Revisar logs de ejecución
- [ ] Documentar webhook en `servicios_endpoints`

---

## 19. DOCUMENTAR NUEVO WEBHOOK

Cuando despliegues un nuevo workflow con webhook:
```sql
-- Añadir el webhook a la documentación
docker exec -it config-postgres-1 psql -U rafael -d fabrica

INSERT INTO infraestructura.servicios_endpoints 
(servicio, tipo, url, metodo, descripcion, ejemplo_payload) 
VALUES 
(
  'Nombre del Servicio',
  'webhook',
  'https://n8n.ia-bybusiness.online/webhook/tu-path',
  'POST',
  'Descripción de lo que hace',
  '{"campo": "valor", "ejemplo": "payload"}'::jsonb
);
```

Ahora aparecerá en:
- Dashboard web (sección ENDPOINTS)
- API en `/api/infraestructura/endpoints`
- Documentación centralizada

---

## 20. REGLAS DE ORO PARA IMPLANTACIONES

### 🚨 NUNCA:
- ❌ Desarrollar directamente en producción
- ❌ Activar workflows sin probar
- ❌ Usar credenciales de desarrollo en producción
- ❌ Modificar workflows activos sin backup
- ❌ Olvidar sincronizar el dashboard después de cambios

### ✅ SIEMPRE:
- ✅ Desarrollar en La Fábrica primero
- ✅ Exportar el workflow completo
- ✅ Importar en producción INACTIVO
- ✅ Configurar credenciales de producción
- ✅ Sincronizar dashboard antes y después
- ✅ Probar con datos reales pero controlados
- ✅ Documentar el webhook en la BD

---

## 21. COMANDOS RÁPIDOS PARA IMPLANTACIONES
```bash
# ========== SINCRONIZACIÓN ==========
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# ========== VERIFICACIÓN ==========
# Ver workflows de producción
curl http://localhost:5000/api/infraestructura/workflows | jq '.[] | {nombre, activo}'

# Ver workflows activos con webhooks
docker exec -it config-postgres-1 psql -U rafael -d fabrica -c "
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true;
"

# ========== DASHBOARD ==========
firefox http://localhost:8000/dashboard.html

# ========== PRODUCCIÓN ==========
firefox https://n8n.ia-bybusiness.online
```

---

**Última actualización:** 27 de Febrero de 2026  
**Mantenedor:** La Fábrica IA  
**Estado:** OPERATIVO - WORKFLOWS N8N INTEGRADOS ✅

---

## 15. WORKFLOWS DE N8N - MONITORIZACIÓN

### ¿Qué se sincroniza?

El dashboard ahora muestra **todos los workflows activos de n8n en producción**:

- ✅ Nombre del workflow
- ✅ Estado (ACTIVO/INACTIVO)
- ✅ URLs de webhooks extraídos automáticamente
- ✅ Última actualización

### Consultas útiles
```sql
-- Ver workflows activos con webhooks
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true 
ORDER BY nombre;

-- Buscar un webhook específico
SELECT nombre, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE webhook_urls::text LIKE '%chat-web%';

-- Contar workflows activos vs inactivos
SELECT 
  activo,
  COUNT(*) as total
FROM infraestructura.workflows_n8n
GROUP BY activo;
```

### ¿Cómo se extraen los webhooks?

El script:
1. Consulta la API de n8n: `https://n8n.ia-bybusiness.online/api/v1/workflows`
2. Recorre cada workflow
3. Busca nodos de tipo `n8n-nodes-base.webhook`
4. Extrae el `path` del webhook
5. Construye la URL completa
6. Guarda en la BD local

### Ejemplo de uso en desarrollo
```javascript
// Consultar webhooks disponibles antes de codificar
const { rows } = await postgres.query(`
  SELECT nombre, webhook_urls 
  FROM infraestructura.workflows_n8n 
  WHERE activo = true
`);

// Usar en tu aplicación
const chatWebhook = rows.find(r => r.nombre.includes('Chat_Web'));
const webhookUrl = chatWebhook.webhook_urls[0];

console.log('Webhook a usar:', webhookUrl);
// https://n8n.ia-bybusiness.online/webhook/chat-web-router
```

---

## 16. FLUJO DE TRABAJO: DESARROLLO → PRODUCCIÓN

### 🏭 LA FÁBRICA (Local) - Entorno de Desarrollo

**n8n Local:** `http://localhost:5678`
- Aquí desarrollas y pruebas workflows
- Experimentas con lógica de negocio
- Validas que todo funcione

**Base de datos Local:** `fabrica` (PostgreSQL en `config-postgres-1`)
- Schemas de prueba
- Datos de desarrollo
- Testing de queries

### 🚀 SERVIDOR VPS (Producción) - Entorno Live

**n8n Producción:** `https://n8n.ia-bybusiness.online`
- Workflows que atienden clientes reales
- APIs y webhooks públicos
- Integraciones productivas

**Base de datos Producción:** `fabrica` (PostgreSQL en `fabrica-postgres-1`)
- Datos reales de clientes
- CRM, leads, candidatos
- Información crítica del negocio

---

## 17. PROCESO DE IMPLANTACIÓN PASO A PASO

### 🔄 Workflow: Desarrollo → Producción

**FASE 1: DESARROLLO EN LA FÁBRICA**
```bash
# 1. Crear workflow en n8n local
# Acceder a: http://localhost:5678
# Crear y probar el workflow

# 2. Validar con datos de prueba
# Ejecutar el workflow manualmente
# Verificar logs y resultados

# 3. Exportar el workflow
# En n8n: Settings → Download
# Guarda el .json del workflow
```

**FASE 2: DESPLIEGUE A PRODUCCIÓN**
```bash
# 1. Acceder a n8n de producción
firefox https://n8n.ia-bybusiness.online

# 2. Importar el workflow
# En n8n: + → Import from File
# Seleccionar el .json exportado

# 3. Configurar credenciales de producción
# Actualizar:
# - URLs de base de datos (fabrica-postgres-1)
# - API keys de producción
# - Webhooks externos

# 4. IMPORTANTE: NO activar todavía
# Dejar el workflow en estado INACTIVO

# 5. Sincronizar el dashboard
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# 6. Verificar en el dashboard local
firefox http://localhost:8000/dashboard.html
# Confirmar que el nuevo workflow aparece como INACTIVO

# 7. Activar en producción
# En n8n producción: Toggle ON
# Sincronizar de nuevo
python backend/sync_servidor.py

# 8. Verificar que está ACTIVO en el dashboard
# Badge debe aparecer verde
```

**FASE 3: VALIDACIÓN**
```bash
# 1. Probar el webhook en producción
curl -X POST https://n8n.ia-bybusiness.online/webhook/tu-nuevo-webhook \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# 2. Revisar ejecuciones en n8n
# Ir a: Executions → Ver logs

# 3. Monitorizar en el dashboard
# Verificar que no haya errores
```

---

## 18. CHECKLIST DE IMPLANTACIÓN

### ✅ Antes de desplegar

- [ ] Workflow probado en La Fábrica (local)
- [ ] Exportado el .json del workflow
- [ ] Credenciales de producción preparadas
- [ ] Base de datos de producción lista (si es necesario)
- [ ] Dashboard sincronizado y funcionando

### ✅ Durante el despliegue

- [ ] Workflow importado en n8n producción
- [ ] Credenciales configuradas (producción)
- [ ] URLs actualizadas (endpoints de producción)
- [ ] Webhook path configurado correctamente
- [ ] Workflow **SIN activar** todavía

### ✅ Después del despliegue

- [ ] Dashboard sincronizado (`python backend/sync_servidor.py`)
- [ ] Workflow visible en dashboard como INACTIVO
- [ ] Activar workflow en n8n producción
- [ ] Sincronizar de nuevo
- [ ] Verificar badge ACTIVO en dashboard
- [ ] Probar webhook con curl
- [ ] Revisar logs de ejecución
- [ ] Documentar webhook en `servicios_endpoints`

---

## 19. DOCUMENTAR NUEVO WEBHOOK

Cuando despliegues un nuevo workflow con webhook:
```sql
-- Añadir el webhook a la documentación
docker exec -it config-postgres-1 psql -U rafael -d fabrica

INSERT INTO infraestructura.servicios_endpoints 
(servicio, tipo, url, metodo, descripcion, ejemplo_payload) 
VALUES 
(
  'Nombre del Servicio',
  'webhook',
  'https://n8n.ia-bybusiness.online/webhook/tu-path',
  'POST',
  'Descripción de lo que hace',
  '{"campo": "valor", "ejemplo": "payload"}'::jsonb
);
```

Ahora aparecerá en:
- Dashboard web (sección ENDPOINTS)
- API en `/api/infraestructura/endpoints`
- Documentación centralizada

---

## 20. REGLAS DE ORO PARA IMPLANTACIONES

### 🚨 NUNCA:
- ❌ Desarrollar directamente en producción
- ❌ Activar workflows sin probar
- ❌ Usar credenciales de desarrollo en producción
- ❌ Modificar workflows activos sin backup
- ❌ Olvidar sincronizar el dashboard después de cambios

### ✅ SIEMPRE:
- ✅ Desarrollar en La Fábrica primero
- ✅ Exportar el workflow completo
- ✅ Importar en producción INACTIVO
- ✅ Configurar credenciales de producción
- ✅ Sincronizar dashboard antes y después
- ✅ Probar con datos reales pero controlados
- ✅ Documentar el webhook en la BD

---

## 21. COMANDOS RÁPIDOS PARA IMPLANTACIONES
```bash
# ========== SINCRONIZACIÓN ==========
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py

# ========== VERIFICACIÓN ==========
# Ver workflows de producción
curl http://localhost:5000/api/infraestructura/workflows | jq '.[] | {nombre, activo}'

# Ver workflows activos con webhooks
docker exec -it config-postgres-1 psql -U rafael -d fabrica -c "
SELECT nombre, activo, webhook_urls 
FROM infraestructura.workflows_n8n 
WHERE activo = true;
"

# ========== DASHBOARD ==========
firefox http://localhost:8000/dashboard.html

# ========== PRODUCCIÓN ==========
firefox https://n8n.ia-bybusiness.online
```

---

**Última actualización:** 27 de Febrero de 2026  
**Mantenedor:** La Fábrica IA  
**Estado:** OPERATIVO - WORKFLOWS N8N INTEGRADOS ✅
