# PENDING TASKS — CRM ByBusiness

Documento vivo de tareas pendientes. **Actualizar** cuando se cierre una tarea.

Última actualización: 2026-08-05

---

## 🔴 URGENTE — Hacer pronto

### 1. Auth-service: harden credentials
**Problema**: El password de la DB está hardcodeado en `/opt/fabrica/auth-service/config.py`. Ya pasó una vez que un cambio de password en DB rompió login para todos los usuarios (el agente reseteó el password y no se actualizó config.py).

**Fix**:
- Mover password a env var + systemd `EnvironmentFile=` con permisos restrictivos
- Documentar el password actual en `docs/CREDENTIALS.md` (gitignored) o en un password manager
- Fail-loudly bien implementado: cuando la DB connection falla, retornar mensaje claro "Error de conexión con el servidor" en lugar de "Usuario no encontrado"

**Acceptance**:
- Password NO está en source files
- Cambio de password en DB requiere solo actualizar env var + restart
- Errores de DB se muestran distintos de "usuario no encontrado"

**Notas del intento fallido**: Mi primer intento de fail-loudly usó `sed 's/^        return None$/        return "db_error"/g'` que reemplazó TODOS los `return None`, incluyendo el legítimo caso de "user not found". Rollback a `.bak.20260729`. Usar Python script con matching explícito en el siguiente intento.

**Reference**: `engram` topic_key `auth-service/password-mismatch-bug` y `auth-service/sed-regression-lesson`.

---

### 2. Lead 19697 (Cerrajeros Ensanche) — CID malo
**Problema**: `google_cid` apunta a un cerrajero de Cabañal (no el Ensanche). El auto-clear del cron solo dispara cuando la página no carga — pero este CID carga bien (solo muestra el negocio equivocado).

**Fix**:
- Short-term: clear el CID manualmente vía SQL
- Medium-term: agregar validación cuando se actualiza un lead que verifique que el CID corresponde al lead (probablemente imposible sin API de pago)
- Long-term: detectar "bad CID" cuando el rating devuelto por Google no encaja con el rango esperado del negocio

**SQL fix**:
```sql
UPDATE operaciones.leads 
SET google_cid = NULL 
WHERE id = 19697;
```

---

## 🟡 IMPORTANTE — Próxima sesión

### 3. SEO Local Module — Phase 3 (geo-grid ranking)
**Pendiente**: Schema `seo.geo_grid_positions` (o similar) + job handler `RANKING_GRID` + frontend con visualización de mapa.

**Por qué**: El diseño original del usuario incluía geo-grid (cuadrícula de puntos para ranking local). Tenemos `seo.locations.latitude`/`longitude` pero nada que los use para tracking de posiciones en una grilla.

**Acceptance**:
- Tabla con rank position + lat/lng point
- Job handler que scrapea Google Maps en cada punto de la grilla
- Visualización en `GeoGridPanel.jsx` con mapa/markers

---

### 4. SEO Local Module — Phase 5 (features avanzadas)
**Pendiente**:
- SERP features detection (featured snippet, knowledge panel, local pack) — parsear HTML adicional
- Mobile device tracking — segundo job type `SERP_KEYWORD_MOBILE` con user-agent mobile
- Multi-country configurable — campo `country` en `seo.keywords` por keyword
- Competitor tracking — trackear otras URLs además del cliente
- Reply suggestions para reseñas — templates primero, LLM después
- Botón "Add to SEO monitoring" en `ClienteDrawer.jsx` — UI para que admin agregue clientes al módulo

**Por qué**: Estos features expanden el módulo hacia ser un rank tracker completo vs solo local pack.

---

### 5. Cron verification — esperar primer run real
**Pendiente**: El cron `0 */3 * * *` debería correr cada 3 horas. La última ejecución confirmada fue manual. Verificar:
- Próximo run automático (~3h desde el último)
- Que `discovered: N` aparezca en el resumen cuando hay candidatos
- Que las SERP positions se guarden con datos reales

**Cómo verificar**:
```bash
tail -50 /var/log/fabrica/alimentador_pw.log
ssh root@72.60.191.179 "docker exec fabrica-postgres-1 psql -U rafael_admin -d crm_bybusiness -c 'SELECT id, position, scraped_at FROM seo.serp_positions ORDER BY scraped_at DESC LIMIT 5;'"
```

