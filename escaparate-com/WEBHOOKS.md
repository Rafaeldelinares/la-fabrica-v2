# Documentación de Webhooks - WhatsApp Assistant Demo

## Webhook Principal (Router)
**Endpoint:** `POST http://localhost:5678/webhook/whatsapp-demo`
**Tipo:** `multipart/form-data` o `application/json`

Este es el único webhook que el frontend necesita llamar. Recibe todas las peticiones y las enruta al flujo conversacional correspondiente (Cliente Nuevo, Cliente Existente o Candidato).

### Parámetros Aceptados
| Parámetro | Tipo | Descripción | Requerido |
| :--- | :--- | :--- | :--- |
| `tipo_usuario` | String | `cliente_nuevo`, `cliente_existente`, o `candidato` | **SÍ** |
| `mensaje` | String | El texto enviado por el usuario en el chat | **SÍ** |
| `nombre` | String | Nombre capturado del usuario | No |
| `email` | String | Email de contacto | No |
| `telefono` | String | Teléfono formato internacional (ej. 34600123456) | No |
| `cv` | File | Archivo binario adjunto (PDF o DOCX) solo en RRHH | No |
| `session_id` | String | ID de sesión para mantener el contexto | **SÍ** |

---

## 🧪 Ejemplos de Testing (Curl)

### 1. Probar flujo 'Cliente Nuevo'
```bash
curl -X POST http://localhost:5678/webhook/whatsapp-demo \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-123",
    "tipo_usuario": "cliente_nuevo",
    "mensaje": "Quiero mejorar el SEO de mi web",
    "nombre": "Elena García",
    "telefono": "34666555444"
  }'
```
**Respuesta esperada:** Un mensaje amigable de "Sofía" preguntando por detalles del negocio y analizando la viabilidad de la automatización.

### 2. Probar flujo 'Cliente Existente'
```bash
curl -X POST http://localhost:5678/webhook/whatsapp-demo \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-session-456",
    "tipo_usuario": "cliente_existente",
    "mensaje": "Hola de nuevo, ¿me puedes ayudar?",
    "email": "cliente@empresa.com"
  }'
```
**Respuesta esperada:** Recuperación del contexto en base al email proporcionado, preguntando si es una consulta sobre un servicio activo o uno nuevo.

### 3. Probar flujo 'Candidato' (con captura de archivo CV)
*Asegúrate de tener un archivo `cv-ejemplo.pdf` en tu carpeta actual antes de ejecutar.*
```bash
curl -X POST http://localhost:5678/webhook/whatsapp-demo \
  -H "Content-Type: multipart/form-data" \
  -F 'session_id=test-session-rrhh' \
  -F 'tipo_usuario=candidato' \
  -F 'mensaje=Quiero trabajar como operador de llamadas' \
  -F 'nombre=Juan Pérez' \
  -F 'email=juan.perez@gmailexample.com' \
  -F 'cv=@./cv-ejemplo.pdf'
```
**Respuesta esperada:** Archivo guardado, base de datos actualizada y respuesta de confirmación de RRHH.
