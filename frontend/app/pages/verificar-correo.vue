<script setup lang="ts">
// Confirmar el correo con el enlace que llega al crear la cuenta (vence en 24 horas, un solo uso).
// POST /auth/verify-email · Si falla: POST /auth/resend-verification
useHead({ title: 'Confirmar correo' })

const route = useRoute()
const session = useSessionStore()
const { verifyEmail, resendVerification } = useAuth()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const state = ref<'checking' | 'ok' | 'error'>(token ? 'checking' : 'error')
const message = ref(token ? '' : 'Falta el enlace. Abrí el enlace completo que te llegó por correo.')
const email = ref('')
onMounted(async () => {
  if (!token) return
  try {
    email.value = (await verifyEmail(token)).email
    state.value = 'ok'
  }
  catch (err) {
    message.value = readApiError(err).message
    state.value = 'error'
  }
})

// Pedir otro enlace
const resendEmail = ref('')
const resendError = ref<string | null>(null)
const resent = ref(false)
const sending = ref(false)
async function resend() {
  resendError.value = null
  if (!session.isLoggedIn && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resendEmail.value.trim())) { resendError.value = 'Ingresá un correo válido.'; return }
  sending.value = true
  try { await resendVerification(session.isLoggedIn ? undefined : resendEmail.value.trim()); resent.value = true }
  catch (err) { resendError.value = readApiError(err).message }
  finally { sending.value = false }
}
</script>

<template>
  <AuthShell title="Confirmar correo" subtitle="Así sabemos que el correo es tuyo y te llegan tus entradas.">
    <p v-if="state === 'checking'" class="state" role="status">Confirmando tu correo…</p>

    <div v-else-if="state === 'ok'" class="form card" role="status">
      <p class="ok"><Icon name="lucide:badge-check" size="22" /> Correo confirmado</p>
      <p><strong>{{ email }}</strong> quedó confirmado. Ya podés comprar entradas y recibirlas por correo.</p>
      <NuxtLink :to="session.isLoggedIn ? '/' : '/login'" class="btn btn--primary">{{ session.isLoggedIn ? 'Ir al inicio' : 'Ingresar' }}</NuxtLink>
    </div>

    <div v-else class="form card">
      <p class="bad" role="alert"><Icon name="lucide:link-2-off" size="22" /> No pudimos confirmar tu correo</p>
      <p>{{ message }}</p>
      <p v-if="resent" class="sent" role="status">Si el correo tiene una cuenta sin confirmar, te enviamos un enlace nuevo.</p>
      <form v-else class="resend" novalidate @submit.prevent="resend">
        <FormField v-if="!session.isLoggedIn" id="resend-email" label="Tu correo" :error="resendError ?? undefined">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="resendEmail" type="email" autocomplete="email" :aria-describedby="describedBy" :aria-invalid="invalid">
          </template>
        </FormField>
        <p v-else-if="resendError" class="err" role="alert">{{ resendError }}</p>
        <button type="submit" class="btn btn--primary" :disabled="sending">Enviar un enlace nuevo</button>
      </form>
    </div>
  </AuthShell>
</template>

<style scoped>
.state { color: var(--text-secondary); }
.form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form p { margin: 0; }
.form .btn { width: 100%; min-height: 50px; }
.form .btn:disabled { opacity: 0.6; }
.ok { display: flex; align-items: center; gap: 8px; font: 600 1.25rem var(--font-display); color: var(--color-forest-dark); }
.bad { display: flex; align-items: center; gap: 8px; font: 600 1.25rem var(--font-display); color: var(--color-raspberry-dark); }
.resend { display: flex; flex-direction: column; gap: 12px; }
.sent { padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.err { color: var(--color-raspberry-dark); font-size: 0.875rem; }
</style>
