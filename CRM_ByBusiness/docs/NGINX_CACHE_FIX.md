# Fix: nginx 1-year cache que ocultaba bundles nuevos

**Fecha**: 2026-06-21
**Severidad**: Alta (impide deploys visibles sin hard refresh)
**Estado**: Resuelto
**Aplica a**: VPS `72.60.191.179`, container `web-crm-bybusiness`

## Síntoma

Después de hacer deploy (`rsync -az --delete dist/ root@72.60.191.179:/var/www/crm.ia-bybusiness.com/`), el navegador seguía mostrando el bundle viejo. Solo `Ctrl+Shift+R` o pestaña incognito funcionaba.

## Causa raíz

El nginx dentro del container `web-crm-bybusiness` tenía esta regla para todos los assets estáticos:

```nginx
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
    expires 1y;
    add_header Cache-Control public;
}
```

`expires 1y` + `Cache-Control: public` significa: **el navegador y proxies pueden cachear el recurso por 365 días**. El bundle JS quedaba en el disco del navegador por un año, incluso cuando se servía uno nuevo con un hash diferente en el nombre del archivo.

## Por qué pasó

1. Vite genera bundles con hash: `index-5ZxyA0eJ.js`, `index-renadN4B.js`, etc.
2. El `index.html` referencia el bundle nuevo en cada deploy (cambia el `<script src>`).
3. El navegador cachea `index.html` con `Cache-Control: no-cache, expires 0` (eso ya estaba bien).
4. **Pero el navegador también cachea el bundle JS referenciado**, y el nginx le decía "podés guardarlo por 1 año".
5. En deploys, Vite genera un nuevo `index-XXXXX.js` y actualiza el `index.html` para apuntar a él. Pero el navegador ya tenía el JS anterior cacheado, y como el nombre del archivo cambia, **no hay forma de invalidar el cache sin recargar a mano**.

## Fix aplicado

**Archivo en el host**: `/opt/fabrica/data/nginx/crm-bybusiness.conf`
**Montado en container**: `/etc/nginx/conf.d/default.conf` (vía `docker inspect web-crm-bybusiness --format '{{.Mounts}}'`)

```diff
-    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff2)$ {
-        expires 1y;
-        add_header Cache-Control public;
-    }
+    location ~* \.(js|css)$ {
+        add_header Cache-Control no-cache;
+        expires 0;
+    }
+
+    location ~* \.(png|jpg|jpeg|gif|ico|svg|woff2)$ {
+        expires 1y;
+        add_header Cache-Control public;
+    }
```

Lógica:
- **JS y CSS** → `no-cache, expires 0` (el navegador SIEMPRE revalida con `If-Modified-Since`)
- **Imágenes y fonts** → `1y, public` (assets que NO cambian entre deploys)

## Recargar nginx sin downtime

```bash
ssh root@72.60.191.179
docker exec web-crm-bybusiness nginx -s reload
```

⚠️ Si el archivo en el host está en modo read-only dentro del container, NO usar `docker cp` (falla con "device or resource busy"). Editar directamente en el host.

## Verificación

```bash
curl -sS -I https://crm.ia-bybusiness.com/assets/index-5ZxyA0eJ.js | grep -iE "cache-control|expires"
# Esperado:
#   cache-control: no-cache
#   expires: <mismo momento del request>
```

## Lección (alternativa mejor a futuro)

La solución "correcta" en producción es:
1. Vite genera bundles con hash único → `index-XXXXX.js`
2. `index.html` tiene `<script src="/assets/index-XXXXX.js?v=COMMIT_HASH">` (cache-buster en query string)
3. Imágenes y fonts con `expires 1y` (no cambian)
4. `index.html` con `Cache-Control: no-cache` (ya estaba bien)

Eso permite que el bundle JS se cachee 1 año (porque su nombre cambia) pero el HTML siempre se revalida. La fix actual (no-cache para JS) es más conservadora y funciona, pero sacrifica ancho de banda en cada page load.

## Por qué no es `Last-Modified` / ETag

El bundle nuevo tiene `Last-Modified` y `ETag` actualizados, pero con `expires 1y`, el navegador **ni siquiera pregunta** al servidor — confía en su cache local. Por eso `no-cache` (que fuerza revalidación) es la solución correcta acá.
