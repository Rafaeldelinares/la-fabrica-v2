import json
import os

workflows_dir = "/opt/fabrica/escaparate-com/n8n-workflows"
os.makedirs(workflows_dir, exist_ok=True)

# 1. ROUTER WORKFLOW
router_wf = {
    "name": "ESCAPARATE_COM_WhatsApp_Router",
    "nodes": [
        {
            "parameters": {
                "httpMethod": "POST",
                "path": "whatsapp-demo",
                "responseMode": "lastNode",
                "options": {}
            },
            "name": "Webhook",
            "type": "n8n-nodes-base.webhook",
            "typeVersion": 1,
            "position": [250, 300]
        },
        {
            "parameters": {
                "rules": {
                    "rules": [
                        {
                            "cnd:string": [
                                {
                                    "value1": "={{$json.body.tipo_usuario}}",
                                    "value2": "cliente_nuevo"
                                }
                            ]
                        },
                        {
                            "cnd:string": [
                                {
                                    "value1": "={{$json.body.tipo_usuario}}",
                                    "value2": "cliente_existente"
                                }
                            ]
                        },
                        {
                            "cnd:string": [
                                {
                                    "value1": "={{$json.body.tipo_usuario}}",
                                    "value2": "candidato"
                                }
                            ]
                        }
                    ]
                }
            },
            "name": "Switch Tipo Usuario",
            "type": "n8n-nodes-base.switch",
            "typeVersion": 1,
            "position": [450, 300]
        },
        {
            "parameters": {
                "workflowId": "id-cliente-nuevo"
            },
            "name": "Call Cliente Nuevo",
            "type": "n8n-nodes-base.executeWorkflow",
            "typeVersion": 1,
            "position": [700, 150]
        },
        {
            "parameters": {
                "workflowId": "id-cliente-existente"
            },
            "name": "Call Cliente Existente",
            "type": "n8n-nodes-base.executeWorkflow",
            "typeVersion": 1,
            "position": [700, 300]
        },
        {
            "parameters": {
                "workflowId": "id-candidato"
            },
            "name": "Call Candidato",
            "type": "n8n-nodes-base.executeWorkflow",
            "typeVersion": 1,
            "position": [700, 450]
        },
        {
            "parameters": {
                "respondWith": "json",
                "responseBody": "={{ $json }}"
            },
            "name": "Respond to Webhook",
            "type": "n8n-nodes-base.respondToWebhook",
            "typeVersion": 1,
            "position": [950, 300]
        }
    ],
    "connections": {
        "Webhook": {
            "main": [
                [
                    {
                        "node": "Switch Tipo Usuario",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Switch Tipo Usuario": {
            "main": [
                [
                    {
                        "node": "Call Cliente Nuevo",
                        "type": "main",
                        "index": 0
                    }
                ],
                [
                    {
                        "node": "Call Cliente Existente",
                        "type": "main",
                        "index": 0
                    }
                ],
                [
                    {
                        "node": "Call Candidato",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Call Cliente Nuevo": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]},
        "Call Cliente Existente": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]},
        "Call Candidato": {"main": [[{"node": "Respond to Webhook", "type": "main", "index": 0}]]}
    }
}

# 2. CLIENTE NUEVO WORKFLOW
cliente_nuevo_wf = {
    "name": "ESCAPARATE_COM_Cliente_Nuevo",
    "nodes": [
        {
            "parameters": {},
            "name": "Start",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [250, 300]
        },
        {
            "parameters": {
                "amount": 2,
                "unit": "seconds"
            },
            "name": "Wait (Thinking)",
            "type": "n8n-nodes-base.wait",
            "typeVersion": 1,
            "position": [450, 300]
        },
        {
            "parameters": {
                "keepOnlySet": True,
                "values": {
                    "string": [
                        {
                            "name": "respuesta",
                            "value": "¡Hola! Soy Sofía, consultora de IA en ByBusiness. Me especializo en ayudar a empresarios y autónomos a crecer usando tecnología. ¿Podrías contarme un poco sobre tu negocio? ¿A qué te dedicas?"
                        },
                        {
                            "name": "valid",
                            "value": "true"
                        }
                    ]
                },
                "options": {}
            },
            "name": "Generar Respuesta Sofía",
            "type": "n8n-nodes-base.set",
            "typeVersion": 1,
            "position": [650, 300]
        },
        {
            "parameters": {
                "method": "POST",
                "url": "http://waha:3000/api/sendText",
                "sendHeaders": True,
                "headerParameters": {
                    "parameters": [
                        {
                            "name": "X-Api-Key",
                            "value": "secret"
                        },
                        {
                            "name": "Content-Type",
                            "value": "application/json"
                        }
                    ]
                },
                "sendBody": True,
                "bodyParameters": {
                    "parameters": [
                        {
                            "name": "chatId",
                            "value": "={{$json.telefono}}@c.us"
                        },
                        {
                            "name": "text",
                            "value": "Hola {{$json.nombre}}, soy Sofía de ByBusiness.\n\nConfirmo que hemos recibido tu interés.\nUn comercial te contactará en máximo 24h con una propuesta personalizada.\n\n¿Alguna pregunta mientras tanto?"
                        },
                        {
                            "name": "session",
                            "value": "default"
                        }
                    ]
                },
                "options": {}
            },
            "name": "WAHA Notificacion (Si Aplica)",
            "type": "n8n-nodes-base.httpRequest",
            "typeVersion": 1,
            "position": [850, 150]
        },
        {
            "parameters": {
                "fromEmail": "informacion@ia-bybusiness.com",
                "toEmail": "informacion@ia-bybusiness.com",
                "subject": "=[LEAD WEB] Nuevo Cliente Potencial - {{$json.empresa}}",
                "text": "=\\nNUEVO LEAD DESDE ESCAPARATE .COM\\n---\\n\\n👤 Nombre: {{$json.nombre}}\\n📱 Teléfono: {{$json.telefono}}\\n\\n---\\nOrigen: WhatsApp Demo - ia-bybusiness.com"
            },
            "name": "Email Interno",
            "type": "n8n-nodes-base.emailSend",
            "typeVersion": 1,
            "position": [850, 450],
            "credentials": {
                "smtp": {
                    "id": "1",
                    "name": "SMTP Account"
                }
            }
        },
        {
            "parameters": {
                "operation": "insert",
                "schema": "escaparate_com",
                "table": "demo_conversaciones",
                "columns": "session_id, tipo_usuario, nombre, email, telefono, mensaje, estado",
                "extraOptions": {}
            },
            "name": "Guardar en PG",
            "type": "n8n-nodes-base.postgres",
            "typeVersion": 1,
            "position": [1050, 300],
            "credentials": {
                "postgres": {
                    "id": "1",
                    "name": "Postgres local"
                }
            }
        }
    ],
    "connections": {
        "Start": {
            "main": [
                [
                    {
                        "node": "Wait (Thinking)",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Wait (Thinking)": {
            "main": [
                [
                    {
                        "node": "Generar Respuesta Sofía",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        }
    }
}

# 3. CLIENTE EXISTENTE WORKFLOW
cliente_existente_wf = {
    "name": "ESCAPARATE_COM_Cliente_Existente",
    "nodes": [
        {
            "parameters": {},
            "name": "Start",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [250, 300]
        },
        {
            "parameters": {
                "operation": "executeQuery",
                "query": "SELECT * FROM escaparate_com.demo_conversaciones WHERE email ILIKE '%{{$json.email}}%' OR telefono LIKE '%{{$json.telefono}}%' LIMIT 1"
            },
            "name": "Buscar en PG",
            "type": "n8n-nodes-base.postgres",
            "typeVersion": 1,
            "position": [450, 300],
            "credentials": {
                "postgres": {
                    "id": "1",
                    "name": "Postgres local"
                }
            }
        },
        {
            "parameters": {
                "keepOnlySet": True,
                "values": {
                    "string": [
                        {
                            "name": "respuesta",
                            "value": "¡Hola de nuevo! Ya te veo, he localizado tu ficha. Veo que estábamos en contacto. ¿Quieres que continuemos donde lo dejamos o prefieres consultar algo diferente?"
                        },
                        {
                            "name": "valid",
                            "value": "true"
                        }
                    ]
                },
                "options": {}
            },
            "name": "Respuesta Reencuentro",
            "type": "n8n-nodes-base.set",
            "typeVersion": 1,
            "position": [650, 300]
        },
        {
            "parameters": {
                "fromEmail": "informacion@ia-bybusiness.com",
                "toEmail": "informacion@ia-bybusiness.com",
                "subject": "=[CLIENTE RETORNO] Contacto de Cliente Existente",
                "text": "=\\nCLIENTE EXISTENTE - NUEVO CONTACTO\\n\\n---\\nOrigen: WhatsApp Demo"
            },
            "name": "Notificación Cliente Retorno",
            "type": "n8n-nodes-base.emailSend",
            "typeVersion": 1,
            "position": [850, 300]
        }
    ],
    "connections": {
        "Start": {
            "main": [
                [
                    {
                        "node": "Buscar en PG",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Buscar en PG": {
             "main": [
                 [
                     {"node": "Respuesta Reencuentro", "type": "main", "index": 0}
                 ]
             ]
        }
    }
}


# 4. CANDIDATO WORKFLOW
candidato_wf = {
    "name": "ESCAPARATE_COM_Candidato_RRHH",
    "nodes": [
        {
            "parameters": {},
            "name": "Start",
            "type": "n8n-nodes-base.manualTrigger",
            "typeVersion": 1,
            "position": [250, 300]
        },
        {
            "parameters": {
                "fileName": "=/opt/fabrica/escaparate-com/cv-recibidos/{{ $json.nombre }}-{{ $now.toFormat('yyyyMMddHHmmss') }}.pdf",
                "dataPropertyName": "cv"
            },
            "name": "Write Binary File (CV)",
            "type": "n8n-nodes-base.writeBinaryFile",
            "typeVersion": 1,
            "position": [450, 150]
        },
        {
            "parameters": {
                "amount": 1,
                "unit": "seconds"
            },
            "name": "Wait (Carlos Typing)",
            "type": "n8n-nodes-base.wait",
            "typeVersion": 1,
            "position": [650, 300]
        },
        {
            "parameters": {
                "operation": "insert",
                "schema": "rrhh",
                "table": "candidatos",
                "columns": "nombre, email, telefono, posicion, cv_url, estado",
                "extraOptions": {}
            },
            "name": "Guardar en PG RRHH",
            "type": "n8n-nodes-base.postgres",
            "typeVersion": 1,
            "position": [850, 300],
            "credentials": {
                "postgres": {
                    "id": "1",
                    "name": "Postgres local"
                }
            }
        },
        {
            "parameters": {
                "keepOnlySet": True,
                "values": {
                    "string": [
                        {
                            "name": "respuesta",
                            "value": "¡Hola! Soy Carlos, del equipo de Talento de ByBusiness. Qué alegría que quieras unirte a nuestro equipo. Hemos recibido tus datos y tu perfil está en revisión. ¡Te contactaremos pronto!"
                        },
                        {
                            "name": "valid",
                            "value": "true"
                        }
                    ]
                },
                "options": {}
            },
            "name": "Respuesta Candidato",
            "type": "n8n-nodes-base.set",
            "typeVersion": 1,
            "position": [1050, 300]
        },
        {
            "parameters": {
                "fromEmail": "informacion@ia-bybusiness.com",
                "toEmail": "informacion@ia-bybusiness.com",
                "subject": "=[CANDIDATO] Nueva Candidatura - Operador Llamadas - {{$json.nombre}}",
                "text": "=\\nNUEVA CANDIDATURA\\n---\\n\\n👤 Nombre: {{$json.nombre}}\\n📧 Email: {{$json.email}}\\n\\n---\\nOrigen: WhatsApp Demo"
            },
            "name": "Notificación Email RRHH",
            "type": "n8n-nodes-base.emailSend",
            "typeVersion": 1,
            "position": [1250, 300]
        }
    ],
    "connections": {
        "Start": {
            "main": [
                [
                    {
                        "node": "Write Binary File (CV)",
                        "type": "main",
                        "index": 0
                    },
                    {
                        "node": "Wait (Carlos Typing)",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Wait (Carlos Typing)": {
            "main": [
                [
                    {
                        "node": "Guardar en PG RRHH",
                        "type": "main",
                        "index": 0
                    }
                ]
            ]
        },
        "Guardar en PG RRHH": {
            "main": [
                [
                    {"node": "Respuesta Candidato", "type": "main", "index": 0}
                ]
            ]
        }
    }
}

paths = [
    ("router.json", router_wf),
    ("cliente-nuevo.json", cliente_nuevo_wf),
    ("cliente-existente.json", cliente_existente_wf),
    ("candidato.json", candidato_wf)
]

for filename, wf in paths:
    filepath = os.path.join(workflows_dir, filename)
    with open(filepath, 'w') as f:
        json.dump(wf, f, indent=4)
        
print("Workflows created successfully.")
