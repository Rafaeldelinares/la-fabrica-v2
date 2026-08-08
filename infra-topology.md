# Infraestructura — La Fábrica IA
## Topología VPS vs Local

> Documento de referencia rápida para orientarse antes de cualquier query, script o deploy.
> Carga automática para toda sesión opencode en `/opt/fabrica/`.

---

## TL;DR — ¿Dónde vive cada cosa?

| Si necesito... | Voy a... |
|---|---|
| Consultar datos GBP (fichas, auditorías, snapshots) | `postgres-vps`, schema `clientes.*` |
| Consultar leads, ventas, operadores, campañas | `postgres-crm` (local `:5432`, DB `crm_bybusiness`) |
| Consultar metadata de workflows n8n / servicios | `postgres-fabrica` (local, READ-ONLY) |
| Consultar cache de scrapers / reputación | `postgres-monitor` (local `:5435`) |
| Disparar un workflow n8n (CRM, GBP, etc.) | `n8n-mcp-vps` (vía túnel `:5679`) |
| Modificar workflows n8n en local | `n8n-mcp-local` (`:5678`) |
| Scrapear ficha GBP desde script | Wrapper local `:8095` (no scrapear directo) |
| Deployar CRM / escaparate | `rsync` a `/var/www/*` en VPS |

**Regla de oro:** frontends NUNCA atacan DB directo. Todo via n8n.

---

## VPS — 72.60.191.179 (producción)

| Servicio | URL / Puerto | Notas |
|---|---|---|
| n8n | `https://n8n.ia-bybusiness.online` | API key en `/home/rafael/.config/opencode/opencode.json` → `mcp.n8n-mcp-vps.environment.N8N_API_KEY`. ⚠️ `localhost:5678` NUNCA funciona desde VPS — usar siempre URL pública. |
| PostgreSQL (DB `crm_bybusiness`) | `:5432` interno, túnel a local `:5433` | User `rafael_admin`. Acceso MCP: `postgres-vps`. SSH directo: `docker exec fabrica-postgres-1 psql -U rafael_admin -d fabrica` |
| WAHA (WhatsApp) | `https://waha.ia-bybusiness.online` | Solo VPS |
| Traefik | `:80` / `:8080` | TLS termination |
| Deploy targets | `/var/www/crm.ia-bybusiness.com/`<br>`/var/www/escaparate-com/`<br>`/var/www/escaparate-es/` | ⚠️ `/var/www/ia-bybusiness.com/` y `/var/www/ia-bybusiness.es/` existen pero nginx NO las sirve — no usar |

### Datos que viven SOLO en VPS (schema `clientes.*`)
- `clientes.clientes` — maestro (columnas `google_cid`, `place_id`, `google_place_id`, `reputacion_at`, `estado`)
- `clientes.gbp_audit_history` — log append-only (`audit_id`, `cliente_id`, `audit_data`, `audit_source`, `audited_at`)
- `clientes.gbp_audit_cache` — último cache por cliente
- `clientes.gmaps_historico` — snapshots diarios

---

## Local — /opt/fabrica (desarrollo)

| Servicio | Puerto | Notas |
|---|---|---|
| n8n | `:5678` | Instancia separada del VPS. MCP `n8n-mcp-local`. |
| PostgreSQL (3 DBs) | `:5432` | Ver detalle abajo |
| PostgreSQL Monitor | `:5435` | DB `reputacion_cache`. MCP `postgres-monitor`. |
| Motor Go (reputación) | `:8092` | systemd, fuera Docker. Endpoint: `POST /webhook/scraper/go` body `{"query":{"q":"...","depth":5,"preload":false}}` |
| Scraper NANO | `:8090` | Docker `scraper-nano-v2` |
| Scraper HEAVY | `:8091` | Docker `scraper-heavy-v2` |
| **GBP wrapper** | `:8095` | systemd `gbp-ficha.service`. Expuesto a VPS via `tunnel-gbp.service`. |
| Dockhand | `:3000` | Docker, red `fabrica_network` |

### PostgreSQL local — 3 bases en `:5432`

| DB | Schemas | MCP | Notas |
|---|---|---|---|
| `fabrica` | `fabrica_core`, `infraestructura`, `public` (n8n) | `postgres-fabrica` | **READ-ONLY**. DDL/DML: `PGPASSWORD='...' psql -U rafael -h localhost -p 5432 -d fabrica` |
| `crm_bybusiness` | `crm_bybusiness`, `marketing`, `operaciones`, `rrhh`, `social` | `postgres-crm` | CRM core (leads, ventas, pagos, operadores, productos, campanas) |
| `chathub_bybusiness` | `chathub`, `chathub_bybusiness` | — | Config Waha + agentes IA |

