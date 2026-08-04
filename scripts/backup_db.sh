#!/bin/bash
# Backup diario de la DB crm_bybusiness + registro como evento BACKUP.
# Lo dispara el cron de root a las 02:30 UTC.

set -euo pipefail

BACKUP_DIR="/opt/fabrica/backups/db"
LOG="/var/log/fabrica/backup.log"
TS=$(date -u +%Y%m%d-%H%M%S)
DEST="$BACKUP_DIR/crm_bybusiness-$TS.sql.gz"

mkdir -p "$BACKUP_DIR"

echo "[$(date -u +%FT%TZ)] Backup inicio" >> "$LOG"

if docker exec fabrica-postgres-1 pg_dump -U rafael_admin -d crm_bybusiness --no-owner --no-acl 2>> "$LOG" | gzip > "$DEST"; then
    SIZE=$(stat -c '%s' "$DEST" 2>/dev/null || echo 0)
    echo "[$(date -u +%FT%TZ)] Backup OK: $DEST ($SIZE bytes)" >> "$LOG"
    STATUS="ok"
else
    echo "[$(date -u +%FT%TZ)] Backup FAIL" >> "$LOG"
    STATUS="fail"
fi

# Avisar al workflow n8n via webhook para registrar el evento BACKUP
curl -fsS -X POST "https://n8n.ia-bybusiness.online/webhook/backup-event" \
    -H "Content-Type: application/json" \
    -d "{\"status\":\"$STATUS\",\"file\":\"$DEST\",\"size\":$SIZE}" \
    2>> "$LOG" || echo "[$(date -u +%FT%TZ)] webhook call failed" >> "$LOG"

# Rotar: mantener ultimos 14 backups
ls -1t "$BACKUP_DIR"/crm_bybusiness-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
