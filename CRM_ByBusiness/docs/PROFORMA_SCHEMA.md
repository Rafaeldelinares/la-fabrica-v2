# Modelo de datos: Proforma

Este documento describe la estructura completa de las tablas `clientes.proformas` y `clientes.proforma_lineas` y cómo se mapean al workflow `CRM_19_POST_PROFORMA` (legacy) y al modal del frontend `ModalNuevaProforma.jsx`.

## Tabla `clientes.proformas`

Cabecera de la proforma. Una proforma representa una cotización de uno o más productos/servicios.

| Campo | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | integer | NO | serial | Identificador único interno |
| `cliente_id` | integer | NO | - | FK a `clientes.clientes.id`. Cliente al que se le cotiza |
| `operador_id` | integer | SI | - | FK a `auth.usuarios.id`. Operador que creó la proforma (opcional) |
| `numero` | varchar | SI | - | Número visible al cliente. Formato: `PRO-MMDD-XXXX` (legacy) o `N/YYYY` (nuevo). Auto-generado |
| `legacy_numero` | varchar | SI | - | Número original del CRM antiguo. Se preserva para trazabilidad histórica |
| `fecha` | date | SI | CURRENT_DATE | Fecha de emisión de la proforma. Cuándo se creó la cotización |
| `estado` | varchar | SI | 'borrador' | Estado del ciclo de vida. CHECK constraint: `borrador`, `verificada`, `pendiente_cliente`, `aceptada`, `aprobada`, `rechazada`, `rellenada`, `enviada` |
| `total` | numeric | SI | 0 | Total con IVA. `total = subtotal + cuota_iva` |
| `subtotal` (base_imponible) | numeric | NO | 0 | Suma de líneas antes de IVA. `base_imponible = SUM(cantidad × precio_unitario × (1 - dto_pct/100))` |
| `porcentaje_iva` | numeric | NO | 21.00 | Porcentaje de IVA (tasa general española 2026). Si iva_pct está setado, se usa ese |
| `cuota_iva` | numeric | NO | 0 | Importe del IVA. `cuota_iva = base_imponible × porcentaje_iva / 100` |
| `iva_pct` | numeric | SI | - | Porcentaje de IVA custom (sobreescribe porcentaje_iva). NULL = usar 21% por defecto |
| `requiere_factura` | boolean | SI | false | Si true, el cliente quiere factura al recibir el servicio. Usado por `CRM_PROFORMA_SOLICITAR` |
| `fraccionado` | boolean | SI | false | Si true, el pago se divide en `num_fracciones` cuotas |
| `num_fracciones` | integer | SI | 1 | Número de cuotas si `fraccionado = true` (rango 2-12) |
| `notas` | text | SI | - | Notas internas (no visibles al cliente en la versión impresa) |
| `iban` | varchar | SI | - | IBAN para pagos. Mostrado en la proforma/factura impresa |
| `fecha_maxima_pago` | date | SI | - | Fecha límite de pago (cliente debe pagar antes de esta fecha) |
| `origen` | varchar | SI | 'normal' | Origen de la proforma: `normal` (nueva) o `legacy` (importada del CRM antiguo) |
| `proforma_padre_id` | integer | SI | - | FK a `clientes.proformas.id`. Usado cuando se consolida N proforma en una |
| `contrato_id` | integer | SI | - | FK a `clientes.contratos.id`. Contrato generado al firmar la proforma |
| `verificada_admin` | boolean | SI | false | Si true, un admin verificó manualmente la proforma |
| `motivo_rechazo` | text | SI | - | Si estado='rechazada', explica por qué el cliente rechazó |
| `solicitud_factura_at` | timestamp | SI | - | Cuándo el cliente solicitó la factura. Usado por `CRM_PROFORMA_SOLICITAR` |
| `solicitada_por_user_id` | integer | SI | - | FK a `auth.usuarios.id`. Usuario (cliente del portal) que solicitó la factura |
| `created_at` | timestamp | SI | now() | Timestamp de creación del registro |

## Tabla `clientes.proforma_lineas`

Detalle de la proforma. Cada línea es un producto/servicio cotizado.

| Campo | Tipo | Nullable | Default | Descripción |
|---|---|---|---|---|
| `id` | integer | NO | serial | Identificador único interno |
| `proforma_id` | integer | NO | - | FK a `clientes.proformas.id`. Proforma padre |
| `producto_id` | integer | SI | - | FK a `clientes.productos.id`. Producto del catálogo. NULL = línea custom (texto libre) |
| `descripcion` | text | SI | - | Descripción visible al cliente. Si `producto_id` está setado, se copia de `productos.nombre` |
| `cantidad` | numeric(10,2) | SI | 1 | Cantidad de unidades |
| `precio_unitario` | numeric(10,2) | SI | 0 | Precio por unidad SIN IVA (base imponible unitaria) |
| `dto_pct` | numeric(5,2) | NO | 0 | Porcentaje de descuento sobre la línea (0-100) |
| `subtotal` | numeric(10,2) | SI | - | Subtotal de la línea CON descuento, SIN IVA. `subtotal = cantidad × precio_unitario × (1 - dto_pct/100)` |

