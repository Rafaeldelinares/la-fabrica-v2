# [PRJ] ESCAPARATE WEB Y REDES SOCIALES (ia-bybusiness.es)

**Clasificación:** Proyecto / Marketing y Ventas

## 1. FRONTEND DE LA WEB PÚBLICA
*   **Stack:** React 18+, Vite, Tailwind CSS v4, Framer Motion para transiciones fluidas [34].
*   **Kiosk Mode:** El hero de la web tiene un ciclo automatizado de 8 pasos (Hero + Soluciones + Tecnologías), rotando cada 5 segundos. Es navegable por teclado o mediante clic directo, pausándose al pasar el ratón por encima [35].
*   **Conexión Backend:** Los formularios de contacto envían un JSON (`nombre`, `email`, `telefono`, `empresa`, `urgencia`) al Webhook público de n8n [34], el cual dispara el "Protocolo Waha Portero de Discoteca" para validar el teléfono antes de guardar nada [36, 37].

## 2. ESTRATEGIA INSTAGRAM (El Escaparate Silencioso)
*   **Filosofía:** "Bajo Perfil Corporativo". Imágenes de arquitecturas de software, oficinas limpias y datos de ROI reales. Prohibidos los memes, contenido viral o lenguaje de influencer [38-40].
*   **Automatización de Posts (Emisor):** Un flujo de n8n publica automáticamente 3-4 veces por semana utilizando un banco local de imágenes y Gemini Flash para redactar los *captions* (textos) [41-43].
*   **Gestión de DMs (Receptor):** El protocolo de los Agentes en Instagram se denomina **EXPRESS**. Debido al riesgo de abandono del usuario, la IA tiene órdenes de interactuar un máximo de 2-3 veces en DM con el único objetivo de evacuar el tráfico hacia el territorio controlado (WhatsApp o Email) [44-47].
