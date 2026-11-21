import type { AuthResponse, User } from '~/types/models'

// Sesión del usuario (Pinia). Por ahora guarda el token en memoria:
// al recargar la página la sesión se pierde. Cuando el backend real tenga
// el refresh token en cookie httpOnly, aquí se agrega la renovación (tarea F08).
export const useSessionStore = defineStore('session', () => {
  const user = ref<User | null>(null)
  const accessToken = ref<string | null>(null)
  const expiresAt = ref<string | null>(null)

  const isLoggedIn = computed(() => Boolean(user.value && accessToken.value))
  const role = computed(() => user.value?.role ?? null)

  /** ¿El usuario tiene este permiso? Ej.: can('events:create') */
  function can(permission: string) {
    return user.value?.permissions.includes(permission) ?? false
  }

  function setSession(res: AuthResponse) {
    user.value = res.user
    accessToken.value = res.accessToken
    expiresAt.value = res.expiresAt
  }

  function clear() {
    user.value = null
    accessToken.value = null
    expiresAt.value = null
  }

  return { user, accessToken, expiresAt, isLoggedIn, role, can, setSession, clear }
})
