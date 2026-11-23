<script setup lang="ts">
// Crear cuenta (rol Asistente). POST /auth/register
// Pide el perfil completo: son los datos que la pasarela de pagos usa para
// precargar la compra. Los datos de tarjetas NUNCA se piden ni se guardan aquí.
import type { IdType } from '~/types/models'
import type { RegisterForm } from '~/utils/authValidation'

definePageMeta({ guestOnly: true })
const route = useRoute()
useHead({ title: 'Crear cuenta' })
const { register } = useAuth()

const form = reactive<RegisterForm>({
  firstName: '', lastName1: '', lastName2: '', birthDate: '',
  idType: '', idNumber: '',
  email: '', phone: '',
  province: '', canton: '', addressLine: '',
  username: '', password: '', confirmPassword: '',
  acceptTerms: false,
})

const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const loading = ref(false)
const showPassword = ref(false)

const idOption = computed(() => idTypeOptions.find(o => o.value === form.idType))
const rules = computed(() => passwordRules.map(r => ({ label: r.label, ok: r.test(form.password) })))
const maxBirthDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d.toISOString().slice(0, 10)
})

// Vuelve a validar un campo en cuanto se corrige
function revalidate(field: keyof RegisterForm) {
  if (!errors.value[field]) return
  const next = validateRegister(form)
  errors.value = { ...errors.value, [field]: next[field] ?? '' }
  if (!errors.value[field]) delete errors.value[field]
}

