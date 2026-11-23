<script setup lang="ts">
import type { Role } from '~/types/models'
// Ingresar con nombre de usuario o correo y contraseña. POST /auth/login
definePageMeta({ guestOnly: true })
useHead({ title: 'Ingresar' })

const route = useRoute()
const { login } = useAuth()

const form = reactive({
  identifier: typeof route.query.usuario === 'string' ? route.query.usuario : '',
  password: '',
})
const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const loading = ref(false)
const showPassword = ref(false)

const googleUnavailable = computed(() => route.query.error === 'google')
const justRegistered = computed(() => route.query.registrado === '1')
const passwordReset = computed(() => route.query.restablecida === '1')
const accountActivated = computed(() => route.query.activada === '1')

/** A dónde ir después de ingresar: la página que pidió el login o el área según el rol */
function nextPage(role: Role) {
  return safeRedirect(route.query.redirect) ?? homeForRole(role)
}
// Si venía de intentar comprar, se avisa por qué tiene que ingresar
const fromPurchase = computed(() => String(route.query.redirect ?? '').startsWith('/eventos/'))

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
    <p v-if="fromPurchase && !justRegistered" class="notice" role="status">
      <Icon name="lucide:ticket" size="18" /> Ingresá o creá una cuenta para comprar tus entradas. Después volvés al evento.
    </p>
    <p v-if="justRegistered" class="notice notice--ok" role="status">
      <Icon name="lucide:circle-check" size="18" /> Tu cuenta quedó creada. Ya podés ingresar. Te enviamos un correo para confirmar tu dirección.
    </p>
    <p v-if="passwordReset" class="notice notice--ok" role="status">
      <Icon name="lucide:circle-check" size="18" /> Tu contraseña se cambió. Ingresá con la nueva.
    </p>
    <p v-if="accountActivated" class="notice notice--ok" role="status">
      <Icon name="lucide:circle-check" size="18" /> Tu cuenta quedó activada. Ingresá con la contraseña que elegiste.
    </p>
    <p v-if="googleUnavailable" class="notice" role="status">
      <Icon name="lucide:info" size="18" /> No pudimos completar el ingreso con Google. Intentá de nuevo o ingresá con tu usuario y contraseña.
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

      <NuxtLink :to="{ path: '/olvide-contrasena', query: form.identifier.includes('@') ? { correo: form.identifier.trim() } : {} }" class="forgot">¿Olvidaste tu contraseña?</NuxtLink>

      <p v-if="serverError" class="form__error" role="alert">
        <Icon name="lucide:circle-alert" size="18" /> {{ serverError }}
      </p>

      <button type="submit" class="btn btn--primary form__submit" :disabled="loading">
        <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
        {{ loading ? 'Ingresando…' : 'Ingresar' }}
      </button>

      <div class="divider"><span>o</span></div>

      <GoogleButton :redirect="safeRedirect(route.query.redirect)" />
    </form>

    <p class="alt">¿No tenés cuenta? <NuxtLink :to="{ path: '/registro', query: route.query.redirect ? { redirect: route.query.redirect } : {} }">Crear cuenta</NuxtLink></p>
  </AuthShell>
</template>

<style scoped>
.form { padding: 24px; display: flex; flex-direction: column; gap: 18px; }
.form__submit { width: 100%; min-height: 50px; font-size: 1rem; }
.form__submit:disabled { opacity: 0.7; cursor: progress; }
.form__error {
  margin: 0; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem;
}

.pass { position: relative; }
.pass input { padding-right: 52px !important; }
.pass__toggle {
  position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: var(--text-secondary);
  display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm);
}
.pass__toggle:hover { color: var(--color-ink); }

.forgot { align-self: flex-end; margin-top: -8px; font-size: 0.875rem; font-weight: 600; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text-secondary); font-size: 0.8125rem; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }

.notice {
  margin: 0 0 16px; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-peach); color: var(--tint-peach-text); font-size: 0.875rem;
}
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }

.alt { margin: 20px 0 0; text-align: center; color: var(--text-secondary); }
.alt a { font-weight: 600; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
