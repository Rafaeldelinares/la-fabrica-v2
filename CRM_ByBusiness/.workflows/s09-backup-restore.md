# CRM_BACKUP_RESTORE — S09 backup-operations

**Status**: Created in n8n VPS (ID: KHIQ9kK7dKU2a51I), needs manual activation.

**Webhook**: `POST /webhook/crm-backup-restore`

**Accepts** (JSON body):
```json
{
  "action": "backup",
  "user_id": "optional_operator_id"
}
```
OR
```json
{
  "action": "restore",
  "backup_id": "event_id_from_crm_backup_status"
}
```

**Returns** (both actions):
```json
{
  "success": true,
  "action": "backup",
  "message": "Backup triggered successfully"
}
```

**Behavior**:

- `action: "backup"` — Logs a `BACKUP` event to `sistema.eventos_sistema` with status `in_progress`, then triggers `CRM_BACKUP_AUTOMATICO` webhook asynchronously. The actual backup creation is handled by the cron script on the VPS host (`/opt/fabrica/scripts/backup_db.sh` runs at 02:30 UTC daily).

- `action: "restore"` — Logs a `BACKUP_RESTORE` event to `sistema.eventos_sistema`. Restore execution requires SSH access to the VPS host. A future enhancement will execute `pg_restore` directly via SSH.

**Manual activation needed**:
1. Open n8n at https://n8n.ia-bybusiness.online
2. Find workflow `CRM_BACKUP_RESTORE`
3. Activate it (toggle switch)
4. PostgreSQL credentials: "PostgreSQL VPS" (ID: 8NbamWrMdRexLNwa)

**Restore caveat**: The restore action is logged but actual `pg_restore` execution is not yet wired. A future workflow or script (triggered by the `BACKUP_RESTORE` event in `sistema.eventos_sistema`) must execute the restore on the VPS host.
