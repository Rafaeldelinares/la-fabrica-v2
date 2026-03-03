# [DOC] LM Studio MCP — Workflow de Integración Qwen + Claude

**Clasificación:** Documentación / Infraestructura IA Local
**Versión:** 1.0 (2026-03-03)

---

## 1. ARQUITECTURA

```
Claude Code (Sonnet 4.6)
        │
        ├── Análisis rápido → Sonnet directo
        │
        └── Análisis profundo ──→ MCP lmstudio ──→ LM Studio :11434
                                                          │
                                                    qwen/qwen3.5-9b
                                                    (RTX 3060 Ti, 6.55GB)
```

**Protocolo:** MCP stdio (`~/.local/share/mcp-servers/lmstudio/server.js`)
**API:** OpenAI-compatible en `http://localhost:11434/v1/`
**Modelo activo:** `qwen/qwen3.5-9b` (9B parámetros, contexto 4096 tokens)

---

## 2. HERRAMIENTAS DISPONIBLES

### `analyze_with_qwen`
Análisis profundo con chain-of-thought. El modelo razona explícitamente antes de concluir.

**Parámetros:**
- `prompt` (string, requerido): Pregunta o problema. Incluir contexto específico.
- `max_tokens` (number, default 3000): Tokens para la respuesta. Qwen necesita ≥2000 para análisis complejos.
- `mode` (enum, default "think"): `"think"` = reasoning visible | `"direct"` = respuesta sin chain-of-thought.

### `list_lmstudio_models`
Lista modelos disponibles en LM Studio. Útil para verificar qué está cargado.

---

## 3. CUÁNDO USAR QWEN VÍA MCP

### ✅ CASOS DONDE APORTA VALOR (usar `analyze_with_qwen`)

| Caso | Por qué Qwen | Ejemplo |
|------|-------------|---------|
| **Debugging de causa raíz** | Explora múltiples hipótesis sistemáticamente | "¿Por qué el AI Agent no invoca la tool tras 40s?" |
| **Análisis de arquitectura** | Evalúa tradeoffs desde múltiples ángulos | "¿Deberíamos usar n8n o un servicio custom para X?" |
| **Diseño de algoritmo complejo** | Razona step-by-step antes de proponer | "Diseña un algoritmo de priorización de leads" |
| **Revisión de decisiones técnicas** | Segunda opinión sin contexto de La Fábrica | "Evalúa estas 3 opciones de caching" |
| **Análisis de logs/errores** | Correlaciona síntomas con causas | "Interpreta este stack trace de Go" |

### ❌ CASOS DONDE ES OVERHEAD INNECESARIO (usar Sonnet directo)

- Código React/TypeScript simple o componentes estándar
- Queries SQL con esquema conocido
- Respuestas que requieren contexto de La Fábrica (Qwen no lo tiene)
- Tareas urgentes (Qwen tarda 30-90s por el thinking overhead)
- Generación de configuraciones n8n (mejor con n8n MCP)

---

## 4. EJEMPLOS DE PROMPTS EFECTIVOS

### Debugging complejo
```
analyze_with_qwen(
  prompt: "Un AI Agent en n8n con Gemini Flash a veces no invoca la tool 'monitor_reputacion'
  (HTTP Request, timeout 120s). Las conversaciones afectadas duran >40s antes de ese punto.
  El workflow tiene memoria de conversación activa. Analiza causas probables ordenadas por probabilidad.",
  max_tokens: 4000
)
```

### Análisis arquitectónico
```
analyze_with_qwen(
  prompt: "Estamos eligiendo entre WebSockets y Server-Sent Events para el dashboard del CRM
  (React 19, n8n como BFF). El CRM tiene ~20 operadores simultáneos y necesita updates de leads
  en tiempo real. Analiza tradeoffs específicos para este caso.",
  max_tokens: 3000
)
```

### Diseño de algoritmo
```
analyze_with_qwen(
  prompt: "Diseña un algoritmo de scoring para priorizar leads en el CRM ByBusiness.
  Factores: tiempo sin contacto, número de intentos fallidos, match de sector/provincia
  con el operador, y urgencia declarada por el lead. El score debe ser 0-100.",
  max_tokens: 3500
)
```

---

## 5. COMPORTAMIENTO DEL MODELO

### Thinking Mode (default)
Qwen 3.5-9B está entrenado para razonar explícitamente. Genera un "Thinking Process" extenso antes del output final. Esto es por diseño — el razonamiento es el valor.

**Estimación de tokens:**
- Thinking section: ~800-1500 tokens
- Conclusión final: ~300-600 tokens
- Total mínimo recomendado: **3000 tokens**
- Para análisis muy complejos: **4000-5000 tokens**

### Rendimiento esperado
- RTX 3060 Ti + 31GB RAM
- Velocidad: ~15-25 tokens/segundo
- Latencia total (análisis 3000t): ~60-120 segundos

---

## 6. CONFIGURACIÓN TÉCNICA

### Archivo del servidor
```
~/.local/share/mcp-servers/lmstudio/
├── server.js       # MCP server (Node.js ESM)
├── package.json    # dependencias
└── node_modules/   # @modelcontextprotocol/sdk v1.x
```

### Entrada en ~/.claude.json
```json
"lmstudio": {
  "type": "stdio",
  "command": "node",
  "args": ["/home/rafael/.local/share/mcp-servers/lmstudio/server.js"],
  "env": {
    "LM_STUDIO_URL": "http://localhost:11434",
    "LM_STUDIO_MODEL": "qwen/qwen3.5-9b"
  }
}
```

### Cambiar de modelo
```bash
# Para usar el Coder (cuando esté cargado):
LM_STUDIO_MODEL="qwen2.5-coder-7b-instruct"

# Para usar otro modelo cargado en LM Studio:
LM_STUDIO_MODEL="<id-del-modelo>"
```

---

## 7. AHORRO ESTIMADO EN TOKENS ANTHROPIC

| Tarea | Sin Qwen MCP | Con Qwen MCP | Ahorro |
|-------|-------------|-------------|--------|
| Debugging complejo (3 rondas Sonnet) | ~6000 tokens | ~800 tokens Sonnet + Qwen local | ~85% |
| Análisis arquitectónico | ~4000 tokens | ~600 tokens Sonnet | ~85% |
| Diseño algoritmo | ~3500 tokens | ~500 tokens Sonnet | ~86% |

*Nota: Los tokens de Qwen son locales (coste = electricidad RTX). Solo se consumen tokens Anthropic para integrar la respuesta de Qwen en el output final de Sonnet.*

---

## 8. TROUBLESHOOTING

| Error | Causa | Fix |
|-------|-------|-----|
| `ECONNREFUSED :11434` | LM Studio server no activo | Activar "Local Server" en LM Studio UI |
| `Failed to load model` | Modelo no cargado | `lms load qwen/qwen3.5-9b` |
| Respuesta truncada (finish: length) | max_tokens insuficiente | Aumentar a 4000-5000 |
| Timeout en Claude Code | LM Studio sobrecargado | Esperar o reiniciar con `lms server restart` |

---

*Documentación generada: 2026-03-03 | MCP versión 1.0*
