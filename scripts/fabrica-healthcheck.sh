#!/bin/bash
#
# fabrica-healthcheck.sh
# Health-check integral para el VPS: patch del task broker y webhooks CRM.
# Ejecutar en local; SSH hacia el VPS para verificar el container n8n-vps-sqlite.
# Dependencias: curl, ssh, docker (todos disponibles en el entorno).
# Runtime objetivo: <30s.
#

set -o pipefail

# --- Configuracion ---
VPS_HOST="root@72.60.191.179"
VPS_CONTAINER="n8n-vps-sqlite"
PATCH_FILE="/usr/local/lib/node_modules/n8n/dist/task-runners/task-broker/auth/task-broker-auth.service.js"
PATCH_PATTERN="GRANT_TOKEN_TTL.*=.*86400"

WEBHOOKS=(
  "crm-kpi-dashboard"
  "crm-actividad-operadores"
  "crm-campanas"
  "crm-proformas"
  "crm-llamada-activa"
)
WEBHOOK_BASE="https://n8n.ia-bybusiness.online/webhook"

# --- Colores ---
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# --- Funciones ---
pass() { echo -e "${GREEN}[PASS]${NC} $1"; }
fail() { echo -e "${RED}[FAIL]${NC} $1"; }
warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }

# Verifica que el patch GRANT_TOKEN_TTL sigue aplicado dentro del container en VPS.
check_task_broker_patch() {
  local result
  result=$(ssh "$VPS_HOST" "docker exec $VPS_CONTAINER grep -c '$PATCH_PATTERN' $PATCH_FILE 2>/dev/null" 2>&1)
  local ret=$?

  if [ $ret -ne 0 ]; then
    warn "No se pudo acceder al container via SSH (ret=$ret). Output: $result"
    return 1
  fi

  if [ "$result" -ge 1 ]; then
    pass "Task broker patch (GRANT_TOKEN_TTL=86400) aplicado."
    return 0
  else
    fail "Task broker patch NO detectado. GRANT_TOKEN_TTL sigue en valor original."
    return 1
  fi
}

# Hit un webhook y reporta status + primeros 100 chars del body.
check_webhook() {
  local name="$1"
  local url="${WEBHOOK_BASE}/${name}"
  local response
  local http_code
  local body_preview

  # curl -sS = silent pero muestra errores; -w "%{http_code}" para el codigo; -o para body
  response=$(curl -sS -w "\n%{http_code}" "$url" 2>&1)
  http_code=$(echo "$response" | tail -n1)
  body_preview=$(echo "$response" | sed '$d' | cut -c1-100 | tr '\n' ' ')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    pass "$name | HTTP $http_code | $body_preview"
    return 0
  elif [ "$http_code" = "0" ]; then
    fail "$name | Connection failed | $body_preview"
    return 1
  else
    warn "$name | HTTP $http_code | $body_preview"
    # 4xx/5xx counts as failure for health-check
    return 1
  fi
}

# --- Ejecucion ---
echo "============================================"
echo " Fabrica VPS Health Check"
echo "============================================"

overall=0

# 1. Task broker patch
echo ""
echo "-- Task Broker Patch --"
check_task_broker_patch || overall=1

# 2. Webhooks CRM
echo ""
echo "-- Webhooks CRM --"
for webhook in "${WEBHOOKS[@]}"; do
  check_webhook "$webhook" || overall=1
done

# --- Resultado final ---
echo ""
echo "============================================"
if [ $overall -eq 0 ]; then
  echo -e "${GREEN}RESULTADO: TODO OK${NC}"
  exit 0
else
  echo -e "${RED}RESULTADO: HAY FALLOS${NC}"
  exit 1
fi