## Mapeo al workflow `CRM_19_POST_PROFORMA`

El workflow legacy (que ya tiene webhook `/webhook/crm-proforma-crear` registrado) ahora soporta 4 operaciones vía campo `op` en el body del POST:

### `op=crear` (default si no se especifica)

```json
{
  "op": "crear",
  "cliente_id": 4,           // required int - FK clientes.clientes
  "operador_id": 1,          // optional int - FK auth.usuarios
  "notas": "texto",          // optional text
  "fraccionado": false,      // optional bool - default false
  "num_fracciones": 1,       // optional int - default 1
  "requiere_factura": true,  // optional bool - default false
  "iva_pct": 21              // optional numeric - default 21
}
```

Crea la proforma con `estado = 'rellenada'`, `numero = PRO-MMDD-XXXX` (legacy), `fecha = CURRENT_DATE`.

### `op=linea`

```json
{
  "op": "linea",
  "proforma_id": 5,         // required int - FK clientes.proformas
  "descripcion": "texto",    // required text
  "cantidad": 1,            // optional numeric - default 1
  "precio_unitario": 100,    // required numeric
  "dto_pct": 0              // optional numeric - default 0
}
```

Inserta línea + actualiza `proforma.total = SUM(subtotal) × (1 + iva/100)`.

### `op=editar`

```json
{
  "op": "editar",
  "proforma_id": 5,         // required int
  "notas": "texto",          // optional - solo se actualiza si viene
  "fraccionado": true,       // optional
  "num_fracciones": 3,       // optional
  "iva_pct": 21              // optional
}
```

Solo funciona si `proforma.estado IN ('borrador', 'rellenada')`.

### `op=borrar`

```json
{
  "op": "borrar",
  "proforma_id": 5          // required int
}
```

Solo funciona si `proforma.estado IN ('borrador', 'rechazada')`. CASCADE borra las líneas hijas.

## Mapeo al frontend `ModalNuevaProforma.jsx`

El modal envía los siguientes campos al workflow:

### Modo "Crear proforma nueva"

| Campo UI | Campo workflow | Tipo |
|---|---|---|
| (interno) `cliente.id` | `cliente_id` | int |
| (interno) `operadorId` | `operador_id` | int |
| Checkbox "Pago aplazado" | `fraccionado` | bool |
| Input "Fracciones" | `num_fracciones` | int |
| Checkbox "Aplicar IVA" | (decide si pasa iva_pct) | bool |
| Input "IVA %" | `iva_pct` | numeric |
| (en cada línea) descripción, cantidad, precio, dto | `descripcion`, `cantidad`, `precio_unitario`, `dto_pct` | varios |
| (en cada línea, futuro) producto del catálogo | `producto_id` (a implementar) | int |

### Modo "Editar proforma existente"

| Campo UI | Campo workflow |
|---|---|
| (interno) `proformaEditar.id` | `proforma_id` |
| Checkbox "Pago aplazado" | `fraccionado` |
| Input "Fracciones" | `num_fracciones` |
| Input "IVA %" | `iva_pct` |
| Textarea "Notas" | `notas` |

## Ciclo de vida (estados)

```
borrador → rellenada → enviada → aprobada → (cliente paga) → (contrato firmado)
                ↓             ↓
          verificada    rechazada
                ↓
         pendiente_cliente
                ↓
           aceptada
```

### Transiciones válidas

| Desde | Hacia | Trigger | Workflow |
|---|---|---|---|
| `borrador` | `rellenada` | Crear proforma con líneas | `CRM_19_POST_PROFORMA` (op=crear) |
| `rellenada` | `enviada` | Gestor envía al cliente | `CRM_PROFORMA_ENVIAR` (action=enviar) |
| `enviada` | `aprobada` | Cliente confirma OK | `CRM_PROFORMA_ENVIAR` (action=aprobar) |
| `aprobada` | - | Generar contrato | `CRM_CONTRATO_*` (prefirmar/firmar/enviar_email) |
| `borrador`, `rellenada` | - | Editar | `CRM_19_POST_PROFORMA` (op=editar) |
| `borrador`, `rechazada` | - | Borrar | `CRM_19_POST_PROFORMA` (op=borrar) |
| `enviada` o posterior | - | Reenviar email | `CRM_PROFORMA_ENVIAR` (action=enviar, idempotente) |

## Coherencia fiscal

- **Total** = `SUM(proforma_lineas.subtotal) × (1 + iva_pct/100)`
- **IVA** = `Total - SUM(proforma_lineas.subtotal)` = 21% del subtotal
- **Subtotal por línea** = `cantidad × precio_unitario × (1 - dto_pct/100)`
- La línea `proforma.fecha_inicio_relacion` en `clientes.clientes` se setea automáticamente al firmar el primer contrato, con `MIN(proforma.fecha)` para mantener trazabilidad histórica
