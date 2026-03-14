#!/bin/bash

echo "🏭 [SECUENCIA DE INICIO] FÁBRICA IA NUEVA..."

# 1. Limpiar procesos fantasma antiguos
echo "🧹 Limpiando túneles y motores anteriores..."
pkill -f monitor_engine
pkill -f "ssh -f -N -R 8092"
sleep 2

# 2. Arrancar el Cerebro de Extracción (Motor Go)
echo "🧠 Encendiendo Motor Go local (Puerto 8092)..."
cd /opt/fabrica/monitor-go && nohup ./monitor_engine > motor.log 2>&1 &
sleep 2

# 3. Desplegar el Túnel Zero Trust hacia el VPS
echo "🚇 Perforando Túnel Zero Trust hacia VPS (72.60.191.179)..."
ssh -f -N -R 8092:127.0.0.1:8092 root@72.60.191.179

echo "✅ SISTEMAS 100% ONLINE. EL VPS YA PUEDE ENVIAR MISILES AL MOTOR."
