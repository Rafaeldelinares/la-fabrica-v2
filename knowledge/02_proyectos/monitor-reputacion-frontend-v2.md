# [PRJ] MONITOR REPUTACIÓN V2 — FRONTEND (Reporte Antigravity)

**Clasificación:** Proyecto / Frontend React
**Estado:** ✅ COMPLETADO — Entregado por Antigravity (2026-03-01)
**Ruta del proyecto:** `/opt/fabrica/monitor-reputacion-frontend/`
**Backend dependiente:** Motor Go en `http://localhost:8092`
**Docs backend:** `monitor-reputacion-v2.md`

---

## 1. STACK TECNOLÓGICO

| Tecnología | Versión | Rol |
|---|---|---|
| **React** | 19 + StrictMode | Framework UI |
| **Vite** | Latest | Bundler y dev server |
| **Tailwind CSS** | Latest | Sistema de estilos |
| **Recharts** | Latest | Gráfica de distribución de estrellas |
| **Lucide React** | Latest | Iconografía |
| **Fetch API** | Nativa | Integración con Motor Go :8092 |
| **localStorage** | Nativo | Historial de búsquedas + cookies |

---

## 2. ESTRUCTURA DE ARCHIVOS

```
/opt/fabrica/monitor-reputacion-frontend/
│
├── package.json              — Dependencias (React, Vite, Recharts, Lucide)
├── vite.config.js            — Configuración del bundler
├── tailwind.config.js        — Tema: colores, sombras, radius 32px, animaciones fade-in
├── postcss.config.js         — Procesador de Tailwind
├── index.html                — Punto de entrada HTML
│
└── src/
    ├── main.jsx              — Renderizado principal con React 19 StrictMode
    ├── App.jsx               — Componente raíz: estado global (búsqueda, paginación, navegación)
    ├── index.css             — Utilidades base: @apply text-slate-900, .progress-bar-fill, animaciones
    │
    ├── services/
    │   └── api.js            — Fetch contra http://localhost:8092 + precarga inteligente (preload)
    │
    ├── components/
    │   ├── layout/
    │   │   ├── Header.jsx    — Navbar estático con logo IA y botón de contacto
    │   │   ├── Workspace.jsx — Contenedor SPA: h-screen, overflow-hidden, scroll solo en paneles
    │   │   └── Footer.jsx    — Pie de página estático minimizado
    │   │
    │   ├── business/
    │   │   ├── CoincidenceCard.jsx  — Tarjetas de grid con hover animado (sombra + radio)
    │   │   ├── AuditReport.jsx      — Dashboard detallado al abrir un negocio + botón "Volver"
    │   │   ├── StatsGrid.jsx        — 4 métricas: Rating, Reseñas, Alarmas, Ranking Estimado
    │   │   ├── StarDistribution.jsx — Gráfica de barras Recharts (1★ a 5★)
    │   │   └── SentimentModule.jsx  — Análisis por áreas de atención con cambio de colores
    │   │
    │   └── modals/
    │       ├── ContactModal.jsx — Modal de contacto con validación por Captcha dinámico
    │       ├── ATSModal.jsx     — Formulario "Trabaja con Nosotros"
    │       └── LegalModal.jsx   — Aviso legal con scroll interno (no global)
```

---

## 3. FUNCIONALIDADES IMPLEMENTADAS

### Búsqueda y conexión con backend
- Conexión viva con Motor Go `:8092` mediante `fetch` POST
- Payload exacto: `{ query: { q, depth, preload } }`
- Funciona tanto para listados de negocios como para resultados individuales

### Precarga inteligente (background fetch)
- Si la respuesta es de tipo `list`, el App ejecuta `fetch` silenciosos en background
- Precarga los 3 primeros resultados a `depth: 3` antes de que el usuario los abra
- Reduce la espera en drill-down de ~15-20s a respuesta instantánea desde caché

### Navegación drill-down / back-navigation
- Entrar a vista detalle (`AuditReport`) sin recarga de página
- Botón "Volver a Resultados" (`ArrowLeft` de Lucide) con memoria de posición y lista previa

### Paginación dinámica
- 6 tarjetas por página
- Control `PÁGINA X DE Y` con corte y renderizado automático

### Layout SPA sin scroll global
- `h-screen` + `overflow-hidden` en el contenedor principal
- Header y Footer comprimidos para máximo espacio útil
- Scroll solo dentro de los paneles de datos

### UX y animaciones
- Estado de carga: spinner + animaciones `pulse` durante el scraping
- Tarjetas con animación `bounce` / `slide` progresivo al cargar
- Contorno turquesa en hover de `CoincidenceCard`
- Transiciones `fade-in` configuradas en `tailwind.config.js`

### Persistencia en sesión (localStorage)
- Historial de las últimas 5 búsquedas por sesión
- Banner de cookies con validación (bloquea mensaje final hasta aceptación)

### Indicador de tiempo de respuesta
- Caja en esquina mostrando "Tiempo IA: XX s"

---

## 4. INTEGRACIÓN CON BACKEND

**Endpoint principal:**
```
POST http://localhost:8092/webhook/scraper/go
Body: { "query": { "q": "ferreterías Málaga", "depth": 3, "preload": false } }
```

**Lógica en `src/services/api.js`:**
- Gestión de estados: loading / success / error
- Precarga automática de los top-3 resultados
- Timeout configurable para scrapings lentos (nivel 3: ~15-20s)

---

## 5. COMANDOS DE GESTIÓN

```bash
# Entrar al proyecto
cd /opt/fabrica/monitor-reputacion-frontend

# Instalar dependencias (primera vez)
npm install

# Arrancar entorno de desarrollo (auto-refresco Vite)
npm run dev
# → http://localhost:5173

# Compilar para producción (genera /dist/)
npm run build
```

---

## 6. AJUSTES PENDIENTES (post-entrega)

Ver también: `/opt/fabrica/knowledge/TAREAS_PENDIENTES.md`

| Ajuste | Prioridad | Descripción |
|---|---|---|
| **Exportar PDF** | Media | `AuditReport` tiene botón "Exportar PDF Pro" sin lógica. Requiere `jspdf` + `html2canvas` o endpoint backend que devuelva PDF |
| **Tiempo de respuesta en caché** | Baja | El indicador "Tiempo IA: XXs" muestra <0.5s cuando hay caché, lo que puede parecer un fallo. Añadir lógica: si `cached=true`, mostrar "CACHÉ" en lugar del tiempo |
| **Webhooks n8n** | Media | Si los scraping provienen de webhook n8n con cargas lentas, valorar WebSocket para notificar al frontend en lugar de polling |
| **React Router DOM** | Baja | Actualmente toda la navegación es condicional en `App.jsx` (SPA puro). Para URLs absolutas (`/auditoria/ferreteria-malaga`), integrar React Router |
| **Formularios → n8n** | Media | Los modales `ContactModal.jsx` y `ATSModal.jsx` no envían datos todavía. Conectar via webhook n8n a CRM |

---

## 7. HISTORIAL

| Fecha | Evento |
|---|---|
| 2026-03-01 | Prompt enviado a Antigravity con spec completa (Navy Industrial, :8092, Recharts) |
| 2026-03-01 | Antigravity entrega frontend completo — todas las funcionalidades del prompt implementadas |
| 2026-03-01 | Ajustes pendientes identificados: PDF, tiempo caché, formularios n8n |