⚠️ **No tiene tablas GBP.** Queries GBP desde acá fallan con "relation does not exist". Usar `postgres-vps`.

---

## Túneles systemd (always-on)

| Servicio | Dirección | Puerto expuesto | Propósito |
|---|---|---|---|
| `tunnel-n8n-vps.service` | VPS → local | `:5679` | VPS n8n accesible como localhost |
| `tunnel-postgres-vps.service` | VPS → local | `:5433` | VPS postgres accesible como localhost |
| `tunnel-gbp.service` | **local → VPS** | VPS `:8095` | VPS puede llamar al wrapper local de vuelta |

⚠️ **Dirección importa.** `tunnel-gbp` es el único que va local→VPS (VPS hace callbacks al wrapper). Los otros dos son VPS→local (local hace proxy).

---

## Reglas de placement de datos

| Tipo de dato | DB destino | MCP / Acceso |
|---|---|---|
| GBP fichas / auditorías / snapshots | `clientes.*` en VPS | `postgres-vps` |
| CRM core (leads, ventas, pagos, operadores) | `crm_bybusiness.*` local | `postgres-crm` |
| Scraper cache / reputación | `reputacion_cache` local | `postgres-monitor` |
| Registry de workflows / servicios infra | `infraestructura` / `public` local | `postgres-fabrica` |
| Chathub (Waha + agentes IA) | `chathub_bybusiness.*` local | SSH / psql directo |

---

## Antes de cualquier query o script

1. **¿Sé dónde vive la tabla?** Si no: `mem_search query: "<nombre-tabla>" project: crm_bybusiness` — las observaciones previas en engram dicen dónde está.
2. **¿Existe el topic de topología?** Si no: leer este archivo.
3. **¿Sigue siendo válido?** Si el script es nuevo, listar schemas PRIMERO (`information_schema.tables`) antes de asumir la DB.
4. **¿Frontend directo a DB?** NO. Siempre via n8n.

---

## Errores comunes

- ❌ Asumir que `postgres-crm` local tiene tablas GBP → "relation does not exist". **Fix:** usar `postgres-vps`.
- ❌ Asumir que `localhost:5678` funciona desde VPS → conexión rechazada. **Fix:** siempre URL pública `https://n8n.ia-bybusiness.online`.
- ❌ Confundir las dos instancias de n8n → workflows ejecutados en lugar equivocado. **Fix:** especificar `n8n-mcp-local` vs `n8n-mcp-vps` antes de listar/workflows.
- ❌ Confundir dirección de túneles → espera escuchar local, pero el tráfico viene de VPS. **Fix:** `tunnel-gbp` es el único local→VPS.
- ❌ Asumir que `postgres-vps` es alcanzable desde VPS via MCP → no lo es. **Fix:** SSH `docker exec fabrica-postgres-1 psql -U rafael_admin -d fabrica`.
- ❌ Modificar `postgres-fabrica` directo desde el MCP → falla, es READ-ONLY. **Fix:** `psql` directo con PGPASSWORD.

---

## Referencias cruzadas

### Engram topic keys (consultables via `mem_search`)
- `infra/topology-vps-vs-local` — este mapa (resumen)
- `infra/gbp-ficha-wrapper` — wrapper systemd + túnel
- `infra/pre-audit-batch` — script y log del batch pre-audit v2
- `schema/gbp-tables-vps` — inventario de tablas GBP en VPS
- `schema/gbp-audit-source` — taxonomía de `audit_source` ('pre-audit-v2-resume' vs 'manual')
- `discovery/pre-audit-coverage-sql` — query SQL lista para verificar cobertura

### AGENTS.md (workspace root)
- Sección "INFRAESTRUCTURA — DOS ENTORNOS" — resumen compacto (este archivo es la versión canónica completa)
- Sección "BASES DE DATOS (PostgreSQL :5432 local)" — detalle de DBs locales
- Sección "REGISTRY DE SERVICIOS" — queries SQL para workflows y endpoints

### Regla de mantenimiento
Si cambia la topología (nuevo túnel, nueva DB, nuevo deploy target): actualizar este archivo + actualizar engram `infra/topology-vps-vs-local` con `mem_update`.
