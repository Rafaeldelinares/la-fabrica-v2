
# Plan de Ejecución Inmediata: Consolidación Pragmática del Scraping

Este plan está diseñado para implementarse en **una tarde (aprox. 4-5 horas)**, sin añadir nuevos servicios ni consumir más recursos, pero elevando drásticamente la fiabilidad del sistema.

---

## 📅 Hito 1: Higiene y Configuración (Base Sólida)
**Objetivo:** Sacar credenciales del código y preparar el terreno.
- [x] **1.1. Seguridad con `.env`:**
    - Crear archivo `.env` oficial (sin subir a git).
    - Migrar todas las constantes hardcodeadas (URLs, passwords de DB) a variables de entorno en `docker-compose.yml` y `config.go`.
- [x] **1.2. Timeouts Hardcodeados:**
    - Establecer timeouts explícitos y seguros en Go:
        - `NANO_TIMEOUT=2m` (Si tarda más es un error).
        - `HEAVY_TIMEOUT=10m` (Damos margen para simulación humana).

## 🛡️ Hito 2: Tolerancia a Fallos (El Núcleo de la Robustez)
**Objetivo:** Que el usuario nunca vea un error "500" si se puede evitar.
- [x] **2.1. Lógica `Retry/Fallback` en Go:**
    - Modificar `scraper_service.go` para implementar la estrategia:
        1.  **Intento 1:** Ejecutar Scraper Óptimo (Nano por defecto).
        2.  **Fallo de Nano:** Detectar error y re-enrutar automáticamente a **Heavy**.
        3.  **Fallo Total:** Si ambos fallan, consultar caché PostgreSQL (datos < 7 días).
        4.  **Error Final:** Si no hay caché, devolver error limpio y estructurado.
- [x] **2.2. Rate Limiter "Anti-Ban":**
    - Implementar un contador simple en memoria (Go `rate/limiter`) para limitar las peticiones a Google a **10 req/min** (ajustable).
    - Si se supera, encolar/esperar en lugar de saturar la IP.

## 📊 Hito 3: Visibilidad (Saber qué pasa sin adivinar)
**Objetivo:** Logs útiles que se expliquen solos.
- [x] **3.1. Logging Estructurado (JSON):**
    - Reemplazar `fmt.Println` por un logger estructurado (`logrus`).
    - Configurar logs en JSON para que sean fáciles de filtrar (ej: `{"level":"error", "component":"nano", "msg":"timeout"}`).
    - Configurar rotación de logs automática (para no llenar el disco).
- [x] **3.2. Endpoints de Salud (`/health`):**
    - Crear rutas `/health` en Go y Node.js que respondan `200 OK` solo si realmente pueden navegar/conectar a DB.

## 🧪 Hito 4: Validación y Entrega
**Objetivo:** Confirmar que funciona como se espera.
- [x] **4.1. Pruebas de Fuego:**
    - Simular caída de Nano Scraper y verificar que el sistema salta al Heavy sin intervención.
    - Test de estrés ligero (5 peticiones seguidas) para ver al Rate Limiter espaciarlas.
- [x] **4.2. Documentación Final:**
    - Actualizar `README.md` con las nuevas variables de entorno y el endpoint `/health`.

---

### 🚀 ¿Por dónde empezamos?
Recomiendo ejecutar el **Hito 1 (Configuración)** y **Hito 2 (Retry Logic)** inmediatamente. Son los que aportan el 80% del valor de robustez.
