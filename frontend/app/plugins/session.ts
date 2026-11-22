// Recupera la sesión al abrir o recargar la página: si hay cookie con token,
// pide el perfil a GET /auth/me. Corre también en el servidor, así la página
// llega ya con el menú correcto (sin parpadeos) y las páginas protegidas se revisan antes de mostrarse.
import type { User } from '~/types/models'

export default defineNuxtPlugin(async () => {
  const session = useSessionStore()
  const token = useCookie<string | null>(SESSION_COOKIE, sessionCookieOptions())
  if (session.user || !token.value) return

  session.accessToken = token.value
  try {
    session.user = await useApi()<User>('/auth/me')
  }
  catch {
    // Token vencido o inválido: se borra la sesión
    session.clear()
    token.value = null
  }
})
