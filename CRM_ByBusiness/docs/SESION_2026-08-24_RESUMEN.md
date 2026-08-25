# 📋 Resumen de la sesión 2026-08-24 (extendido)

## 🎯 Decisión estratégica

El usuario decide quedarse con **SOLO 2 informes ACTIVOS** (de los 14 implementados):
1. **#5 Estado del GBP** (`/opt/fabrica/CRM_ByBusiness/scripts/gbp/estado_gbp/estado_gbp_v2.py`) - datos de la ficha del cliente
2. **Informe Competitivo v2** (`/opt/fabrica/CRM_ByBusiness/scripts/gbp/competitive/informe_competitivo_v2.py`) - comparativa + leads de entrada

**Motivación**: simplificación, evitar saturar el OnePlus, valor práctico.

### Informes NO ACTIVOS (archivados, no se generan)

Los 12 informes restantes del catálogo están implementados pero **NO se generan automáticamente**:
- #1 Resumen ejecutivo (`resumen/resumen_ejecutivo_v2.py`)
- #3 Sentiment (`sentiment/sentiment_v2.py`)
- #4 Reviews Deep Dive (`reviews_deep/reviews_deep_v2.py`)
- #7 Benchmarking (`benchmarking/benchmarking_v2.py`)
- #8 Reporte respuesta (`reporte_respuestas/reporte_respuestas_v2.py`)
- #9 Local Rank Tracking (`rank_tracking/rank_tracking_v2.py`)
- #X1 Categorías múltiples (`categorias/categorias_v2.py`)
- #X2 Completitud (`completitud/completitud_v2.py`)
- #X3 Competidor hace bien (`competitor_strengths/competitor_strengths_v2.py`)
- #X5 Palabras clave (`keyword_analysis/keyword_analysis_v2.py`)
- #X7 Review Velocity (`review_velocity/review_velocity_v2.py`)
- #X8 GBP Engagement (`gbp_engagement/gbp_engagement_v2.py`)

Estos quedan disponibles en el código por si en el futuro el usuario quiere activarlos.

## 🏗️ Estado del sistema

### OnePlus 10T
- **Estado**: vivo pero inestable
- **Problema**: Android mata procesos en background, batería, Doze
- **Watchdog reforzado**: 3 watchdogs (ssh-watchdog, tunnel-watchdog, zombie-killer) instalados
- **Patrón**: cae cada 25-30 min tras reinicio

### VPS (lafabrica)
- **Estado**: 100% funcional, 24/7
- **Servicios**: 4 tmux (gosom-proxy, gosom-web, http-apk, ssh-tunnel-vps)
- **Infraestructura**: Docker, n8n, Postgres
- **Imagen gosom-gmaps-scraper:latest** ya descargada (2GB)

## 📊 Trabajo realizado en esta sesión

### Informes implementados (14 v2.py)
1. Base: Análisis Competitivo v2, Local SEO Audit (legacy), Leads
2. TIER 1: #5 Estado del GBP, #1 Resumen ejecutivo, #3 Sentiment, #4 Reviews Deep Dive
3. TIER 2: #7 Benchmarking, #8 Reporte respuesta, #9 Local Rank Tracking
4. Catálogo mejora: #X7 Review Velocity, #X1 Categorías múltiples, #X2 Completitud, #X8 GBP Engagement, #X3 Lo que el competidor hace bien, #X5 Palabras clave

### Scraping acumulado
- **Bloque 0-14 días**: 9 clientes scrapeados y con informes enviados
- **Bloque 14-90 días**: 25 clientes scrapeados, 22 con informes + emails enviados
- **Bloque 90-180 días**: 22 clientes scrapeados, 22 con informes + emails enviados
- **Bloque 180-365 días**: scrapeando en lotes de 15

### Emails enviados
- ~70 emails con PDFs adjuntos a rafaeldelinares@gmail.com

## 🛠️ Decisiones arquitectónicas tomadas

### 1. Scraping basado en eventos (NO rotativo)
- WF "Scrapear por Cita": 5 días antes de cada cita
- WF "Mantenimiento": semanal, X=30 días
- WF "Refresh Leads": diario, 30 días

### 2. X (días máximos sin scrape) = 30 días
- Captura ciclo mensual de reseñas
- 30 clientes/semana × 5 semanas = cubre los 193 en 1 mes

### 3. Ventana de scraping antes de cita = 5 días
- Renovación: 5 días
- Seguimiento: 7 días
- Nuevo lead: 1 día
- Urgente: manual

### 4. Tailscale como VPN (intacto)
- OnePlus con IP Tailscale 100.89.189.113
- VPS (lafabrica) con IP Tailscale 100.107.67.35

## 🐛 Bugs identificados y plan

### Bug 1: tunnel-watchdog no detecta zombies
- **Fix**: usar `nc -z 127.0.0.1 5433` además de `pgrep -f ssh`
- **Implementar v3** con 2 checks

### Bug 2: healthcheck con pg_isready (Gemini prop. 3)
- **Implementar**: `pg_isready -h 127.0.0.1 -p 5433 -t 5` cada 2 min
- Si falla → matar túnel y re-arrancar

### Bug 3: Android mata Termux (Gemini prop. 1)
- **Solución ADB** requiere acceso físico al OnePlus
- Comandos: `device_config set_sync_disabled_for_tests persistent`
- `settings put global settings_enable_monitor_phantom_procs false`
- Ajustes: Batería > No optimizar Termux

