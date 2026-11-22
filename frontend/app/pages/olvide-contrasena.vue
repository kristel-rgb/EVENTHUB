<script setup lang="ts">
// Olvidé mi contraseña: pide el correo y el backend envía un enlace de un solo uso (vence en 30 minutos).
// La respuesta es siempre la misma, exista o no la cuenta (para no revelar qué correos están registrados).
// POST /auth/forgot-password
definePageMeta({ guestOnly: true })
useHead({ title: 'Recuperar contraseña' })

const route = useRoute()
const { forgotPassword } = useAuth()
const email = ref(typeof route.query.correo === 'string' ? route.query.correo : '')
const error = ref<string | null>(null)
const serverError = ref<string | null>(null)
const loading = ref(false)
const sentTo = ref<string | null>(null)

// Se puede pedir otro enlace después de 60 segundos
const wait = ref(0)
let timer = 0
function startWait() {
  wait.value = 60
  clearInterval(timer)
  timer = window.setInterval(() => { wait.value--; if (wait.value <= 0) clearInterval(timer) }, 1000)
}
onBeforeUnmount(() => clearInterval(timer))

async function submit() {
  serverError.value = null
  error.value = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value.trim()) ? null : 'Ingresá un correo válido.'
  if (error.value) return
  loading.value = true
  try {
    await forgotPassword(email.value.trim())
    sentTo.value = email.value.trim()
    startWait()
  }
  catch (err) { serverError.value = readApiError(err).message }
  finally { loading.value = false }
}
</script>

<template>
  <AuthShell title="Recuperar contraseña" subtitle="Te enviamos un enlace para que elijas una contraseña nueva.">
    <div v-if="sentTo" class="form card" role="status">
      <p class="ok"><Icon name="lucide:mail-check" size="22" /> Revisá tu correo</p>
      <p>Si hay una cuenta con <strong>{{ sentTo }}</strong>, te llegará un enlace para restablecer la contraseña. Vence en 30 minutos y sirve una sola vez.</p>
      <p class="muted">¿No llega? Revisá la carpeta de spam o pedí otro enlace.</p>
      <button type="button" class="btn btn--outline" :disabled="wait > 0 || loading" @click="submit">
        {{ wait > 0 ? `Pedir otro enlace en ${wait} s` : 'Pedir otro enlace' }}
      </button>
      <NuxtLink to="/login" class="btn btn--primary">Volver a ingresar</NuxtLink>
    </div>

    <form v-else class="form card" novalidate @submit.prevent="submit">
      <FormField id="email" label="Correo de tu cuenta" :error="error ?? undefined">
        <template #default="{ id, describedBy, invalid }">
          <input :id="id" v-model="email" type="email" autocomplete="email" autocapitalize="none" placeholder="nombre@correo.com" :aria-describedby="describedBy" :aria-invalid="invalid" @input="error = null">
        </template>
      </FormField>
      <p v-if="serverError" class="err" role="alert"><Icon name="lucide:circle-alert" size="18" /> {{ serverError }}</p>
      <button type="submit" class="btn btn--primary submit" :disabled="loading">
        <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" /> {{ loading ? 'Enviando…' : 'Enviar enlace' }}
      </button>
    </form>

    <p class="alt">¿Te acordaste? <NuxtLink to="/login">Ingresar</NuxtLink></p>
  </AuthShell>
</template>

<style scoped>
.form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form p { margin: 0; }
.submit, .form .btn { width: 100%; min-height: 50px; }
.submit:disabled, .form .btn:disabled { opacity: 0.6; cursor: default; }
.ok { display: flex; align-items: center; gap: 8px; font: 600 1.25rem var(--font-display); color: var(--color-forest-dark); }
.muted { color: var(--text-secondary); font-size: 0.875rem; }
.err { display: flex; gap: 8px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem; }
.alt { text-align: center; margin-top: 18px; color: var(--text-secondary); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
