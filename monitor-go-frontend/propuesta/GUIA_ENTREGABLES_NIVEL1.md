# 📦 ENTREGABLES NIVEL 1 - GUÍA DE ARCHIVOS

> **Fecha de Entrega:** 12 Febrero 2026  
> **Versión:** 1.0 - Quick Win Implementation  
> **Desarrollado para:** Rafael @ IA-ByBusiness

---

## 📂 Estructura de Archivos Entregados

```
nivel1/
├── 📄 QUICKSTART.md                    ← EMPIEZA AQUÍ (5 minutos)
├── 📘 README.md                        ← Documentación completa
├── 🔧 install.sh                       ← Instalador automatizado
├── 🐳 Dockerfile                       ← Para despliegue Docker
├── 🐳 docker-compose.yml               ← Orquestación completa
├── 🚀 start.sh                         ← Script de inicio (creado por install.sh)
├── 📊 stats.sh                         ← Ver estadísticas (creado por install.sh)
├── 🧹 clean_cache.sh                   ← Limpiar caché (creado por install.sh)
│
├── 💻 CÓDIGO GO (Núcleo del Nivel 1)
│   ├── level1_scraper.go              ← Scraper HTTP principal
│   ├── level1_parser.go               ← Parser de HTML de Google Maps
│   ├── level1_cache.go                ← Sistema de caché PostgreSQL
│   ├── main_example.go                ← Ejemplo de integración
│   └── level1_test.go                 ← Tests unitarios
│
├── 🗄️ MIGRACIONES
│   └── migrations/
│       └── 001_create_level1_cache.sql  ← Schema de PostgreSQL
│
└── 📝 DOCUMENTACIÓN ADICIONAL
    ├── .env.example                   ← Variables de entorno
    └── INSTALL_INFO.txt               ← Info de instalación (creado por install.sh)
```

---

## 🎯 INICIO RÁPIDO (3 OPCIONES)

### Opción 1: Instalación Automática ⚡ (Recomendado)

```bash
# 1. Extraer archivos
unzip nivel1.zip
cd nivel1

# 2. Ejecutar instalador
chmod +x install.sh
./install.sh

# 3. Iniciar
./start.sh
```

**Tiempo estimado:** 5 minutos

---

### Opción 2: Docker 🐳 (Más Rápido)

```bash
# 1. Configurar
export DB_PASSWORD="mi_password"

# 2. Levantar
docker-compose up -d

# 3. Verificar
curl http://localhost:8082/api/health
```

**Tiempo estimado:** 2 minutos

---

### Opción 3: Manual 🔧 (Control Total)

```bash
# 1. Instalar dependencias
go get github.com/lib/pq

# 2. Migrar BD
psql -U usuario -d reputacion -f migrations/001_create_level1_cache.sql

# 3. Compilar
go build -o app main_example.go

# 4. Ejecutar
./app
```

**Tiempo estimado:** 10 minutos

---

## 📚 GUÍA DE ARCHIVOS DETALLADA

### 📄 QUICKSTART.md
**Para quién:** Todos  
**Cuándo leer:** PRIMERO  
**Contenido:**
- Instalación en 5 minutos
- Tests básicos de verificación
- Primeros comandos
- Troubleshooting rápido

**Acción:** Lee esto ANTES de hacer nada más.

---

### 📘 README.md
**Para quién:** Desarrolladores  
**Cuándo leer:** Después de la instalación  
**Contenido:**
- Arquitectura completa del Nivel 1
- API Reference detallado
- Configuración avanzada
- Métricas y monitoreo
- Testing completo
- Troubleshooting profundo

**Acción:** Consulta cuando necesites detalles técnicos.

---

### 🔧 install.sh
**Para quién:** Usuarios que prefieren instalación guiada  
**Qué hace:**
1. Verifica requisitos (Go, PostgreSQL)
2. Crea estructura de directorios
3. Instala dependencias Go
4. Ejecuta migraciones de BD
5. Crea archivo `.env`
6. Compila la aplicación
7. Ejecuta tests (opcional)
8. Crea scripts de utilidad
9. Configura servicio systemd (opcional)
10. Configura cron job de limpieza (opcional)

**Salidas:**
- Binario compilado en `bin/`
- Scripts `start.sh`, `stats.sh`, `clean_cache.sh`
- Archivo `.env` configurado
- Logs en `logs/`

**Uso:**
```bash
chmod +x install.sh
./install.sh
```

---

### 💻 ARCHIVOS GO

#### `level1_scraper.go`
**Qué es:** Motor principal del scraping HTTP  
**Responsabilidades:**
- Búsquedas individuales con reintentos
- Búsquedas batch en paralelo
- Gestión de timeouts
- Headers HTTP realistas
- Integración con caché