## 💰 Investigación VPS (Gemini + búsqueda web)

| Proveedor | Plan mínimo | vCPU | RAM | SSD | Transfer | Precio/mes |
|---|---|---|---|---|---|---|
| **Hetzner CX22** | Shared | 2 | 4GB | 40GB | 20TB | **~4€** |
| Hetzner CX32 | Shared | 4 | 8GB | 80GB | 20TB | ~8€ |
| Hetzner CCX13 | Dedicated | 2 | 8GB | 80GB | 20TB | ~7€ |
| DigitalOcean Basic | Dedicated | 1 | 1GB | 25GB | 1TB | $4 |
| DigitalOcean Regular | Dedicated | 1 | 2GB | 50GB | 2TB | $6 |

**Recomendación**: Hetzner CX22 (4€/mes) - mejor relación calidad/precio.

## 🔮 Planes futuros posibles

### Opción A: Mantener OnePlus (lo que el usuario prefiere)
- OnePlus scrapea cuando puede
- VPS genera PDFs y emails (ya funciona)
- Riesgo: caídas periódicas del OnePlus

### Opción B: VPS secundario como backup
- Hetzner CX22 (4€/mes)
- Docker con gosom + gms-browser
- Cuando OnePlus cae, VPS fallback
- Plan completo no implementado aún

### Opción C: Otro móvil dedicado
- Coste: 100-300€ (Xiaomi, Samsung, etc.)
- Pros: independiente de batería, con cable siempre
- Cons: setup similar al OnePlus (mismo riesgo Android)

## 📂 Archivos del proyecto

| Path | Contenido |
|---|---|
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/*/pdf/*.pdf` | PDFs generados (cientos) |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/SESION_2026-08-24_ARQUITECTURA.md` | Doc completa anterior |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/CATALOGO_INFORMES.md` | Catálogo + análisis de mejoras |
| `/opt/fabrica/CRM_ByBusiness/scripts/gbp/informe_citas_2semanas.md` | Informe maestro |
| `/tmp/start-services-v2.sh` | Watchdog reforzado v2 |

## 🎯 Decisión final del usuario

**Quedarse con 2 informes**:
1. Estado del GBP (ficha del cliente)
2. Informe Competitivo (comparativa + leads de entrada)

**No saturar el OnePlus**. Considerar:
- Otro móvil dedicado
- VPS barato (Hetzner CX22 ~4€/mes)

## 📌 Tareas pendientes

### Corto plazo
- [ ] Finalizar scrapeo 180-365 días (36 restantes)
- [ ] Finalizar scrapeo 1-3 años (~50 clientes)
- [ ] Generar PDFs y enviar emails para todos
- [ ] Implementar fix v3 del tunnel-watchdog
- [ ] Implementar healthcheck con pg_isready

### Medio plazo
- [ ] Documentar setup manual del OnePlus (ajustes batería)
- [ ] Decidir VPS secundario o segundo móvil
- [ ] Simplificar a 2 informes (quitar los 12 restantes)

### Largo plazo
- [ ] Dashboard web
- [ ] WF n8n automático "Scrapear por Cita" en VPS
- [ ] Fallback Docker en Hetzner si OnePlus cae

## 📌 Anotación del usuario (2026-08-24)

**Decisión**: OnePlus 10T sigue siendo el interlocutor con Google Maps y el hacedor de los informes.

- No VPS secundario por ahora
- No segundo móvil dedicado por ahora
- Se aceptan las caídas periódicas del OnePlus
- El VPS (lafabrica) se mantiene como generador de PDFs + emails

**Cuándo reconsiderar**:
- Si el número de scrapeos programados crece significativamente
- Si los errores por caídas manuales empiezan a ser inaceptables
- Si se requiere 24/7 sin babysitting


## 📧 Emails de leads competidores (final, 14:35)

**Resultado del re-scrapeo**: 25/45 leads competidores con email encontrado.

| Métrica | Antes | Después |
|---|---|---|
| Leads con email | 0 | **25** (56%) |
| Leads con teléfono | 42 | 42 (sin cambio) |
| Total leads competidores | 45 | 45 |

**Leads scrapeados con email** (top 10):
1. info@academiapaulamarin.com (Academia Paula Marín)
2. dublin.school@hotmail.com (Dublin School)
3. lidia@inmobiliaria.es (EBENEZER INMOBILIARIA)
4. info@gesprocasa.es (RK GESPROCASA)
5. meca@raoposiciones.com (Oppositions Rafael Alcalde)
6. agentecalma@gmail.com (Calma Inmobiliaria x2)
7. info@jbrinmobiliaria.com (JBR Inmobiliaria x2)
8. ruben.vrueda@gmail.com (Oviedo Secreto Tours)
9. vibrapisos@gmail.com (VIBRA INMOBILIARIA)
10. info@monteprincipesportcenter.com (Montepríncipe Sport)

## 🎯 CIERRE DEL CÍRCULO

**Al cerrar la sesión** (14:35 del 24-ago-2026):

- ✅ 193 clientes activos scrapeados
- ✅ 140 emails enviados con 280 PDFs del catálogo (2 informes cada uno)
- ✅ 25 leads competidores con email
- ✅ OnePlus sigue siendo el interlocutor con Google Maps
- ✅ VPS (lafabrica) sigue siendo el generador de PDFs + emails

