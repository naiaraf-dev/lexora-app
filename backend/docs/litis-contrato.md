# Contrato de la API de Litis

Contrato entre el frontend y el backend del asistente Litis (HU31). Cualquier cambio en este documento se acuerda entre quienes trabajan en el asistente.

Los tipos de TypeScript equivalentes están en `frontend/src/app/features/asistente/models/asistente.model.ts`.

## Endpoints

| Método | Ruta | Autenticación | HU |
|---|---|---|---|
| `POST` | `/api/asistente/mensajes` | `Authorization: Bearer <jwt>` | HU33 |
| `POST` | `/api/asistente/documentos/:id/enlace` | `Authorization: Bearer <jwt>` | HU39 |
| `GET` | `/api/asistente/documentos/descargar?t=<token>&modo=<ver\|descargar>` | Token `t` del enlace (sin header) | HU39 |

## 1. Conversar con Litis

`POST /api/asistente/mensajes`

### Pedido

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `mensaje` | string | Sí | Mensaje actual del usuario. Entre 1 y 2000 caracteres. |
| `contexto` | string | No | Número interno del expediente cuando Litis se usa desde un expediente. Formato `EXP-{año}-{id}`. |
| `historial` | `MensajeHistorial[]` | No | Mensajes anteriores de la conversación (máximo 10). No incluye el mensaje actual. |

`MensajeHistorial`:

| Campo | Tipo | Descripción |
|---|---|---|
| `autor` | `'usuario' \| 'litis'` | Quién escribió el mensaje. |
| `texto` | string | Contenido del mensaje. |

```json
{
  "mensaje": "traeme la demanda de Pérez del año pasado",
  "historial": [
    { "autor": "litis", "texto": "¡Hola! Soy Litis, ¿en qué te puedo ayudar?" }
  ]
}
```

Pedido en modo expediente:

```json
{
  "mensaje": "¿qué tareas están pendientes?",
  "contexto": "EXP-2026-26",
  "historial": []
}
```

### Respuesta `200`

| Campo | Tipo | Descripción |
|---|---|---|
| `respuesta` | string | Texto que escribe Litis. |
| `resultados` | `ResultadoLitis[]` | Elementos para mostrar como tarjetas. Siempre viene, aunque esté vacío. |

