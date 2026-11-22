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

### 1.3 Quién puede usar cada parte (separación de accesos)

El frontend muestra un menú distinto según el tipo de cuenta y protege las páginas, pero **eso solo ordena la navegación: la seguridad está en la API**. Cada endpoint debe revisar el token (`401 UNAUTHORIZED` si falta o venció) y el rol (`403 FORBIDDEN` si no le corresponde).

| Tipo de cuenta (`role`) | Ve en el sitio | Endpoints |
|---|---|---|
| Sin cuenta | Inicio, Buscar, detalle de eventos, páginas legales, Ingresar, Crear cuenta. **Puede ver y buscar, pero no comprar.** | Solo públicos: `GET /categories`, `GET /events`, `GET /events/:id`, `GET /locations`, `POST /auth/*`. |
| Cliente (`attendee`) | Lo anterior + **Mis entradas** (con historial) y **Perfil**, y **Cerrar sesión**. | + `POST /events/:id/reservations`, `/me/*` (sección 2.14), `GET /me/tickets`, `/me/reservations/*`. |
| Organización (`organizer`) | **Solo su panel** (Resumen, Mis eventos, Reservaciones, Validar entradas) y **Buscar**, dentro de la misma barra de íconos, más su Perfil. **No** tiene Inicio ni Mis entradas y **no compra** entradas. Solo ve y cambia **sus** eventos. | `/organizer/*`, `POST/PATCH/DELETE /events…`, `/tickets/validate`, `/files/upload-intent`, `/me` (perfil). Si el evento o la reservación no es suyo → `404`. `POST /events/:id/reservations` → `403 FORBIDDEN`. |
| Super Admin (`admin`) | **Todo**: lo anterior sobre **todos** los eventos, y el panel de administración (pendiente). | Todos. En `/organizer/*` el admin ve los eventos de todas las organizaciones. |

- **Sesión en el navegador:** el frontend guarda el `accessToken` en una cookie `eh_session` (`SameSite=Lax`, `Secure` en producción) para no perder la sesión al recargar, y al abrir la página llama `GET /auth/me` para recuperar el usuario. Cuando exista el refresh token, la idea es pasar a cookie **httpOnly** del backend (tarea F08).
- Al cerrar sesión: `POST /auth/logout` invalida el token en el servidor.
- **Vista previa de un borrador** (`GET /events/:id?preview=1`): solo su organización o el Super Admin. Sin sesión → `401`; con otra cuenta → `404` (para no revelar que existe).

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
| `sort` | `date` \| `popular` | `date` (por defecto): el más próximo primero. `popular`: **los más esperados**, ordenados por % vendido (`(capacity - availableSpots) / capacity`) de mayor a menor; se usa en el inicio del cliente. |
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
- Los eventos `draft` **no** son públicos: responder **404**.
- **Vista previa:** con `?preview=1` se devuelve también un borrador, **solo** si quien pide es su organizador o un admin (con sesión). El frontend la abre en `/eventos/:id?vista=previa` para que la empresa organizadora apruebe el evento antes de publicarlo.
- Incluye los campos ampliados del evento (`summary`, `imageAlt`, `venueName`, `address`, `city`, `province`, `endDate`, `doorsOpenMinutes`, `maxPerPurchase`, `minAge`, `accessibility`, `importantInfo`). Ver sección 2.11.

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

**Pago y plazo de 3 horas**

- En un evento **de pago**, la reservación nace con `status: "pending"` y `paymentStatus: "pending"`, guarda los espacios y lleva `expiresAt = createdAt + 3 h`. **Todavía no tiene entradas.**
- Cuando la pasarela confirma el pago (webhook), pasa a `status: "confirmed"`, `paymentStatus: "paid"`, se guardan `paidAt` y `paymentRef`, **se emiten las entradas** y se envía el correo con ellas (`ticketsSentAt`).
- Si el pago **no se confirma en 3 horas**, una tarea programada (EventBridge + Lambda, cada 5 min) la pasa a `cancelled` con `cancelledBy: "system"` y devuelve los espacios con `$inc`. Ver la guía de base de datos, regla 4.2.
- En un evento **gratis** (`price: 0`) se confirma al instante con `paymentStatus: "free"`.
- **Nunca** se guardan datos de tarjeta: solo la referencia que devuelve la pasarela (`paymentRef`).

**Respuesta 201**