async function focusFirstError() {
  await nextTick()
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function submit() {
  serverError.value = null
  errors.value = validateRegister(form)
  if (Object.keys(errors.value).length) return focusFirstError()

  loading.value = true
  try {
    await register({
      firstName: form.firstName.trim(),
      lastName1: form.lastName1.trim(),
      lastName2: form.lastName2.trim(),
      username: form.username.trim(),
      email: form.email.trim().toLowerCase(),
      phone: cleanPhone(form.phone),
      idType: form.idType as IdType,
      idNumber: cleanIdNumber(form.idNumber),
      birthDate: form.birthDate,
      province: form.province,
      canton: form.canton.trim(),
      addressLine: form.addressLine.trim(),
      password: form.password,
      acceptTerms: form.acceptTerms,
    })
    await navigateTo({ path: '/login', query: { registrado: '1', usuario: form.username.trim(), ...(safeRedirect(route.query.redirect) ? { redirect: route.query.redirect } : {}) } })
  }
  catch (err) {
    const e = readApiError(err)
    serverError.value = e.message
    if (e.details && typeof e.details === 'object') {
      errors.value = { ...(e.details as Record<string, string>) }
      focusFirstError()
    }
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <AuthShell title="Crear cuenta" subtitle="Completá tus datos una sola vez y comprá más rápido en cada evento." wide>
    <form class="form card" novalidate @submit.prevent="submit">
      <div class="quick">
        <GoogleButton label="Crear cuenta con Google" :redirect="safeRedirect(route.query.redirect)" />
        <p class="quick__note">Usamos tu nombre y tu correo de Google. Antes de tu primera compra te pedimos los datos que faltan.</p>
        <div class="divider"><span>o con tu correo</span></div>
      </div>
      <!-- Datos personales -->
      <fieldset class="group">
        <legend>Datos personales</legend>
        <div class="grid">
          <FormField id="firstName" label="Nombre" :error="errors.firstName">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.firstName" autocomplete="given-name" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('firstName')">
            </template>
          </FormField>
          <FormField id="lastName1" label="Primer apellido" :error="errors.lastName1">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.lastName1" autocomplete="family-name" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('lastName1')">
            </template>
          </FormField>
          <FormField id="lastName2" label="Segundo apellido" optional>
            <template #default="{ id }">
              <input :id="id" v-model="form.lastName2" autocomplete="additional-name">
            </template>
          </FormField>
          <FormField id="birthDate" label="Fecha de nacimiento" hint="Tenés que ser mayor de 18 años." :error="errors.birthDate">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.birthDate" type="date" :max="maxBirthDate" autocomplete="bday" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('birthDate')">
            </template>
          </FormField>
        </div>
      </fieldset>

      <!-- Identificación -->
      <fieldset class="group">
        <legend>Identificación</legend>
        <div class="grid">
          <FormField id="idType" label="Tipo de identificación" :error="errors.idType">
            <template #default="{ id, describedBy, invalid }">
              <select :id="id" v-model="form.idType" :aria-describedby="describedBy" :aria-invalid="invalid" @change="revalidate('idType'); revalidate('idNumber')">
                <option value="" disabled>Elegí una opción</option>
                <option v-for="o in idTypeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
              </select>
            </template>
          </FormField>
          <FormField id="idNumber" label="Número de identificación" :hint="idOption?.hint" :error="errors.idNumber">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.idNumber" :placeholder="idOption?.placeholder" autocomplete="off" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('idNumber')">
            </template>
          </FormField>
        </div>
      </fieldset>

      <!-- Contacto -->
      <fieldset class="group">
        <legend>Contacto</legend>
        <div class="grid">
          <FormField id="email" label="Correo electrónico" hint="Te enviaremos un enlace para verificarlo." :error="errors.email">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.email" type="email" autocomplete="email" autocapitalize="none" placeholder="nombre@correo.com" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('email')">
            </template>
          </FormField>
          <FormField id="phone" label="Teléfono" hint="8 dígitos, por ejemplo 8888-1234." :error="errors.phone">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.phone" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="8888-1234" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('phone')">
            </template>
          </FormField>
        </div>
      </fieldset>

      <!-- Dirección -->
      <fieldset class="group">
        <legend>Dirección</legend>
        <div class="grid">
          <FormField id="province" label="Provincia" :error="errors.province">
            <template #default="{ id, describedBy, invalid }">
              <select :id="id" v-model="form.province" autocomplete="address-level1" :aria-describedby="describedBy" :aria-invalid="invalid" @change="revalidate('province')">
                <option value="" disabled>Elegí una provincia</option>
                <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
              </select>
            </template>
          </FormField>
          <FormField id="canton" label="Cantón" :error="errors.canton">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.canton" autocomplete="address-level2" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('canton')">
            </template>
          </FormField>
          <FormField id="addressLine" label="Dirección exacta" optional class="grid__full">
            <template #default="{ id }">
              <input :id="id" v-model="form.addressLine" autocomplete="street-address" placeholder="Barrio, calle, número de casa…">
            </template>
          </FormField>
        </div>
      </fieldset>

      <!-- Cuenta -->
      <fieldset class="group">
        <legend>Tu cuenta</legend>
        <div class="grid">
          <FormField id="username" label="Nombre de usuario" hint="De 4 a 20 letras, números, puntos o guiones bajos." :error="errors.username" class="grid__full">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.username" autocomplete="username" autocapitalize="none" spellcheck="false" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('username')">
            </template>
          </FormField>
          <FormField id="password" label="Contraseña" :error="errors.password">
            <template #default="{ id, describedBy, invalid }">
              <div class="pass">
                <input :id="id" v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="`${describedBy ?? ''} password-rules`" :aria-invalid="invalid" @input="revalidate('password'); revalidate('confirmPassword')">
                <button type="button" class="pass__toggle" :aria-pressed="showPassword" :aria-label="showPassword ? 'Ocultar contraseñas' : 'Mostrar contraseñas'" @click="showPassword = !showPassword">
                  <Icon :name="showPassword ? 'lucide:eye-off' : 'lucide:eye'" size="20" />
                </button>
              </div>
            </template>
          </FormField>
          <FormField id="confirmPassword" label="Repetí la contraseña" :error="errors.confirmPassword">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.confirmPassword" :type="showPassword ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('confirmPassword')">
            </template>
          </FormField>
          <ul id="password-rules" class="rules grid__full" aria-label="Requisitos de la contraseña">
            <li v-for="r in rules" :key="r.label" :class="{ 'is-ok': r.ok }">
              <Icon :name="r.ok ? 'lucide:circle-check' : 'lucide:circle'" size="16" /> {{ r.label }}
            </li>
          </ul>
        </div>
      </fieldset>

      <div class="terms" :class="{ 'is-invalid': errors.acceptTerms }">
        <label class="terms__label">
          <input v-model="form.acceptTerms" type="checkbox" :aria-invalid="Boolean(errors.acceptTerms)" aria-describedby="terms-error" @change="revalidate('acceptTerms')">
          <span>
            Acepto los <NuxtLink to="/terminos" target="_blank">términos y condiciones</NuxtLink>
            y la <NuxtLink to="/privacidad" target="_blank">política de privacidad</NuxtLink>.
          </span>
        </label>
        <p v-if="errors.acceptTerms" id="terms-error" class="terms__error">{{ errors.acceptTerms }}</p>
      </div>

      <p class="secure">
        <Icon name="lucide:shield-check" size="18" />
        EventHub no guarda datos de tarjetas. Los pagos se hacen en una pasarela segura que usa estos datos para completar tu compra más rápido.
      </p>

      <p v-if="serverError" class="form__error" role="alert">
        <Icon name="lucide:circle-alert" size="18" /> {{ serverError }}
      </p>

      <button type="submit" class="btn btn--primary form__submit" :disabled="loading">
        <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
        {{ loading ? 'Creando cuenta…' : 'Crear cuenta' }}
      </button>
    </form>

    <p class="alt">¿Ya tenés cuenta? <NuxtLink :to="{ path: '/login', query: route.query.redirect ? { redirect: route.query.redirect } : {} }">Ingresar</NuxtLink></p>
  </AuthShell>
</template>

<style scoped>
.form { padding: 24px; display: flex; flex-direction: column; gap: 22px; }
.quick { display: flex; flex-direction: column; gap: 10px; }
.quick__note { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); text-align: center; }
.divider { display: flex; align-items: center; gap: 12px; color: var(--text-secondary); font-size: 0.875rem; margin-top: 6px; }
.divider::before, .divider::after { content: ''; flex: 1; height: 1px; background: var(--border); }
.group { border: 0; margin: 0; padding: 0; min-width: 0; }
.group legend { padding: 0; margin-bottom: 12px; font-family: var(--font-display); font-weight: 600; font-size: 1.125rem; letter-spacing: -0.01em; }
.group + .group { padding-top: 20px; border-top: 1px solid var(--border); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grid__full { grid-column: 1 / -1; }

.pass { position: relative; }
.pass input { padding-right: 52px !important; }
.pass__toggle {
  position: absolute; right: 2px; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: var(--text-secondary);
  display: inline-flex; align-items: center; justify-content: center; border-radius: var(--radius-sm);
}
.pass__toggle:hover { color: var(--color-ink); }

.rules { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 16px; font-size: 0.8125rem; color: var(--text-secondary); }
.rules li { display: inline-flex; align-items: center; gap: 6px; }
.rules li.is-ok { color: var(--color-forest-dark); }

.terms__label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; font-size: 0.9375rem; }
.terms__label input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--color-forest); flex-shrink: 0; }
.terms__label a { font-weight: 600; }
.terms__error { margin: 6px 0 0 30px; font-size: 0.8125rem; color: var(--color-raspberry-dark); }

.secure {
  margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md);
  background: var(--tint-forest); color: var(--color-forest-dark); font-size: 0.875rem;
}

.form__submit { width: 100%; min-height: 52px; font-size: 1rem; }
.form__submit:disabled { opacity: 0.7; cursor: progress; }
.form__error {
  margin: 0; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem;
}

.alt { margin: 20px 0 0; text-align: center; color: var(--text-secondary); }
.alt a { font-weight: 600; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .form { padding: 18px; }
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
