// Cliente HTTP central: todas las llamadas a la API pasan por aquí.
// La URL base sale de NUXT_PUBLIC_API_BASE (.env), así que cambiar
// entre la API de prueba y el backend real no requiere tocar código.
// Si hay sesión, agrega el encabezado Authorization: Bearer <token>.
export function useApi() {
  const config = useRuntimeConfig()
  const session = useSessionStore()

  return $fetch.create({
    baseURL: config.public.apiBase as string,
    onRequest({ options }) {
      if (!session.accessToken) return
      const headers = new Headers(options.headers as HeadersInit | undefined)
      headers.set('Authorization', `Bearer ${session.accessToken}`)
      options.headers = headers
    },
  })
}
