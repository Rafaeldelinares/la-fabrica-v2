#!/bin/bash

echo "🔧 ACTUALIZACIÓN MONITOR ENGINE - Corrección de is_simulated y filtro de basura"
echo "==============================================================================="
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar que estamos en el directorio correcto
if [ ! -d "/opt/fabrica/monitor-go" ]; then
    echo -e "${RED}❌ Error: /opt/fabrica/monitor-go no existe${NC}"
    exit 1
fi

cd /opt/fabrica/monitor-go

echo -e "${YELLOW}📦 PASO 1: Crear backup de los archivos originales${NC}"
BACKUP_DIR="backup_$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp main.go "$BACKUP_DIR/main.go.bak" 2>/dev/null && echo "  ✓ main.go respaldado"
cp scraper_service.go "$BACKUP_DIR/scraper_service.go.bak" 2>/dev/null && echo "  ✓ scraper_service.go respaldado"
cp monitor_engine "$BACKUP_DIR/monitor_engine.bak" 2>/dev/null && echo "  ✓ monitor_engine respaldado"
echo ""

echo -e "${YELLOW}📝 PASO 2: Copiar archivos corregidos${NC}"
# Los archivos ya están en /home/claude/, los copiamos aquí
if [ -f "/home/claude/main.go" ] && [ -f "/home/claude/scraper_service.go" ]; then
    cp /home/claude/main.go ./main.go
    echo "  ✓ main.go actualizado"
    cp /home/claude/scraper_service.go ./scraper_service.go
    echo "  ✓ scraper_service.go actualizado"
else
    echo -e "${RED}  ❌ Error: Archivos corregidos no encontrados en /home/claude/${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}🔨 PASO 3: Recompilar monitor_engine${NC}"
go build -o monitor_engine
if [ $? -eq 0 ]; then
    echo -e "  ${GREEN}✓ Compilación exitosa${NC}"
else
    echo -e "${RED}  ❌ Error en compilación. Restaurando backup...${NC}"
    cp "$BACKUP_DIR/main.go.bak" ./main.go
    cp "$BACKUP_DIR/scraper_service.go.bak" ./scraper_service.go
    cp "$BACKUP_DIR/monitor_engine.bak" ./monitor_engine
    echo -e "${RED}  Archivos restaurados. Revisa los errores de compilación.${NC}"
    exit 1
fi
echo ""

echo -e "${YELLOW}🔄 PASO 4: Reiniciar servicio${NC}"
# Encontrar el PID del proceso actual
OLD_PID=$(pgrep -f "./monitor_engine")
if [ ! -z "$OLD_PID" ]; then
    echo "  Deteniendo proceso antiguo (PID: $OLD_PID)..."
    kill $OLD_PID
    sleep 2
    
    # Verificar que se detuvo
    if ps -p $OLD_PID > /dev/null 2>&1; then
        echo -e "${YELLOW}  Proceso no respondió a SIGTERM, usando SIGKILL...${NC}"
        kill -9 $OLD_PID
        sleep 1
    fi
    echo "  ✓ Proceso antiguo detenido"
else
    echo "  ℹ No había proceso corriendo"
fi

echo "  Iniciando nuevo proceso..."
nohup ./monitor_engine > motor.log 2>&1 &
NEW_PID=$!
sleep 2

# Verificar que arrancó
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo -e "  ${GREEN}✓ Servicio iniciado correctamente (PID: $NEW_PID)${NC}"
else
    echo -e "${RED}  ❌ Error: El servicio no arrancó. Revisa motor.log${NC}"
    tail -20 motor.log
    exit 1
fi
echo ""

echo -e "${YELLOW}🧪 PASO 5: Probar el servicio${NC}"
sleep 3
echo "  Probando health check..."
HEALTH=$(curl -s http://localhost:8092/health | jq -r '.status' 2>/dev/null)
if [ "$HEALTH" = "ok" ]; then
    echo -e "  ${GREEN}✓ Health check: OK${NC}"
else
    echo -e "${YELLOW}  ⚠ Health check no respondió correctamente${NC}"
fi
echo ""

echo -e "${GREEN}✅ ACTUALIZACIÓN COMPLETADA${NC}"
echo ""
echo "📋 Resumen de cambios:"
echo "  • IsSimulated: Cambiado de 'depth < 5' a 'false'"
echo "  • Filtro de basura: Ahora ignora resultados con rating=0 y reviews=0 sin datos reales"
echo ""
echo "🗂️  Backup guardado en: /opt/fabrica/monitor-go/$BACKUP_DIR"
echo "📊 Logs del servicio: /opt/fabrica/monitor-go/motor.log"
echo "🔍 Nuevo PID: $NEW_PID"
echo ""
echo -e "${YELLOW}🧹 PASO 6: Limpiar caché corrupto en PostgreSQL${NC}"
echo "Ejecuta esto en pgAdmin (base de datos 'reputacion_cache', puerto 5435):"
echo ""
echo "  DELETE FROM scraped_cache WHERE data_json::text LIKE '%is_simulated\":true%';"
echo ""
echo -e "${GREEN}Luego prueba con:${NC}"
echo "  curl -X POST http://localhost:8092/webhook/scraper/go -H \"Content-Type: application/json\" -d '{\"query\":{\"q\":\"ferreterías Málaga\",\"depth\":3,\"preload\":false}}' | python3 -m json.tool"
echo ""
