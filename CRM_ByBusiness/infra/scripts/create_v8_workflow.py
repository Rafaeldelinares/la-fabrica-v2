#!/usr/bin/env python3
"""Create V8 workflow on VPS via REST API."""
import json
import urllib.request
import urllib.error

API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkNGNlZjY1My04ZTU3LTQ2ODUtOTMxZS02NzhiNWI3NDhjMmUiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwianRpIjoiZjY1ZjNhMDItZDYzNC00YjU4LWJiMTctMzM1OGU1OGMzZjc0IiwiaWF0IjoxNzgxNTM4MjU5fQ.Y0dfnYiqLz77wjPxwde9z1FSL7Ps_2NZoyrKA8CqquM"
URL = "https://n8n.ia-bybusiness.online/api/v1/workflows"

payload = {
    "name": "CRM_INFORME_PDF_V8",
    "nodes": [
        {
            "id": "wh-v8",
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 2,
            "webhookId": "crm-informe-pdf-v8",
            "position": [240, 300],
            "parameters": {
                "httpMethod": "POST",
                "path": "crm-informe-pdf-v8",
                "responseMode": "responseNode",
                "webhookId": "crm-informe-pdf-v8",
                "responseNode": "Respond"
            }
        },
        {
            "id": "http-v8",
            "name": "Request PDF",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 4.2,
            "position": [460, 300],
            "parameters": {
                "url": "=http://72.60.191.179:8093/pdf/cliente?cliente_id={{ $json.body.cliente_id }}",
                "method": "GET",
                "sendQuery": False,
                "sendHeaders": False,
                "sendBody": False,
                "options": {
                    "response": {
                        "response": {
                            "fullResponse": False,
                            "neverError": False,
                            "responseFormat": "file",
                            "outputPropertyName": "data"
                        }
                    }
                }
            }
        },
        {
            "id": "resp-v8",
            "name": "Respond",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1.1,
            "position": [680, 300],
            "parameters": {
                "respondWith": "binary",
                "binaryData": "data",
                "mimeType": "application/pdf"
            }
        }
    ],
    "connections": {
        "Webhook": {"main": [[{"node": "Request PDF", "type": "main", "index": 0}]]},
        "Request PDF": {"main": [[{"node": "Respond", "type": "main", "index": 0}]]}
    },
    "settings": {
        "executionOrder": "v1",
        "callerPolicy": "workflowsFromSameOwner"
    }
}

data = json.dumps(payload).encode()
req = urllib.request.Request(
    URL, data=data,
    headers={"Content-Type": "application/json", "X-N8N-API-KEY": API_KEY}
)
try:
    with urllib.request.urlopen(req) as resp:
        result = json.load(resp)
        print(f"Created: {result.get('id')} | {result.get('name')}")
except urllib.error.HTTPError as e:
    body = e.read().decode()
    print(f"Error {e.code}: {body[:500]}")