---

### 6. CHANGELOG.md update
**Pendiente**: El CHANGELOG.md no se actualizó con las features de esta sesión:
- Modal "leads actualizados" en popup CRON
- Tiered refresh (buckets A/B/C/D)
- Reputation history tracking
- google_cid capture
- CID-first search + cron fix
- Lead discovery (top-3 candidates)
- SEO Local Module Phase 1 (audit engine)
- SEO Local Module Phase 4 (SERP keyword tracking)

**Acceptance**: Nueva entrada bajo `[Unreleased]` con cada feature, archivos modificados, y riesgos.

---

## 🟢 NICE TO HAVE — Cuando haya tiempo

### 7. Smoke test login API
**Por qué**: El incidente de hoy (login broken) pasó desapercibido. Un smoke test diario habría alertado.

**Fix**: Script bash simple que haga curl al `/api/auth/login` y alerte si retorna error. Agregar al cron diario.

---

### 8. Discovered leads — verification
**Pendiente**: El run con `batch=5` no encontró candidatos (probablemente los leads específicos no tienen vecinos). Verificar con más leads:
- ¿Hay leads en `seo.locations` con `target_keywords` populated?
- ¿El name-search devuelve candidatos en otros negocios del mismo rubro?

**Si verification falla**, considerar:
- Relajar aún más los filtros (aceptar candidatos sin match exacto de keyword)
- Bajar el `discovery_count_seen` cap para procesar más leads

---

### 9. deploy.yml consolidation
**Status**: El archivo duplicado en `CRM_ByBusiness/.github/workflows/deploy.yml` fue eliminado (commit `787f649`). El archivo en la raíz del repo (`.github/workflows/deploy.yml`) ahora es el único. No requiere acción adicional.

---

### 10. Update engram memories
**Pendiente**: Verificar que los siguientes topic_keys están bien documentados para futuras sesiones:
- `scraper/cron-sistema-modal-data-flow` ✅
- `scraper/tiered-refresh-strategy` ✅
- `scraper/reputation-history-tracking` ✅
- `scraper/alimentador-pipe-bug-pattern` ✅
- `scraper/google-maps-cid-selectors` ✅
- `ci/env-production-missing-fix` ✅
- `ci/deploy-yml-duplicate-file-bug` ✅
- `seo/scope-clients-only` ✅
- `seo/auto-registration-trigger` ✅
- `seo/phase-4-serp-keywords-design` ✅
- `n8n/api-creation-pitfalls` ✅
- `auth-service/password-mismatch-bug` ✅
- `auth-service/sed-regression-lesson` ✅

---

## ✅ DONE — Cerrado en esta sesión

| Item | Commit/Status |
|---|---|
| Modal "leads actualizados" en popup CRON | commits `84fc370`, `2691318` |
| Tiered refresh | commit `38c8660` |
| Reputation history tracking | commit `64175ce` |
| google_cid capture | commit `5d3223d` |
| Submodules fix en deploy.yml (root) | commit `599bae3` |
| Eliminar deploy.yml duplicado | commit `787f649` |
| CID-first search + selectors tuned | commits `8ec8a84`, `9a46248` |
| Auto-clear bad CID + lead discovery | commits `2c64fe0`, `1d67422`, `a6d84fb` |
| SEO Local Phase 1 (audit engine) | schema + script |
| SEO Local Phase 4 (SERP keywords) | commits `3f5ec78` (backend), `1bfe6c8` (frontend) |
| n8n workflows SEO keywords (5) | IDs: `M4gXMaabO4sWrrv1`, `WCrku5gWZGA4oEM5`, `hgshrLARLBlWduWj`, `C7B4db4tz7pNEa1p`, `3L4zaCifQ8VSgpHG` |
| Auth-service config.py password fix | `sed -i 's/TestMeNew1/Fabrica_Industrial_2026_Secure!/'` |
| Lead 19697 CID cleared | SQL UPDATE |

---

## 📋 Convenciones para usar este documento

- **Marcá items como DONE** moviéndolos a la sección `## ✅ DONE` con fecha
- **Agregá nuevos items** según aparezcan
- **Linkeá a memories** (engram topic_keys) cuando estén relacionados
- **Actualizá "Última actualización"** al pie

**Próxima revisión sugerida**: cuando vuelvas a abrir sesión.