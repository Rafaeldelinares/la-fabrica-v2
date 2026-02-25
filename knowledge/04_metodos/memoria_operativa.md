# [SYS] MEMORIA OPERATIVA Y METODOLOGÍA DE DESARROLLO

**Clasificación:** Sistema / Desarrollo e Inteligencia

## 1. METODOLOGÍA FRONTEND
* **Stack:** React 19 + Vite + TailwindCSS V4.
* **Regla de Simetría:** 1 Tarjeta Visual = 1 Flujo n8n = 1 Tabla SQL. No se permiten diseños vacíos ni componentes desconectados.
* **UX de Ingeniería:** Priorizar navegación por teclado. Se prohíben los spinners de carga; usar Skeleton Screens en su lugar.

## 2. ESCUADRÓN DE SUBAGENTES INTERNOS (Roles IA)
* **Ingeniero de Flujos (n8n Architect):** Diseño de workflows JSON en n8n conectando frontend y backend. Nomenclatura obligatoria: `[PROYECTO]_[MODULO]_[ACCION]`.
* **Arquitecto de Datos:** Gestión de esquemas PostgreSQL respetando el aislamiento de la Constitución.
* **Frontend Elite:** Refactorización automática de componentes visuales de más de 150 líneas.
* **Piloto (QA):** Navegación simulada de usuario. **Regla TTS:** Si encuentra un error < 400 caracteres, ejecuta alerta de voz por Radio Fábrica sin pedir permiso.
* **Sleeper (Implantador):** Bloqueado por defecto. Solo sube código a producción VPS al escuchar *"AUTORIZO DESPLIEGUE FINAL"*.
