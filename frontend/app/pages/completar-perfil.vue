<script setup lang="ts">
// Completar el perfil · POST /me/complete-profile
// Para cuentas creadas con Google: Google solo da nombre, correo y foto. Acá se piden los datos
// que faltan para comprar (los usa la pasarela de pagos y confirman que es mayor de edad).
// Se puede dejar para después y seguir navegando, pero no se puede comprar hasta completarlo.
import type { IdType } from '~/types/models'
import type { CompleteProfileForm } from '~/utils/authValidation'

definePageMeta({ auth: true })
useHead({ title: 'Completá tu perfil' })

const route = useRoute()
const session = useSessionStore()
const { completeProfile } = useAuth()
const user = computed(() => session.user!)
const redirect = safeRedirect(route.query.redirect)
const later = computed(() => redirect ?? homeForRole(user.value.role))

// Si ya está completo, no hay nada que hacer acá
if (user.value.profileComplete) await navigateTo(later.value, { replace: true })

const form = reactive<CompleteProfileForm>({
  firstName: user.value.firstName ?? '',
  lastName1: user.value.lastName1 ?? '',
  lastName2: user.value.lastName2 ?? '',
  birthDate: user.value.birthDate ?? '',
  idType: user.value.idType ?? '',
  idNumber: user.value.idNumber ?? '',
  phone: user.value.phone ?? '',
  province: user.value.address?.province ?? '',
  canton: user.value.address?.canton ?? '',
  addressLine: user.value.address?.line ?? '',
  username: user.value.username ?? '',
  acceptTerms: false,
})

const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const loading = ref(false)
const idOption = computed(() => idTypeOptions.find(o => o.value === form.idType))
const maxBirthDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 18)
  return d.toISOString().slice(0, 10)
})

function revalidate(field: keyof CompleteProfileForm) {
  if (!errors.value[field]) return
  const next = validateCompleteProfile(form)
  errors.value = { ...errors.value, [field]: next[field] ?? '' }
  if (!errors.value[field]) delete errors.value[field]
}

async function focusFirstError() {
  await nextTick()
  document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
}

async function submit() {
  serverError.value = null
  errors.value = validateCompleteProfile(form)
  if (Object.keys(errors.value).length) return focusFirstError()
  loading.value = true
  try {
    await completeProfile({
      firstName: form.firstName.trim(),
      lastName1: form.lastName1.trim(),
      lastName2: form.lastName2.trim(),
      username: form.username.trim(),
      idType: form.idType as IdType,
      idNumber: cleanIdNumber(form.idNumber),
      phone: cleanPhone(form.phone),
      birthDate: form.birthDate,
      province: form.province,
      canton: form.canton.trim(),
      addressLine: form.addressLine.trim(),
      acceptTerms: form.acceptTerms,
    })
    await navigateTo(redirect ? { path: redirect, query: { perfil: 'completo' } } : { path: '/', query: { perfil: 'completo' } })
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
  <AuthShell v-if="session.user" title="Completá tu perfil" subtitle="Te faltan unos datos para poder comprar entradas. Solo te los pedimos una vez." wide>
    <form class="form card" novalidate @submit.prevent="submit">
      <p class="why">
        <Icon name="lucide:info" size="18" />
        <span>Google nos dio tu nombre y tu correo. La identificación, el teléfono, la fecha de nacimiento y la dirección los usa la pasarela de pagos y confirman que sos mayor de edad.</span>
      </p>

      <!-- Cuenta -->
      <fieldset class="group">
        <legend>Tu cuenta</legend>
        <div class="grid">
          <div class="readonly grid__full">
            <span class="readonly__label" id="email-label">Correo</span>
            <p class="readonly__value" aria-labelledby="email-label">
              {{ user.email }}
              <span class="badge badge--success"><Icon name="lucide:circle-check" size="14" /> Confirmado por Google</span>
            </p>
          </div>
          <FormField id="username" label="Nombre de usuario" hint="Te sugerimos uno; lo podés cambiar. De 4 a 20 letras, números, puntos o guiones bajos." :error="errors.username" class="grid__full">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.username" autocomplete="username" autocapitalize="none" spellcheck="false" :aria-describedby="describedBy" :aria-invalid="invalid" @input="revalidate('username')">
            </template>
          </FormField>
        </div>
      </fieldset>

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

      <!-- Identificación y contacto -->
      <fieldset class="group">
        <legend>Identificación y contacto</legend>
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
          <FormField id="phone" label="Teléfono" hint="8 dígitos, por ejemplo 8888-1234." :error="errors.phone" class="grid__full">
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
        EventHub no guarda datos de tarjetas. Los pagos se hacen en una pasarela segura.
      </p>

      <p v-if="serverError" class="form__error" role="alert">
        <Icon name="lucide:circle-alert" size="18" /> {{ serverError }}
      </p>

      <div class="actions">
        <button type="submit" class="btn btn--primary form__submit" :disabled="loading">
          <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
          {{ loading ? 'Guardando…' : 'Guardar y continuar' }}
        </button>
        <NuxtLink :to="later" class="btn btn--ghost">Hacerlo después</NuxtLink>
      </div>
      <p class="later-note">Si lo dejás para después, podés seguir viendo eventos, pero te lo vamos a pedir antes de comprar.</p>
    </form>
  </AuthShell>
</template>

<style scoped>
.form { padding: 24px; display: flex; flex-direction: column; gap: 22px; }
.why {
  margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md);
  background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.875rem;
}
.why > :first-child { flex-shrink: 0; margin-top: 2px; }
.group { border: 0; margin: 0; padding: 0; min-width: 0; }
.group legend { padding: 0; margin-bottom: 12px; font-family: var(--font-display); font-weight: 600; font-size: 1.125rem; letter-spacing: -0.01em; }
.group + .group { padding-top: 20px; border-top: 1px solid var(--border); }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; }
.grid__full { grid-column: 1 / -1; }

.readonly__label { display: block; font-weight: 600; font-size: 0.875rem; margin-bottom: 6px; }
.readonly__value { margin: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--surface-muted); border: 1px solid var(--border); overflow-wrap: anywhere; }
.readonly__value .badge { display: inline-flex; align-items: center; gap: 4px; }

.terms__label { display: flex; gap: 10px; align-items: flex-start; cursor: pointer; font-size: 0.9375rem; }
.terms__label input { width: 20px; height: 20px; margin-top: 2px; accent-color: var(--color-forest); flex-shrink: 0; }
.terms__label a { font-weight: 600; }
.terms__error { margin: 6px 0 0 30px; font-size: 0.8125rem; color: var(--color-raspberry-dark); }

.secure {
  margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md);
  background: var(--tint-forest); color: var(--color-forest-dark); font-size: 0.875rem;
}
.actions { display: flex; flex-direction: column; gap: 8px; }
.form__submit { width: 100%; min-height: 52px; font-size: 1rem; }
.form__submit:disabled { opacity: 0.7; cursor: progress; }
.later-note { margin: -10px 0 0; text-align: center; font-size: 0.8125rem; color: var(--text-secondary); }
.form__error {
  margin: 0; padding: 12px 14px; border-radius: var(--radius-md); display: flex; gap: 8px; align-items: flex-start;
  background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem;
}
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 600px) {
  .form { padding: 18px; }
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
