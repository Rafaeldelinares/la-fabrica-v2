# ⚡ QUICKSTART - Nivel 1 en 5 Minutos

> **Objetivo:** Tener el Nivel 1 funcionando en menos de 5 minutos.

---

## 🚀 Opción 1: Instalación Automática (Recomendado)

```bash
# 1. Dar permisos al instalador
chmod +x install.sh

# 2. Ejecutar instalador
./install.sh

# 3. Iniciar servidor
./start.sh
```

¡Listo! El servidor debería estar corriendo en `http://localhost:8082`

---

## 🐳 Opción 2: Con Docker (Más Rápido)

```bash
# 1. Configurar contraseña de DB
export DB_PASSWORD="tu_password_seguro"

# 2. Levantar servicios
docker-compose up -d

# 3. Verificar que está corriendo
docker-compose ps
```

---

## ✅ Verificar Instalación

### Test 1: Health Check
```bash
curl http://localhost:8082/api/health
```

**Respuesta esperada:**
```json
{
  "status": "healthy",
  "timestamp": "2026-02-12T10:00:00Z",
  "version": "1.0.0",
  "level1": "enabled"
}
```

### Test 2: Búsqueda de Prueba
```bash
curl "http://localhost:8082/api/search?negocio=Restaurante&ciudad=Madrid"
```

**Respuesta esperada:**
```json
{
  "data": {
    "query": "Restaurante Madrid",
    "found": true,
    "level": 1,
    "latency_ms": 45,
    "cache_hit": false
  },
  "level": 1,
  "latency_ms": 47
}
```

### Test 3: Estadísticas del Caché
```bash
curl http://localhost:8082/api/stats
```

---

## 📊 Primeros Pasos

### 1. Búsqueda Simple (GET)
```bash
curl "http://localhost:8082/api/search?negocio=Hotel Costa&ciudad=Marbella"
```

### 2. Búsqueda Batch (POST)
```bash
curl -X POST http://localhost:8082/api/batch-search \
  -H "Content-Type: application/json" \
  -d '{
    "queries": [
      {"negocio": "Restaurante A", "ciudad": "Madrid"},
      {"negocio": "Hotel B", "ciudad": "Barcelona"},
      {"negocio": "Bar C", "ciudad": "Sevilla"}
    ]
  }'
```

### 3. Forzar Uso de Chromium (para comparar)
```bash
curl "http://localhost:8082/api/search?negocio=Test&ciudad=Madrid&force_chromium=true"
```

---

## 🔍 Monitoreo Básico

### Ver Logs en Tiempo Real
```bash
# Si instalaste manualmente
tail -f logs/nivel1.log

# Si usas Docker
docker-compose logs -f nivel1-backend
```

### Estadísticas de PostgreSQL
```bash
# Directamente con psql
psql -U reputacion_user -d reputacion -c "SELECT * FROM get_level1_cache_stats();"

# O con el script
./stats.sh
```

### Limpiar Caché Expirado
```bash
# Con el script
./clean_cache.sh

# O manualmente
psql -U reputacion_user -d reputacion -c "SELECT * FROM cleanup_expired_level1_cache();"
```

---

## 🐛 Troubleshooting Rápido

### Problema: "Connection refused"
```bash
# Verificar que el servidor está corriendo
ps aux | grep reputacion-monitor

# Verificar puerto
netstat -tulpn | grep 8082

# Reiniciar
./start.sh
```

### Problema: "Database connection failed"
```bash
# Verificar PostgreSQL
systemctl status postgresql

# O con Docker
docker-compose ps postgres

# Probar conexión manual
psql -U reputacion_user -d reputacion -c "SELECT 1;"
```

### Problema: "Table does not exist"
```bash
# Ejecutar migración manualmente
psql -U reputacion_user -d reputacion -f nivel1/migrations/001_create_level1_cache.sql
```

---

## 📈 Métricas Esperadas (Primeros 100 Queries)

Después de ~100 búsquedas deberías ver:

```
Cache Hit Rate:    20-30% (aumenta con el tiempo)
Latencia Promedio: 50-100ms
Nivel 1 Hit Rate:  60-70%
Nivel 2/3 Hit Rate: 5-10%
```

Con el tiempo (1000+ queries):

```
Cache Hit Rate:    70-80%
Latencia Promedio: 10-20ms
Nivel 1 Hit Rate:  85-90%
Nivel 2/3 Hit Rate: 2-5%
```

---

## 🎯 Próximos Pasos

1. ✅ Lee el [README.md](README.md) completo
2. ✅ Revisa el [Análisis Técnico](../ANALISIS_TECNICO_MEJORAS_REPUTACION_DIGITAL.md)
3. ✅ Configura monitorización (Prometheus + Grafana)
4. ✅ Implementa sistema de colas
5. ✅ Planifica migración a Playwright

---

## 🆘 Ayuda

**Documentación:**
- README.md - Guía completa
- ANALISIS_TECNICO_MEJORAS_REPUTACION_DIGITAL.md - Análisis profundo

**Contacto:**
- Email: rafael@ia-bybusiness.com
- Proyecto: https://ia-bybusiness.com

---

## 🎉 ¡Felicidades!

Si llegaste hasta aquí, ya tienes el Nivel 1 funcionando.

**Siguiente objetivo:** Lograr 80% de cache hit rate en producción 🚀