**Funciones principales:**
```go
NewLevel1Scraper(cache, config)  // Constructor
Search(ctx, negocio, ciudad)     // Búsqueda simple
BatchSearch(ctx, queries)        // Búsqueda múltiple
Close()                          // Cleanup
```

---

#### `level1_parser.go`
**Qué es:** Parser especializado de HTML de Google Maps  
**Responsabilidades:**
- Extracción de placeID
- Extracción de nombre, dirección, rating
- Detección de necesidad de JavaScript
- Conteo de resultados
- Limpieza de texto

**Funciones principales:**
```go
parseGoogleMapsHTML(html, query)     // Parser principal
extractPlaceID(html)                 // Extrae placeID
extractBusinessName(html)            // Extrae nombre
extractRating(html)                  // Extrae rating
detectRequiresJS(html)               // Detecta si necesita JS
```

---

#### `level1_cache.go`
**Qué es:** Sistema de caché con PostgreSQL  
**Responsabilidades:**
- Lectura/escritura en PostgreSQL
- Gestión de TTL
- Estadísticas del caché
- Limpieza automática
- Top queries

**Funciones principales:**
```go
NewLevel1Cache(db, ttlDays)       // Constructor
Get(ctx, query)                   // Leer del caché
Set(ctx, query, result)           // Guardar en caché
CleanExpired(ctx)                 // Limpiar expirados
GetStats(ctx)                     // Estadísticas
GetTopQueries(ctx, limit)         // Queries populares
```

---

#### `main_example.go`
**Qué es:** Ejemplo de integración completo  
**Responsabilidades:**
- Servidor HTTP con endpoints
- Cascada de niveles (0→1→2/3)
- Manejo de errores
- Logging estructurado

**Endpoints implementados:**
```
GET  /api/search         - Búsqueda simple
POST /api/batch-search   - Búsqueda múltiple
GET  /api/stats          - Estadísticas
GET  /api/health         - Health check
```

**Cómo usarlo:**
1. Copia como base de tu `main.go`
2. Adapta la función `chromiumScrape()` a tu código existente
3. Personaliza los endpoints según necesites

---

#### `level1_test.go`
**Qué es:** Suite completa de tests unitarios  
**Cobertura:**
- Construcción de queries
- Extracción de datos (placeID, nombre, rating)
- Detección de resultados
- Limpieza de texto
- Configuración

**Cómo ejecutar:**
```bash
go test ./nivel1 -v              # Todos los tests
go test ./nivel1 -cover          # Con coverage
go test ./nivel1 -bench=.        # Benchmarks
```

---

### 🗄️ MIGRACIONES

#### `001_create_level1_cache.sql`
**Qué es:** Schema completo de PostgreSQL  
**Incluye:**
- Tabla `level1_cache` con índices optimizados
- Funciones auxiliares:
  - `cleanup_expired_level1_cache()` - Limpieza automática
  - `get_level1_cache_stats()` - Estadísticas
  - `reset_level1_cache_access_counts()` - Reset contadores
- Triggers automáticos
- Vistas útiles:
  - `level1_cache_valid` - Entradas válidas
  - `level1_cache_top_queries` - Queries populares
  - `level1_cache_daily_stats` - Stats diarias
- Comentarios documentados

**Cómo ejecutar:**
```bash
psql -U usuario -d reputacion -f migrations/001_create_level1_cache.sql
```

---

### 🐳 DOCKER

#### `Dockerfile`
**Qué es:** Imagen Docker optimizada (< 15MB)  
**Características:**
- Multi-stage build
- Binario estático (sin dependencias)
- Usuario no-root (seguridad)
- Health check integrado
- Logs en JSON

**Cómo construir:**
```bash
docker build -t reputacion-nivel1:latest -f Dockerfile .
```

---

#### `docker-compose.yml`
**Qué es:** Orquestación completa del sistema  
**Servicios incluidos:**

**Siempre activos:**
- `postgres` - Base de datos con migraciones automáticas
- `nivel1-backend` - Backend Go con Nivel 1
- `scraper-nano` - Chromium ligero (Nivel 2)
- `scraper-heavy` - Chromium completo (Nivel 3)

**Opcionales (profiles):**
- `prometheus` - Monitorización de métricas
- `grafana` - Dashboards visuales
- `redis` - Caché in-memory adicional
- `frontend` - Interfaz React

**Cómo usar:**
```bash
# Solo servicios básicos
docker-compose up -d

# Con monitorización
docker-compose --profile monitoring up -d

# Con todo
docker-compose --profile monitoring --profile cache up -d
```

---

## 🎯 FLUJO DE TRABAJO RECOMENDADO

### Día 1: Instalación y Pruebas (2 horas)

