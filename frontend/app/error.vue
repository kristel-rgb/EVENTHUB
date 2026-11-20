<script setup lang="ts">
// Página de error global (404, 500…). Nuxt la muestra cuando algo falla
// o cuando una página lanza createError(), por ejemplo un evento que no existe.
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()
const is404 = computed(() => props.error.statusCode === 404)

useHead({ title: is404.value ? 'Página no encontrada' : 'Algo salió mal' })
</script>

<template>
  <NuxtLayout>
    <section class="container err">
      <p class="err__code">{{ error.statusCode }}</p>
      <h1>{{ is404 ? (error.statusMessage || 'No encontramos esta página') : 'Algo salió mal' }}</h1>
      <p class="err__text">
        {{ is404 ? 'Puede que el enlace esté mal escrito o que el contenido ya no exista.' : 'Intentá de nuevo en unos minutos.' }}
      </p>
      <button class="btn btn--primary" @click="clearError({ redirect: '/' })">Volver al inicio</button>
    </section>
  </NuxtLayout>
</template>

<style scoped>
.err { padding-top: 80px; padding-bottom: 40px; max-width: 640px; }
.err__code { font-family: var(--font-display); font-weight: 700; font-size: 96px; line-height: 1; color: var(--color-raspberry); margin: 0 0 12px; letter-spacing: -0.05em; }
.err h1 { font-size: 40px; }
.err__text { color: var(--text-secondary); font-size: 18px; margin: 14px 0 24px; }
</style>
