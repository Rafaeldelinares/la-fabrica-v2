# WhatsApp Assistant — Ejemplo Real (ASUS)

## 📸 Contexto Visual

### 1. Verificación de Edad
- Modal inicial
- Protección de privacidad
- Dropdowns: Año, Mes, Día

### 2. AI Assistant Menu
- Pregunta: "¿En qué puedo ayudarte?"
- Opciones (chips/buttons):
  - "Especificaciones del producto"
  - "Recomendar productos"
  - "Comparar productos"
  - "Sugerir accesorios"

### 3. Conversación
- Usuario pregunta
- AI responde
- Flujo natural

### 4. Final
- Solicitar teléfono
- Guardar en BD
- Enviar confirmación WAHA
- Rating del asistente

## 🎯 Para Escaparate.com

**Adaptación:**
```
Chips iniciales:
- "¿Soy cliente nuevo?"
- "¿Quiero una cita?"
- "¿Quiero trabajar con ustedes?"

Cada uno lleva a:
- Conversación específica
- Captura de teléfono
- Guardado en PostgreSQL
- Mensaje WAHA final
```

## 🔄 Flujo Completo
```
1. Modal aparece
2. Verificación edad
3. AI pregunta intención
4. Usuario elige chip
5. Conversación contextual
6. Pregunta: "¿Tu teléfono?"
7. Valida teléfono
8. Guarda en crm_bybusiness.leads
9. Envía WAHA: "Gracias, nos contactaremos"
10. Rutea a equipo (Ventas/RR.HH./Soporte)
```

