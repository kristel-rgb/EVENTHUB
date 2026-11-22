// Sesión: nombre de la cookie, a dónde va cada rol y qué puede ver.
// La cookie guarda solo el token (no datos personales). Cuando exista el backend real,
// la renovación irá con un refresh token en cookie httpOnly (tarea F08).
import type { Role } from '~/types/models'

export const SESSION_COOKIE = 'eh_session'

/** Para leerla con useCookie (en el plugin, que corre en servidor y navegador) */
export const sessionCookieOptions = () => ({
  path: '/',
  sameSite: 'lax' as const,
  secure: !import.meta.dev,
  decode: (v: string) => decodeURIComponent(v), // el token es texto: que no se convierta en número
})

/** Guarda o borra la cookie desde el navegador (después de ingresar o al cerrar sesión) */
export function writeSessionCookie(token: string | null, expiresAt?: string | null) {
  if (!import.meta.client) return
  const secure = location.protocol === 'https:' ? '; Secure' : ''
  document.cookie = token
    ? `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; SameSite=Lax${secure}${expiresAt ? `; Expires=${new Date(expiresAt).toUTCString()}` : ''}`
    : `${SESSION_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax${secure}`
}

/** Nombre para mostrar de cada rol */
export const roleLabel: Record<Role, string> = {
  attendee: 'Cliente',
  organizer: 'Organización',
  admin: 'Super Admin',
}

/** ¿Puede entrar al panel de organizar eventos? */
export const canOrganize = (role: Role | null | undefined) => role === 'organizer' || role === 'admin'

/** Página de inicio de cada rol después de ingresar */
export const homeForRole = (role: Role | null | undefined) => (role === 'admin' ? '/admin' : role === 'organizer' ? '/organizador' : '/')

/** Solo se aceptan redirecciones internas (evita mandar al usuario a otro sitio) */
export function safeRedirect(value: unknown) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : null
}
