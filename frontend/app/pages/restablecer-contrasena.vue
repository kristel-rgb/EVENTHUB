<script setup lang="ts">
// Elegir una contraseña nueva con el enlace del correo. Sirve para dos casos:
//   · "Olvidé mi contraseña" (enlace de 30 minutos)
//   · Invitación del Super Admin a una cuenta nueva (enlace de 48 horas, ?invitacion=1)
// GET /auth/reset-password/check (revisa el enlace) · POST /auth/reset-password (lo usa una sola vez)
useHead({ title: 'Elegir contraseña' })

const route = useRoute()
const session = useSessionStore()
const { checkResetToken, resetPassword } = useAuth()
const token = typeof route.query.token === 'string' ? route.query.token : ''

const info = ref<{ kind: 'reset' | 'invite', name: string, username: string } | null>(null)
const linkError = ref<string | null>(token ? null : 'Falta el enlace. Abrí el enlace completo que te llegó por correo.')
const checking = ref(Boolean(token))
onMounted(async () => {
  if (!token) return
  try { info.value = await checkResetToken(token) }
  catch (err) { linkError.value = readApiError(err).message }
  finally { checking.value = false }
})
const isInvite = computed(() => info.value?.kind === 'invite')

const form = reactive({ password: '', confirm: '' })
const show = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)
const rules = computed(() => passwordRules.map(r => ({ label: r.label, ok: r.test(form.password) })))

async function submit() {
  serverError.value = null
  errors.value = {}
  if (!passwordRules.every(r => r.test(form.password))) errors.value.password = 'La contraseña no cumple los requisitos.'
  if (form.confirm !== form.password) errors.value.confirm = 'Las contraseñas no coinciden.'
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const r = await resetPassword(token, form.password)
    // Cambiar la contraseña cierra todas las sesiones de la cuenta
    if (session.isLoggedIn) { session.clear(); writeSessionCookie(null) }
    await navigateTo({ path: '/login', query: { usuario: r.username, [r.kind === 'invite' ? 'activada' : 'restablecida']: '1' } })
  }
  catch (err) {
    const e = readApiError(err)
    if (e.code.startsWith('TOKEN_')) linkError.value = e.message
    else serverError.value = e.message
  }
  finally { saving.value = false }
}
</script>

<template>
  <AuthShell :title="isInvite ? 'Activá tu cuenta' : 'Elegí una contraseña nueva'" :subtitle="isInvite ? 'Elegí la contraseña con la que vas a ingresar.' : 'Después vas a ingresar con ella.'">
    <p v-if="checking" class="state">Revisando el enlace…</p>

    <div v-else-if="linkError" class="form card" role="alert">
      <p class="bad"><Icon name="lucide:link-2-off" size="22" /> No pudimos usar este enlace</p>
      <p>{{ linkError }}</p>
      <NuxtLink to="/olvide-contrasena" class="btn btn--primary">Pedir un enlace nuevo</NuxtLink>
      <NuxtLink to="/login" class="btn btn--ghost">Volver a ingresar</NuxtLink>
    </div>

    <form v-else-if="info" class="form card" novalidate @submit.prevent="submit">
      <p class="hello">
        <template v-if="isInvite">Hola, <strong>{{ info.name }}</strong>. Tu usuario es <strong>{{ info.username }}</strong>.</template>
        <template v-else>Cuenta: <strong>{{ info.username }}</strong></template>
      </p>
      <input type="text" name="username" autocomplete="username" :value="info.username" class="sr-only" tabindex="-1" aria-hidden="true" readonly>
      <FormField id="password" label="Contraseña nueva" :error="errors.password">
        <template #default="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.password" :type="show ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="`${describedBy ?? ''} rules`" :aria-invalid="invalid">
        </template>
      </FormField>
      <FormField id="confirm" label="Repetí la contraseña" :error="errors.confirm">
        <template #default="{ id, describedBy, invalid }">
          <input :id="id" v-model="form.confirm" :type="show ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="describedBy" :aria-invalid="invalid">
        </template>
      </FormField>
      <ul id="rules" class="rules" aria-label="Requisitos de la contraseña">
        <li v-for="r in rules" :key="r.label" :class="{ 'is-ok': r.ok }"><Icon :name="r.ok ? 'lucide:circle-check' : 'lucide:circle'" size="16" /> {{ r.label }}</li>
      </ul>
      <label class="check"><input v-model="show" type="checkbox"> Mostrar contraseñas</label>
      <p v-if="serverError" class="err" role="alert">{{ serverError }}</p>
      <button type="submit" class="btn btn--primary submit" :disabled="saving">
        <Icon v-if="saving" name="lucide:loader-circle" size="18" class="spin" /> {{ isInvite ? 'Activar mi cuenta' : 'Guardar contraseña' }}
      </button>
      <p class="muted">Por seguridad, se cerrará tu sesión en todos los dispositivos.</p>
    </form>
  </AuthShell>
</template>

<style scoped>
.state { color: var(--text-secondary); }
.form { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.form p { margin: 0; }
.form .btn, .submit { width: 100%; min-height: 50px; }
.submit:disabled { opacity: 0.6; cursor: progress; }
.bad { display: flex; align-items: center; gap: 8px; font: 600 1.25rem var(--font-display); color: var(--color-raspberry-dark); }
.hello { padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.rules { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 0.8125rem; color: var(--text-secondary); }
.rules li { display: inline-flex; align-items: center; gap: 6px; }
.rules li.is-ok { color: var(--color-forest-dark); }
.check { display: flex; align-items: center; gap: 8px; cursor: pointer; }
.check input { width: 18px; height: 18px; accent-color: var(--color-forest); }
.err { padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; text-align: center; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
