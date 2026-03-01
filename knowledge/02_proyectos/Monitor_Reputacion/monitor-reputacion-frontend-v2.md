# [PRJ] MONITOR REPUTACION — FRONTEND V2

**Clasificación:** Proyecto / Frontend React
**Estado:** 🔨 EN DESARROLLO — Antigravity ejecutándolo (sesión 2026-03-01)
**Dependencia:** Motor Go operativo en `:8092`
**Repo:** `/opt/fabrica/monitor-reputacion-frontend/`

---

## 1. STACK TÉCNICO

| Tecnología | Rol |
|---|---|
| **React 19** | Framework UI |
| **Vite** | Build tool + dev server |
| **Tailwind CSS v4** | Estilos Navy Industrial |
| **Recharts** | Gráficas de distribución de estrellas y tendencias |
| **Lucide React** | Iconografía táctica (sin emojis en UI) |
| **Fetch API nativa** | Integración con Motor Go :8092 |

**Estándar visual obligatorio:** Navy Industrial (`bg-slate-950`, acento `#D00000`, `JetBrains Mono` para datos).

---

## 2. INTEGRACION CON BACKEND

El frontend consume directamente el **Motor Go en `:8092`**. Sin capa intermedia n8n para la demo (latencia crítica en vivo).

### Endpoints principales

```
GET  http://localhost:8092/health
     → Estado del sistema y scrapers

POST http://localhost:8092/search
     Body: { "query": "Nombre Negocio Ciudad", "level": 3 }
     → BusinessData completo (rating, reseñas, distribución, web, tel)

GET  http://localhost:8092/status/:jobId
     → Polling de resultado asíncrono (nivel 3-4)
```

### Modelo de datos esperado (BusinessData)
```typescript
interface BusinessData {
  name: string
  rating: number           // 0.0 - 5.0
  total_reviews: number
  stars_distribution: {    // Porcentaje por estrella
    "1": number, "2": number, "3": number, "4": number, "5": number
  }
  website?: string
  phone?: string
  address?: string
  is_simulated: boolean    // true si Go activó el fail-safe de datos
  level_used: number       // Nivel real ejecutado (1-4)
  cached: boolean          // true si vino de caché Postgres :5435
  response_time_ms: number
}
```

---

## 3. PROMPT USADO PARA ANTIGRAVITY

**Resumen del prompt de construcción:**

> "Necesito el frontend React del Monitor de Reputación V2. Es una herramienta de demo comercial en vivo: el comercial busca el nombre de un negocio y en 15-20 segundos aparece su ficha de reputación completa. El efecto WOW es clave.
>
> Stack: React 19 + Vite + Tailwind v4 + Recharts + Lucide. Estilo Navy Industrial estricto (fondo `bg-slate-950`, acento rojo `#D00000`, tipografía `JetBrains Mono` para datos, `rounded-sm` en tarjetas, prohibido `rounded-xl`).
>
> El backend es un Motor Go en `localhost:8092`. Endpoint POST `/search` con body `{query, level}`. Responde con rating, total_reviews, distribución de estrellas (1-5), website, phone, is_simulated.
>
> Componentes que necesito:
> 1. Barra de búsqueda táctica con estado de carga (Skeleton, no spinner)
> 2. Tarjeta principal con rating grande y estrella visual
> 3. Gráfica de barras Recharts para distribución 1-5 estrellas (horizontal, acento rojo)
> 4. Sección de datos de contacto (web, teléfono) con iconos Lucide
> 5. Badge de modo: REAL / SIMULADO (cuando is_simulated=true, badge ámbar)
> 6. Badge de caché: CACHÉ / LIVE + tiempo de respuesta en ms
>
> Diseño tipo cockpit: pantalla fija h-screen sin scroll global. Panel izquierdo búsqueda + historial. Panel derecho resultado. Navegación por teclado."

---

## 4. COMPONENTES PRINCIPALES ESPERADOS

```
monitor-reputacion-frontend/src/
├── components/
│   ├── SearchBar.jsx          — Input táctica + botón buscar + estado loading
│   ├── SkeletonResult.jsx     — Pantalla fantasma durante los 15-20s de scraping
│   ├── BusinessCard.jsx       — Tarjeta principal: nombre, rating, datos de contacto
│   ├── StarDistribution.jsx   — Gráfica Recharts barras horizontales 1-5 estrellas
│   ├── SearchHistory.jsx      — Panel izquierdo: últimas búsquedas con rating rápido
│   ├── StatusBadge.jsx        — Badge REAL/SIMULADO + CACHÉ/LIVE + tiempo respuesta
│   └── EmptyState.jsx         — Estado inicial (antes de primera búsqueda)
├── pages/
│   └── Dashboard.jsx          — Layout cockpit: h-screen, panel izq + panel der
├── services/
│   └── monitorApi.js          — Fetch wrapper para Motor Go :8092 (search, status, health)
├── hooks/
│   └── useSearch.js           — Estado de búsqueda, polling asíncrono nivel 3-4
└── App.jsx
```

---

## 5. UX / COMPORTAMIENTO CRITICO

| Situación | Comportamiento esperado |
|---|---|
| Búsqueda iniciada | `SkeletonResult` aparece inmediatamente (no spinner) |
| Nivel 1-2 (<8s) | Resultado parcial visible, se enriquece al llegar nivel 3 |
| is_simulated=true | Badge ámbar "SIMULADO" visible. Datos realistas igualmente |
| cached=true | Badge verde "CACHÉ" + tiempo en ms (<100ms) |
| Error de red | Mensaje inline en panel derecho, historial intacto |
| Tecla Enter | Dispara búsqueda desde cualquier punto del cockpit |

**Fail-safe visual:** Si `is_simulated=true`, la tarjeta funciona y se ve igual de impresionante. El comercial puede continuar la demo sin interrupciones.

---

## 6. PROXIMOS PASOS

- [ ] Antigravity entrega componentes base (`BusinessCard`, `StarDistribution`, `SearchBar`)
- [ ] Validar integración real con Motor Go :8092 en dev local
- [ ] Ajustar selectores y manejo de `null` en campos opcionales (website, phone)
- [ ] Prueba de demo comercial en vivo: búsqueda de negocio real, nivel 3, <20s
- [ ] Añadir historial persistente (localStorage) para reutilizar en demos
- [ ] Ajuste fino de colores Recharts al acento `#D00000`
- [ ] Build de producción Vite + servir desde Motor Go como estático (opcional)

---

## 7. REFERENCIA RAPIDA

```bash
# Arrancar dev
cd /opt/fabrica/monitor-reputacion-frontend
npm run dev        # → http://localhost:5173

# Verificar backend
curl http://localhost:8092/health

# Test búsqueda manual
curl -X POST http://localhost:8092/search \
  -H "Content-Type: application/json" \
  -d '{"query": "Restaurante El Rincón Madrid", "level": 3}'
```
