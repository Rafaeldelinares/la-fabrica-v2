# Google session cookie renewal

The GBP audit scraper uses a logged-in Google account session to extract
review, photo, post, and Q&A data (limited-view doesn't expose these tabs).

When the cookie expires (every 2-4 weeks):

1. Open Brave (or Chrome) and log in to `delinaresrafa@gmail.com`
2. Navigate to https://www.google.com (must be logged in)
3. Click EditThisCookie extension icon → Export
4. Save the file to /home/rafael/Documentos/google_session.json
5. Restart the wrapper: `sudo systemctl restart gbp-ficha.service`

The symlink at /opt/fabrica/scripts/google_session.json points to the file
in Documents. Just overwrite the source file.

Check if cookies expired: visit a ficha in the CRM and see if reviews_count
returns 0 (means cookies expired). If so, refresh.

## Cookie format

EditThisCookie JSON array. Required cookies:
- `__Secure-1PSID`, `__Secure-3PSID` — main session tokens
- `__Secure-1PAPISID`, `__Secure-3PAPISID` — auth tokens
- `SID`, `HSID`, `SSID`, `NID`, `SAPISID` — identity & preferences
- `__Host-GMAIL_SCH` (session cookie, no expiry) — Gmail session

SameSite must be explicitly set to Strict/Lax/None in EditThisCookie settings.
If a cookie has sameSite=unspecified, the wrapper maps it to 'None' (lax).

Session cookies (no expirationDate) are supported — omit the expires field.

## Verification

```bash
# Check logs for "Loaded N cookies"
sudo journalctl -u gbp-ficha.service -n 5 --no-pager

# Health check
curl -sS http://localhost:8095/healthz

# Test with a known GBP
curl -sS "http://localhost:8095/run?place_id=ChIJEUY459_PEQ0R0Q72g_Jrlq0&refresh=true" \
  --max-time 60 | python3 -c "import json,sys; d=json.load(sys.stdin); print(f'limited={d.get(\"limited_view\")} reviews={d.get(\"reviews_count\")} fotos={d.get(\"fotos_count\")}')"
```