```bash
# 1. Instalar (5 min)
./install.sh

# 2. Verificar (5 min)
curl http://localhost:8082/api/health
curl "http://localhost:8082/api/search?negocio=Test&ciudad=Madrid"

# 3. Ejecutar tests (10 min)
go test ./nivel1 -v

# 4. Monitorear (30 min)
tail -f logs/nivel1.log
./stats.sh

# 5. Hacer búsquedas de prueba (1 hora)
# - 50-100 queries diferentes
# - Observar latencias
# - Verificar cache hit rate
```

---

### Día 2: Integración con tu Código Existente (4 horas)

```bash
# 1. Backup de tu código actual
cp -r tu_proyecto tu_proyecto.backup

# 2. Integrar Nivel 1 (2 horas)
# - Copiar archivos nivel1/ a tu proyecto
# - Adaptar main.go según main_example.go
# - Conectar con tu contenedor Chromium existente

# 3. Testing (1 hora)
# - Tests unitarios
# - Tests de integración
# - Tests de carga básicos

# 4. Ajustar configuración (1 hora)
# - Timeouts
# - TTL del caché
# - Límites de recursos
```

---

### Día 3: Despliegue en Producción (3 horas)

```bash
# 1. Configurar ambiente de producción
# - Variables de entorno
# - Certificados SSL
# - Firewall

# 2. Desplegar con Docker
docker-compose -f docker-compose.yml up -d

# 3. Monitoreo inicial
# - Verificar logs
# - Configurar alertas
# - Dashboard de métricas

# 4. Optimización
# - Ajustar TTL según datos reales
# - Configurar limpieza automática
```

---

## 📊 MÉTRICAS DE ÉXITO

Después de 1 semana en producción, deberías ver:

### Objetivos Nivel 1:
- ✅ Cache hit rate: 70-80%
- ✅ Latencia promedio: < 50ms
- ✅ Tráfico a Chromium: Reducido en 60%+
- ✅ Consumo RAM total: Reducido en 50%+
- ✅ Uptime: > 99%

### Cómo verificar:
```bash
# Stats del caché
./stats.sh

# O desde SQL
psql -U reputacion_user -d reputacion -c "SELECT * FROM get_level1_cache_stats();"

# Logs de rendimiento
grep "Nivel 1" logs/nivel1.log | grep "ms"
```

---

## 🆘 SOPORTE Y AYUDA

### Documentación:
1. **QUICKSTART.md** - Inicio rápido
2. **README.md** - Documentación completa
3. **ANALISIS_TECNICO_MEJORAS_REPUTACION_DIGITAL.md** - Análisis profundo

### Troubleshooting:
- Revisar `README.md` sección "Troubleshooting"
- Logs en `logs/nivel1.log`
- Logs de Docker: `docker-compose logs -f`

### Contacto:
- **Email:** rafael@ia-bybusiness.com
- **Proyecto:** https://ia-bybusiness.com

---

## ✅ CHECKLIST DE INSTALACIÓN

Usa este checklist para verificar que todo está correcto:

- [ ] Go 1.21+ instalado
- [ ] PostgreSQL 13+ instalado y corriendo
- [ ] Migración de BD ejecutada exitosamente
- [ ] Tabla `level1_cache` creada
- [ ] Archivo `.env` configurado
- [ ] Binario compilado sin errores
- [ ] Tests unitarios pasan (opcional)
- [ ] Servidor inicia correctamente
- [ ] `/api/health` responde OK
- [ ] Primera búsqueda funciona
- [ ] Caché funciona (segunda búsqueda más rápida)
- [ ] Stats muestra datos

---

## 🚀 PRÓXIMOS PASOS

Una vez que el Nivel 1 esté funcionando:

### Semana 1-2: Optimización
1. Ajustar TTL del caché según datos reales
2. Configurar limpieza automática (cron)
3. Implementar rate limiting básico

### Semana 3-4: Escalabilidad
1. Implementar sistema de colas (Redis + Asynq)
2. Configurar monitorización (Prometheus + Grafana)
3. Health checks avanzados

### Mes 2: Arquitectura Dual
1. Separar scraper-nano y scraper-heavy
2. Load balancing entre scrapers
3. Auto-scaling básico

### Mes 3: Migración a Playwright
1. Tests comparativos
2. Migración gradual
3. Optimización final

---

## 🎉 CONCLUSIÓN

Tienes todo lo necesario para implementar el Nivel 1 y ver resultados inmediatos:

**Ahorro esperado:**
- 📉 60% menos uso de RAM
- ⚡ 95% mejor latencia
- 💰 50% reducción de costes de servidor
- 🚀 10x más throughput

**Tiempo de implementación:**
- ⏱️ Quick win: 5 minutos (instalación básica)
- 🔧 Integración completa: 1-2 días
- 🎯 Producción: 3-5 días

---

**¡Éxito con la implementación!** 🚀

*IA-ByBusiness © 2026*
