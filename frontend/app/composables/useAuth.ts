import type { AuthResponse, RegisterPayload, User } from '~/types/models'

/** Inicio de sesión, registro y cierre de sesión contra /auth/* */
export function useAuth() {
  const api = useApi()
  const session = useSessionStore()

  async function login(identifier: string, password: string) {
    const res = await api<AuthResponse>('/auth/login', { method: 'POST', body: { identifier, password } })
    session.setSession(res)
    // La cookie permite recuperar la sesión al recargar (ver plugins/session.ts)
    writeSessionCookie(res.accessToken, res.expiresAt)
    return res.user
  }

  async function register(payload: RegisterPayload) {
    const res = await api<{ user: User }>('/auth/register', { method: 'POST', body: payload })
    return res.user
  }

  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' })
    }
    catch { /* aunque falle, la sesión se borra en este navegador */ }
    finally {
      session.clear()
      writeSessionCookie(null)
      // Borra de la memoria todo lo que se cargó con la sesión (entradas, panel…)
      clearNuxtData()
    }
    await navigateTo('/')
  }

  return { login, register, logout }
}
