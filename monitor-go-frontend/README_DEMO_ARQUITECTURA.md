# 🛡️ Monitor de Reputación IA - Arquitectura & Flujo (Demo V1.2)

> **Autor & Arquitecto Principal:** Rafael De Linares  
> **Estado:** Demo Funcional con Persistencia en Base de Datos  
> **Tecnología:** React (Vite) + Go (Backend) + PostgreSQL (Persitencia) + n8n/Scraper (Motor de Datos)

---

## 1. Resumen Ejecutivo
Este proyecto es un **Demonstrador Tecnológico (MVP)** de una plataforma de auditoría reputacional para negocios. 

A diferencia de un scraper tradicional, esta solución implementa una **Arquitectura de Niveles y Persistencia**, diseñada para simular una experiencia de usuario "Zero-Latency" propia de un producto SaaS comercial. 

El sistema no solo captura datos, sino que los "recuerda" (persistencia en disco) y los presenta mediante una interfaz modular de alto impacto visual.

---

## 2. Arquitectura del Sistema

### A. Frontend (React Modular)
El frontend ha sido refactorizado para abandonar el diseño monolítico y adoptar una estructura de **Módulos Independientes**:
*   **Header/Footer Blindados:** Componentes estáticos con protección de autoría.
*   **Workspace Dinámico:** El corazón de la app. Cambia de estado "Idle" (Motor Neural) a "Resultados" (Grid/Detalle) sin recargas.
*   **Gestión de Estados:** Mantiene la coherencia entre la búsqueda rápida y la auditoría profunda.
*   **UX Premium:** Animaciones, gradientes y feedback visual instantáneo (spinners, transiciones).

### B. Backend (Go Inteligente + PostgreSQL)
El servicio en Go (`:8092`) ha evolucionado de un simple router a un **Orquestador Inteligente**:
*   **Enrutamiento Dual (Nano/Heavy):** Analiza la complejidad de cada petición (`depth`).
    *   **Tráfico Ligero (`depth <= 3`)**: Se envía al **Scraper Nano** (:8090). Respuesta en milisegundos.
    *   **Tráfico Pesado (`depth > 3`)**: Se envía al **Scraper Heavy** (:8091). Emulación humana completa.
*   **Persistencia Híbrida (`db.go`):**  Conecta con PostgreSQL (`crm_bybusiness`) y gestiona la tabla `scraped_cache` para evitar re-scrapeos innecesarios.

### C. Infraestructura de Scraping Dual (Docker)
Abandonamos el contenedor monolítico por una estrategia de microservicios especializados:
*   **`scraper-nano` (Puerto 8090):** Optimizado para velocidad. Bloquea recursos pesados (imágenes, fuentes). Ideal para listados y verificaciones rápidas ("¿Existe este negocio?").
*   **`scraper-heavy` (Puerto 8091):** Navegador completo con emulación humana. Descarga reseñas, analiza sentimientos y comportamiento. Ideal para auditorías profundas.

---

## 3. Flujo de Datos "Inteligente"

El sistema implementa una lógica de decisión en tiempo real:

### Paso 1: Búsqueda & Caché (Nivel 0)
1.  El usuario busca un negocio (ej: "Peluquería Loli").
2.  El Backend consulta **inmediatamente** la base de datos PostgreSQL.
3.  **Si existe:** Devuelve el JSON guardado. **(Experiencia Zero-Latency)**.

### Paso 2: Orquestación & Scraping (Nivel 1-3)
1.  **Si NO existe**, el backend evalúa la petición:
    *   **¿Es un listado simple?** -> Llama al API del **Nano Scraper**.
    *   **¿Es una auditoría completa?** -> Llama al API del **Heavy Scraper**.
2.  Inicia el trabajo en el contenedor correspondiente y realiza polling hasta completar.

### Paso 3: Persistencia & Entrega
1.  Una vez obtenidos los datos frescos...
2.  **SE GRABAN EN DISCO:** Se hace un `UPSERT` en PostgreSQL para futuras consultas.
3.  Se sirven los datos al Frontend.

---

## 4. Trabajo Realizado y Hitos (Última Sesión)

### ✅ Arquitectura Dual (Nano vs Heavy)
*   **Microservicios Docker:** Separación exitosa de `scraper-nano` y `scraper-heavy` en contenedores distintos con asignación de recursos optimizada.
*   **Backend Go Inteligente:** Implementación de lógica de enrutamiento basada en profundidad (`depth`).
*   **Pruebas de Carga:** Verificación de que el tráfico ligero no bloquea al pesado y viceversa.

### ✅ Refactorización UI/UX
*   **Limpieza Visual:** Eliminación de barras negras inferiores obsoletas.
*   **Navegación Coherente:** Unificación de experiencia en el Workspace.

### ✅ Hardening del Backend
*   **Persistencia Real:** Migración completa a PostgreSQL.
*   **Resiliencia:** Manejo robusto de timeouts y errores en ambos motores de scraping.

---

### ✅ Precarga Oportunista (Background Loading)
*   **Backend Híbrido:** Implementación de hilos (Goroutines) en `main.go` para procesar scrapings pesados en segundo plano sin bloquear la UI.
*   **Frontend Predictivo:** Cuando el usuario visualiza una lista de resultados, el sistema dispara automáticamente la captura de datos detallados para los 3 primeros resultados.
*   **Resultado:** Al hacer clic en una ficha, la información aparece instantáneamente porque ya ha sido procesada y persistida silenciosamente.

---

## 5. Roadmap Futuro (Siguientes Pasos)

El sistema está listo para escalar a producción. Siguientes iteraciones recomendadas:
1.  **Refinamiento de Caché:** Implementar caducidad automática de datos (TTL) en PostgreSQL (ej: refrescar datos > 30 días).
2.  **Dashboard de Analítica:** Visualizar métricas globales de reputación agregada.
3.  **Integración con CRM:** Volcar los leads capturados directamente en la tabla `leads` del CRM.

---

**© 2026 Rafael De Linares - IA Factory Development**
