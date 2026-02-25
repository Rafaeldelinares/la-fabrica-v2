# [SYS] ARQUITECTURA DE DATOS Y ORQUESTACIÓN

**Clasificación:** Sistema / Bases de Datos

## 1. EL ORQUESTADOR COMO LEY SUPREMA (Zero Trust)
* **n8n como BFF:** El Frontend NUNCA ataca directamente a las bases de datos. n8n (Puerto 5678) recibe las peticiones y orquesta las conexiones.
* **Herramientas de Agente:** Se prioriza n8n sobre Prisma MCP. La IA alterará estructuras vía n8n para mantener trazabilidad.

## 2. TOPOLOGÍA DE DATOS LOCAL (Bases de Datos Físicas)
**A. DB: fabrica (Cerebro del Sistema)**
* `fabrica_core`: Bitácora, métricas, normas y usuarios.
* `infraestructura`: Contenedores y proyectos.
* `public`: Uso exclusivo para las tablas del motor interno de n8n.

**B. DB: crm_bybusiness (Motor Comercial)**
* `crm_bybusiness`: Leads descartados, chat, pagos, productos y tabla general de ventas.
* `marketing`: Leads entrantes cualificados.
* `operaciones`: Tablas de barrido.
* `rrhh`: Candidatos y procesos.
* `social`: Cola de posts y DMs.

**C. DB: chathub_bybusiness (Central IA)**
* `chathub`: Configuración Waha/WhatsApp.
* `chathub_bybusiness`: Agentes IA y sesiones.

## 3. EL REFLEJO DE PRODUCCIÓN (VPS)
* Opera bajo Zero Trust. Recibe webhooks públicos y los vuelca hacia La Fábrica local para su procesamiento.
