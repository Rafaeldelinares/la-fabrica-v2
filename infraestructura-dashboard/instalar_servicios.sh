#!/bin/bash

echo "🏭 INSTALACIÓN DE SERVICIOS - INFRAESTRUCTURA DASHBOARD"
echo "========================================================"
echo ""

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Este script debe ejecutarse como root o con sudo${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Paso 1: Copiar archivos de servicio a systemd${NC}"
cp /opt/fabrica/infraestructura-dashboard/infraestructura-api.service /etc/systemd/system/
cp /opt/fabrica/infraestructura-dashboard/infraestructura-dashboard.service /etc/systemd/system/
echo -e "${GREEN}✓${NC} Archivos copiados"

echo ""
echo -e "${YELLOW}📋 Paso 2: Recargar systemd${NC}"
systemctl daemon-reload
echo -e "${GREEN}✓${NC} Systemd recargado"

echo ""
echo -e "${YELLOW}📋 Paso 3: Habilitar servicios${NC}"
systemctl enable infraestructura-api
systemctl enable infraestructura-dashboard
echo -e "${GREEN}✓${NC} Servicios habilitados"

echo ""
echo -e "${YELLOW}📋 Paso 4: Iniciar servicios${NC}"
systemctl start infraestructura-api
systemctl start infraestructura-dashboard
echo -e "${GREEN}✓${NC} Servicios iniciados"

echo ""
echo -e "${YELLOW}📋 Paso 5: Verificar estado${NC}"
systemctl is-active --quiet infraestructura-api && echo -e "${GREEN}✓${NC} API corriendo" || echo -e "${RED}✗${NC} API error"
systemctl is-active --quiet infraestructura-dashboard && echo -e "${GREEN}✓${NC} Dashboard corriendo" || echo -e "${RED}✗${NC} Dashboard error"

echo ""
echo -e "${YELLOW}📋 Paso 6: Configurar sincronización automática${NC}"
cat > /opt/fabrica/infraestructura-dashboard/sync_cron.sh << 'CRONSCRIPT'
#!/bin/bash
cd /opt/fabrica/infraestructura-dashboard
source venv/bin/activate
python backend/sync_servidor.py >> /var/log/infraestructura-sync.log 2>&1
CRONSCRIPT

chmod +x /opt/fabrica/infraestructura-dashboard/sync_cron.sh

# Añadir a crontab
(crontab -u rafael -l 2>/dev/null | grep -v "sync_cron.sh"; echo "0 * * * * /opt/fabrica/infraestructura-dashboard/sync_cron.sh"; echo "@reboot sleep 60 && /opt/fabrica/infraestructura-dashboard/sync_cron.sh") | crontab -u rafael -
echo -e "${GREEN}✓${NC} Cron configurado"

echo ""
echo -e "${GREEN}✅ INSTALACIÓN COMPLETADA${NC}"
echo ""
echo "📊 URLs: http://localhost:8000/dashboard.html"
echo "🔧 Logs: sudo journalctl -u infraestructura-api -f"
