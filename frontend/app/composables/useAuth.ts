import type { AuthResponse, CompleteProfilePayload, GoogleExchangeResponse, RegisterPayload, User } from '~/types/models'

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

  // ---------- Recuperar contraseña, invitaciones y verificación de correo ----------
  /** Siempre responde igual, exista o no la cuenta */
  const forgotPassword = (email: string) => api('/auth/forgot-password', { method: 'POST', body: { email } })
  /** Revisa el enlace antes de mostrar el formulario (no lo gasta) */
  const checkResetToken = (token: string) =>
    api<{ kind: 'reset' | 'invite', name: string, username: string, expiresAt: string }>('/auth/reset-password/check', { query: { token } })
  const resetPassword = (token: string, password: string) =>
    api<{ username: string, kind: 'reset' | 'invite' }>('/auth/reset-password', { method: 'POST', body: { token, password } })
  const verifyEmail = async (token: string) => {
    const r = await api<{ email: string }>('/auth/verify-email', { method: 'POST', body: { token } })
    if (session.user && session.user.email === r.email) session.user = { ...session.user, emailVerified: true }
    return r
  }
  /** Con sesión no hace falta el correo */
  const resendVerification = (email?: string) => api('/auth/resend-verification', { method: 'POST', body: email ? { email } : {} })

  /** Ingreso con Google: cambia el código de un solo uso que el backend puso en la URL de vuelta por la sesión */
  async function googleExchange(code: string) {
    const res = await api<GoogleExchangeResponse>('/auth/google/exchange', { method: 'POST', body: { code } })
    session.setSession(res)
    writeSessionCookie(res.accessToken, res.expiresAt)
    return res
  }

  /** Guarda los datos que Google no da (identificación, teléfono, nacimiento, dirección) */
  async function completeProfile(payload: CompleteProfilePayload) {
    const user = await api<User>('/me/complete-profile', { method: 'POST', body: payload })
    session.user = user
    return user
  }

  /** Dirección del backend que empieza el ingreso con Google (vuelve a `redirect` al terminar) */
  function googleLoginUrl(redirect?: string | null) {
    const safe = safeRedirect(redirect)
    return `${useRuntimeConfig().public.apiBase}/auth/google${safe ? `?redirect=${encodeURIComponent(safe)}` : ''}`
  }

  return { login, register, logout, forgotPassword, checkResetToken, resetPassword, verifyEmail, resendVerification, googleExchange, completeProfile, googleLoginUrl }
}
