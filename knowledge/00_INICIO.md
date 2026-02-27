# 🏭 LA FÁBRICA IA — ÍNDICE MAESTRO

**Versión:** 1.1
**Última actualización:** 2026-02-26
**Estado:** Operativo

---

## 📍 NAVEGACIÓN RÁPIDA

### ARQUITECTURA CORPORATIVA
- **Constitución Maestra**: `01_arquitectura/constitucion_maestra.md`
- **Arquitectura de Datos**: `01_arquitectura/arquitectura_datos.md`
- **Línea de Montaje**: `01_arquitectura/linea_montaje.md`
- **Manifiesto**: `01_arquitectura/manifiesto_fabrica.md`
- **Protocolos IA**: `01_arquitectura/protocolos_ia.md`

### PROYECTOS ACTIVOS
- **CRM ByBusiness**: `02_proyectos/CRM_ByBusiness/`
- **Escaparate ES**: `02_proyectos/Escaparate_ES/`
- **Escaparate COM**: `02_proyectos/Escaparate_COM/`
- **Monitor Reputación**: `02_proyectos/Monitor_Reputacion/`

### ESTÁNDARES
- **Navy Industrial**: `03_estandares/navy_industrial.md`

### MÉTODOS Y FLUJOS
- **Memoria Operativa**: `04_metodos/memoria_operativa.md`

### SKILLS Y MCP
- **Antigravity Integration**: `05_skills_y_mcp/ANTIGRAVITY_KIT_INTEGRATION.md`
- **MCP Config**: `05_skills_y_mcp/mcp_config.json`
- **MCP n8n**: `05_skills_y_mcp/mcp-n8n/`
- **MCP PostgreSQL**: `05_skills_y_mcp/mcp-postgres/`
- **Agents**: `05_skills_y_mcp/agents/`
- **Skills**: `05_skills_y_mcp/skills/`
- **Workflows**: `05_skills_y_mcp/workflows/`

### INFRAESTRUCTURA ⚠️ CRÍTICO
- **Despliegue Fábrica**: `06_infraestructura/sys_despliegue_fabrica_nueva.md`
- **🆕 Dashboard Infraestructura**: `06_infraestructura/sys_infraestructura_dashboard.md` ← **VITAL PARA DESARROLLO Y DEPLOY**

---

## 🎯 SISTEMA CRÍTICO: INFRAESTRUCTURA DASHBOARD

**⚠️ ATENCIÓN: Sistema esencial para el funcionamiento diario de La Fábrica**

### ¿Qué es?
Sistema de monitorización y documentación del servidor VPS que proporciona:
- 📊 Estado en tiempo real de todos los servicios
- 🔗 URLs exactas de webhooks de n8n y APIs
- 💾 Métricas de recursos (RAM, disco, CPU)
- 📦 Inventario de contenedores Docker
- 🗄️ Base de conocimiento para desarrollo y deploy

### Acceso inmediato:
- **Dashboard:** http://localhost:8000/dashboard.html
- **API:** http://localhost:5000/api/contenedores
- **Documentación:** `06_infraestructura/sys_infraestructura_dashboard.md`

### Cuándo usarlo:
- ✅ **Al desarrollar:** Consulta endpoints antes de codificar
- ✅ **Antes de deploy:** Verifica estado del servidor
- ✅ **Al documentar:** Añade nuevos webhooks a la BD
- ✅ **Al debuggear:** Verifica que servicios estén UP

---

## 📊 QUICK START - NUEVO DESARROLLADOR

### 1. Consultar estado del servidor
```bash
firefox http://localhost:8000/dashboard.html
```

### 2. Ver endpoints disponibles
```bash
curl http://localhost:5000/api/endpoints
```

### 3. Consultar base de datos
```bash
docker exec -it config-postgres-1 psql -U rafael -d fabrica
\c fabrica
\dn
SELECT * FROM infraestructura.inventario_contenedores;
```

### 4. Sincronizar datos del servidor
```bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py
```

---

## 🗂️ ESTRUCTURA DE CONOCIMIENTO
```
/opt/fabrica/knowledge/
├── 00_INICIO.md                    ← Estás aquí
├── 01_arquitectura/                ← Leyes y fundamentos
├── 02_proyectos/                   ← Proyectos activos
├── 03_estandares/                  ← Guías de estilo
├── 04_metodos/                     ← Metodologías
├── 05_skills_y_mcp/                ← Skills y agentes
└── 06_infraestructura/             ← Sistemas operativos
    ├── sys_despliegue_fabrica_nueva.md
    └── sys_infraestructura_dashboard.md  ← NUEVO Y CRÍTICO
```

---

## 🔄 FLUJO DE TRABAJO ESTÁNDAR

### Para desarrollar una nueva aplicación:

1. **Consultar infraestructura**
   - Abrir dashboard de infraestructura
   - Ver qué endpoints están disponibles
   - Verificar recursos del servidor

2. **Consultar arquitectura**
   - Leer `01_arquitectura/arquitectura_datos.md`
   - Leer `01_arquitectura/constitucion_maestra.md`

3. **Consultar proyecto similar**
   - Ver `02_proyectos/` para referencia
   - Seguir estructura establecida

4. **Desarrollar siguiendo estándares**
   - Navy Industrial: `03_estandares/navy_industrial.md`
   - Skills: `05_skills_y_mcp/skills/`

5. **Deploy**
   - Verificar servidor con dashboard
   - Seguir `06_infraestructura/sys_despliegue_fabrica_nueva.md`

---

## 🚨 SISTEMAS CRÍTICOS

### Nivel 1 - ESENCIAL (Sin estos, nada funciona)
- ✅ PostgreSQL (`config-postgres-1`)
- ✅ n8n (Orquestador BFF)
- ✅ Traefik (Proxy)
- ✅ **Dashboard Infraestructura** (Conocimiento del sistema)

### Nivel 2 - IMPORTANTE (Funcionalidad core)
- n8n workflows activos
- WAHA (WhatsApp API)
- Portainer (Gestión Docker)

### Nivel 3 - OPERATIVO (Proyectos específicos)
- Monitor Reputación
- CRM ByBusiness
- Escaparates web

---

## 📞 CONTACTO Y SOPORTE

**Administrador del Sistema:** rafael  
**Base de Datos:** `fabrica` (PostgreSQL)  
**Servidor VPS:** 72.60.191.179  

**Accesos críticos:**
- Portainer: https://portainer.ia-bybusiness.online
- n8n: https://n8n.ia-bybusiness.online
- Dashboard Local: http://localhost:8000

---

## 📝 CHANGELOG

### 2026-02-26
- ✅ Sistema de Infraestructura Dashboard operativo
- ✅ Base de datos `infraestructura` schema creado
- ✅ Servicios systemd configurados (arranque automático)
- ✅ Sincronización automática cada hora
- ✅ Documentación completa añadida

### 2025-02-25
- Inicialización del sistema de conocimiento
- Estructura base de carpetas
- Documentación inicial de arquitectura

---

**🏭 La Fábrica IA - Donde el software se forja con precisión industrial**
