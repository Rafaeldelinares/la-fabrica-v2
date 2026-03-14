# [PRJ MOTOR_REPUTACION] BITACORA Y ARQUITECTURA (V2)

**Clasificación:** Célula Satélite / Extracción de Datos
**Estado:** Operación Nominal (Motor Go + Playwright)

## ENDPOINT DE INVOCACIÓN REAL

POST http://localhost:8092/webhook/scraper/go
Body: { "query": { "q": "nombre negocio, dirección, ciudad", "depth": 5, "preload": false } }

Ejemplo respuesta real:
{"type":"detail","data":{"name":"Restaurante Bar El Comienzo","rating":4.3,"reviews":43,
"breakdown":{"1":0,"2":0,"3":0,"4":43,"5":0},"address":"C. Río Pomar, 13, 05004 Ávila",
"phone":"647 56 52 99","website":"http://elcomienzobyjlg.es/",
"sentiment":[{"name":"Calidad","score":85},{"name":"Atención","score":78},
{"name":"Precio","score":72},{"name":"Velocidad","score":80}],
"cached":true,"response_time":0.031}}

## TOPOLOGÍA

| Servicio | Puerto | Rol |
|---|---|---|
| Motor Go (Orquestador) | 8092 | Lógica, enrutamiento, rate limiter |
| Scraper NANO v2 | 8090 | Playwright ligero 256MB, 5-8s (Nivel 2) |
| Scraper HEAVY v2 | 8091 | Playwright pesado 1.5GB, 15-30s (Nivel 3) |
| Postgres Caché | 5435 | scraped_cache, respuesta <0.01s si repetida |

## TÚNEL SSH

Cron activo en máquina local (cada minuto):
* * * * * ssh -N -T -R 8092:localhost:8092 root@72.60.191.179 >/dev/null 2>&1 &

Flujo: Petición externa → VPS 72.60.191.179 → túnel SSH → Motor Go local :8092 → scrapers → respuesta

## PROTOCOLO SOFÍA (uso en ventas)

1. Sofía pide nombre del negocio y ciudad
2. n8n dispara POST al Motor Go via túnel
3. Motor devuelve rating y nº reseñas en 5-8s
4. Sofía responde con el dato real generando "Efecto WOW"
