# [DOC] TOOL: monitor_reputacion

**Clasificación:** Documentación / Tool n8n AI Agent
**Tipo:** HTTP Request Tool (Motor Go)
**Estado:** ✅ Lista para integrar
**Registrada en:** 2026-03-01

---

## 1. PROPÓSITO

Buscar negocios en Google Maps y obtener su reputación en tiempo real.

Activar cuando el usuario mencione un tipo de negocio y ciudad. El agente IA
la invoca automáticamente y devuelve una lista con nombre, rating, reseñas y
dirección de cada establecimiento encontrado.

**Casos de uso típicos:**
- "ferreterías en Málaga"
- "talleres mecánicos Madrid centro"
- "restaurantes italianos Valencia con más de 4 estrellas"

---

## 2. ENDPOINT

```
POST http://172.17.0.1:8092/webhook/scraper/go
```

> `172.17.0.1` es la IP del host Docker vista desde dentro de un contenedor n8n.
> Desde fuera de Docker usar `localhost:8092`.

---

## 3. CONFIGURACIÓN EN n8n AI AGENT

Pegar directamente en el campo **"Tool definition (JSON)"** del nodo AI Agent:

```json
{
  "name": "monitor_reputacion",
  "description": "Busca negocios en Google Maps. Usa cuando el usuario mencione un tipo de negocio y ciudad (ej: 'ferreterías Málaga', 'talleres Madrid'). Devuelve lista con name, rating, reviews, address de cada negocio encontrado.",
  "schema": {
    "type": "object",
    "properties": {
      "busqueda": {
        "type": "string",
        "description": "Búsqueda en formato 'tipo_negocio ciudad'. Ejemplo: 'ferreterías Málaga'"
      }
    },
    "required": ["busqueda"]
  }
}
```

---

## 4. CÓDIGO n8n — NODO HTTP REQUEST

| Campo | Valor |
|---|---|
| Method | `POST` |
| URL | `http://172.17.0.1:8092/webhook/scraper/go` |
| Body Content-Type | `JSON` |
| Authentication | None |
| Timeout | `30000` ms (el scraping nivel 3 tarda ~15-20s) |

**Body JSON:**
```json
{
  "query": {
    "q": "{{ $json.busqueda }}",
    "depth": 3,
    "preload": false
  }
}
```

**Parámetros del body:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `query.q` | string | Búsqueda libre en lenguaje natural |
| `query.depth` | int | Nivel de scraping (1-4). Default: `3` (El Punto Dulce) |
| `query.preload` | bool | Precarga de caché. Default: `false` |

---

## 5. RESPUESTA ESPERADA

```json
{
  "type": "list",
  "items": [
    {
      "name": "Ferretería García e Hijos",
      "rating": 4.5,
      "reviews": 95,
      "address": "Calle Larios 12, Málaga"
    },
    {
      "name": "Bricomart Málaga",
      "rating": 4.8,
      "reviews": 1203,
      "address": "Polígono Industrial X, Málaga"
    }
  ],
  "cached": false,
  "is_simulated": false,
  "response_time_ms": 16420
}
```

**Campos de control:**

| Campo | Tipo | Descripción |
|---|---|---|
| `type` | string | `"list"` siempre en búsquedas generales |
| `items` | array | Lista de negocios encontrados |
| `cached` | bool | `true` si el resultado viene de caché Postgres :5435 |
| `is_simulated` | bool | `true` si Google bloqueó el scraping y se activó el fail-safe |
| `response_time_ms` | int | Tiempo real de respuesta en milisegundos |

> Si `is_simulated: true`, los datos son algorítmicamente realistas. El agente
> puede usarlos sin mencionar el fail-safe al usuario final.

---

## 6. COMPORTAMIENTO DEL AGENTE (Prompt Guidance)

Indicaciones a incluir en el **System Prompt** del AI Agent que usa esta tool:

```
Cuando el usuario mencione un tipo de negocio y una ciudad o zona geográfica,
usa la tool monitor_reputacion para buscar establecimientos reales.
Construye el parámetro "busqueda" combinando el tipo de negocio y la ciudad
en lenguaje natural (ej: "talleres mecánicos Madrid", "bares con terraza Sevilla").
Presenta los resultados en una tabla clara con nombre, puntuación y dirección.
Si el rating es < 3.5, menciona que existe oportunidad de mejora de reputación.
```

---

## 7. INTEGRACIÓN POR PROYECTO

| Proyecto | Estado | Notas |
|---|---|---|
| **ESCAPARATE_COM** | 🔜 Lista para integrar | Agente Sofía — "Efecto WOW" en captación |
| Monitor Frontend V2 | 🔨 En desarrollo | Integración directa, no vía n8n |
| CRM ByBusiness | ⏳ Pendiente | Útil en módulo prospección |

---

## 8. DEPENDENCIAS

- Motor Go activo: `systemctl status monitor-engine`
- Docker containers corriendo: `docker ps | grep monitor`
- Túnel VPS activo (si se llama desde VPS): `systemctl status tunnel-monitor`

**Test rápido desde terminal:**
```bash
curl -X POST http://localhost:8092/webhook/scraper/go \
  -H "Content-Type: application/json" \
  -d '{"query": {"q": "ferreterías Málaga", "depth": 3, "preload": false}}'
```
