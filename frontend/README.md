# EventHub · Frontend (Nuxt)

Interfaz web de EventHub: buscar eventos, comprar entradas con QR, organizar eventos y administrar la plataforma.
Hecha con **Nuxt 4**, **Vue 3** (`<script setup>` + TypeScript), **Pinia** y **Chart.js**.

> El frontend solo consume la API REST del backend (ver [`docs/api`](../docs/api/README.md)).
> No guarda datos propios: las reglas y la seguridad reales las aplica el backend.

---

## 1. Requisitos

- Node.js 20 o superior y npm.
- El backend de EventHub corriendo (o la API de prueba local, ver sección 6).

## 2. Cómo ejecutarlo

```bash
cd frontend
npm install
cp .env.example .env        # y ajustá NUXT_PUBLIC_API_BASE
npm run dev                 # http://localhost:3000
```

### Variables de entorno (`.env`)

| Variable | Para qué sirve | Ejemplo |
|---|---|---|
| `NUXT_PUBLIC_API_BASE` | URL base de la API, sin barra al final | `http://localhost:4000/api/v1` |

El archivo `.env` **no se sube** al repositorio. Nunca se ponen contraseñas ni claves en el código ni en este documento.

## 3. Scripts

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` | Compila para producción en `.output/` |
| `npm run preview` | Sirve la compilación de producción |
| `npm test` | Corre todas las pruebas una vez (Vitest) |
| `npm run test:watch` | Pruebas en modo observación |
| `npm run typecheck` | Revisa los tipos de TypeScript de todo el proyecto |
| `npm run check` | Tipos + pruebas + compilación, en ese orden (se detiene en el primer error) |

Antes de entregar: `npm run check` (funciona igual en PowerShell, cmd y bash).

## 4. Estructura

```
frontend/
├─ app/
│  ├─ pages/          Rutas (una página por archivo)
│  ├─ layouts/        default (sitio público) y panel (Organización y Super Admin)
│  ├─ components/     Componentes reutilizables (admin/, home/, dashboard/ …)
│  ├─ composables/    Llamadas a la API por tema: useAuth, useEvent, useReservations, useAdmin …
│  ├─ stores/         Pinia: sesión del usuario
│  ├─ middleware/     auth.global.ts: quién puede abrir cada página
│  ├─ plugins/        Recupera la sesión al recargar la página
│  ├─ utils/          Validaciones, formatos de fecha y dinero, formulario de eventos
│  └─ types/          Tipos de los datos que devuelve la API
├─ test/
│  ├─ unit/           Validaciones, formulario de eventos, fechas, sesión, errores
│  ├─ components/     FormField, StarRating, PermissionPicker
│  └─ flows/          Accesos por rol, ingresar, comprar entradas
└─ vitest.config.ts
```

## 5. Páginas y acceso por tipo de cuenta

| Página | Ruta | Sin cuenta | Cliente | Organización | Super Admin |
|---|---|:-:|:-:|:-:|:-:|
| Inicio (novedades personales si es Cliente) | `/` | ✓ | ✓ | → Resumen | ✓ |
| Buscar | `/buscar` | ✓ | ✓ | ✓ | ✓ |
| Detalle del evento | `/eventos/:id` | ✓ (para comprar pide ingresar) | ✓ compra | ✓ (no compra) | ✓ |
| Ingresar / Crear cuenta | `/login`, `/registro` | ✓ | — | — | — |
| Olvidé / restablecer contraseña, verificar correo | `/olvide-contrasena`, `/restablecer-contrasena`, `/verificar-correo` | ✓ | ✓ | ✓ | ✓ |
| Mis entradas | `/mis-entradas` | → Ingresar | ✓ | → Resumen | ✓ |
| Perfil | `/perfil` | → Ingresar | ✓ | ✓ | ✓ |
| Resumen, Mis eventos, Crear/editar evento | `/organizador`, `/organizador/eventos/**` | → Ingresar | 403 | ✓ | ✓ |
| Reservaciones, Validar entradas | `/organizador/reservaciones`, `/organizador/validar` | → Ingresar | 403 | ✓ | ✓ |
| Resumen general, Cuentas y permisos, Categorías, Moderación | `/admin/**` | → Ingresar | 403 | 403 | ✓ |
| Privacidad, Términos, Cookies | `/privacidad`, `/terminos`, `/cookies` | ✓ | ✓ | ✓ | ✓ |

- La Organización y el Super Admin trabajan con la barra de íconos del panel.
- La sesión se recupera al recargar (cookie `eh_session`); si la API responde 401, la sesión se cierra.

### Revisión rápida por rol

- **Sin cuenta:** buscar, filtrar y ordenar; abrir un evento; al comprar, ir a Ingresar y volver al evento.
- **Cliente:** comprar por tipo de entrada; ver el QR en Mis entradas; pedir que se reenvíe; cancelar según la política; calificar un evento al que asistió; editar el perfil y cambiar la contraseña.
- **Organización:** crear un evento en 5 pasos (borrador → publicar); editar; ver reservaciones; validar entradas con la cámara o con el código; descargar reportes CSV/PDF.
- **Super Admin:** ver estadísticas; crear cuentas de Organización o Lugar con permisos; administrar categorías; ocultar reseñas.

## 6. API de prueba local (no se sube)

Para trabajar sin el backend, hay una API simulada en `frontend/server/` y páginas de apoyo en `app/pages/dev/`.
**Esas carpetas están en `.gitignore` y no forman parte de la entrega.** Para usarla:

```bash
NUXT_PUBLIC_API_BASE=/mock-api npm run dev
```

Las cuentas de prueba se definen en esa API local y en el `.env` (cuenta Super Admin con `SEED_ADMIN_USERNAME` y `SEED_ADMIN_PASSWORD`).
Las contraseñas no se escriben en este documento.

## 7. Pruebas

```bash
npm test
```

- **66 pruebas** con Vitest y `@nuxt/test-utils` (entorno Nuxt + happy-dom).
- No necesitan backend: las llamadas se responden con `registerEndpoint` sobre una URL de prueba (`/api-test`).
- Cubren: validaciones de formularios, el formulario de eventos (borradores, tipos de entrada, lista para publicar), fechas y dinero en formato de Costa Rica, sesión y mensajes de error, accesibilidad de componentes, accesos por tipo de cuenta, ingresar y comprar entradas.

## 8. Accesibilidad y diseño adaptable

- Objetivo WCAG 2.1 AA. Revisado con **axe-core** en 21 páginas × 2 tamaños (escritorio 1366 px y celular 390 px), con las 4 clases de cuenta, en tema claro y oscuro: **0 problemas** graves o moderados.
- Ninguna página se sale del ancho de la pantalla en celular.
- Formularios con etiquetas, errores leídos por lectores de pantalla (`aria-describedby`, `aria-live`) y resumen de errores.
- Navegación completa con teclado, foco visible y enlace para saltar al contenido.
- Menú de accesibilidad: tamaño de letra, alto contraste, tema oscuro y menos animaciones.

Capturas de pantalla por rol y tamaño: [`docs/capturas/frontend`](../docs/capturas/frontend/).

## 9. Seguridad en el frontend

- No se guardan contraseñas ni datos de tarjetas. El pago solo guarda una referencia (`paymentRef`).
- El token de sesión vive en una cookie con `SameSite=Lax` y vencimiento; se borra al cerrar sesión o al recibir 401.
- Las redirecciones después de ingresar solo aceptan rutas internas (`safeRedirect`).
- Las restricciones por rol del frontend son de navegación; el backend debe validar cada permiso.

## 10. Conectar el backend real

1. Poner `NUXT_PUBLIC_API_BASE=http://localhost:4000/api/v1` (o la URL del servidor) en `.env`.
2. Respetar los contratos de [`docs/api/README.md`](../docs/api/README.md) y [`docs/base-de-datos/README.md`](../docs/base-de-datos/README.md).
3. Errores con el formato `{ code, message, details }` (el código HTTP indica el tipo); los campos de `details` se muestran junto a cada campo del formulario.
4. Permitir CORS desde la URL del frontend.
