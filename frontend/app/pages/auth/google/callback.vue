<script setup lang="ts">
// Vuelta del ingreso con Google.
// El backend (GET /auth/google/callback) valida la respuesta de Google, busca o crea la cuenta
// y redirige acá con un código de un solo uso (?code=…, vence en 60 s) o con ?error=…
// Acá se cambia el código por la sesión (POST /auth/google/exchange). El token nunca viaja en la URL.
import type { Role } from '~/types/models'

useHead({ title: 'Ingresando con Google' })
const route = useRoute()
const { googleExchange } = useAuth()

const redirect = safeRedirect(route.query.redirect)
const status = ref<'loading' | 'error'>('loading')
const errorText = ref('')

// Mensajes según el error que devuelve Google o el backend
const googleErrors: Record<string, string> = {
  access_denied: 'Cancelaste el ingreso con Google. Podés intentarlo de nuevo cuando quieras.',
  account_disabled: 'Tu cuenta está desactivada. Escribinos a soporte para más información.',
  email_not_verified: 'Tu cuenta de Google no tiene el correo verificado. Verificalo en Google o creá la cuenta con tu correo.',
}

function nextPage(role: Role, profileComplete: boolean) {
  // Sin los datos que faltan no puede comprar: se le piden apenas entra (puede dejarlo para después)
  if (role === 'attendee' && !profileComplete) {
    return { path: '/completar-perfil', query: redirect ? { redirect } : {} }
  }
  return redirect ?? homeForRole(role)
}

onMounted(async () => {
  const error = typeof route.query.error === 'string' ? route.query.error : ''
  const code = typeof route.query.code === 'string' ? route.query.code : ''
  if (error || !code) {
    errorText.value = googleErrors[error] ?? 'No pudimos completar el ingreso con Google. Intentá de nuevo.'
    status.value = 'error'
    return
  }
  try {
    const res = await googleExchange(code)
    await navigateTo(nextPage(res.user.role, res.user.profileComplete), { replace: true })
  }
  catch (err) {
    errorText.value = readApiError(err).message
    status.value = 'error'
  }
})
</script>

<template>
  <section class="container callback">
    <div class="card box" :aria-busy="status === 'loading'">
      <template v-if="status === 'loading'">
        <Icon name="lucide:loader-circle" size="36" class="spin box__icon" />
        <h1>Ingresando con Google…</h1>
        <p role="status">Un momento, estamos preparando tu cuenta.</p>
      </template>
      <template v-else>
        <Icon name="lucide:circle-alert" size="36" class="box__icon box__icon--error" />
        <h1>No pudimos ingresar</h1>
        <p role="alert">{{ errorText }}</p>
        <div class="box__actions">
          <GoogleButton label="Intentar de nuevo con Google" :redirect="redirect" />
          <NuxtLink :to="{ path: '/login', query: redirect ? { redirect } : {} }" class="btn btn--ghost">Ingresar con usuario y contraseña</NuxtLink>
        </div>
      </template>
    </div>
  </section>
</template>

<style scoped>
.callback { padding-top: 64px; padding-bottom: 64px; display: flex; justify-content: center; }
.box { width: 100%; max-width: 460px; padding: 32px 28px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; }
.box h1 { font-size: 1.5rem; margin: 6px 0 0; }
.box p { margin: 0; color: var(--text-secondary); }
.box__icon { color: var(--color-forest); }
.box__icon--error { color: var(--color-raspberry-dark); }
.box__actions { display: flex; flex-direction: column; gap: 8px; width: 100%; margin-top: 12px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
