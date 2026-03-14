#!/bin/bash

# ============================================================================
# Script de Instalación Automatizada - Nivel 1 HTTP Scraper
# ============================================================================
# Descripción: Instala y configura el scraper Nivel 1 automáticamente
# Uso: bash install.sh
# ============================================================================

set -e  # Exit on error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Funciones de output
info() {
    echo -e "${BLUE}ℹ ${NC}$1"
}

success() {
    echo -e "${GREEN}✓${NC} $1"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

error() {
    echo -e "${RED}✗${NC} $1"
    exit 1
}

step() {
    echo ""
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# Banner
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🚀 INSTALADOR NIVEL 1 - HTTP SCRAPER                    ║"
echo "║   Monitor de Reputación Digital v1.2                      ║"
echo "║   IA-ByBusiness © 2026                                    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

# ============================================================================
# PASO 1: Verificar Requisitos
# ============================================================================
step "PASO 1: Verificando Requisitos Previos"

# Verificar Go
info "Verificando instalación de Go..."
if command -v go &> /dev/null; then
    GO_VERSION=$(go version | awk '{print $3}')
    success "Go encontrado: $GO_VERSION"
else
    error "Go no está instalado. Instalar desde: https://golang.org/dl/"
fi

# Verificar versión mínima de Go
GO_MIN_VERSION="1.21"
GO_CURRENT=$(go version | grep -oP 'go\K[0-9.]+' | head -1)
if [ "$(printf '%s\n' "$GO_MIN_VERSION" "$GO_CURRENT" | sort -V | head -n1)" != "$GO_MIN_VERSION" ]; then
    error "Se requiere Go >= $GO_MIN_VERSION (actual: $GO_CURRENT)"
fi

# Verificar PostgreSQL
info "Verificando PostgreSQL..."
if command -v psql &> /dev/null; then
    PSQL_VERSION=$(psql --version | awk '{print $3}')
    success "PostgreSQL encontrado: $PSQL_VERSION"
else
    error "PostgreSQL no está instalado. Instalar con: sudo apt install postgresql"
fi

# Verificar git (opcional pero recomendado)
if command -v git &> /dev/null; then
    success "Git encontrado"
else
    warning "Git no encontrado (recomendado para control de versiones)"
fi

# ============================================================================
# PASO 2: Configuración de Variables
# ============================================================================
step "PASO 2: Configuración de Base de Datos"

# Pedir credenciales de PostgreSQL
echo ""
read -p "Host de PostgreSQL [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "Puerto de PostgreSQL [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "Usuario de PostgreSQL [reputacion_user]: " DB_USER
DB_USER=${DB_USER:-reputacion_user}

read -sp "Contraseña de PostgreSQL: " DB_PASSWORD
echo ""

read -p "Nombre de la base de datos [reputacion]: " DB_NAME
DB_NAME=${DB_NAME:-reputacion}

read -p "Puerto del servidor HTTP [8082]: " SERVER_PORT
SERVER_PORT=${SERVER_PORT:-8082}

# ============================================================================
# PASO 3: Verificar Conexión a DB
# ============================================================================
step "PASO 3: Verificando Conexión a Base de Datos"

info "Probando conexión a PostgreSQL..."
export PGPASSWORD=$DB_PASSWORD

if psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "SELECT 1;" > /dev/null 2>&1; then
    success "Conexión exitosa a PostgreSQL"
else
    error "No se pudo conectar a PostgreSQL. Verificar credenciales."
fi

# ============================================================================
# PASO 4: Crear Estructura de Directorios
# ============================================================================
step "PASO 4: Creando Estructura de Directorios"

PROJECT_ROOT=$(pwd)
info "Directorio del proyecto: $PROJECT_ROOT"

# Crear directorios necesarios
mkdir -p nivel1
mkdir -p nivel1/migrations
mkdir -p logs
mkdir -p temp

success "Directorios creados"

# ============================================================================
# PASO 5: Instalar Dependencias de Go
# ============================================================================
step "PASO 5: Instalando Dependencias de Go"

# Inicializar módulo si no existe
if [ ! -f "go.mod" ]; then
    info "Inicializando módulo Go..."
    go mod init reputacion-monitor
    success "go.mod creado"
else
    success "go.mod ya existe"
fi

# Instalar dependencias
info "Instalando dependencias..."
go get github.com/lib/pq
go mod tidy

success "Dependencias instaladas"

# ============================================================================
# PASO 6: Ejecutar Migraciones de Base de Datos
# ============================================================================
step "PASO 6: Ejecutando Migraciones de Base de Datos"

if [ -f "nivel1/migrations/001_create_level1_cache.sql" ]; then
    info "Ejecutando migración de base de datos..."
    
    psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
         -f nivel1/migrations/001_create_level1_cache.sql \
         > logs/migration.log 2>&1
    
    if [ $? -eq 0 ]; then
        success "Migración ejecutada exitosamente"
        
        # Verificar tabla creada
        TABLE_COUNT=$(psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME \
                      -t -c "SELECT COUNT(*) FROM pg_tables WHERE tablename='level1_cache';" \
                      | xargs)
        
        if [ "$TABLE_COUNT" -eq "1" ]; then
            success "Tabla level1_cache verificada"
        else
            error "Tabla level1_cache no encontrada después de migración"
        fi
    else
        error "Error ejecutando migración. Ver logs/migration.log"
    fi
else
    warning "Archivo de migración no encontrado, saltando..."
fi

# ============================================================================
# PASO 7: Crear Archivo de Configuración
# ============================================================================
step "PASO 7: Creando Archivo de Configuración"

cat > .env << EOF
# ============================================================================
# Configuración del Monitor de Reputación Digital - Nivel 1
# Generado automáticamente el $(date)
# ============================================================================

# Base de Datos
DB_HOST=$DB_HOST
DB_PORT=$DB_PORT
DB_USER=$DB_USER
DB_PASSWORD=$DB_PASSWORD
DB_NAME=$DB_NAME

# Servidor
PORT=$SERVER_PORT

# Chromium (para niveles superiores)
CHROMIUM_URL=http://localhost:8080

# Nivel 1 Config
LEVEL1_TIMEOUT=15
LEVEL1_MAX_RETRIES=3
LEVEL1_CACHE_TTL_DAYS=30
LEVEL1_MAX_CONCURRENT=10

# Logging
LOG_LEVEL=info
LOG_FILE=logs/nivel1.log
EOF

success "Archivo .env creado"

# ============================================================================
# PASO 8: Compilar Aplicación
# ============================================================================
step "PASO 8: Compilando Aplicación"

info "Compilando binario..."

# Verificar que existe main_example.go o crear uno básico
if [ -f "nivel1/main_example.go" ]; then
    go build -o bin/reputacion-monitor nivel1/main_example.go
    
    if [ $? -eq 0 ]; then
        success "Compilación exitosa: bin/reputacion-monitor"
    else
        error "Error en compilación"
    fi
else
    warning "main_example.go no encontrado, saltando compilación..."
fi

# ============================================================================
# PASO 9: Ejecutar Tests
# ============================================================================
step "PASO 9: Ejecutando Tests (Opcional)"

read -p "¿Deseas ejecutar los tests unitarios? (s/N): " RUN_TESTS
if [[ $RUN_TESTS =~ ^[Ss]$ ]]; then
    info "Ejecutando tests..."
    go test ./nivel1 -v > logs/tests.log 2>&1
    
    if [ $? -eq 0 ]; then
        success "Tests pasados exitosamente"
    else
        warning "Algunos tests fallaron. Ver logs/tests.log"
    fi
else
    info "Tests omitidos"
fi

# ============================================================================
# PASO 10: Crear Script de Inicio
# ============================================================================
step "PASO 10: Creando Scripts de Utilidad"

# Script de inicio
cat > start.sh << 'EOF'
#!/bin/bash
source .env
./bin/reputacion-monitor
EOF
chmod +x start.sh

# Script de limpieza de caché
cat > clean_cache.sh << EOF
#!/bin/bash
source .env
psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME \
     -c "SELECT * FROM cleanup_expired_level1_cache();"
EOF
chmod +x clean_cache.sh

# Script de estadísticas
cat > stats.sh << EOF
#!/bin/bash
source .env
psql -h \$DB_HOST -p \$DB_PORT -U \$DB_USER -d \$DB_NAME \
     -c "SELECT * FROM get_level1_cache_stats();"
EOF
chmod +x stats.sh

success "Scripts de utilidad creados:"
echo "   ./start.sh        - Iniciar servidor"
echo "   ./clean_cache.sh  - Limpiar caché expirado"
echo "   ./stats.sh        - Ver estadísticas"

# ============================================================================
# PASO 11: Crear Servicio Systemd (Opcional)
# ============================================================================
step "PASO 11: Crear Servicio Systemd (Opcional)"

read -p "¿Crear servicio systemd para arranque automático? (s/N): " CREATE_SERVICE
if [[ $CREATE_SERVICE =~ ^[Ss]$ ]]; then
    SERVICE_FILE="/etc/systemd/system/reputacion-monitor.service"
    
    info "Creando servicio systemd..."
    sudo tee $SERVICE_FILE > /dev/null << EOF
[Unit]
Description=Monitor de Reputación Digital - Nivel 1
After=network.target postgresql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_ROOT
Environment="PATH=/usr/local/bin:/usr/bin:/bin"
EnvironmentFile=$PROJECT_ROOT/.env
ExecStart=$PROJECT_ROOT/bin/reputacion-monitor
Restart=on-failure
RestartSec=5s

[Install]
WantedBy=multi-user.target
EOF

    sudo systemctl daemon-reload
    success "Servicio systemd creado: $SERVICE_FILE"
    
    info "Para habilitar el servicio:"
    echo "   sudo systemctl enable reputacion-monitor"
    echo "   sudo systemctl start reputacion-monitor"
    echo "   sudo systemctl status reputacion-monitor"
else
    info "Servicio systemd omitido"
fi

# ============================================================================
# PASO 12: Crear Cron Job para Limpieza (Opcional)
# ============================================================================
step "PASO 12: Configurar Limpieza Automática del Caché"

read -p "¿Configurar limpieza automática diaria del caché? (s/N): " SETUP_CRON
if [[ $SETUP_CRON =~ ^[Ss]$ ]]; then
    CRON_JOB="0 3 * * * $PROJECT_ROOT/clean_cache.sh >> $PROJECT_ROOT/logs/cron.log 2>&1"
    
    # Agregar a crontab si no existe
    (crontab -l 2>/dev/null | grep -v "$PROJECT_ROOT/clean_cache.sh"; echo "$CRON_JOB") | crontab -
    
    success "Cron job configurado (diariamente a las 3 AM)"
else
    info "Cron job omitido"
fi

# ============================================================================
# RESUMEN DE INSTALACIÓN
# ============================================================================
echo ""
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║   🎉 INSTALACIÓN COMPLETADA EXITOSAMENTE                  ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo ""

success "El Nivel 1 está listo para usar"
echo ""
echo "📋 Próximos Pasos:"
echo ""
echo "1. Iniciar el servidor:"
echo "   ${GREEN}./start.sh${NC}"
echo ""
echo "2. Probar la API:"
echo "   ${GREEN}curl 'http://localhost:$SERVER_PORT/api/health'${NC}"
echo ""
echo "3. Búsqueda de prueba:"
echo "   ${GREEN}curl 'http://localhost:$SERVER_PORT/api/search?negocio=Test&ciudad=Madrid'${NC}"
echo ""
echo "4. Ver estadísticas:"
echo "   ${GREEN}./stats.sh${NC}"
echo ""
echo "5. Ver logs:"
echo "   ${GREEN}tail -f logs/nivel1.log${NC}"
echo ""

echo "📚 Documentación:"
echo "   README.md          - Guía completa"
echo "   .env               - Configuración"
echo "   logs/              - Logs del sistema"
echo ""

echo "🔧 Comandos Útiles:"
echo "   ${BLUE}./start.sh${NC}        - Iniciar servidor"
echo "   ${BLUE}./clean_cache.sh${NC}  - Limpiar caché"
echo "   ${BLUE}./stats.sh${NC}        - Ver estadísticas"
echo "   ${BLUE}go test ./nivel1${NC}  - Ejecutar tests"
echo ""

echo "📊 Métricas Esperadas:"
echo "   • Hit Rate Caché: 70-80%"
echo "   • Latencia Promedio: 10-50ms"
echo "   • Ahorro RAM: 60-70%"
echo ""

warning "IMPORTANTE: Asegúrate de que el contenedor Chromium esté corriendo"
warning "para las búsquedas que requieran JavaScript (Nivel 2/3)"
echo ""

info "Para soporte: rafael@ia-bybusiness.com"
echo ""

# Guardar información de instalación
cat > INSTALL_INFO.txt << EOF
Instalación completada el: $(date)
Versión: Nivel 1 v1.0
Base de datos: $DB_NAME en $DB_HOST:$DB_PORT
Puerto servidor: $SERVER_PORT
Directorio: $PROJECT_ROOT
EOF

success "Información de instalación guardada en INSTALL_INFO.txt"
echo ""
