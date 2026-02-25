# [PRJ] CRM BYBUSINESS (PROYECTO UNO)

**Clasificación:** Proyecto / Desarrollo Activo
**Ruta de Desarrollo:** `/Desarrollos-Proyectos/CRM_ByBusiness/` [18]

## 1. ARQUITECTURA FRONTEND
Hereda el ADN de seguridad de la Fábrica. Alerta de inactividad, autenticación 2FA y diseño Navy Industrial [19-21].
*   **Torre de Control (Admin):** Interfaz con 6 módulos de supervisión ejecutiva para los administradores [20].
*   **Modo Túnel (Operador):** Interfaz restringida a 4 módulos, optimizada para alta productividad y gestión ininterrumpida de llamadas [20].

## 2. EL CEREBRO DE ASIGNACIÓN (n8n_01_distribuidor)
El flujo en n8n opera cada 30 segundos evaluando operadores libres bajo un sistema estricto de prioridades [22-24]:
1.  **Prioridad Máxima:** Si el operador tiene llamadas agendadas (Callbacks, Seguimientos), se le asignan inmediatamente, ignorando cualquier otro filtro [25, 26].
2.  **Prioridad Media (Filtros):** Si no tiene programadas, n8n cruza la tabla `operador_preferencias` con la tabla `leads` buscando clientes nuevos que coincidan con la provincia o sector exigidos por el operador [25, 27, 28].
3.  **Prioridad Baja:** Si no hay coincidencias y el operador tiene `solo_filtrados = false`, el sistema le inyecta un lead general aleatorio para mantener la cadena de producción [25, 26, 29].

## 3. TELEMETRÍA Y TRAZABILIDAD
*   Al finalizar cada llamada, la aplicación web debe disparar el webhook `registrar-resultado` en n8n [30].
*   Todo evento viaja y muere en la tabla `historial_llamadas` de Postgres, la cual es consultada siempre antes de pasarle un nuevo lead al operador para que tenga el contexto histórico [31-33].
