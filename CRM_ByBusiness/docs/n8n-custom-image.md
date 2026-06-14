# n8n Custom Image — Patches Horneados

Esta imagen custom de n8n tiene **dos patches críticos horneados en build time**, no en runtime. La imagen se reconstruye cada vez que hay un cambio de versión de n8n.

## Patches aplicados

### PATCH 1: GRANT_TOKEN_TTL (broker)
- **Archivo**: `dist/task-runners/task-broker/auth/task-broker-auth.service.js`
- **Cambio**: `15 * Time.seconds` → `86400 * Time.seconds` (24h)
- **Bug**: TTL de grant token 15s insuficiente → 403 en Task Broker JS runner
- **Origen**: n8n 2.11.0 bug (issue n8n-io/n8n#9700 aprox)

### PATCH 2: OFFER_VALID_TIME_MS (runner)
- **Archivo**: `node_modules/.pnpm/@n8n+task-runner@.../node_modules/@n8n/task-runner/dist/task-runner.js`
- **Cambio**: `5000` → `60000` (60s)
- **Bug**: Bajo carga, el runner no acepta offers del broker en 5s → "Offer expired - not accepted within validity window" → ejecuciones lentas (5-15s) o timeouts
- **Síntoma observado**: 1600% CPU en n8n VPS, health check 5-15s

## Build

```bash
cd /opt/fabrica/n8n-custom
docker build -t fabrica/n8n:2.11.0-patched .
docker save fabrica/n8n:2.11.0-patched | gzip > /tmp/fabrica-n8n-2.11.0-patched.tar.gz
scp /tmp/fabrica-n8n-2.11.0-patched.tar.gz root@72.60.191.179:/tmp/
```

## Deploy en VPS

```bash
ssh root@72.60.191.179
docker load -i /tmp/fabrica-n8n-2.11.0-patched.tar.gz
docker stop n8n-vps-sqlite
docker rm n8n-vps-sqlite
bash /tmp/start_n8n.sh  # usa la imagen fabrica/n8n:2.11.0-patched
```

## Re-extraer archivos al actualizar n8n

Si actualizás la versión de n8n (ej: 2.11.0 → 2.12.0), el path pnpm del task-runner puede cambiar. Re-extraé los archivos del nuevo base image:

```bash
# Extraer task-broker-auth.service.js (path estable)
docker create --name tmp-extract n8nio/n8n:NEW_VERSION --entrypoint sh
docker cp tmp-extract:/usr/local/lib/node_modules/n8n/dist/task-runners/task-broker/auth/task-broker-auth.service.js /opt/fabrica/n8n-custom/task-broker-auth.service.js
docker rm tmp-extract

# Extraer task-runner.js (path pnpm con hash)
docker run --rm n8nio/n8n:NEW_VERSION sh -c \
  'find /usr/local/lib/node_modules/n8n/node_modules/.pnpm -name task-runner.js' \
  | head -1
# Luego usar ese path para docker cp
docker create --name tmp-extract n8nio/n8n:NEW_VERSION --entrypoint sh
docker cp tmp-extract:/usr/local/lib/node_modules/n8n/node_modules/.pnpm/@n8n+task-runner@.../node_modules/@n8n/task-runner/dist/task-runner.js /opt/fabrica/n8n-custom/task-runner.js
docker rm tmp-extract

# Actualizar la versión base en el Dockerfile
sed -i 's/n8nio\/n8n:2.11.0/n8nio\/n8n:NEW_VERSION/g' /opt/fabrica/n8n-custom/Dockerfile
# Actualizar el ARG RUNNER_FILE en el Dockerfile si el hash del pnpm cambió
```

## Historia de cambios

- **2026-06-14**: Agregado PATCH 2 (OFFER_VALID_TIME_MS 5s → 60s). Bug: n8n VPS sobrecargado, health check 5-15s, "Offer expired" en logs. Aplicado a container en producción, verificado 10/10 health checks < 1.5s.
- **2026-06-11**: Dockerfile creado con PATCH 1 (GRANT_TOKEN_TTL 15s → 24h). Bug: 403 en Task Broker JS runner, jobs Code node fallaban. Imagen custom `fabrica/n8n:2.11.0-patched` reemplaza `fabrica/n8n:2.11.0-patched-original` (entrada en AGENTS.md).
