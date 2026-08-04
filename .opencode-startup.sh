#!/bin/bash
#
# .opencode-startup.sh
# Verificacion de MCPs + health-check integral de VPS.
# Ejecutar al inicio de cada sesion opencode.
#

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }

# --- Verificacion de MCPs ---
echo "============================================"
echo " Verificacion de MCPs (5/5)"
echo "============================================"

MCPS=(
  "postgres-vps:localhost:5433:PostgreSQL VPS"
  "n8n-mcp-local:localhost:5678:n8n local"
  "n8n-mcp-vps:https://n8n.ia-bybusiness.online:n8n VPS"
  "postgres-fabrica:localhost:5432:PostgreSQL Fabrica"
  "postgres-monitor:localhost:5435:PostgreSQL Monitor"
)

mcp_ok=0

for mcp in "${MCPS[@]}"; do
  IFS=':' read -r key host port label <<< "$mcp"
  if [ "$key" = "n8n-mcp-vps" ]; then
    # HTTPS endpoint
    http_code=$(curl -sS -o /dev/null -w "%{http_code}" https://n8n.ia-bybusiness.online 2>/dev/null || echo "000")
  else
    http_code=$(curl -sS -o /dev/null -w "%{http_code}" "http://${host}:${port}" 2>/dev/null || echo "000")
  fi
  if [ "$http_code" = "200" ] || [ "$http_code" = "301" ] || [ "$http_code" = "302" ]; then
    pass "$label ($key) - HTTP $http_code"
    mcp_ok=$((mcp_ok + 1))
  else
    fail "$label ($key) - HTTP $http_code"
  fi
done

echo ""
if [ $mcp_ok -eq 5 ]; then
  echo -e "${GREEN}RESULTADO: MCPs FUNCIONALES (5/5)${NC}"
else
  echo -e "${RED}RESULTADO: MCPs CON FALLOS ($mcp_ok/5)${NC}"
fi

# --- Health-check VPS ---
echo ""
echo "============================================"
echo " Health-check VPS"
echo "============================================"
/opt/fabrica/scripts/fabrica-healthcheck.sh
health_result=$?

echo ""
if [ $health_result -eq 0 ]; then
  echo -e "${GREEN}RESULTADO: HEALTH-CHECK VPS OK${NC}"
  exit 0
else
  echo -e "${RED}RESULTADO: HEALTH-CHECK VPS FALLO${NC}"
  exit 1
fi