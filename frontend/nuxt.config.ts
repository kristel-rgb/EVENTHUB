// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@pinia/nuxt', '@nuxt/fonts', '@nuxt/icon/module'],
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  // Estilos globales: paleta, tipografías y clases base
  css: ['~/assets/css/main.css'],

  app: {
    head: {
      htmlAttrs: { lang: 'es' },
      titleTemplate: '%s · EventHub',
      meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    },
  },

  // /eventos se movió a /buscar (el detalle sigue en /eventos/:id)
  routeRules: {
    '/eventos': { redirect: '/buscar' },
  },

  // Variables públicas (se pueden sobrescribir con NUXT_PUBLIC_API_BASE en .env)
  runtimeConfig: {
    public: {
      apiBase: 'http://localhost:4000/api/v1',
    },
  },
})
