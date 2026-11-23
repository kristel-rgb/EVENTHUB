// Pruebas del frontend con Vitest + @nuxt/test-utils.
// El ambiente "nuxt" carga la app real (auto-imports, Pinia, rutas), así se prueban
// utilidades, componentes y flujos completos sin levantar el servidor.
// La API se simula con registerEndpoint() en cada prueba (no depende de la API de prueba local).
import { defineVitestConfig } from '@nuxt/test-utils/config'

export default defineVitestConfig({
  test: {
    environment: 'nuxt',
    include: ['test/**/*.test.ts'],
    environmentOptions: {
      nuxt: {
        domEnvironment: 'happy-dom',
        overrides: { runtimeConfig: { public: { apiBase: '/api-test' } } },
      },
    },
  },
})
