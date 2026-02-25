# [SYS] PROYECTOS Y LÍNEA DE MONTAJE

**Clasificación:** Sistema / Operaciones Activas

## 1. CRM BYBUSINESS (Motor de Asignación)
* Flujo de n8n escanea la base de datos cada 30 segundos.
* **Prioridad 1:** Llamadas Programadas (van directas a su operador).
* **Prioridad 2:** Leads Nuevos Filtrados (coincidencia de provincia/sector).
* **Prioridad 3:** Leads Generales (para operadores sin filtros restrictivos).

## 2. MONITOR DE REPUTACIÓN V2 (Operación Local Exclusiva)
* Ejecución aislada en La Fábrica local por alto consumo de RAM (Headless Browsers).
* **Microservicios (Estándar Lego):**
  1. Motor Go (Orquestador - Puerto 8092).
  2. Scraper NANO v2 (Rápido - Puerto 8090).
  3. Scraper HEAVY v2 (Profundo - Puerto 8091).
  4. DB de Caché (Puerto 5435).
* **Fail-Safe:** Si Google bloquea la demo, se activa el generador algorítmico de datos idénticos para salvar la presentación comercial.

## 3. ARCHIVO I+D (Congelados)
* **Experimento TTS (Radio Fábrica):** Prototipo funcional validado usando motor ligero `Piper` y Polling (Flask). Queda documentado y paralizado.
