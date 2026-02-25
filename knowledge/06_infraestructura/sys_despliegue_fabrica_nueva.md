# [SYS] MANIFIESTO DE DESPLIEGUE: FÁBRICA NUEVA (V3)

**Clasificación:** Infraestructura Crítica / Despliegue Físico
**Dependencia:** Constitución Maestra V15
**Estado:** VIGENTE (Operación Nominal)

## 1. DIRECTRIZ PARA LA IA (CONTEXTO QWEN)
**ATENCIÓN QWEN:** Este documento contiene el "ADN" físico de la infraestructura de producción aislada ("La Fábrica Nueva"). Define el levantamiento de los contenedores Docker, las variables de entorno y el script de ignición que enlaza el Motor Go local con el VPS en la nube mediante un túnel Zero Trust inverso. Si se te solicita modificar puertos o añadir servicios, debes consultar este documento para mantener la coherencia de la red.

---

## 2. EL PLANO ARQUITECTÓNICO (`docker-compose.yml`)
Este es el manifiesto maestro de Docker. Divide la infraestructura en dos redes aisladas: `fabrica_network` (El núcleo de gestión) y `monitor_network` (Las células satélite de extracción de datos).

**Ruta de creación:** `/opt/fabrica/docker-compose.yml`

```yaml
version: '3.8'

# 🌐 REDES (Aislamiento Zero Trust)
networks:
  fabrica_network:
    name: fabrica_network
    driver: bridge
  monitor_network:
    name: monitor_network
    driver: bridge

# 💾 VOLÚMENES (Persistencia de Datos)
volumes:
  postgres_data:
    name: fabrica_postgres_data
  n8n_data:
    name: fabrica_n8n_data
  dockhand_data:
    name: dockhand_data

services:
  # ==========================================
  # 🏭 STACK: CORE FÁBRICA (CRM y Orquestación)
  # ==========================================
  
  fabrica-traefik:
    image: traefik:v2.10
    container_name: fabrica-traefik
    restart: unless-stopped
    command:
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
    ports:
      - "80:80"
      - "8080:8080"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
    networks:
      - fabrica_network

  config-postgres-1:
    image: postgres:16
    container_name: config-postgres-1
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER:-rafael}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-Samsung18091809&}
      POSTGRES_DB: fabrica
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fabrica_network

  fabrica-n8n:
    image: n8nio/n8n:latest
    container_name: fabrica-n8n
    restart: unless-stopped
    environment:
      - DB_TYPE=postgresdb
      - DB_POSTGRESDB_HOST=config-postgres-1
      - DB_POSTGRESDB_PORT=5432
      - DB_POSTGRESDB_DATABASE=fabrica
      - DB_POSTGRESDB_USER=${POSTGRES_USER:-rafael}
      - DB_POSTGRESDB_PASSWORD=${POSTGRES_PASSWORD:-Samsung18091809&}
      - WEBHOOK_URL=${WEBHOOK_URL:-http://n8n.localhost}
    ports:
      - "5678:5678"
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.n8n.rule=Host(`n8n.localhost`)"
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - fabrica_network
    depends_on:
      - config-postgres-1

  fabrica-whatsapp:
    image: devlikeapro/waha
    container_name: fabrica-whatsapp
    restart: unless-stopped
    ports:
      - "3030:3000"
    networks:
      - fabrica_network

  dockhand:
    image: fnsys/dockhand:latest
    container_name: Dockhand
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - dockhand_data:/app/data
    networks:
      - fabrica_network

  # ==========================================
  # 🕵️ STACK: MONITOR GO (Células Satélite V2)
  # ==========================================

  postgres-monitor-v2:
    image: postgres:15-alpine
    container_name: postgres-monitor-v2
    restart: unless-stopped
    environment:
      POSTGRES_USER: monitor
      POSTGRES_PASSWORD: monitor_password
      POSTGRES_DB: reputacion_cache
    ports:
      - "5435:5432"
    networks:
      - monitor_network

  scraper-nano-v2:
    image: monitor-go-scraper-nano
    container_name: scraper-nano-v2
    restart: unless-stopped
    ports:
      - "8090:8080"
    networks:
      - monitor_network

  scraper-heavy-v2:
    image: monitor-go-scraper-heavy
    container_name: scraper-heavy-v2
    restart: unless-stopped
    ports:
      - "8091:8081"
    networks:
      - monitor_network

--------------------------------------------------------------------------------
3. VARIABLES DE ENTORNO (.env)
Configuración base para el ecosistema. Debe convivir en el mismo directorio que el docker-compose.yml.
Ruta de creación: /opt/fabrica/.env
# 🏭 CONFIGURACIÓN FÁBRICA CORE
POSTGRES_USER=rafael
POSTGRES_PASSWORD=Samsung18091809&
POSTGRES_DB=fabrica

# 🌐 ENRUTAMIENTO LOCAL
WEBHOOK_URL=http://n8n.localhost
VITE_API_URL=http://localhost:5678

# 🤖 CONFIGURACIÓN WAHA (WHATSAPP)
WAHA_API_KEY=secret

# 🚇 TÚNEL ZERO TRUST (VPS)
VPS_IP=72.60.191.179
VPS_USER=root

--------------------------------------------------------------------------------
4. GATILLO DE IGNICIÓN AUTÓNOMA (arranque_total.sh)
Script de Grado Militar diseñado para ejecutarse autónomamente al arrancar el servidor físico. Garantiza que el Backend en Go despierte y que el túnel inverso conecte el servidor local con el VPS en la nube, absorbiendo las peticiones del puerto 8092.
Ruta de creación: /opt/fabrica/arranque_total.sh Permisos requeridos: chmod +x /opt/fabrica/arranque_total.sh Registro en Crontab: @reboot sleep 20 && /opt/fabrica/arranque_total.sh
#!/bin/bash

echo "🏭 [SECUENCIA DE INICIO] FÁBRICA IA NUEVA..."

# 1. Limpiar procesos fantasma antiguos
echo "🧹 Limpiando túneles y motores anteriores..."
pkill -f monitor_engine
pkill -f "ssh -f -N -R 8092"
sleep 2

# 2. Arrancar el Cerebro de Extracción (Motor Go)
# Nota para Qwen: El motor Go usa 127.0.0.1 (IPv4) para evitar colisiones con IPv6.
echo "🧠 Encendiendo Motor Go local (Puerto 8092)..."
cd /opt/fabrica/monitor-go && nohup ./monitor_engine > motor.log 2>&1 &
sleep 2

# 3. Desplegar el Túnel Zero Trust hacia el VPS
echo "🚇 Perforando Túnel Zero Trust hacia VPS (72.60.191.179)..."
ssh -f -N -R 8092:127.0.0.1:8092 root@72.60.191.179

echo "✅ SISTEMAS 100% ONLINE. LA FÁBRICA ESTÁ OPERATIVA."
***

