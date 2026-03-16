#!/bin/bash
# Lanzador único para el snapshot GBP inicial
# Uso: bash /opt/fabrica/scripts/run_gbp_snapshot.sh

LOG=/var/log/gbp_snapshot.log
PID_FILE=/tmp/gbp_snapshot.pid
SCRIPT=/opt/fabrica/scripts/gbp_snapshot.py

# Evitar doble ejecución
if [ -f "$PID_FILE" ] && kill -0 "$(cat $PID_FILE)" 2>/dev/null; then
    echo "Ya está corriendo (PID $(cat $PID_FILE)). Usa 'tail -f $LOG' para seguirlo."
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Iniciando GBP Snapshot..." | tee -a "$LOG"
PYTHONUNBUFFERED=1 nohup python3 "$SCRIPT" >> "$LOG" 2>&1 &
echo $! > "$PID_FILE"
echo "[$(date '+%Y-%m-%d %H:%M:%S')] PID $(cat $PID_FILE) — Log: tail -f $LOG" | tee -a "$LOG"
