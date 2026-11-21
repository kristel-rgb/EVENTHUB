# EventHub · Contrato de la API (lo que necesita el frontend)

> **Para:** Persona 2 (Backend A: auth, seguridad, administración), Persona 3 (Backend B: eventos, reservas, MongoDB) y Persona 4 (AWS).
> **Mantiene:** Persona 1 (Frontend). Última actualización: 20 de noviembre de 2026.

Este documento describe **exactamente** lo que el frontend (Nuxt) ya llama y espera recibir. Si el backend responde con esta forma, el frontend funciona sin cambios. Si necesitan cambiar algo (un nombre de campo, una ruta, un código de error), **avisen antes** para actualizar el frontend y este documento.

- Los tipos de TypeScript que usa el frontend están en [`frontend/app/types/models.ts`](../../frontend/app/types/models.ts).
- La guía de la base de datos está en [`docs/base-de-datos/README.md`](../base-de-datos/README.md).

---

## Índice

1. [Convenciones generales](#1-convenciones-generales)
2. [Endpoints que el frontend YA usa](#2-endpoints-que-el-frontend-ya-usa)
3. [Endpoints que el frontend VA a necesitar (propuesta)](#3-endpoints-que-el-frontend-va-a-necesitar-propuesta)
4. [Códigos de error](#4-códigos-de-error)
5. [Cómo prueba el frontend sin el backend](#5-cómo-prueba-el-frontend-sin-el-backend)
6. [Checklist para el backend](#6-checklist-para-el-backend)

---

## 1. Convenciones generales

| Tema | Acuerdo |
|---|---|
| **URL base** | `http://localhost:4000/api/v1` en desarrollo (confirmar puerto). El frontend la lee de la variable `NUXT_PUBLIC_API_BASE`. |
| **Formato** | JSON en peticiones y respuestas (`Content-Type: application/json`). |
| **IDs** | `_id` de MongoDB como **string** de 24 caracteres hexadecimales. |
| **Fechas** | Siempre **ISO 8601 en UTC**, por ejemplo `"2026-11-30T01:00:00.000Z"`. El frontend las convierte a hora de Costa Rica. |
| **Dinero** | Número entero en **colones** (`8000` = ₡8 000). `0` significa **gratis**. |
| **Nombres de campos** | `camelCase` en inglés (`availableSpots`, `createdAt`). |
| **Referencias** | Donde se indica, la API devuelve la referencia **populada** (objeto) y no solo el id. |
| **Autenticación** | `Authorization: Bearer <accessToken>` en endpoints privados (ver sección 3.1). Mientras no exista login, el frontend no envía token. |
| **CORS** | Permitir el origen del frontend (`http://localhost:3000` en desarrollo y la URL pública en producción). Si el refresh token va en cookie, habilitar `credentials`. |
| **Ordenamiento de rutas en Express** | Declarar rutas fijas antes que las de parámetro, por ejemplo `/events/locations` antes de `/events/:id` si algún día se mueve ahí. |

### 1.1 Formato de listas paginadas

```json
{
  "items": [ ... ],
  "page": 1,
  "limit": 12,
  "total": 38
}
```

- `page` empieza en **1**.
- `total` es el total de resultados **con los filtros aplicados**, no solo los de la página.
- El frontend calcula las páginas como `ceil(total / limit)`.

### 1.2 Formato de errores

**Todos** los errores (400, 401, 403, 404, 409, 422, 500) con este cuerpo:

```json
{
  "code": "NOT_ENOUGH_SPOTS",
  "message": "Solo quedan 9 espacios disponibles.",
  "details": null
}
```

- `code`: constante en MAYÚSCULAS, estable (el frontend puede decidir según el código).
- `message`: texto en **español, listo para mostrar al usuario** (el frontend lo muestra tal cual).
- `details`: opcional, por ejemplo los errores de validación por campo: `{ "quantity": "Debe ser un número entre 1 y 10" }`.
- **Nunca** enviar stack traces ni mensajes internos en producción.

---

## 2. Endpoints que el frontend YA usa

Resumen:

| Método | Ruta | Auth | Pantalla que lo usa |
|---|---|---|---|
| `GET` | `/categories` | Pública | Buscar (chips de categoría) |
| `GET` | `/events` | Pública | Inicio (próximos eventos) y Buscar |
| `GET` | `/locations` | Pública | Buscar (filtro "Lugar") |
| `GET` | `/events/:id` | Pública | Detalle del evento |
| `POST` | `/events/:id/reservations` | Asistente | Detalle del evento (botón comprar/reservar) |
| `GET` | `/me/tickets` | Usuario con sesión | Mis entradas |
| `GET` | `/organizer/stats` | Organizador | Panel del organizador |
| `POST` | `/auth/login` | Pública | Ingresar |
| `POST` | `/auth/register` | Pública | Crear cuenta |
| `GET` | `/auth/google` | Pública | Botón "Continuar con Google" (redirección) |

---

### 2.1 `GET /categories`

Lista de categorías para los filtros.

**Respuesta 200**

```json
[
  { "_id": "6740a0010000000000000001", "name": "Conciertos", "slug": "conciertos" },
  { "_id": "6740a0010000000000000002", "name": "Comedia", "slug": "comedia" }
]
```

- Ordenadas como quieran que se muestren (sugerido: por nombre o por un campo `order`).
- `slug` es el que viaja en las URLs del frontend (`/buscar?categoria=conciertos`), así que debe ser **único, en minúscula y sin tildes**.

---

### 2.2 `GET /events`

Catálogo público con búsqueda, filtros y paginación.

**Query params** (todos opcionales)

| Parámetro | Tipo | Descripción |
|---|---|---|
| `q` | string | Texto a buscar en **nombre, lugar y nombre de la categoría**. Ignorar mayúsculas y **tildes** (`cafe` encuentra `café`). Si trae varias palabras, deben aparecer **todas**. |
| `category` | string | **Slug** de la categoría (no el id). |
| `from` | ISO date | Solo eventos con `date >= from`. Si no viene, usar **ahora**. |
| `to` | ISO date | Solo eventos con `date <= to`. |
| `price` | `free` \| `paid` | `free` = `price === 0`; `paid` = `price > 0`. |
| `location` | string | Lugar **exacto**, tal como lo devuelve `GET /locations`. |
| `page` | number | Página, desde 1. Por defecto 1. |
| `limit` | number | Tamaño de página. Por defecto 12, **máximo 50**. |

> El frontend calcula `from`/`to` en hora de Costa Rica para "Hoy", "Este fin de semana", "Próximos 7 días" y "Próximos 30 días", y manda el rango ya listo. El backend solo filtra por rango.

**Reglas**

- Solo eventos con `status = "published"` y fecha **futura**.
- Orden: por `date` **ascendente** (el más próximo primero).
- Si `q` viene y **no hay resultados**, intentar corregir la búsqueda (ver "didYouMean").

**Respuesta 200**

```json
{
  "items": [
    {
      "_id": "6740a0a00000000000000001",
      "name": "Noche de jazz en vivo",
      "description": "Una noche de música en vivo...\nLas puertas abren 45 minutos antes...",
      "category": { "_id": "6740a001...", "name": "Conciertos", "slug": "conciertos" },
      "imageUrl": "https://<bucket>.s3.amazonaws.com/events/6740a0a0.jpg",
      "location": "Jazz Café, Escazú",
      "date": "2026-11-26T02:00:00.000Z",
      "capacity": 120,
      "availableSpots": 8,
      "price": 9000,
      "status": "published",
      "organizer": { "_id": "6740a002...", "name": "Sonido Vivo Producciones" },
      "ratingAvg": null,
      "ratingCount": 0
    }
  ],
  "page": 1,
  "limit": 12,
  "total": 1,
  "didYouMean": null
}
```

Detalles de cada campo del evento:

| Campo | Notas |
|---|---|
| `category` | **Populada** con `_id`, `name`, `slug`. |
| `organizer` | **Populado** con `_id` y `name` (sin email ni otros datos). |
| `imageUrl` | URL accesible desde el navegador (S3 público o URL firmada). `null` si no tiene imagen; el frontend muestra un cartel de color. |
| `description` | Texto plano. Los párrafos se separan con `\n`. |
| `availableSpots` | Espacios que quedan. Lo mantiene el backend al reservar/cancelar. |
| `ratingAvg` | Promedio de calificaciones visibles, **1 decimal**. `null` si no hay. |
| `ratingCount` | Cantidad de calificaciones visibles. |

#### `didYouMean` (¿Quisiste decir…?)

Si `q` no encuentra nada y el backend puede corregirla, debe:

1. Buscar de nuevo con el texto corregido.
2. Devolver **esos resultados** en `items`/`total`.
3. Poner el texto corregido en `didYouMean`, por ejemplo `"jazz"` cuando se buscó `"jass"`.

Si no hubo corrección: `didYouMean: null`. El frontend muestra: *No encontramos «jass». ¿Quisiste decir **jazz**? Te mostramos esos resultados.*

Opciones para implementarlo: **MongoDB Atlas Search** con `fuzzy`, o comparar cada palabra con un vocabulario (nombres, lugares y categorías) usando distancia de edición. La versión de prueba del frontend usa la segunda opción y trata como parecidas las letras que suenan igual en español (s/z/c, b/v, g/j, i/y). Ejemplos esperados:

| Busca | Corrige a |
|---|---|
| `jass` | `jazz` |
| `rok` | `rock` |
| `pedregla` | `pedregal` |
| `tetro nacional` | `teatro nacional` |

---

### 2.3 `GET /locations`

Lugares que tienen eventos próximos publicados, para el filtro "Lugar" de Buscar.

**Respuesta 200**

```json
[
  { "name": "Centro de Eventos Pedregal, Belén", "count": 3 },
  { "name": "Teatro Nacional, San José", "count": 2 }
]
```

- Misma regla que el catálogo: solo eventos `published` y futuros.
- Orden sugerido: `count` descendente y luego por nombre.
- En MongoDB es un `aggregate` con `$match` + `$group` por `location`.

---

### 2.4 `GET /events/:id`

Detalle de un evento.

**Respuesta 200:** el mismo objeto de evento de `GET /events` (con `category` y `organizer` populados, `ratingAvg` y `ratingCount`).

**Reglas**

- Devolver eventos `published`, `cancelled` y `finished`. El frontend muestra el motivo cuando no se puede comprar ("Este evento fue cancelado", "Este evento ya finalizó", "Ya no quedan espacios").
- Los eventos `draft` **no** son públicos: responder **404** (salvo para su propio organizador o un admin).

**Errores**

| Status | code | Cuándo |
|---|---|---|
| 400 | `INVALID_ID` | El id no es un ObjectId válido. |
| 404 | `EVENT_NOT_FOUND` | No existe o es borrador. El frontend muestra su página 404. |

---

### 2.5 `POST /events/:id/reservations`

Comprar o reservar entradas. **Requiere sesión de Asistente.**

**Body**

```json
{ "quantity": 2 }
```

**Validaciones (en el servidor, en este orden)**

1. El evento existe → si no, `404 EVENT_NOT_FOUND`.
2. `status === "published"` → si no, `409 EVENT_NOT_AVAILABLE`.
3. La fecha es futura → si no, `409 EVENT_FINISHED`.
4. `quantity` es entero entre **1 y 10** → si no, `400 INVALID_QUANTITY` (máximo por compra; el frontend también lo limita a 10 en `app.config.ts`, avisen si cambia).
5. Hay cupo suficiente → si no, `409 NOT_ENOUGH_SPOTS` con el mensaje *"Solo quedan N espacios disponibles."*.

> ⚠️ **Evitar sobreventa:** descontar el cupo con **una sola operación atómica**, por ejemplo:
> `Event.findOneAndUpdate({ _id, status: 'published', availableSpots: { $gte: quantity } }, { $inc: { availableSpots: -quantity } }, { new: true })`.
> Si devuelve `null`, no había cupo → `409 NOT_ENOUGH_SPOTS`. Luego crear la reservación y las entradas (idealmente en una **transacción**). Debe existir una prueba automatizada que lance reservas simultáneas por el último espacio.

**Respuesta 201**

```json
{
  "reservation": {
    "_id": "6740b0000000000000000001",
    "event": { "_id": "6740a0a0...", "name": "Noche de jazz en vivo" },
    "user": { "_id": "6740a003...", "name": "Andrea Vargas" },
    "quantity": 2,
    "status": "confirmed",
    "createdAt": "2026-11-20T18:30:00.000Z"
  },
  "tickets": [
    { "_id": "6740c000...01", "code": "EH-20387" },
    { "_id": "6740c000...02", "code": "EH-20388" }
  ]
}
```

- Se crea **una entrada (Ticket) por cada espacio** reservado.
- Después de confirmar, disparar el **correo de confirmación** (Persona 4, SES). Si el correo falla, la reserva **no** se debe revertir.
- Mientras no exista el login, el frontend llama sin token; cuando exista, sin token debe responder `401 UNAUTHORIZED`.

---

### 2.6 `GET /me/tickets`

Todas las entradas del usuario con sesión (activas e historial).

**Respuesta 200**

```json
[
  {
    "_id": "6740c0000000000000000001",
    "code": "EH-20372",
    "status": "active",
    "usedAt": null,
    "qrValue": "<token firmado>",
    "createdAt": "2026-10-31T18:00:00.000Z",
    "event": {
      "_id": "6740a0a0...",
      "name": "Yoga al amanecer",
      "date": "2026-11-21T12:00:00.000Z",
      "location": "Parque La Sabana, San José",
      "imageUrl": null,
      "status": "published",
      "category": { "_id": "...", "name": "Bienestar", "slug": "bienestar" }
    },
    "reservation": { "_id": "6740b000...", "quantity": 1, "createdAt": "2026-10-31T18:00:00.000Z" },
    "holder": { "_id": "6740a003...", "name": "Andrea Vargas" }
  }
]
```

**Reglas**

- Orden por `event.date` **ascendente**.
- Sin paginación por ahora (un usuario tiene pocas entradas). Si se vuelve grande, pasar al formato paginado.
- `status` de la entrada: `active` (sin usar), `used` (ya ingresó) o `cancelled`.
- El frontend calcula por su cuenta los estados visuales **"Pronto"** (faltan 3 días o menos) y **"Vencida"** (el evento pasó y la entrada no se usó). El backend **no** necesita guardarlos.
- `qrValue` es el texto que va **dentro** del código QR. El frontend dibuja el QR. Debe ser un **token firmado** (JWT o HMAC con secreto del servidor) que incluya al menos el id de la entrada, para que no se pueda falsificar al validar en la puerta.
- **Nunca** devolver entradas de otros usuarios.

---

### 2.7 `GET /organizer/stats`

Estadísticas del panel del organizador. **Requiere sesión de Organizador.** Se calculan **solo con los eventos del organizador que hace la petición** (sacarlo del token, no de un parámetro).

**Respuesta 200**

```json
{
  "eventsCreated": 11,
  "activeEvents": 7,
  "reservations": 413,
  "availableSpots": 428,
  "occupancyRate": 62,
  "upcomingEvents": [
    { "_id": "6740a0a0...", "name": "Noche de jazz en vivo", "date": "2026-11-26T02:00:00.000Z", "capacity": 120, "reserved": 112, "status": "published" }
  ],
  "reservationsByWeek": [
    { "week": "S1", "count": 34 }, { "week": "S2", "count": 41 },
    { "week": "S3", "count": 38 }, { "week": "S4", "count": 52 },
    { "week": "S5", "count": 47 }, { "week": "S6", "count": 60 },
    { "week": "S7", "count": 71 }, { "week": "S8", "count": 70 }
  ]
}
```

| Campo | Cómo se calcula |
|---|---|
| `eventsCreated` | Todos los eventos del organizador (cualquier estado). |
| `activeEvents` | Eventos `published` con fecha futura. |
| `reservations` | Cantidad de **reservaciones** `confirmed` de sus eventos (documentos, no entradas). |
| `availableSpots` | Suma de `availableSpots` de sus eventos activos. |
| `occupancyRate` | `round(espacios reservados / capacidad total × 100)` de sus eventos activos. Entero 0–100. |
| `upcomingEvents` | Hasta **5** eventos futuros no cancelados, por fecha ascendente. `reserved` = espacios reservados (suma de `quantity` confirmadas). |
| `reservationsByWeek` | **8** elementos, de la semana más antigua (`S1`) a la actual (`S8`), contando reservaciones confirmadas creadas en cada semana. |

> Son agregaciones de MongoDB (`$match`, `$group`, `$sum`). El enunciado exige que sean **consultas reales**, no datos fijos.

---

### 2.8 `POST /auth/login`

**Body**

```json
{ "identifier": "UsuarioTest", "password": "••••••••" }
```

- `identifier` puede ser el **nombre de usuario** (sin importar mayúsculas) **o el correo**.

**Respuesta 200**

```json
{
  "accessToken": "<token>",
  "expiresAt": "2026-11-21T09:59:44.959Z",
  "user": {
    "_id": "...", "username": "UsuarioTest", "firstName": "Usuario", "lastName1": "Test", "lastName2": "Pruebas",
    "name": "Usuario Test", "organizationName": null, "email": "...", "phone": "88881234",
    "idType": "cedula", "idNumber": "102340567", "birthDate": "1995-04-10",
    "address": { "province": "Heredia", "canton": "Belén", "line": "" },
    "role": "attendee", "permissions": ["profile:read:own", "reservations:create", "..."],
    "status": "active", "emailVerified": true, "lastLoginAt": "...", "createdAt": "..."
  }
}
```

- **Nunca** incluir `passwordHash` ni `googleId`.
- `permissions` = permisos del rol (ver la guía de base de datos, sección 3.8). El frontend los usa para mostrar u ocultar opciones; la seguridad real la aplica el backend.
- Registrar **cada intento** en `accessLogs` y actualizar `lastLoginAt` si fue exitoso.

**Errores**

| Status | code | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Falta el usuario/correo o la contraseña. |
| 401 | `INVALID_CREDENTIALS` | Usuario inexistente **o** contraseña incorrecta: mismo mensaje para los dos (no revelar cuál). |
| 403 | `ACCOUNT_DISABLED` | La cuenta está desactivada. |
| 429 | `TOO_MANY_REQUESTS` | 5 intentos fallidos en 15 minutos para ese usuario/correo. |

---

### 2.9 `POST /auth/register`

Crea una cuenta de **Cliente** (`role: "attendee"`). Es el único tipo de cuenta que se registra solo. Envía el correo de verificación.

**Body**

```json
{
  "firstName": "María", "lastName1": "Rojas", "lastName2": "Mora",
  "username": "maria.rojas", "email": "maria@example.com",
  "phone": "88881234", "idType": "cedula", "idNumber": "102340567",
  "birthDate": "1995-04-10",
  "province": "Heredia", "canton": "Belén", "addressLine": "",
  "password": "••••••••", "acceptTerms": true
}
```

El frontend ya envía `phone` e `idNumber` **sin guiones ni espacios** y `email` en minúscula.

**Validaciones** (las mismas que hace el frontend; la que cuenta es la del servidor)

| Campo | Regla |
|---|---|
| `firstName`, `lastName1` | Mínimo 2 caracteres. `lastName2` opcional. |
| `username` | `^[a-zA-Z0-9._]{4,20}$` y **único** (sin importar mayúsculas). |
| `email` | Formato válido y **único**. |
| `phone` | `^[2-8]\d{7}$` (8 dígitos de Costa Rica). |
| `idType` / `idNumber` | `cedula`: `^[1-9]\d{8}$` · `dimex`: `^\d{11,12}$` · `pasaporte`: `^[A-Z0-9]{6,20}$`. **Único**. |
| `birthDate` | Fecha válida, mayor de 18 años. |
| `province` | Una de: San José, Alajuela, Cartago, Heredia, Guanacaste, Puntarenas, Limón. |
| `canton` | Mínimo 2 caracteres. `addressLine` opcional. |
| `password` | Mínimo 8 caracteres, con mayúscula, minúscula y número. Guardar **solo el hash**. |
| `acceptTerms` | Debe ser `true`. |

**Respuesta 201:** `{ "user": { ...mismo formato que en el login... } }` con `emailVerified: false`. No inicia sesión: el frontend lleva a la persona a "Ingresar".

**Error 400 `VALIDATION_ERROR`** con **un mensaje por campo** en `details`, para que el frontend lo muestre debajo de cada casilla:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Revisá los datos marcados.",
  "details": { "username": "Ese nombre de usuario ya está en uso.", "email": "Ya existe una cuenta con ese correo." }
}
```

---

### 2.10 `GET /auth/google`

Redirige a Google OAuth 2.0. Al volver (`/auth/google/callback`), el backend crea o enlaza la cuenta (como **Cliente** si es nueva) y redirige al frontend con la sesión iniciada. Si falla, redirigir a `FRONTEND_URL/login?error=google`; el frontend ya muestra un aviso con ese parámetro.

---

## 3. Endpoints que el frontend VA a necesitar (propuesta)

Estas pantallas todavía no están conectadas. Las rutas siguen la propuesta del documento de división de tareas (sección 11). **Son propuestas:** si el backend prefiere otra forma, avisen antes de programarla.

### 3.1 Autenticación y cuenta (Persona 2)

| Método | Ruta | Body / Notas | Respuesta |
|---|---|---|---|
| ~~`POST`~~ | ~~`/auth/register`~~, ~~`/auth/login`~~ | **Ya definidos** en las secciones 2.8 y 2.9. | |
| `POST` | `/auth/refresh` | Usa el refresh token. | `200` `{ accessToken }` |
| `POST` | `/auth/logout` | Invalida el refresh token. | `204` |
| `GET` | `/auth/google` | Redirige a Google. | `302` |
| `GET` | `/auth/google/callback` | Redirige al frontend con la sesión iniciada. | `302` a `FRONTEND_URL/...` |
| `POST` | `/auth/verify-email` | `{ token }` (viene del enlace del correo). | `200` |
| `POST` | `/auth/resend-verification` | `{ email }` | `204` |
| `POST` | `/auth/forgot-password` | `{ email }`. Responder **siempre 204** (no revelar si el correo existe). | `204` |
| `POST` | `/auth/reset-password` | `{ token, password }` | `200` |
| `GET` | `/me` | Perfil del usuario con sesión. | `200` `User` |
| `PATCH` | `/me` | `{ name }` | `200` `User` |

Por decidir entre los dos:

- **Dónde va el refresh token.** Recomendado: cookie `httpOnly`, `Secure`, `SameSite=Lax`. El `accessToken` lo guarda el frontend solo en memoria.
- **Rutas del frontend a las que apuntan los enlaces de los correos:** `/verificar-correo?token=...` y `/restablecer-contrasena?token=...`.
- **Tipos de usuario:** solo se registran **Clientes** (`attendee`). El **Administrador** (dueño del sistema, todos los permisos) se crea con el seed. El **Organizador** existe pero solo lo asigna el Admin (ver la guía de base de datos, sección 3.8).

### 3.2 Reservaciones y entradas (Persona 3)

| Método | Ruta | Notas |
|---|---|---|
| `POST` | `/reservations/:id/cancel` | Cancelar desde "Mis entradas". Devuelve los espacios de forma atómica (`$inc`), pasa las entradas a `cancelled` y envía el correo de cancelación. Reglas de cancelación: **pendientes de decidir**. |
| `POST` | `/tickets/validate` | `{ qrValue }`. Para el organizador en la puerta: verifica la firma, que la entrada sea de un evento suyo y que no esté usada. La marca `used` con `usedAt`. Errores: `TICKET_INVALID`, `TICKET_ALREADY_USED`, `TICKET_CANCELLED`. |
| `GET` | `/organizer/events` | Eventos del organizador (todos los estados), paginado. |
| `GET` | `/organizer/events/:id/reservations` | Reservaciones de **un evento suyo**, paginado. |

### 3.3 Gestión de eventos del organizador (Persona 3 y Persona 4)

| Método | Ruta | Notas |
|---|---|---|
| `POST` | `/events` | Crear evento (`draft` por defecto). Body con los campos del modelo Event. |
| `PATCH` | `/events/:id` | Editar. Solo el dueño o un admin. |
| `POST` | `/events/:id/publish` | `draft` → `published`. |
| `POST` | `/events/:id/cancel` | → `cancelled`. Notifica a los asistentes por correo. |
| `POST` | `/files/upload-intent` | `{ fileName, contentType }` → `{ uploadUrl, fileUrl }`. URL **prefirmada de S3**: el frontend sube la imagen directo con `PUT uploadUrl` y luego guarda `fileUrl` como `imageUrl` del evento. Validar tipo (`image/jpeg`, `image/png`, `image/webp`) y tamaño máximo. |

### 3.4 Comentarios y calificaciones (Persona 3)

| Método | Ruta | Notas |
|---|---|---|
| `GET` | `/events/:id/reviews?page=&limit=` | Paginado. Solo visibles (`hidden: false`). Cada review con `user: { _id, name }`. |
| `POST` | `/events/:id/reviews` | `{ rating: 1-5, comment }`. Solo con reservación **confirmada** del evento y una por usuario. Error `REVIEW_NOT_ALLOWED` o `REVIEW_ALREADY_EXISTS`. |
| `PATCH` / `DELETE` | `/reviews/:id` | Solo el autor. |

### 3.5 Administración (Persona 2, con consultas de Persona 3)

| Método | Ruta | Notas |
|---|---|---|
| `GET` | `/admin/stats` | Totales generales: usuarios, organizadores, eventos por estado, reservaciones. |
| `GET` | `/admin/users?q=&role=&page=&limit=` | Paginado. |
| `PATCH` | `/admin/users/:id` | `{ role?, status? }` (activar o desactivar). |
| `GET`, `POST`, `PATCH`, `DELETE` | `/admin/categories[/:id]` | CRUD de categorías. |
| `PATCH` | `/admin/reviews/:id` | `{ hidden: true }` para moderar. |

### 3.6 Reportes (Persona 4)

El equipo decidió **no** mostrar botones de reportes en el frontend. Igual hay que poder demostrar en la defensa la llamada **Express → API Gateway → Lambda** (RC-02) y el cron (RC-04). Si más adelante se necesita una pantalla, la ruta propuesta es `POST /reports` → `{ reportId, status }` y `GET /reports/:id` → `{ status, downloadUrl }`.

---

## 4. Códigos de error

| Status | code | Uso |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Body o query inválidos (con `details` por campo). |
| 400 | `INVALID_ID` | `:id` no es ObjectId. |
| 400 | `INVALID_QUANTITY` | Cantidad fuera de 1–10. |
| 401 | `UNAUTHORIZED` | Falta el token o venció. El frontend intentará `/auth/refresh` y, si falla, mandará al login. |
| 403 | `FORBIDDEN` | Con sesión pero sin permiso (rol o no es el dueño). |
| 404 | `EVENT_NOT_FOUND`, `NOT_FOUND` | No existe. |
| 409 | `EVENT_NOT_AVAILABLE`, `EVENT_FINISHED`, `NOT_ENOUGH_SPOTS` | Reservas. |
| 409 | `TICKET_ALREADY_USED`, `TICKET_CANCELLED` | Validación en la puerta. |
| 409 | `EMAIL_TAKEN` | Registro con un correo existente. |
| 429 | `TOO_MANY_REQUESTS` | Rate limit (login, recuperación). |
| 500 | `INTERNAL_ERROR` | Error inesperado; mensaje genérico. |

---

## 5. Cómo prueba el frontend sin el backend

Mientras el backend no está listo, el frontend usa una **API de prueba local** con datos ficticios (`frontend/server/`, en el `.gitignore`, **no está en el repo**). Responde exactamente con las formas de este documento en la ruta `/mock-api`.

Para conectar el frontend al backend real solo hay que cambiar en `frontend/.env`:

```env
NUXT_PUBLIC_API_BASE=http://localhost:4000/api/v1
```

Si quieren ver cómo se comporta un endpoint (por ejemplo la búsqueda con `didYouMean` o las estadísticas), pídanle a la Persona 1 que se los muestre corriendo.

---

## 6. Checklist para el backend

- [ ] Prefijo `/api/v1` y CORS para el origen del frontend.
- [ ] Formato de error `{ code, message, details }` en **todos** los errores (middleware centralizado).
- [ ] Fechas en ISO UTC; dinero en colones enteros.
- [ ] `GET /categories`, `GET /events` (con `q`, `category`, `from`, `to`, `price`, `location`, paginación y `didYouMean`), `GET /locations`, `GET /events/:id`.
- [ ] `POST /events/:id/reservations` con descuento **atómico** del cupo y **prueba de concurrencia**.
- [ ] `GET /me/tickets` con `qrValue` **firmado**.
- [ ] `GET /organizer/stats` con agregaciones reales y filtrado por el organizador del token.
- [ ] Endpoints de la sección 3 acordados con el frontend antes de programarlos.
- [ ] Documentación OpenAPI/Swagger/Scalar generada a partir de este contrato.
