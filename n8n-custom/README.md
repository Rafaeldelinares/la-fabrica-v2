# n8n 2.11.0 — Custom Image con GRANT_TOKEN_TTL Patch

## Problema

n8n 2.11.0 tiene un bug conocido en el Task Broker JS runner: el `GRANT_TOKEN_TTL` esta hardcodeado en15 segundos (`15 * constants_1.Time.seconds.toMilliseconds`), lo que causa errores HTTP 403 cuando el grant token expira antes de que la tarea arranque.

## Solucion

En lugar de aplicar el patch via entrypoint wrapper en tiempo de ejecucion (volumen montado, fragil), este Dockerfile hornea el patch en tiempo de construccion. La imagen resultante es autocontenida.

## Construccion

```bash
cd /opt/fabrica/n8n-custom
docker build --no-cache -t fabrica/n8n:2.11.0-patched .
```

## Verificacion

```bash
# Confirmar que el patch esta horneado
docker run --rm fabrica/n8n:2.11.0-patched \
  grep "86400.*GRANT_TOKEN_TTL\|86400.*constants_1" \
 /usr/local/lib/node_modules/n8n/dist/task-runners/task-broker/auth/task-broker-auth.service.js

# Verificar tamano de imagen (delta esperado: 10-50 MB sobre la base)
docker images fabrica/n8n:2.11.0-patched
```

## Push a registry (opcional)

```bash
docker tag fabrica/n8n:2.11.0-patched registry.ia-bybusiness.online/fabrica/n8n:2.11.0-patched
docker push registry.ia-bybusiness.online/fabrica/n8n:2.11.0-patched
```

## Actualizar compose para usar la imagen custom

Reemplazar en `docker-compose.yml`:

```yaml
# ANTES (entrypoint wrapper fragile)
image: n8nio/n8n:2.11.0
entrypoint: ["/bin/sh", "/usr/local/bin/entrypoint-wrapper.sh"]
volumes:
  - /opt/fabrica/n8n-patches:/n8n-patches:ro

# AHORA (imagen autocontenida)
image: fabrica/n8n:2.11.0-patched
# entrypoint y volumen de patch ya no son necesarios
```

## Fallback

Si la construccion de la imagen falla, usar `docker-compose.fallback.yml` que vuelve al entrypoint wrapper original.
