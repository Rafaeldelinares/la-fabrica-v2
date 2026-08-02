# CRM_BACKUP_STATUS — S09 backup-operations

**Status**: Created in n8n VPS (ID: krMZMcflVf6ZE77u), needs manual activation.

**Webhook**: `GET /webhook/crm-backup-status`

**Returns**:
```json
{
  "backups": [
    {
      "id": "1",
      "timestamp": "2026-08-02T02:30:00Z",
      "size_mb": 14.32,
      "status": "ok",
      "file": "/opt/fabrica/backups/db/crm_bybusiness-20260802-023000.sql.gz"
    }
  ],
  "schedule": {
    "frequency": "Diario",
    "next_run": null
  }
}
```

**Source of truth**: Backup events are stored in `sistema.eventos_sistema` with `tipo_evento = 'BACKUP'`. The workflow queries this table ordered by `fecha_evento DESC LIMIT 50`.

**Data extraction**: The `detalles` JSONB column contains `{ cron, status, file, size_bytes }`.

**Manual activation needed**:
1. Open n8n at https://n8n.ia-bybusiness.online
2. Find workflow `CRM_BACKUP_STATUS`
3. Activate it (toggle switch)
4. PostgreSQL credentials: "PostgreSQL VPS" (ID: 8NbamWrMdRexLNwa)

**Note**: The `size_mb` is computed from `size_bytes / (1024 * 1024)` with 2 decimal places. If `size_bytes` is absent, `size_mb` is `null`.