```json
{
  "reservation": {
    "_id": "6740b0000000000000000001",
    "event": { "_id": "6740a0a0...", "name": "Noche de jazz en vivo" },
    "user": { "_id": "6740a003...", "name": "Andrea Vargas" },
    "quantity": 2,
    "total": 24000,
    "status": "confirmed",
    "paymentStatus": "paid",
    "createdAt": "2026-11-20T18:30:00.000Z"
  },
  "tickets": [
    { "_id": "6740c000...01", "code": "EH-20387" },
    { "_id": "6740c000...02", "code": "EH-20388" }
  ]
}
```

- Se crea **una entrada (Ticket) por cada espacio** reservado, cuando el pago queda confirmado. Si el pago todavía está pendiente, `tickets` viene vacío.
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

Datos del dashboard del organizador. **Requiere sesión de Organizador** (o Admin). Se calcula **solo con los eventos del organizador que hace la petición** (sacarlo del token, no de un parámetro).

**Query params**

| Parámetro | Valores | Descripción |
|---|---|---|
| `period` | `7` \| `30` \| `90` | Días hacia atrás desde hoy. Por defecto `30`. El "periodo anterior" son los mismos días justo antes. |

**Respuesta 200**

```json
{
  "period": 30,
  "organizerName": "Sonido Vivo Producciones",
  "kpis": {
    "revenue":       { "value": 15360000, "previous": 12688000, "series": [2100000, 2650000, 2400000, 2900000, 2700000, 2610000] },
    "ticketsSold":   { "value": 1936, "previous": 1520, "series": [260, 330, 300, 362, 340, 344] },
    "occupancyRate": { "value": 78, "previous": 35, "series": [42, 50, 57, 64, 71, 78] },
    "events":        { "active": 8, "draft": 1, "cancelled": 1 }
  },
  "nextEvent": { "_id": "...", "name": "Noche de jazz en vivo", "date": "2026-11-28T02:00:00.000Z", "location": "Jazz Café, Escazú", "capacity": 120, "reserved": 112 },
  "sales": {
    "current":  [ { "start": "2026-10-23T06:00:00.000Z", "tickets": 260, "revenue": 2100000 } ],
    "previous": [ { "start": "2026-09-23T06:00:00.000Z", "tickets": 210, "revenue": 1800000 } ]
  },
  "alerts": [
    { "type": "almost_full", "eventId": "...", "title": "Noche de jazz en vivo casi lleno", "message": "93 % · quedan 8 espacios" },
    { "type": "drafts", "eventId": null, "title": "1 evento en borrador", "message": "Publicalos para empezar a vender." }
  ],
  "recentActivity": [
    { "_id": "...", "type": "reservation", "userName": "Ana M.", "quantity": 2, "eventId": "...", "eventName": "Noche de jazz en vivo", "createdAt": "2026-11-22T05:58:00.000Z" }
  ],
  "events": [
    { "_id": "...", "name": "Noche de jazz en vivo", "date": "2026-11-28T02:00:00.000Z", "status": "published", "capacity": 120, "reserved": 112, "revenue": 1008000 }
  ]
}
```

**Cómo se calcula cada parte**

| Campo | Cálculo |
|---|---|
| `kpis.revenue` | Suma de `quantity × event.price` de las reservaciones `confirmed` **creadas** en el periodo. `previous`: lo mismo en el periodo anterior. |
| `kpis.ticketsSold` | Suma de `quantity` de las reservaciones `confirmed` creadas en el periodo (y en el anterior). |
| `kpis.occupancyRate` | `round(espacios reservados / capacidad total × 100)` de los eventos **activos** (publicados y futuros). `value` = hoy; `previous` = al inicio del periodo. Entero 0–100. |
| `…series` | Un valor por tramo, en el mismo orden que `sales.current`. Para la ocupación, el valor al final de cada tramo. |
| `kpis.events` | `active`: publicados y futuros · `draft`: borradores · `cancelled`: cancelados con fecha futura. |
| `nextEvent` | El evento publicado más próximo, o `null`. `reserved` = suma de `quantity` confirmadas. |
| `sales.current` / `sales.previous` | Tramos del periodo. **7 días:** 7 tramos de 1 día. **30 días:** 6 tramos de 5 días. **90 días:** 13 tramos de 7 días. `start` = inicio del tramo. |
| `alerts` | Máximo 4, en este orden: `sold_out` (sin espacios), `almost_full` (≥ 90 %), `low_sales` (< 35 % y faltan 21 días o menos), `drafts` (cuántos borradores hay; `eventId: null`). `title` y `message` en español, listos para mostrar. |
| `recentActivity` | Las 6 reservaciones más recientes de sus eventos (incluye canceladas, `type: "cancellation"`). `userName` = nombre y **solo la inicial** del apellido (privacidad). |
| `events` | Sus eventos futuros y sus borradores, por fecha. `revenue` = espacios reservados × precio. |