`ResultadoLitis`:

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tipo` | `'documento' \| 'expediente' \| 'tarea' \| 'novedad' \| 'cliente'` | Sí | Tipo de elemento. |
| `id` | number | Sí | Identificador en la base. |
| `titulo` | string | Sí | Texto principal de la tarjeta. |
| `subtitulo` | string | No | Texto secundario (expediente, tipo, fecha). |
| `expedienteId` | number | No | Expediente asociado, para el botón "Ir al expediente". |
| `numeroExpediente` | string | No | Número interno del expediente asociado. |
| `extension` | string | No | Solo documentos: `pdf`, `docx`, `jpg`, etc. |

```json
{
  "respuesta": "Encontré la demanda de Juan Pérez contra ACME S.A., cargada el 14/03/2025.",
  "resultados": [
    {
      "tipo": "documento",
      "id": 911,
      "titulo": "demanda_perez.pdf",
      "subtitulo": "EXP-2025-128 · Demanda · 14/03/2025",
      "expedienteId": 128,
      "numeroExpediente": "EXP-2025-128",
      "extension": "pdf"
    }
  ]
}
```

Sin resultados también responde `200`:

```json
{
  "respuesta": "No encontré documentos de ese cliente. ¿Querés que busque por otro nombre o por número de causa?",
  "resultados": []
}
```

## 2. Pedir un enlace de descarga

`POST /api/asistente/documentos/:id/enlace`

### Pedido

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `modo` | `'ver' \| 'descargar'` | No | `ver` abre el archivo en el navegador; `descargar` lo baja. Por defecto `descargar`. |

```json
{ "modo": "ver" }
```

### Respuesta `200`

| Campo | Tipo | Descripción |
|---|---|---|
| `url` | string | Ruta relativa del enlace temporal. |
| `expiraEn` | number | Segundos de validez del enlace (60). |

```json
{ "url": "/api/asistente/documentos/descargar?t=eyJhbGciOi...&modo=ver", "expiraEn": 60 }
```

## 3. Ver o descargar el archivo

`GET /api/asistente/documentos/descargar?t=<token>&modo=<ver|descargar>`

El front abre la `url` recibida en una pestaña nueva. No lleva header de autenticación: se valida con el token `t`, que solo sirve para ese documento y ese usuario.

- Modo `ver`: responde el archivo con `Content-Disposition: inline`.
- Modo `descargar`: responde el archivo con `Content-Disposition: attachment` y el nombre original.

## Errores

Todos los errores tienen el mismo formato. El campo `mensaje` se puede mostrar directamente al usuario.

```json
{ "codigo": "LIMITE_CONSULTAS", "mensaje": "Hiciste muchas consultas seguidas. Esperá un minuto y volvé a intentar." }
```

| HTTP | `codigo` | Cuándo |
|---|---|---|
| 400 | `PEDIDO_INVALIDO` | El cuerpo del pedido no cumple el contrato. |
| 401 | `NO_AUTENTICADO` | Falta el token de sesión o es inválido. |
| 401 | `ENLACE_INVALIDO` | El enlace de descarga venció, fue adulterado o es de otro documento. |
| 404 | `NO_ENCONTRADO` | El expediente de `contexto` o el documento no existe o está dado de baja. |
| 429 | `LIMITE_CONSULTAS` | El usuario superó el límite de consultas por minuto. |
| 503 | `ASISTENTE_NO_DISPONIBLE` | No hay clave del proveedor de IA configurada o el proveedor no responde. |
| 500 | `ERROR_INTERNO` | Error inesperado. No incluye detalles técnicos ni URLs internas. |

## Herramientas

Las herramientas son las funciones del backend que la IA puede pedir que se ejecuten. Todas siguen la misma estructura, para que cada integrante pueda crear las suyas sin depender del otro.

| Propiedad | Descripción |
|---|---|
| `name` | Nombre en snake_case, por ejemplo `buscar_documentos`. |
| `description` | Cuándo usar la herramienta. La lee la IA para decidir. |
| `input_schema` | JSON Schema de los parámetros que acepta. |
| `ejecutar(input, ctx)` | Función asíncrona que ejecuta la herramienta y devuelve `{ resumen, items }`. |
| `soloModoExpediente` | Opcional. Si es `true`, la herramienta solo se ofrece a la IA cuando Litis se usa desde un expediente (HU37). |

Las herramientas se registran en `backend/src/asistente/herramientas/index.js`. Sumar una no requiere tocar el ciclo de conversación.

`ctx` contiene:

| Campo | Descripción |
|---|---|
| `usuario` | Usuario logueado (`req.usuario`). Las herramientas siempre trabajan con su identidad. |
| `expedienteId` | Expediente resuelto desde `contexto`, si Litis se usa en modo expediente (HU37). |
| `numeroExpediente` | Número interno de ese expediente (`EXP-año-id`), para armar los `items`. |

`ejecutar` devuelve:

| Campo | Descripción |
|---|---|
| `resumen` | Lo que ve la IA: datos mínimos de cada resultado (id, título, tipo, fecha). Nunca contenido de archivos, DNI ni CUIT. |
| `items` | Lo que va al front como tarjetas, con el formato `ResultadoLitis`. |
| `contenido` | Opcional. Bloques de contenido (documento PDF o imagen en base64) que se le envían a la IA junto con el `resumen`. Solo lo usa `leer_documento` (HU45): el archivo se lee en el momento, no se guarda y nunca va al front. |

```js
/**
 * @typedef {Object} ContextoHerramienta
 * @property {Object} usuario           - req.usuario
 * @property {number} [expedienteId]    - modo expediente (HU37)
 *
 * @typedef {Object} ResultadoHerramienta
 * @property {Object[]} resumen         - lo que ve la IA
 * @property {Object[]} items           - ResultadoLitis[] para el front
 * @property {Object[]} [contenido]     - bloques que solo ve la IA (HU45)
 *
 * @typedef {Object} Herramienta
 * @property {string} name
 * @property {string} description
 * @property {Object} input_schema
 * @property {boolean} [soloModoExpediente]
 * @property {(input: Object, ctx: ContextoHerramienta) => Promise<ResultadoHerramienta>} ejecutar
 */
```

## Reglas

- `resultados` siempre viene en la respuesta, aunque esté vacío.
- Los ids, enlaces y números de expediente los arma el backend; la IA nunca los genera.
- El historial no incluye el mensaje actual, que viaja en `mensaje`.
- El enlace de descarga se pide al hacer clic y no viene en `resultados`, porque vence en 60 segundos.
- Los nombres de campos del historial (`autor`, `texto`) coinciden con los mensajes del chat del front.
