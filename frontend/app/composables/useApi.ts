// Cliente HTTP central: todas las llamadas a la API pasan por aquí.
// La URL base sale de NUXT_PUBLIC_API_BASE (.env), así que cambiar
// entre la API de prueba y el backend real no requiere tocar código.
export function useApi() {
  const config = useRuntimeConfig()

  return $fetch.create({
    baseURL: config.public.apiBase as string,
    // Aquí se agregará el token de sesión cuando exista el login (tarea F08):
    // onRequest({ options }) { options.headers.set('Authorization', `Bearer ${token}`) }
  })
}
