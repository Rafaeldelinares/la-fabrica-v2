# [DOC] MANUAL DE IDENTIDAD Y UX (INGENIERÍA VISUAL)

**Clasificación:** Documentación / Diseño y Experiencia

## 1. ESTILOS POR ZONA (Protocolo Camaleón)
El diseño a aplicar depende de si el software es interno o para el público:
*   **Zona Pública (Escaparate / ia-bybusiness.es):** Estilo "Light Mode" o Azul Brillante para transmitir confianza comercial [6, 7].
*   **Zona Operativa (La Fábrica y CRM):** Estilo "Navy Industrial" (Modo Oscuro Forzado) [6, 8]. Prohibido el blanco puro y el azul genérico de Flowbite [4, 8, 9].

## 2. DICCIONARIO "NAVY INDUSTRIAL" (Valores Exactos)
*   **Fondo Global:** `bg-slate-950` (#020617) [4, 10].
*   **Paneles y Tarjetas:** `bg-slate-900/90` con efecto *backdrop-blur* [8, 10].
*   **Bordes:** `border-slate-800` (sutiles) con radio `rounded-sm` (rigidez militar, prohibido `rounded-xl`) [10, 11].
*   **Acento de Marca:** Rojo ByBusiness (`#D00000`). Uso exclusivo para botones primarios y alertas [8, 10].
*   **Tipografía:** `Inter` para la UI general, y `JetBrains Mono` para datos técnicos (IDs, logs, números) [11].

## 3. EXPERIENCIA DE INGENIERÍA (UX-ENG)
*   **Navegación "Cockpit":** La pantalla principal de las aplicaciones de escritorio debe ser fija (`h-screen` con `overflow-hidden`), sin scroll global. El scroll solo ocurre dentro de cada panel [12, 13].
*   **Carga de Datos:** Prohibidos los spinners circulares. Se deben usar *Skeleton Screens* (tarjetas fantasma pulsantes) [14, 15].
*   **Navegación Táctica:** Priorizar el uso del teclado. Las listas deben ser navegables con flechas, y los elementos seleccionados deben mostrar un anillo esmeralda (`ring-emerald-400`) [16, 17].
