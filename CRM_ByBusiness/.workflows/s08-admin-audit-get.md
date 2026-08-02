# CRM_ADMIN_AUDIT_GET — S08 admin-audit-trail

**Status**: Created in n8n VPS (ID: RTvcwCDw4zkd3AfF), needs manual activation after fixing jsCode expression validator warnings.

**Webhook**: `GET /webhook/crm-admin-audit-get`

**Accepts** (query params):
- `event_type?: string` — filter by event type (e.g. FRONTEND_ERROR, USER_LOGIN)
- `user_id?: string` — filter by user ID
- `desde?: string` — start date (ISO date, inclusive)
- `hasta?: string` — end date (ISO date, inclusive)
- `page?: number` — page number (default 1)
- `page_size?: number` — items per page (default 50)

**Returns**:
```json
{
  "events": [
    {
      "id": 1,
      "event_type": "FRONTEND_ERROR",
      "timestamp": "2026-08-01T10:00:00Z",
      "user_id": "2",
      "user_name": "Operador Test",
      "entity_type": null,
      "entity_id": null,
      "description": "Error: Cannot read property 'x' of undefined",
      "metadata": { "component_stack": "...", "zone_id": "zone1" }
    }
  ],
  "total": 123,
  "page": 1,
  "page_size": 50
}
```

**Dev notice**: When `sistema.eventos_sistema` is absent (local dev), returns:
```json
{ "events": [], "total": 0, "warning": "Audit trail solo disponible en produccion (VPS)" }
```

**Manual fix needed in n8n UI**:
1. The jsCode expressions in Parse Input and Format Response nodes show validator warnings about `}}` brackets. These are n8n expression validator false positives — the JavaScript is syntactically valid. Ignore and save.
2. Set Webhook node options → onError: "continueRegularOutput"
3. Activate the workflow
4. PostgreSQL credentials: "PostgreSQL VPS" (ID: 8NbamWrMdRexLNwa)
