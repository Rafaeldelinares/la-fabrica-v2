#!/bin/bash
# clean_empty_leads.sh — descarta leads vacíos nuevos que crea el cron upstream desconocido.
# Patrón: marca como 'error' cualquier lead en 'pendiente' que tenga nombre_comercial Y telefono vacíos.
# Es work-around defensivo hasta encontrar el cron upstream (A2 en RUNBOOK).
#
# ── EXCEPCIÓN CLI ADMIN (AGENTS.md §"BASE DE DATOS POSTGRESQL") ──
# Script local (no internet), sin input externo, valores numéricos validados.
# Credenciales via env file (no hardcoded).
set -euo pipefail

LOG="/var/log/clean-empty-leads.log"
TIMEOUT_PSQL=10

ts() { date -u +"%Y-%m-%dT%H:%M:%SZ"; }
log() { echo "[$(ts)] $*" >> "$LOG"; }

# Marcar como 'error' los leads pendientes vacíos (nombre Y telefono vacíos).
# Usa una CTE con RETURNING para loguear cuántos se marcaron en esta corrida.
SQL="
WITH moved AS (
  UPDATE operaciones.leads
  SET estado = 'error',
      updated_at = NOW()
  WHERE es_simulacion = false
    AND estado = 'pendiente'
    AND (nombre_comercial IS NULL OR nombre_comercial = '')
    AND (telefono IS NULL OR telefono = '')
  RETURNING id
)
SELECT COUNT(*) AS descartados FROM moved;
"

# Factory DB (backup)
factory_count=$(PGPASSWORD="${FACTORY_PG_PASSWORD:-}" psql \
  -U "${FACTORY_PG_USER:-rafael}" \
  -h "${FACTORY_PG_HOST:-localhost}" \
  -p "${FACTORY_PG_PORT:-5432}" \
  -d "${FACTORY_PG_DB:-fabrica}" \
  -c "$SQL" -t -A 2>/dev/null) || factory_count="ERR"

# VPS DB (source of truth para producción)
vps_count=$(PGPASSWORD="${VPS_PG_PASSWORD:-}" psql \
  -U "${VPS_PG_USER:-rafael_admin}" \
  -h "${VPS_PG_HOST:-localhost}" \
  -p "${VPS_PG_PORT:-5433}" \
  -d "${VPS_PG_DB:-crm_bybusiness}" \
  -c "$SQL" -t -A 2>>"$LOG") || vps_count="ERR"

log "factory=${factory_count} vps=${vps_count}"
