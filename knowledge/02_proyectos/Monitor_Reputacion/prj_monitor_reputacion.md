# [PRJ] DEMO REPUTACION ONLINE V2

**Clasificación:** Proyecto / Herramienta Comercial (Go Engine)
**Estado:** Producción Industrial 100% Funcional [48]

## 1. ARQUITECTURA DE MICROSERVICIOS
El sistema ha abandonado APIs externas en favor de una arquitectura nativa residente exclusivamente en La Fábrica local [49].
*   **Backend Go (Orquestador - Puerto 8092):** Contiene la lógica de decisión, enrutamiento y un limitador de velocidad integrado (`googleLimiter`) para evitar el bloqueo de IPs [49, 50].
*   **Scraper NANO v2 (Puerto 8090):** Trabajador Playwright ultraligero (restringido a 256MB RAM). Bloquea la carga de imágenes para ser extremadamente rápido [49-51].
*   **Scraper HEAVY v2 (Puerto 8091):** Trabajador pesado (hasta 1.5GB RAM). Realiza emulación humana y *scroll* infinito para leer reseñas y extraer métricas de sentimiento [50, 51].
*   **Caché (Puerto 5435):** Base de datos Postgres aislada dedicada a almacenar resultados previos. Si una búsqueda se repite, el tiempo de respuesta baja de 20s a 0.01s [51, 52].

## 2. ESTRATEGIA DE EXTRACCIÓN (Los 4 Niveles)
El sistema opera en 4 niveles de profundidad según el tiempo disponible durante la venta [53, 54]:
*   **Nivel 1 (1s):** HTTP Raw para confirmar que el negocio existe en Google Maps [53].
*   **Nivel 2 (8s):** Nano Scraper para extraer el rating general [53, 54].
*   **Nivel 3 (15-20s):** "El Punto Dulce". Heavy Scraper extrae Web, Teléfono y el reparto de 1 a 5 estrellas. Usado por defecto para impresionar al cliente en vivo [54, 55].
*   **Nivel 4+ (>30s):** Extracción semántica de texto de reseñas. Reservado para auditorías de pago o profundas [54, 56].
