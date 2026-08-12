# Proposal: Xiaomi-12 Cookies Admin Panel

## Why
El wrapper xiaomi-12 para scraping Google Business Profile necesita cookies de Google actualizada manualmente via SSH. El admin actual no tiene visibilidad del estado de las cookies ni alertas de expiración.

## What
Panel admin en el CRM para:
1. Subir cookies via UI (drag-drop, file picker, o paste JSON)
2. Ver estado actual y días hasta expiración
3. Recibir alertas email automáticas cuando las cookies están por expirar

## Scope
- Migración DB: tabla `infraestructura.xiaomi_cookies_log`
- 3 workflows n8n en VPS: upload, status, expiry-check (daily cron)
- Frontend: hook + panel React en admin/scraper
- Email alerts via SMTP n8n

## Out of Scope
- No se modifica el scraper xiaomi-12 en sí
- No se implementa rotación automática de cookies

## Rollback
- Drop tabla: `DROP TABLE IF EXISTS infraestructura.xiaomi_cookies_log;`
- Disable workflows en n8n
- Revert frontend commit
