<script setup lang="ts">
// Ingresar con nombre de usuario o correo y contraseña. POST /auth/login
useHead({ title: 'Ingresar' })

const route = useRoute()
const config = useRuntimeConfig()
const { login } = useAuth()

const form = reactive({
  identifier: typeof route.query.usuario === 'string' ? route.query.usuario : '',
  password: '',
})
const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const loading = ref(false)
const showPassword = ref(false)

const googleUrl = `${config.public.apiBase}/auth/google`
const googleUnavailable = computed(() => route.query.error === 'google')
const justRegistered = computed(() => route.query.registrado === '1')

/** A dónde ir después de ingresar: la página que pidió el login o el área según el rol */
function nextPage(role: string) {
  const r = route.query.redirect
  if (typeof r === 'string' && r.startsWith('/') && !r.startsWith('//')) return r
  if (role === 'organizer') return '/organizador'
  if (role === 'attendee') return '/mis-entradas'
  return '/'
}

async function submit() {
  serverError.value = null
  errors.value = validateLogin(form)
  if (Object.keys(errors.value).length) return

  loading.value = true
  try {
    const user = await login(form.identifier.trim(), form.password)
    await navigateTo(nextPage(user.role))
  }
  catch (err) {
    serverError.value = readApiError(err).message
    form.password = ''
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Ingresar" subtitle="Usá tu nombre de usuario o tu correo.">
    <p v-if="justRegistered" class="notice notice--ok" role="status">
      <Icon name="lucide:circle-check" size="18" /> Tu cuenta quedó creada. Ya podés ingresar.
    </p>
    <p v-if="googleUnavailable" class="notice" role="status">
      <Icon name="lucide:info" size="18" /> El ingreso con Google estará disponible cuando se conecte el backend.
    </p>

    <form class="form card" novalidate @submit.prevent="submit">
      <FormField id="identifier" label="Usuario o correo" :error="errors.identifier">
        <template #default="{ id, describedBy, invalid }">
          <input
            :id="id" v-model="form.identifier" type="text" autocomplete="username" autocapitalize="none"
            spellcheck="false" placeholder="Tu usuario o nombre@correo.com"
            :aria-describedby="describedBy" :aria-invalid="invalid"
          >
        </template>
      </FormField>

      <FormField id="password" label="Contraseña" :error="errors.password">
        <template #default="{ id, describedBy, invalid }">
          <div class="pass">
            <input
              :id="id" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password"
              :aria-describedby="describedBy" :aria-invalid="invalid"
            >
            <button
              type="button" class="pass__toggle" :aria-pressed="showPassword"
              :aria-label="showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'"
              @click="showPassword = !showPassword"
            >
              <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" size="20" />
            </button>
          </div>
        </template>
      </FormField>

      <p v-if="serverError" class="form__error" role="alert">
        <Icon name="lucide:circle-alert" size="18" /> {{ serverError }}
      </p>

      <button type="submit" class="btn btn--primary form__submit" :disabled="loading">
        <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>

      <div class="divider"><span>o</span></div>

      <a :href="googleUrl" class="btn btn--outline form__google">
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
          <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
          <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
          <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-7.9l-6.5 5C9.5 39.6 16.2 44 24 44z" />
          <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
        </svg>
        Continuar con Google
      </a>
    </form>

    <p class="alt">¿No tenés cuenta? <NuxtLink to="/registro">Crear cuenta</NuxtLink></p>
  </AuthShell>
</template>

<style scoped>
.form { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
.form__submit, .form__google { width: 100%; min-height: 50px; font-size: 16px; }
.form__submit:disabled { opacity: 0.7; cursor: progress; }
.form__error {
  margin: 0; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 14px;
}

.pass { position: relative; }
.pass input { padding-right: 52px !important; }
.pass__toggle {
  position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: var(--text-secondary);
  display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm);
}
.pass__toggle:hover { color: var(--color-ink); }

.divider { display: flex; align-items: center; gap: 12px; color: var(--text-secondary); font-size: 13px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.notice {
  margin: 0 0 16px; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-peach); color: var(--tint-peach-text); font-size: 14px;
}
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }

.alt { margin: 20px 0 0; text-align: center; color: var(--text-secondary); }
.alt a { font-weight: 600; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
