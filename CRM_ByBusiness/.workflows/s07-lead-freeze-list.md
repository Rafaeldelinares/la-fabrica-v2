# Workflows — S07 lead-freeze-list + lead-assignment-explainability

Created: 2026-08-02
Slice: S07

## CRM_LEADS_FREEZED_LIST

- **ID**: 9110DF549CBA40B0
- **Webhook**: GET/POST `/webhook/crm-leads-freezed-list`
- **Trigger**: Webhook (GET for list, POST for unfreeze)
- **Actions**:
  - `GET ?operador_id=X&action=list` → returns `{ frozen_leads: [{ id, nombre, telefono, congelado_en, motivo }] }`
  - `POST { action: 'unfreeze', lead_id, operador_id }` → returns `{ success: true, unfrozen_id }`
- **Nodes**: Webhook, Action Switch, PostgreSQL (list query), PostgreSQL (unfreeze query), RespondToWebhook (x2)
- **Status**: Inactive (active=0) — activate after VPS deployment

## CRM_LEADS_DISPONIBLES_SIMPLE — Extended

- **ID**: AP1iqQJAPwZZEJws
- **Extension**: Added `leads` array to response with `asignado_por: { campaign, prioridad, fuente }` per lead
- **New fields per lead**:
  - `asignado_por.campaign` — campaign name (from `operaciones.lead_asignacion`)
  - `asignado_por.prioridad` — assignment priority (from `operaciones.lead_asignacion`)
  - `asignado_por.fuente` — source (from `operaciones.lead_asignacion` or `lead.fuente_original`)
- **Backward compatible**: Existing `ok`, `total_disponibles`, `por_campana` fields unchanged
- **Status**: Inactive — activate after VPS deployment