> Son agregaciones de MongoDB (`$match`, `$group`, `$sum`, `$bucket` o `$dateTrunc`). El enunciado exige que sean **consultas reales**, no datos fijos.

---

### 2.8 `POST /auth/login`

**Body**

```json
{ "identifier": "UserTest", "password": "••••••••" }
```

- `identifier` puede ser el **nombre de usuario** (sin importar mayúsculas) **o el correo**.

**Respuesta 200**

```json
{
  "accessToken": "<token>",
  "expiresAt": "2026-11-21T09:59:44.959Z",
  "user": {
    "_id": "...", "username": "UserTest", "firstName": "Usuario", "lastName1": "Test", "lastName2": "Pruebas",
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

### 2.11 Gestión de eventos del organizador ("Mis eventos")

Pantallas: `/organizador/eventos` (lista), `/organizador/eventos/nuevo` y `/organizador/eventos/:id/editar` (el mismo formulario). Todas piden sesión de **organizador o admin**; un organizador solo ve y cambia **sus** eventos (si no es suyo → `404`, no `403`, para no revelar que existe).

**Flujo:** se crea como **borrador** → *Vista previa* (la empresa organizadora la revisa y aprueba) → *Publicar*. Si se edita un evento ya publicado, el cambio se ve de inmediato en el detalle, en Buscar y en el Inicio.

#### Campos del evento que envía el formulario (`EventInput`)

| Campo | Tipo | Para publicar | Notas |
|---|---|---|---|
| `name` | string | ✓ | 3–120 caracteres. Único campo obligatorio para guardar un borrador. |
| `category` | ObjectId | ✓ | |
| `summary` | string | ✓ | Una frase, máx. 160. Se muestra debajo del título. |
| `description` | string | ✓ | Mín. 40 caracteres. Párrafos separados con `\n`. |
| `imageUrl` / `imageAlt` | string \| null | — | Si hay imagen, `imageAlt` es obligatorio (accesibilidad). |
| `date` | ISO 8601 | ✓ | Inicio. Debe ser futuro. El frontend envía hora de Costa Rica (`-06:00`). |
| `endDate` | ISO \| null | — | Fin; debe ser después de `date`. |
| `doorsOpenMinutes` | number | — | Minutos antes del inicio en que abren puertas (0–240). |
| `venueName`, `address`, `city`, `province` | string | ✓ (menos `address`) | `province` es una de las 7 provincias. El backend arma `location = "venueName, city"`. |
| `capacity` | number | ✓ | Entero ≥ 1. Al editar, **no menor** que lo ya reservado. |
| `price` | number | ✓ | Entero ≥ 0 en colones. `0` = gratis. |
| `maxPerPurchase` | number | — | 1–10. El detalle limita la cantidad con esto. |
| `minAge` | number | — | `0` (todo público), `12`, `15` o `18`. |
| `accessibility` | string[] | — | `wheelchair`, `parking`, `public_transport`, `sign_language`. |
| `importantInfo` | string | — | Una indicación por línea. |

#### Endpoints

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| `GET` | `/organizer/events?status=&q=&sort=&page=&limit=` | Lista propia. `status`: `published` \| `draft` \| `finished` \| `cancelled` (vacío = todos). `sort`: `date` (más próximo, por defecto) \| `recent` (creado recientemente) \| `occupancy` \| `revenue`. | `200` `{ items: OrganizerEvent[], page, limit, total, counts: { all, published, draft, finished, cancelled } }` |
| `GET` | `/organizer/events/:id` | Un evento propio con todos sus campos (para el formulario). | `200` `OrganizerEvent` |
| `POST` | `/events` | Crear. Siempre queda `draft`. | `201` `OrganizerEvent` |
| `PATCH` | `/events/:id` | Editar. Si está `published` se valida **completo**. | `200` `OrganizerEvent` |
| `DELETE` | `/events/:id` | Eliminar. **Solo borradores** (los demás se cancelan). | `204` |
| `POST` | `/events/:id/publish` | `draft` → `published`. Valida que esté completo. | `200` `OrganizerEvent` |
| `POST` | `/events/:id/cancel` | `published` → `cancelled`. Cancela reservaciones y entradas y avisa por correo a los asistentes. | `200` `{ event, notified }` |
| `POST` | `/events/:id/duplicate` | Copia como **borrador** con nombre "(copia)", sin reservaciones. El frontend abre el formulario de la copia para cambiar fecha, hora, lugar o cualquier dato. | `201` `OrganizerEvent` |
| `POST` | `/files/upload-intent` | `{ fileName, contentType, size }` → `{ uploadUrl, fileUrl }`. URL **prefirmada de S3**; el frontend hace `PUT uploadUrl` con el archivo y guarda `fileUrl` en `imageUrl`. Solo `image/jpeg`, `image/png`, `image/webp`, máx. 5 MB. | `200` |

`OrganizerEvent` = todos los campos de arriba + `_id`, `category` (populado), `location`, `availableSpots`, `status`, `displayStatus` (`finished` si está publicado y la fecha ya pasó), `reserved`, `revenue`, `attendees`, `createdAt`, `updatedAt`.

#### Errores

| Status | code | Cuándo |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Datos inválidos (incluye bajar `capacity` por debajo de lo reservado). `details` = `{ campo: mensaje }` con los nombres de la API (`date`, `endDate`, `capacity`…); el frontend los marca en el formulario. |
| 404 | `EVENT_NOT_FOUND` | No existe o no es del organizador. |
| 409 | `EVENT_INCOMPLETE` | Publicar con datos faltantes. `details` igual que arriba. El frontend lleva al formulario con `?revisar=1`. |
| 409 | `EVENT_NOT_EDITABLE` | Editar un evento `cancelled` o `finished`. |
| 409 | `EVENT_NOT_DRAFT` | Publicar algo que no es borrador. |
| 409 | `EVENT_NOT_DELETABLE` | Eliminar algo que no es borrador (los publicados se cancelan). |
| 409 | `EVENT_NOT_CANCELLABLE` | Cancelar algo que no está publicado o ya pasó. |
| 400 | `INVALID_FILE_TYPE` / `FILE_TOO_LARGE` / `EMPTY_FILE` | Imagen inválida. |

> Para confirmar la cancelación, el frontend pide escribir el nombre del evento. No hace falta que el backend lo valide.

---

### 2.12 Reservaciones (organizador y cliente)

Pantallas: `/organizador/reservaciones` (organizador) y `/mis-entradas` (cliente). Las dos pueden **cancelar** una reservación y **reenviar** las entradas por correo (por si el cliente las perdió).

#### Objeto `ReservationItem`

```json
{
  "_id": "6740b0000000000000000001",
  "code": "R-0001",
  "quantity": 2,
  "unitPrice": 12000,
  "total": 24000,
  "status": "confirmed",
  "paymentStatus": "paid",
  "paymentRef": "PAY-8F2A91C0",
  "paidAt": "2026-11-20T18:31:30.000Z",
  "expiresAt": null,
  "cancelledAt": null,
  "cancelledBy": null,
  "ticketsSentAt": "2026-11-20T18:32:00.000Z",
  "createdAt": "2026-11-20T18:30:00.000Z",
  "ticketsUsed": 0,
  "canCancel": true,
  "canResend": true,
  "event": { "_id": "...", "name": "Noche de jazz en vivo", "date": "...", "location": "Jazz Café, Escazú", "status": "published", "category": { "_id": "...", "name": "Conciertos", "slug": "conciertos" } },
  "customer": { "_id": "...", "name": "Andrea Vargas", "email": "a••••s@correo.cr" }
}
```

| Campo | Notas |
|---|---|
| `code` | Código corto para mostrar y buscar: `R-` + últimos 4 caracteres del `_id` en mayúscula. |
| `status` | `pending` (esperando pago) \| `confirmed` \| `cancelled`. |
| `paymentStatus` | `pending` \| `paid` \| `free`. |
| `paymentRef` | Referencia de la pasarela. **Nunca** datos de tarjeta. |
| `expiresAt` | Solo si `status: "pending"`: hora en que se cancela sola (creación + 3 h). |
| `cancelledBy` | `customer` \| `organizer` \| `system` (pago no confirmado a tiempo). |
| `ticketsUsed` | Entradas de la reservación ya validadas en la puerta. |
| `canCancel` / `canResend` | Calculados por el backend con las reglas de abajo; el frontend muestra u oculta los botones con esto. |
| `customer.email` | En las **listas** va parcialmente oculto (`a••••s@correo.cr`). Completo, con `phone`, solo en el detalle del organizador. |

#### Endpoints del organizador

Solo reservaciones de **eventos suyos** (si no, `404`).

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| `GET` | `/organizer/reservations?event=&status=&q=&sort=&page=&limit=` | Lista. `event` vacío = todos sus eventos. `status`: `confirmed` \| `pending` \| `cancelled`. `q` busca por nombre, correo, código de reservación (`R-1A2B`) o de entrada (`EH-1042`), sin tildes. `sort`: `recent` (por defecto) \| `oldest` \| `total` \| `quantity`. `limit` máx. 50. | `200` (ver abajo) |
| `GET` | `/organizer/reservations/:id` | Detalle: `ReservationItem` con `customer.email` completo, `customer.phone` y `tickets: [{ _id, code, status, usedAt }]`. | `200` |
| `POST` | `/organizer/reservations/:id/cancel` | Cancela (`cancelledBy: "organizer"`). | `200` `ReservationItem` |
| `POST` | `/organizer/reservations/:id/resend` | Reenvía las entradas al correo de la cuenta del cliente. | `200` `{ sentTo, sentAt }` (`sentTo` con el correo oculto) |

Respuesta de la lista:

```json
{
  "items": [ /* ReservationItem */ ],
  "page": 1, "limit": 20, "total": 86,
  "counts": { "all": 92, "confirmed": 81, "pending": 6, "cancelled": 5 },
  "summary": {
    "reservations": 81,
    "newThisWeek": 12,
    "ticketsSold": 142,
    "ticketsPending": 8,
    "capacity": 180,
    "revenue": 1704000,
    "checkedIn": 0,
    "unitPrice": 12000
  }
}
```

- `counts` respeta la búsqueda `q` pero no el filtro `status` (son los números de las pestañas).
- `summary` es del evento elegido (o de todos), **sin** la búsqueda: `reservations` y `ticketsSold` cuentan solo `confirmed`; `revenue` suma solo lo **pagado**; `checkedIn` = entradas `used`; `unitPrice` es `null` cuando son todos los eventos.

#### Endpoints del cliente

Solo sus propias reservaciones (si no, `404`).

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| `GET` | `/me/reservations?status=` | Sus reservaciones. El frontend la usa con `status=pending` para mostrar "Esperando pago" en Mis entradas. | `200` `ReservationItem[]` |
| `POST` | `/me/reservations/:id/cancel` | Cancela su reservación completa (`cancelledBy: "customer"`). | `200` `ReservationItem` |
| `POST` | `/me/reservations/:id/resend` | Le reenvía sus entradas (por si las perdió). | `200` `{ sentTo, sentAt }` |

> Las entradas de `GET /me/tickets` ya traen `reservation._id`, que es lo que el frontend usa para cancelar o reenviar desde el boleto.

#### Reglas (iguales para los dos lados)

- **Cancelar** se puede si la reservación está `pending` o `confirmed`, el evento **todavía no ocurrió** y **ninguna entrada se usó**. Al cancelar: `status: "cancelled"`, `cancelledAt`, `cancelledBy`, las entradas pasan a `cancelled`, los espacios vuelven con `$inc` y se envía un correo al cliente (Persona 4).
- **Reenviar** se puede si está `confirmed` y el evento no ocurrió. Siempre al correo **de la cuenta** (no a uno que mande el cliente). Límite: una vez por minuto por reservación → `429 RESEND_TOO_SOON`.
- **Reembolsos** de reservaciones pagadas que se cancelan: **pendiente de decidir** la política (¿siempre?, ¿hasta X horas antes?). El frontend por ahora no promete reembolso.

#### Errores

| Status | code | Cuándo |
|---|---|---|
| 404 | `RESERVATION_NOT_FOUND` | No existe o no le pertenece (al cliente o a un evento del organizador). |
| 409 | `RESERVATION_ALREADY_CANCELLED` | Ya estaba cancelada. |
| 409 | `EVENT_FINISHED` | El evento ya ocurrió. |
| 409 | `TICKETS_ALREADY_USED` | Alguna entrada ya se validó en la puerta. |
| 409 | `RESERVATION_NOT_CONFIRMED` | Reenviar algo que no está confirmado (pendiente de pago o cancelado). |
| 429 | `RESEND_TOO_SOON` | Reenvío repetido en menos de un minuto. |

---

### 2.13 Validar entradas en la puerta

Pantalla: `/organizador/validar`, pensada para el **celular** del personal en la puerta. Se escanea el QR con la cámara o se escribe el código (`EH-1042`). **La validación la hace siempre el backend**; el frontend solo muestra el resultado.

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| `GET` | `/organizer/checkin/events` | Eventos del organizador que se pueden validar: `published`, que empiezan en los próximos **7 días** o empezaron hace menos de **12 horas**, ordenados por fecha. | `200` `[{ _id, name, date, doorsOpenMinutes, location, sold, checkedIn }]` |
| `GET` | `/organizer/checkin?event=:id` | Contador y últimas 15 validaciones del evento. | `200` `{ event: { _id, name, date, location }, sold, checkedIn, recent: ScanInfo[] }` |
| `POST` | `/tickets/validate` | Valida y marca la entrada como usada. Body: `{ event, qrValue }` (escaneado) **o** `{ event, code }` (escrito; acepta `EH-1042` o solo `1042`), más `gate` opcional (nombre de la puerta, máx. 40). | `200` `ScanInfo` + `{ result: "valid", sold, checkedIn }` |
| `POST` | `/tickets/:id/undo-validation` | Deshace una validación hecha por error: solo **quien la hizo** y dentro de **2 minutos**. La entrada vuelve a `active`. | `200` `{ ticketId, sold, checkedIn }` |

`sold` = entradas vigentes del evento (sin canceladas); `checkedIn` = entradas `used`.

**`ScanInfo`**

```json
{
  "ticket": { "_id": "...", "code": "EH-1043", "position": { "n": 2, "of": 2 } },
  "holder": { "name": "Andrea Vargas" },
  "reservation": { "code": "R-4F2A", "paymentStatus": "paid" },
  "usedAt": "2026-11-28T01:41:00.000Z",
  "gate": "Puerta 1",
  "canUndo": true
}
```

**Orden de las validaciones** (en el servidor):

1. El evento es del organizador → si no, `404 EVENT_NOT_FOUND`. Si está cancelado → `409 EVENT_CANCELLED`.
2. Verificar la **firma** del `qrValue` (o buscar por `code`) → si no existe o la firma no coincide, `404 TICKET_INVALID`.
3. La entrada es de **ese** evento → si no, `409 TICKET_WRONG_EVENT` (con `details.eventName`).
4. La entrada o su reservación están canceladas → `409 TICKET_CANCELLED`.
5. La reservación está esperando pago → `409 TICKET_PAYMENT_PENDING`.
6. Ya está `used` → `409 TICKET_ALREADY_USED`.
7. Marcarla con **una sola operación atómica**: `findOneAndUpdate({ _id, status: 'active' }, { $set: { status: 'used', usedAt: now, validatedBy: userId, gate } })`. Si devuelve `null`, otro dispositivo la acaba de validar → `409 TICKET_ALREADY_USED`.

> **Los rechazos llevan los datos para la pantalla en `details`** (el mismo `ScanInfo` cuando se encontró la entrada), por ejemplo, para `TICKET_ALREADY_USED`: nombre del titular, hora en que se usó y en qué puerta. Para `TICKET_INVALID`, `details` va vacío.

Errores de deshacer: `403 FORBIDDEN` (no la validó él), `409 UNDO_EXPIRED` (pasaron más de 2 minutos), `409 TICKET_NOT_USED`.

> La cámara del navegador solo funciona en **https** (o `localhost`). En producción el frontend va con https; para probar desde un celular en desarrollo hay que levantar Nuxt con `--https`.

---

### 2.14 Perfil (`/perfil`)

Página para **cualquier** cuenta con sesión.

| Método | Ruta | Qué hace | Respuesta |
|---|---|---|---|
| `GET` | `/auth/me` | Usuario de la sesión (sección 2.8). El frontend lo llama al abrir el sitio para recuperar la sesión. | `200` `User` |
| `PATCH` | `/me` | Actualiza **solo** los datos personales: `firstName`, `lastName1`, `lastName2`, `phone`, `birthDate`, `address { province, canton, line }` y, si es organización, `organizationName`. Se mandan todos juntos. | `200` `User` |
| `POST` | `/me/password` | `{ currentPassword, newPassword }`. Verifica la actual, aplica las reglas de contraseña, guarda el **hash** y **cierra las demás sesiones** del usuario. | `200` `{ closedSessions }` |

**Reglas de `PATCH /me`** (las mismas del registro): nombre y primer apellido de 2+ caracteres, teléfono de Costa Rica de 8 dígitos (`^[2-8]\d{7}$`), mayor de 18 años, provincia de la lista y cantón de 2+ caracteres. `name` se recalcula: nombre + apellidos (o `organizationName` si es organización). Errores: `400 VALIDATION_ERROR` con `details` por campo.

**No se cambian desde el perfil:** `username`, `email` (necesita verificación del correo nuevo), `idType`/`idNumber` y `role`. El frontend los muestra como solo lectura y la identificación enmascarada (`•••••0567`).

**Errores de `POST /me/password`:** `400 WRONG_PASSWORD` (la actual no coincide, con `details.currentPassword`) · `400 VALIDATION_ERROR` (no cumple las reglas o es igual a la actual, con `details.newPassword`). Enviar un correo avisando del cambio (Persona 4).

### 2.15 Inicio del cliente (`GET /me/feed`)

Cuando un **cliente** ingresa, el inicio no muestra el hero: muestra un saludo con buscador, **su próxima entrada** (sale de `GET /me/tickets`), **Novedades** y **Lo más esperado** (`GET /events?sort=popular&limit=4`).

`GET /me/feed` (requiere sesión) → `200 { items: FeedItem[] }`, en este orden:

| `type` | Qué es | Regla |
|---|---|---|
| `cancelled` | Un evento al que iba se canceló. | `eventUpdates` de los últimos 30 días de eventos donde el usuario tuvo reservación. |
| `changed` | Cambió la fecha, la hora o el lugar de un evento al que va. | `eventUpdates` de los últimos 30 días de eventos con reservación **no cancelada**. Más reciente primero. |
| `few_spots` | Últimos espacios. | Máx. 2 eventos publicados y futuros con **85 % o más** vendido y espacios libres, que el usuario no tenga; primero los de sus categorías favoritas. |
| `new` | Nuevo evento que le puede gustar. | Máx. 3 eventos publicados en las últimas 3 semanas, de las **3 categorías en que más compra** (o de cualquiera si no tiene historial), que no tenga. |

```json
{
  "_id": "...", "type": "changed", "title": "Cambio de fecha u hora",
  "text": "La hora de inicio cambió a las 8:00 p. m.", "createdAt": "2026-11-20T15:00:00.000Z",
  "event": { "_id": "...", "name": "Noche de jazz en vivo", "date": "...", "location": "...", "imageUrl": null,
             "capacity": 120, "availableSpots": 5, "status": "published", "category": { "_id": "...", "name": "Conciertos", "slug": "conciertos" } }
}
```

**Cuándo se crea un `eventUpdate`:** en `PATCH /events/:id` de un evento **publicado**, si cambia `date`, `venueName`, `city` o `address` (con un texto que diga qué cambió), y en `POST /events/:id/cancel`. Además, enviar un correo a quienes tienen entradas (Persona 4). Ver la guía de base de datos, sección 3.9.

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
| ~~`GET`~~ / ~~`PATCH`~~ | ~~`/me`~~ | **Ya definidos** en la sección 2.14 (`GET /auth/me`, `PATCH /me`, `POST /me/password`). | |

Por decidir entre los dos:

- **Dónde va el refresh token.** Recomendado: cookie `httpOnly`, `Secure`, `SameSite=Lax`. El `accessToken` lo guarda el frontend solo en memoria.
- **Rutas del frontend a las que apuntan los enlaces de los correos:** `/verificar-correo?token=...` y `/restablecer-contrasena?token=...`.
- **Tipos de usuario:** solo se registran **Clientes** (`attendee`). El **Administrador** (dueño del sistema, todos los permisos) se crea con el seed. El **Organizador** existe pero solo lo asigna el Admin (ver la guía de base de datos, sección 3.8).

### 3.2 Reservaciones y entradas (Persona 3)

| Método | Ruta | Notas |
|---|---|---|
| ~~`POST`~~ | ~~`/reservations/:id/cancel`~~ | **Ya definido** en la sección 2.12 (`/me/reservations/:id/cancel` y `/organizer/reservations/:id/cancel`). |
| `POST` | `/payments/webhook` | Lo llama la pasarela cuando confirma un pago: verificar la firma, pasar la reservación a `confirmed`/`paid`, emitir entradas y enviar el correo. Si llega después de las 3 h y la reservación ya se canceló: **reembolsar** (pendiente de definir con la pasarela). |
| ~~`POST`~~ | ~~`/tickets/validate`~~ | **Ya definido** en la sección 2.13. |
| ~~`GET`~~ | ~~`/organizer/events/:id/reservations`~~ | Reemplazado por `GET /organizer/reservations?event=:id` (sección 2.12). |

### 3.3 Gestión de eventos del organizador (Persona 3 y Persona 4)

**Ya definidos** en la sección 2.11 (crear, editar, publicar, cancelar, duplicar, eliminar borrador y subir imagen). Lo que falta acá es solo el correo de cancelación a los asistentes (Persona 4).

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
| 404 | `TICKET_INVALID` | QR o código que no corresponde a ninguna entrada (o firma inválida). |
| 409 | `TICKET_ALREADY_USED`, `TICKET_CANCELLED`, `TICKET_WRONG_EVENT`, `TICKET_PAYMENT_PENDING`, `EVENT_CANCELLED` | Validación en la puerta (sección 2.13). Llevan `details` para la pantalla. |
| 409 | `UNDO_EXPIRED`, `TICKET_NOT_USED` | Deshacer una validación. |
| 404 | `RESERVATION_NOT_FOUND` | Reservación inexistente o ajena. |
| 409 | `RESERVATION_ALREADY_CANCELLED`, `TICKETS_ALREADY_USED`, `RESERVATION_NOT_CONFIRMED` | Cancelar o reenviar reservaciones (sección 2.12). |
| 409 | `EVENT_INCOMPLETE`, `EVENT_NOT_EDITABLE`, `EVENT_NOT_DRAFT`, `EVENT_NOT_DELETABLE`, `EVENT_NOT_CANCELLABLE` | Gestión de eventos (sección 2.11). |
| 429 | `RESEND_TOO_SOON` | Reenvío de entradas repetido en menos de un minuto. |
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
- [ ] Separación de accesos (sección 1.3): token y rol revisados en **cada** endpoint; comprar exige sesión.
- [ ] Perfil (sección 2.14): `PATCH /me` y `POST /me/password` (cierra las otras sesiones).
- [ ] Formato de error `{ code, message, details }` en **todos** los errores (middleware centralizado).
- [ ] Fechas en ISO UTC; dinero en colones enteros.
- [ ] `GET /categories`, `GET /events` (con `q`, `category`, `from`, `to`, `price`, `location`, paginación y `didYouMean`), `GET /locations`, `GET /events/:id`.
- [ ] `POST /events/:id/reservations` con descuento **atómico** del cupo y **prueba de concurrencia**.
- [ ] `GET /me/tickets` con `qrValue` **firmado**.
- [ ] `GET /organizer/stats` con agregaciones reales y filtrado por el organizador del token.
- [ ] Gestión de eventos (sección 2.11): crear, editar, publicar, vista previa, duplicar, cancelar, eliminar borrador y subida de imagen a S3.
- [ ] Reservaciones (sección 2.12): estado de pago, **cancelación automática a las 3 h** (tarea programada), cancelar y reenviar desde los dos lados.
- [ ] Validación en la puerta (sección 2.13): firma del QR, operación atómica, deshacer en 2 minutos y `validatedBy`/`gate`.
- [ ] Inicio del cliente (sección 2.15): `GET /me/feed`, `GET /events?sort=popular` y registrar `eventUpdates` al cambiar o cancelar un evento publicado.
- [ ] Webhook de la pasarela de pago. **No guardar datos de tarjeta**, solo `paymentRef`.
- [ ] Endpoints de la sección 3 acordados con el frontend antes de programarlos.
- [ ] Documentación OpenAPI/Swagger/Scalar generada a partir de este contrato.
