# Design — 2026-08-11-xiaomi-gosom-scraper

> **Estado**: requiere **una decisión de Rafael** antes de pasar a `sdd-tasks`. Ver [§0 Hallazgos que cambian la propuesta](#0-hallazgos-que-cambian-la-propuesta) y [§10 Decisión pendiente](#10-decisión-pendiente-bloqueante).

---

## 0. Hallazgos que cambian la propuesta

Durante la fase de diseño se validó **contra el dispositivo real** (`ssh -p 8022 100.75.94.18`) y contra el código fuente de gosom v1.17.3. Seis supuestos de la propuesta resultaron **incorrectos**. Se documentan primero porque alteran el alcance.

| # | Supuesto en `proposal.md` | Realidad verificada | Impacto |
|---|---|---|---|
| H1 | "Storage 100% lleno (741MB/741MB)" — riesgo **Alto**, *"posponer sprint si no se resuelve"* | **FALSO**. Los 741 MB al 100% son `/`, la partición **de sistema Android, de solo lectura**. El `$HOME` de Termux vive en `/data`: **202 GB libres de 239 GB**. | ✅ Riesgo **eliminado**. No hay limpieza de storage que hacer. La sección "Storage Cleanup" del encargo es innecesaria. |
| H2 | "Cross-compilation aarch64" — tarea pendiente, riesgo Baja | **YA ESTÁ HECHO**. `~/xiaomi-gb-scape/bin/google-maps-scraper` existe (44 MB, 11-ago 11:34), es aarch64 nativo y **ejecuta correctamente**: reporta `v1.17.3+dirty-a75a157`. | ✅ Tarea **cerrada**. No hay que cross-compilar nada. |
| H3 | "gosom NO tiene search-by-name" — riesgo **Alta**, requiere pre-step de HTML parsing con curl+jq | **FALSO**. gosom acepta queries de texto plano como líneas de input de forma nativa. Verificado: `restaurantes` devolvió 20 negocios. | ✅ El "pre-step" de parsing HTML **no hace falta**. Simplifica mucho `search-cids`. |
| H4 | "Go binary estático, sin dependencias runtime" | **FALSO**. gosom depende de `mxschmitt/playwright-go v0.6100.0`. En modo normal descarga un driver **Node.js + Chromium enlazados a glibc**. Termux es **bionic**, no glibc. Verificado en el dispositivo: modo normal **falla al arrancar** (`could not get driver instance`). | ❌ **BLOQUEANTE NUEVO**. El modo navegador **no puede funcionar** en Termux. |
| H5 | (No contemplado) `-fast-mode` como alternativa sin navegador | **CONFIRMADO sin navegador** (`runner/filerunner/filerunner.go`, `setApp()`: si `FastMode` usa `WithStealth("firefox")` en lugar de `WithJS(...)`). Ejecuta bien en Termux vía HTTP+TLS-impersonation. **PERO** devuelve datos incompletos. | ⚠️ Es la única vía viable en el móvil, pero **no cubre el contrato de los webhooks**. Ver H6. |
| H6 | "36 data points" disponibles | En `-fast-mode`, sobre 20/20 registros reales: `place_id` **0/20 vacío**, `cid` **0/20 vacío**, `review_count` **0/20 vacío**, `link` **0/20 vacío**. Sí llegan: `review_rating` 20/20, `data_id` 20/20, `web_site` 18/20, `phone`, `address`, `lat/lng`. | ❌ **BLOQUEANTE NUEVO**. `place_id` y `reviews_count` son **obligatorios** en los payloads de ambos webhooks. |

### Evidencia reproducible de H4/H5/H6

```bash
# H4 — modo normal (navegador) en xiaomi-12:
$ ./bin/google-maps-scraper -input q.txt -json -lang es -c 1 -depth 1
could not get driver instance: could not get default cache directory: could not determine cache directory
# (persiste tras exportar XDG_CACHE_HOME; y aunque se resolviera, el driver Node
#  y el Chromium que descargaría son glibc → inejecutables en bionic)

# H5/H6 — fast-mode en xiaomi-12: SÍ ejecuta, 20 resultados:
$ ./bin/google-maps-scraper -input q2.txt -results o2.json -json -fast-mode \
    -lang es -c 1 -geo "40.4168,-3.7038" -radius 3000 -exit-on-inactivity 40s
place_id non-empty: 0 / 20      review_rating set:  20 / 20
cid non-empty:      0 / 20      data_id set:        20 / 20
review_count>0:     0 / 20      web_site set:       18 / 20
```

### Otros hallazgos menores (afectan al parser del adapter)

- El campo se llama **`web_site`**, no `website`.
- Existe un campo `longtitude` (typo en upstream) **además** de `longitude`. Usar `longitude`.
- `-fast-mode` **exige `-geo lat,lon`**; sin él aborta con `geo coordinates are required in fast mode`.
- `-fast-mode` es **incompatible con `-grid-bbox`**.
- La sintaxis de ID personalizado `query #!#MiID` documentada en el README **no propaga a `input_id` en fast-mode**: verificado, `input_id` devuelve un hash generado (`oGV7aretFYCJkdUP49iY0Q4`), no `LEAD9999`. **La correlación por `#!#` no es utilizable** → hay que correlacionar 1 query = 1 invocación.
- El `cid` **sí es derivable** de `data_id`: `0x…:0x3aa19c9748a2726a` → `int(hex,16)` = `4224830099022836330`. Verificado.
- **La arquitectura real ya depende del VPS**: `feed-leads-v2.sh` y `search-cids-v3.sh` hacen `ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql …"` para leer y escribir la DB. El principio "solo xiaomi-12, NO VPS" **ya está roto de facto** en el pipeline actual, y el VPS **ya tiene Docker**.

---

## 1. Architecture Overview

### 1.1 Estado actual (parcialmente migrado, inoperativo)

```
xiaomi-12 (Termux, aarch64)
  cron/*.sh  →  bin/crm-gb-scap  ──HTTP──▶  [wrapper Node :8095]  ✗ CAÍDO
                                                    │
  bin/google-maps-scraper (v1.17.3 aarch64) ✓ ya desplegado, sin usar
                                                    │
  crontab: VACÍO ✗
```

El wrapper `bin/crm-gb-scap` es hoy un **cliente HTTP** contra un servicio Node en `127.0.0.1:8095` que ya no existe. El binario gosom está desplegado pero ningún script lo invoca.

### 1.2 Arquitectura objetivo (recomendada — modelo híbrido)

La división nace de H6: **la búsqueda de CID puede vivir en el móvil; la auditoría no.**

```
┌─ xiaomi-12 (Termux aarch64) ─────────────────────────────────┐
│                                                              │
│  cron: search-cids-v4.sh                                     │
│      │  1 lead = 1 invocación (no hay #!# usable)            │
│      ▼                                                       │
│  bin/gosom-adapter  (NUEVO — reemplaza crm-gb-scap)          │
│      │  search <nombre> <localidad> <provincia>              │
│      ▼                                                       │
│  bin/google-maps-scraper -fast-mode -geo <lat,lon> -json     │
│      │  ✓ sin navegador · funciona en bionic                 │
│      ▼  data_id "0x..:0xHEX"                                 │
│  derive_cid()  →  int(HEX,16)  →  google_cid                 │
│      │                                                       │
└──────┼───────────────────────────────────────────────────────┘
       │ ssh + docker exec psql          (ya existente)
       ▼
┌─ VPS 72.60.191.179 (Docker disponible) ──────────────────────┐
│                                                              │
│  cron: feed-leads-v3.sh / audit-clientes-v3.sh               │
│      │  batch: N leads → 1 fichero input                     │
│      ▼                                                       │
│  docker run gosom/google-maps-scraper  (modo navegador)      │
│      │  ✓ place_id · reviews_count · link · status           │
│      ▼  results.json                                         │
│  adapter → payload {lead_id, audit_data}                     │
│      │                                                       │
└──────┼───────────────────────────────────────────────────────┘
       │ POST /webhook/crm-gb-scape-save-{lead,cliente}
       ▼
  [n8n workflows]  ← SIN CAMBIOS
       ▼
  [PostgreSQL crm_bybusiness]  ← SIN CAMBIOS
```

**Por qué híbrido y no todo en el móvil**: porque `place_id` y `reviews_count` —obligatorios en el contrato de ambos webhooks y en la spec `reputation-feed`— **no existen en fast-mode** (H6), y el modo que sí los produce necesita un navegador que **no puede ejecutarse en Termux** (H4).

**Por qué híbrido y no todo en el VPS**: porque la búsqueda de CID (los 5.275 leads sin CID, incluidos los 9 `vendido`) **sí funciona hoy en el móvil**, aprovecha su IP residencial móvil (mucho mejor para anti-detección que una IP de datacenter) y respeta la intención de Rafael de mantener el xiaomi-12 en producción.

> Las alternativas a este modelo, con sus costes, están en [§10](#10-decisión-pendiente-bloqueante). **No implementar nada hasta que Rafael elija.**

---

## 2. Components

### 2.1 `bin/google-maps-scraper` (binario gosom aarch64) — YA DESPLEGADO

| Propiedad | Valor verificado |
|---|---|
| Ruta | `~/xiaomi-gb-scape/bin/google-maps-scraper` |
| Versión | `v1.17.3+dirty-a75a157` |
| Tamaño | 44 MB |
| Arquitectura | aarch64, ejecuta nativo en Termux |
| Modo utilizable | **solo `-fast-mode`** (H4) |

No requiere acción: ya está en el dispositivo y responde. La sección "Cross-compile Strategy" del encargo queda cubierta por [§5](#5-cross-compile-strategy) únicamente como procedimiento de *actualización futura*.

### 2.2 `bin/gosom-adapter` (NUEVO — sustituye `bin/crm-gb-scap`)

Script Bash que **preserva la interfaz CLI actual** (`health` / `scrape` / `search`) para que los cron scripts cambien lo mínimo, pero internamente invoca el binario gosom en vez de hacer `curl` al Node muerto.

Responsabilidades:
1. Construir el fichero de input temporal (una query por invocación).
2. Invocar gosom con los flags correctos según el subcomando.
3. Parsear el JSON de salida (`web_site`, no `website`; `longitude`, no `longtitude`).
4. **Derivar `cid` desde `data_id`** cuando venga vacío (fast-mode).
5. Emitir por stdout **un único objeto JSON** compatible con lo que ya esperan los scripts.
6. Limpiar temporales; devolver exit code distinto de 0 en fallo.

### 2.3 Cron scripts

| Script | Acción | Nota |
|---|---|---|
| `search-cids-v4.sh` | **Reescribir** desde `search-cids-v3.sh` | v3 ya tiene la lógica de negocio buena (prioriza `vendido` > `asignado` > `pendiente`, state file, tasa de éxito). Solo cambia la llamada al adapter y añade `-geo` derivado de localidad/provincia. Corregir: v3 guarda un **place_id** en la columna `google_cid` — inconsistencia a resolver ([§3.3](#33-inconsistencia-cid-vs-place_id-en-la-db)). |
| `feed-leads-v3.sh` | **Reescribir y reubicar** al VPS | Requiere `place_id` + `reviews_count` → modo navegador. |
| `audit-clientes-v3.sh` | **Reescribir y reubicar** al VPS | Igual que el anterior. |
| `watchdog.sh` | **Simplificar** | Ver §2.4. |

### 2.4 Watchdog

El watchdog actual existe para reanimar un proceso Node persistente. Con gosom **ese rol desaparece**: gosom es un proceso *one-shot* lanzado por cron, no un daemon; no hay PID que vigilar ni "wakeup" de Puppeteer que hacer.

El watchdog se reduce a un **verificador de resultados**, no de proceso:
- Última ejecución con éxito por job (leyendo `state/*.json` y `logs/*.log`).
- Contador de fallos consecutivos por job.
- Alerta a Rafael tras **3 fallos consecutivos** (ver [§8](#8-error-handling--resilience)).
- **Ya NO** vigila espacio en disco (H1: 202 GB libres lo hacen irrelevante).

### 2.5 Storage

**No se requiere ninguna limpieza** (H1). Con 202 GB libres, la eliminación de `node_modules` (48 MB) o `google_session.json` (16 KB) no aporta nada operativamente.

Recomendación: **conservar** `lib/` intacto durante todo el sprint. Es el plan de rollback (`proposal.md` §Rollback depende de `lib/crm-gb-scap.js.bak-pre-gosom` y de `node_modules`). Borrarlo por "liberar espacio" que no hace falta destruiría la única vía de vuelta atrás. Limpiar, si acaso, **al archivar el cambio**, no durante.

### 2.6 Proxy strategy (MVP)

No se usan proxies en el MVP: se **omite el flag** `-proxies` (no se pasa `-proxies ""`, que sería un valor vacío inválido). Mitigación de rate-limiting por configuración conservadora:

```
-c 1                      # concurrencia mínima
-exit-on-inactivity 2m    # corta si Google deja de responder
```

La IP móvil residencial del xiaomi-12 es un activo anti-detección; no conviene desperdiciarlo con concurrencia alta. Si aparecen CAPTCHAs, la palanca es reducir el volumen por ejecución, no añadir proxies (fuera de scope según `proposal.md`).

---

## 3. Data Mapping

### 3.1 gosom → webhook

Contratos destino (sin cambios):
`POST /webhook/crm-gb-scape-save-lead` → `{lead_id, audit_data:{place_id, rating, reviews_count, …}}`
`POST /webhook/crm-gb-scape-save-cliente` → `{cliente_id, audit_data:{place_id, name, rating, reviews_count, address, phone, web}}`

| Campo gosom | Campo webhook (`audit_data.*`) | Modo navegador | **Fast-mode (verificado)** |
|---|---|---|---|
| `place_id` | `place_id` | ✅ | ❌ **0/20 vacío** |
| `title` | `name` | ✅ | ✅ 20/20 |
| `review_rating` | `rating` | ✅ | ✅ 20/20 |
| `review_count` | `reviews_count` | ✅ | ❌ **0/20 = 0** |
| `address` | `address` | ✅ | ✅ 20/20 |
| `phone` | `phone` | ✅ | ✅ |
| `web_site` ⚠️ | `web` | ✅ | ✅ 18/20 |
| `cid` | `google_cid` | ✅ | ❌ vacío → **derivar de `data_id`** |
| `data_id` | (fuente de `cid`) | ✅ | ✅ 20/20 |
| `latitude` / `longitude` | `lat` / `lng` | ✅ | ✅ |
| `link` | `gmaps_url` | ✅ | ❌ vacío → reconstruible desde CID |
| `status` | `status` | ✅ | ❌ vacío |
| `category` | `categoria` | ✅ | ❌ vacío (`categories` sí viene) |
| `open_hours` | `horario` | ✅ | ✅ |
| `owner` | `owner` | ✅ | ⚠️ estructura vacía |

**Las dos filas en rojo (`place_id`, `review_count`) son el bloqueo.** Un payload de auditoría sin `reviews_count` no cumple el propósito del sprint (medir reputación) y rompe lo que `reputation-feed` REQ-003 espera (`{ place_id, review_count, … }`).

### 3.2 Derivación de CID (aplicable en fast-mode)

```python
# data_id = "0xd42287e40478415:0x3aa19c9748a2726a"
cid = str(int(data_id.split(":")[1], 16))   # → "4224830099022836330"  ✓ verificado
gmaps_url = f"https://maps.google.com/?cid={cid}"
```

### 3.3 Inconsistencia CID vs place_id en la DB

`search-cids-v3.sh` escribe en `operaciones.leads.google_cid` el valor de `d.get('place_id')` y construye `…/maps/place/?q=place_id:<valor>`. Es decir, **la columna llamada `google_cid` contiene place_ids**. `feed-leads-v2.sh` luego lee esa misma columna y la pasa como `scrape <cid>`.

gosom distingue `cid` y `place_id` como campos separados. Antes de implementar hay que decidir **cuál de los dos se persiste** en `google_cid` y aplicarlo de forma coherente en los tres scripts. Se recomienda persistir el **CID numérico** (derivable en ambos modos vía `data_id`) y, si se necesita `place_id`, añadirlo donde corresponda sin cambiar el esquema.

---

## 4. API Contracts — `bin/gosom-adapter`

Interfaz preservada respecto de `bin/crm-gb-scap` para minimizar el cambio en los cron scripts.

### `gosom-adapter search <nombre> [localidad] [provincia] [direccion]`

- Construye query: `"<nombre> <localidad> <provincia>"`.
- Resuelve `-geo` a partir de localidad/provincia (tabla estática de capitales de provincia; fallback centro de España `40.4168,-3.7038`). **Obligatorio en fast-mode.**
- Ejecuta: `google-maps-scraper -input <tmp> -json -fast-mode -lang es -c 1 -geo <lat,lon> -radius 5000 -exit-on-inactivity 2m`
- Toma el **primer** registro; deriva `cid` de `data_id`.
- **stdout**: `{"cid":"4224830099022836330","name":"…","address":"…","phone":"…","web":"…","lat":…,"lng":…,"source":"fast-mode"}`
- Sin resultados → exit 2, stdout vacío.

### `gosom-adapter scrape <cid|place_id>`

- **Requiere modo navegador** para devolver `place_id` + `reviews_count`. En xiaomi-12 **no es ejecutable** (H4).
- Comportamiento en el móvil: exit 3 + `{"error":"browser_mode_unavailable"}`, sin fabricar datos parciales. Un payload de auditoría con `reviews_count: 0` inventado sería peor que un fallo explícito: contaminaría la DB con ceros indistinguibles de negocios reales sin reseñas.
- Implementación efectiva: en el host que ejecute modo navegador (VPS, según §10).

### `gosom-adapter health`

- Ya no hay proceso que consultar. Devuelve:
  `{"binary":"ok","version":"v1.17.3+dirty-a75a157","fast_mode":"ok","browser_mode":"unavailable","last_success":"<ISO>","consecutive_failures":N}`
- Se alimenta de los state files, no de un puerto HTTP.

---

## 5. Cross-compile Strategy

**Ya ejecutado (H2)** — esta sección queda como procedimiento de actualización futura.

```bash
# En dev amd64. OJO: gosom v1.17.3 exige Go 1.26.5+ (go.mod).
# La máquina dev actual tiene go1.22.2 → hay que actualizar el toolchain primero.
git clone https://github.com/gosom/google-maps-scraper && cd google-maps-scraper
git checkout v1.17.3
GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -o gosom-scraper-aarch64 .

scp -P 8022 gosom-scraper-aarch64 100.75.94.18:~/xiaomi-gb-scape/bin/google-maps-scraper
ssh -p 8022 100.75.94.18 'chmod +x ~/xiaomi-gb-scape/bin/google-maps-scraper && \
  ~/xiaomi-gb-scape/bin/google-maps-scraper -version'
```

Notas:
- **No hay release oficial linux-arm64**: los assets de v1.17.3 son solo `darwin-amd64`, `linux-amd64`, `windows-amd64`. La compilación propia es obligatoria.
- Test con QEMU: **no disponible** en la máquina dev (`qemu-aarch64` no instalado). El test real se hace en el dispositivo, que es lo que se ha hecho.
- `CGO_ENABLED=0` evita depender de la libc del host.

---

## 6. Storage Cleanup

**No aplica.** Ver H1 y [§2.5](#25-storage): hay 202 GB libres; la premisa de la limpieza era una lectura errónea de la partición de sistema de Android. Se recomienda **no borrar** `lib/`, `node_modules/`, `google_session.json` ni `package.json` durante el sprint, porque constituyen el plan de rollback.

---

## 7. Search-by-name Strategy

gosom **acepta queries de texto plano nativamente** (H3): no hace falta el pre-step de scraping de Google Search con curl+jq que planteaba la propuesta.

Flujo:
1. `search-cids-v4.sh` obtiene leads sin CID (SQL de v3, ya correcto).
2. Por cada lead → `gosom-adapter search "<nombre>" "<localidad>" "<provincia>"`.
3. El adapter escribe `"<nombre> <localidad> <provincia>"` como línea de input.
4. gosom fast-mode con `-geo` de la provincia.
5. Se toma el primer resultado, se deriva el CID de `data_id`.
6. `UPDATE operaciones.leads SET google_cid = … WHERE id = …` (vía el SSH+psql ya existente).

**Limitación a aceptar**: sin `#!#` utilizable (H6), la correlación exige **1 invocación por lead** — no se puede batchear en un único fichero de input. Con `-exit-on-inactivity 2m` y `-c 1`, el coste real es de **decenas de segundos por lead**, no los ~120 places/min del README (esa cifra es para batch masivo). Para el muestreo de `LIMIT=10` de v3 es perfectamente asumible; para los 5.275 leads, no. El backfill masivo debe planificarse como gradual (50/día, como sugiere la propuesta) o batchearse en el host de modo navegador.

---

## 8. Error Handling & Resilience

- **Exit codes del adapter**: `0` ok · `2` sin resultados (no es error: el negocio puede no existir en Maps) · `3` modo no disponible · `1` fallo de ejecución.
- **State files**: mantener el patrón ya existente (`state/*.json` con la lista de IDs procesados, truncada). Funciona y sobrevive entre runs. Añadir `consecutive_failures` y `last_success`.
- **Backoff exponencial**: ante exit 1 (fallo real, no "sin resultados"), esperar `min(2^n · 30s, 15m)` antes del siguiente intento dentro de la misma ejecución. **No** aplicar backoff a exit 2, que es un resultado legítimo.
- **Watchdog**: ya no reanima procesos (§2.4). Vigila `consecutive_failures`.
- **Alerta a Rafael tras 3 fallos consecutivos**: sí, recomendado. Vía webhook n8n dedicado (`CRM_WATCHDOG_ALERT`), coherente con el resto de la integración y sin introducir un canal nuevo (email/SMTP) que habría que mantener.
- **Rate limiting / CAPTCHA**: si gosom devuelve `empty business list` de forma sostenida en queries que antes funcionaban, es señal de bloqueo. El watchdog debe distinguirlo de "no encontrado" puntual: umbral de ≥5 vacíos consecutivos → alerta y pausa del job.

---

## 9. Testing Strategy

Escalera de validación; **no activar el crontab hasta completar los tres primeros peldaños**.

1. **T1 — Binario** ✅ *ya superado*: `-version` responde `v1.17.3+dirty-a75a157`.
2. **T2 — Fast-mode** ✅ *ya superado*: query real devolvió 20 negocios con rating/phone/address.
3. **T3 — Adapter search**: contra **2 leads conocidos** con CID ya en DB. Ejecutar `gosom-adapter search` y comprobar que el CID derivado **coincide con el almacenado**. Esta es la prueba que valida la derivación `data_id → cid`. Sin ella, se estaría escribiendo CIDs sin verificar en 5.275 leads.
4. **T4 — Payload**: `curl` manual del payload construido al webhook en un lead de prueba; verificar `{"ok":true}`.
5. **T5 — DB**: `SELECT` del lead tocado; confirmar que los campos se escribieron y que **no hay ceros espurios** en `reviews_count`.
6. **T6 — Gold test**: los **9 leads `vendido` sin CID**. Ejecutar `search-cids-v4.sh` con `LIMIT=9` y revisar **manualmente uno a uno** que el negocio encontrado es el correcto (el matching por nombre es aproximado; un CID equivocado en un cliente que ya pagó es peor que ningún CID).
7. **T7 — Cron**: solo entonces, reactivar los jobs de uno en uno, empezando por `search-cids`.

---

## 10. Decisión pendiente (BLOQUEANTE)

`place_id` + `reviews_count` requieren modo navegador; el modo navegador no corre en Termux (H4/H6). Hay tres salidas. **Ninguna es implementable sin que Rafael elija**, porque las tres tocan decisiones que él ya había cerrado.

| Opción | Qué implica | Coste | Riesgo |
|---|---|---|---|
| **A — Híbrido** (recomendada) | Búsqueda de CID en xiaomi-12 (fast-mode); auditoría en el VPS con Docker (modo navegador). | Reescribir 2 scripts en el VPS. El VPS **ya tiene Docker y ya es dependencia** del pipeline (los scripts hacen `ssh root@72.60.191.179 docker exec … psql`). | Contradice parcialmente "❌ NO VPS", pero esa decisión se tomó **sin saber** que el navegador es imposible en Termux. |
| **B — Solo móvil, auditoría degradada** | Todo en xiaomi-12 con fast-mode. Se renuncia a `reviews_count` y `place_id`. | Mínimo. | **Vacía de sentido el sprint**: una auditoría GBP sin nº de reseñas no mide reputación. Rompería `reputation-feed`. Requeriría delta specs para degradar contratos. |
| **C — proot-distro en Termux** | Instalar un rootfs Ubuntu glibc dentro de Termux para poder ejecutar Playwright. | Espacio sobra (202 GB). | Alto y no verificado: Playwright no publica Chromium linux-arm64 para todas las versiones; sobre `proot` el rendimiento cae mucho y con 7 GB de RAM (2,8 GB disponibles) un Chromium es pesado. **No recomendada sin un spike previo.** |

**Recomendación: opción A.** Preserva el xiaomi-12 en el rol donde aporta valor real (IP residencial móvil para búsqueda), cumple el contrato de los webhooks sin degradarlo, y no introduce ninguna dependencia nueva: el VPS ya está en el camino crítico.

---

## 11. Spec impact — el skip declarado **no se sostiene tal cual**

`proposal.md` justifica el skip así: *"La spec `cliente-gbp-audit` ya define el comportamiento esperado del scraper"*.

**Esa spec no existe.** El inventario de `openspec/specs/` es: `admin-audit-trail`, `admin-error-boundaries`, `backup-operations`, `dev-eventos-shim`, `lead-callbacks`, `lead-freeze-list`, `lead-freshness-config`, `operator-live-kpis`, `rbac-coverage-first-slice`, `react-query-operator-data`, `reputation-feed`, `scraper-config-panel`, `scraper-health-panel`, `stale-phase-label-cleanup`. No hay ninguna `cliente-gbp-audit`.

Conclusión por opción elegida en §10:

- **Opción A** → **el skip se confirma**, pero por un motivo distinto al declarado: el comportamiento observable (payloads de los webhooks, esquema de DB) no cambia; el cambio es de implementación y de *host*. No hacen falta delta specs. Corregir la justificación en `proposal.md` para que no cite una spec inexistente.
- **Opción B** → **el skip NO es válido**: degradar `reviews_count`/`place_id` es un cambio de comportamiento observable que afecta a `reputation-feed` (REQ-003 exige `{ place_id, review_count, … }`). Exigiría delta spec.
- **Opción C** → skip válido (comportamiento idéntico), pero requiere un spike de factibilidad antes de diseñar tareas.

No se ha detectado ninguna capability nueva (no hay comando `search-by-url` ni interfaz externa nueva): el adapter conserva `health` / `scrape` / `search`.

---

## 12. Dependencias externas

- **Acceso SSH a xiaomi-12**: `ssh -p 8022 100.75.94.18` vía Tailscale. ✅ verificado operativo en esta sesión.
- **Acceso SSH al VPS**: `root@72.60.191.179`, con Docker y el contenedor `fabrica-postgres-1`. Usado hoy por los cron scripts. Necesario para la opción A.
- **Toolchain Go 1.26.5+** en la máquina dev: **NO cumplido hoy** (`go1.22.2`). Solo necesario si hay que recompilar; el binario actual ya funciona.
- **QEMU aarch64**: no instalado. No bloqueante (se testea en el dispositivo real).
- **Termux**: `bash`, `curl`, `python3`, `coreutils` presentes y en uso por los scripts actuales.
- **Webhooks n8n** `EPjSea8GBZsTVKkk` / `fJy7pfNYVZqj6LXY`: activos, sin cambios.

---

## 13. Actualizaciones sugeridas a `proposal.md`

Para que la propuesta y el diseño no se contradigan, conviene corregir en `proposal.md`:

1. Riesgo "Storage 100% lleno" → **eliminar** (H1, falso).
2. Riesgo "gosom NO tiene search-by-name" → **eliminar** (H3, falso).
3. Riesgo "Cross-compilation aarch64 fallida" → **cerrado** (H2, ya hecho y verificado).
4. Dependencia "Go runtime NO requerido (gosom es binario estático)" → **corregir**: gosom depende de Playwright en modo navegador (H4).
5. Añadir riesgo **crítico** nuevo: modo navegador inejecutable en Termux + fast-mode sin `place_id`/`reviews_count`.
6. Open question "¿Qué versión de gosom?" → **resuelta**: v1.17.3 (la propuesta decía "v0.7.0+", muy desactualizado).
7. Corregir la justificación del spec skip (§11): la spec `cliente-gbp-audit` no existe.
