# Informe de Consolidación: Arquitectura Dual de Scraping Inteligente

**Fecha:** 13 de Febrero de 2026
**Proyecto:** Monitor de Reputación con IA - Motor Dual Go/Node.js
**Estado:** Implementación Exitosa y Validada en Producción Local

---

## 1. Resumen Ejecutivo

Se ha completado la refactorización del motor de scraping monolítico hacia una **arquitectura de microservicios dual**, orquestada por un backend central en **Go**. Esta arquitectura permite un equilibrio óptimo entre **velocidad/coste** (Scraper Nano) y **profundidad/fiabilidad** (Scraper Heavy), gestionando inteligentemente los recursos del sistema mediante Docker.

El objetivo de este documento es proporcionar una radiografía técnica completa para facilitar la consolidación, mantenimiento y futura escalabilidad del sistema.

---

## 2. Diagrama Lógico de Arquitectura

```mermaid
graph TD
    User[Cliente Frontend / n8n] -->|Webhook Request| GoServer[Orquestador Backend (Go :8092)]
    
    GoServer -->|Decisión de Enrutamiento| Router{Evaluador de Profundidad}
    
    subgraph "Docker Cluster - Network Privada"
        Router -->|Depth <= 3| Nano[Scraper Nano (Node :8090)]
        Router -->|Depth > 3| Heavy[Scraper Heavy (Node :8091)]
        
        Nano -->|Bloqueo Recursos| G1[Google Maps (Fast)]
        Heavy -->|Emulación Humana| G2[Google Maps (Deep)]
    end
    
    Nano -->|JSON Result| GoServer
    Heavy -->|CSV/JSON Result| GoServer
    
    GoServer -->|Upsert/Cache| PG[(PostgreSQL)]
```

---

## 3. Especificación de Componentes

### A. El Orquestador (Backend en Go)
**Rol:** Cerebro central que recibe peticiones y decide qué recurso utilizar.
- **Archivo Clave:** `scraper_service.go`
- **Lógica de Enrutamiento:**
  - Evalúa el parámetro `depth` (profundidad de escaneo).
  - **Ruta Rápida (Nano):** Si `depth <= 3`, envía la petición a `http://scraper-nano:8080`.
  - **Ruta Profunda (Heavy):** Si `depth > 3`, envía la petición a `http://scraper-heavy:8081`.
- **Gestión de Errores:** Implementa polling de estado y manejo de timeouts específicos (más cortos para Nano, extendidos para Heavy).

### B. Microservicio: Scraper NANO ⚡
**Rol:** Velocidad y eficiencia. Escaneos rápidos de existencia y datos básicos.
- **Tecnología:** Node.js + Playwright (Headless).
- **Puerto Docker:** `8090` (mapeado a interno `8080`).
- **Optimizaciones Clave (`scraper-nano.js`):**
  - **Bloqueo de Recursos:** Intercepta y aborta cargas de imágenes, fuentes, media y CSS (`**/*.{png,jpg...}`).
  - **Contexto Ligero:** Sin emulación de geolocalización compleja ni plugins.
  - **Timeouts Agresivos:** Falla rápido si no encuentra datos (15s).
- **Consumo:** Extremadamente bajo (~0.5 CPU, <256MB RAM).

### C. Microservicio: Scraper HEAVY 🛡️
**Rol:** Indetectabilidad y profundidad. Extracción de reseñas completas y scroll infinito.
- **Tecnología:** Node.js + Playwright (Stealth).
- **Puerto Docker:** `8091` (mapeado a interno `8081`).
- **Características Clave (`scraper-heavy.js`):**
  - **Emulación Humana:** Movimientos de ratón, delays aleatorios entre acciones.
  - **Carga Completa:** Permite carga de recursos visuales para evitar detección por comportamiento "bot".
  - **Persistencia:** Capacidad para extraer cientos de reseñas mediante paginación segura.
- **Consumo:** Alto (~1.5 CPU, 1.5GB RAM reservada).

### D. Infraestructura (Docker Compose)
**Rol:** Aislamiento y gestión de recursos.
- **Servicios Definidos:**
  1.  `scraper-nano`: Limitado a 0.5 CPUs y 256MB RAM. Reinicio automático.
  2.  `scraper-heavy`: Limitado a 1.5 CPUs y 1.5GB RAM. 
  3.  `postgres-db-v2`: Persistencia de datos compartida.
- **Red:** `fabrica_network` interna para comunicación segura entre contenedores.

### E. Integración con n8n
**Rol:** Flujo de trabajo visual y conexión con usuario final.
- **Lógica Dinámica:** Los nodos HTTP Request ahora utilizan expresiones para determinar el puerto destino dinámicamente:
  `{{ $json.query.depth > 3 ? '8091' : '8090' }}`
- Esto asegura que n8n respete la lógica de arquitectura sin necesidad de "hardcodear" endpoints separados.

---

## 4. Recursos Modificados y Scripts

### Directorio: `/scrapers-playwright/`
1.  **`server.js`**: Servidor Express unificado que carga dinámicamente la clase `Nano` o `Heavy` según configuración, pero expone la misma API compatible.
2.  **`scraper-base.js`**: Clase padre con la lógica de navegación común (DRY - Don't Repeat Yourself).
3.  **`scraper-nano.js`**: Hereda de Base y aplica la capa de bloqueo de red.
4.  **`scraper-heavy.js`**: Hereda de Base y aplica la capa de simulación humana.
5.  **`Dockerfile.nano` vs `Dockerfile.heavy`**:
    - `Nano`: `npm install --only=production`, `ENV SCRAPER_TYPE=nano`.
    - `Heavy`: `ENV SCRAPER_TYPE=heavy`, configuración de librerías extra si necesario.

### Configuración Go
- **`config.go`**: Constantes separadas para `NanoScraperURL` y `HeavyScraperURL`.
- **`models.go`**: Estructuras unificadas para que el frontend no note la diferencia entre un resultado "Nano" y uno "Heavy".

---

## 5. Pruebas de Validación

Se realizaron las siguientes pruebas exitosas:
1.  **Prueba Nano:** Query "Prueba Nano Scraper V2" (Depth 2).
    - **Resultado:** Ejecución rápida, bloqueo de recursos verificado en logs, respuesta correcta en ~70s (incluyendo esperas de seguridad).
2.  **Prueba Heavy:** Query "Restaurante Madrid Centro" (Depth 10).
    - **Resultado:** Ejecución profunda, detección de lista de resultados, extracción de 10 items, simulación humana verificada en logs. Tiempo respuesta: 8.6s (cache hit/optimizado).

## 6. Siguientes Pasos Sugeridos para Consolidación

1.  **Limpieza de Código:** Eliminar código comentado antiguo en `scraper-base.js` relacionado con versiones monolíticas anteriores.
2.  **Optimización de Logs:** Estandarizar el formato de logs entre Go y Node.js para facilitar el debugging centralizado.
3.  **Refinar Tiempos de Espera:** Ajustar los `Wait` en n8n para ser más reactivos en lugar de fijos (usar webhooks de respuesta si es posible en el futuro).

---
*Documento generado automáticamente por el Asistente de Fábrica IA.*
