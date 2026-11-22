<script setup lang="ts">
// Perfil: datos de la cuenta, datos personales (editables) y cambio de contraseña.
// Datos: la sesión (GET /auth/me) · Guardar: PATCH /me · Contraseña: POST /me/password
// El usuario, el correo y la identificación no se cambian aquí (piden verificación o soporte).
import type { ProfileForm } from '~/utils/authValidation'

definePageMeta({ auth: true })
useHead({ title: 'Mi perfil' })

const session = useSessionStore()
const { update, changePassword } = useProfile()
const { legal } = useAppConfig()
const user = computed(() => session.user!)
const isOrg = computed(() => user.value.role === 'organizer')

// ---------- Datos personales ----------
const fromUser = (): ProfileForm => ({
  firstName: user.value.firstName ?? '',
  lastName1: user.value.lastName1 ?? '',
  lastName2: user.value.lastName2 ?? '',
  organizationName: user.value.organizationName ?? '',
  birthDate: user.value.birthDate ?? '',
  phone: user.value.phone ?? '',
  province: user.value.address?.province ?? '',
  canton: user.value.address?.canton ?? '',
  addressLine: user.value.address?.line ?? '',
})
const form = reactive<ProfileForm>(fromUser())
const saved = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== saved.value)
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const notice = ref<{ tone: 'ok' | 'error', text: string } | null>(null)
const incomplete = computed(() => !user.value.phone || !user.value.birthDate || !user.value.address)

function clearErr(k: string) { if (errors.value[k]) { const { [k]: _x, ...rest } = errors.value; errors.value = rest } }

async function save() {
  notice.value = null
  errors.value = validateProfile(form, isOrg.value)
  if (Object.keys(errors.value).length) {
    await nextTick()
    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    return
  }
  saving.value = true
  try {
    await update({
      firstName: form.firstName.trim(), lastName1: form.lastName1.trim(), lastName2: form.lastName2.trim(),
      organizationName: isOrg.value ? form.organizationName.trim() : undefined,
      phone: cleanPhone(form.phone), birthDate: form.birthDate,
      address: { province: form.province, canton: form.canton.trim(), line: form.addressLine.trim() },
    })
    Object.assign(form, fromUser())
    saved.value = JSON.stringify(form)
    notice.value = { tone: 'ok', text: 'Tus datos se guardaron.' }
  }
  catch (err) {
    const e = readApiError(err)
    if (e.details && typeof e.details === 'object') errors.value = e.details as Record<string, string>
    notice.value = { tone: 'error', text: e.message }
  }
  finally { saving.value = false }
}
function reset() { Object.assign(form, fromUser()); errors.value = {}; notice.value = null }

// ---------- Contraseña ----------
const pw = reactive({ currentPassword: '', newPassword: '', confirmPassword: '' })
const pwErrors = ref<Record<string, string>>({})
const pwSaving = ref(false)
const pwNotice = ref<{ tone: 'ok' | 'error', text: string } | null>(null)
const showPw = ref(false)
const rules = computed(() => passwordRules.map(r => ({ label: r.label, ok: r.test(pw.newPassword) })))

async function savePassword() {
  pwNotice.value = null
  pwErrors.value = validatePasswordChange(pw)
  if (Object.keys(pwErrors.value).length) return
  pwSaving.value = true
  try {
    const r = await changePassword(pw.currentPassword, pw.newPassword)
    pw.currentPassword = ''; pw.newPassword = ''; pw.confirmPassword = ''
    pwNotice.value = { tone: 'ok', text: r.closedSessions ? `Contraseña cambiada. Cerramos tu sesión en ${r.closedSessions} ${r.closedSessions === 1 ? 'otro dispositivo' : 'otros dispositivos'}.` : 'Contraseña cambiada.' }
  }
  catch (err) {
    const e = readApiError(err)
    if (e.details && typeof e.details === 'object') pwErrors.value = e.details as Record<string, string>
    pwNotice.value = { tone: 'error', text: e.message }
  }
  finally { pwSaving.value = false }
}

// ---------- Confirmar correo ----------
const { resendVerification } = useAuth()
const verifySent = ref(false)
const verifySending = ref(false)
async function sendVerify() {
  verifySending.value = true
  try { await resendVerification(); verifySent.value = true }
  catch (err) { pwNotice.value = { tone: 'error', text: readApiError(err).message } }
  finally { verifySending.value = false }
}

// ---------- Ayudas ----------
const initials = computed(() => (user.value.organizationName || `${user.value.firstName} ${user.value.lastName1}`).split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]!.toUpperCase()).join(''))
const idLabel = computed(() => idTypeOptions.find(o => o.value === user.value.idType)?.label ?? 'Identificación')
const maskedId = computed(() => {
  const v = user.value.idNumber
  return v ? `${'•'.repeat(Math.max(0, v.length - 4))}${v.slice(-4)}` : null
})
</script>

<template>
  <section v-if="session.user" class="container profile">
    <!-- Encabezado -->
    <header class="card head">
      <span class="head__avatar" aria-hidden="true">{{ initials }}</span>
      <div class="head__info">
        <h1>{{ user.organizationName || user.name }}</h1>
        <p class="head__meta">
          @{{ user.username }} · <span class="badge badge--success">{{ roleLabel[user.role] }}</span>
        </p>
        <p class="head__meta">
          Miembro desde {{ formatLongDate(user.createdAt) }}<template v-if="user.lastLoginAt"> · Último ingreso {{ formatEventDate(user.lastLoginAt) }}</template>
        </p>
      </div>
      <nav class="head__links" aria-label="Accesos">
        <NuxtLink v-if="user.role !== 'organizer'" to="/mis-entradas" class="btn btn--outline"><Icon name="lucide:ticket" size="16" /> Mis entradas</NuxtLink>
        <NuxtLink v-if="canOrganize(user.role)" to="/organizador" class="btn btn--outline"><Icon name="lucide:layout-dashboard" size="16" /> Organizar eventos</NuxtLink>
      </nav>
    </header>

    <p v-if="incomplete" class="notice notice--warm" role="status">
      <Icon name="lucide:info" size="18" />
      <span>Completá tu teléfono, fecha de nacimiento y dirección: la pasarela de pagos los usa para que compres más rápido.</span>
    </p>

    <div class="cols">
      <!-- Datos personales -->
      <form class="card sec" novalidate @submit.prevent="save">
        <h2>Datos personales</h2>
        <p v-if="notice" class="notice" :class="`notice--${notice.tone}`" role="status">{{ notice.text }}</p>
        <div class="grid">
          <FormField v-if="isOrg" id="organizationName" label="Nombre de la organización" class="grid__full" hint="Es el nombre que ven los clientes en tus eventos." :error="errors.organizationName">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.organizationName" autocomplete="organization" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('organizationName')">
            </template>
          </FormField>
          <FormField id="firstName" :label="isOrg ? 'Nombre de la persona de contacto' : 'Nombre'" :error="errors.firstName">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.firstName" autocomplete="given-name" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('firstName')">
            </template>
          </FormField>
          <FormField id="lastName1" label="Primer apellido" :error="errors.lastName1">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.lastName1" autocomplete="family-name" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('lastName1')">
            </template>
          </FormField>
          <FormField id="lastName2" label="Segundo apellido" optional>
            <template #default="{ id }">
              <input :id="id" v-model="form.lastName2" autocomplete="additional-name">
            </template>
          </FormField>
          <FormField id="birthDate" label="Fecha de nacimiento" :error="errors.birthDate">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.birthDate" type="date" autocomplete="bday" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('birthDate')">
            </template>
          </FormField>
          <FormField id="phone" label="Teléfono" hint="8 dígitos, por ejemplo 8888-1234" :error="errors.phone">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.phone" type="tel" inputmode="numeric" autocomplete="tel-national" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('phone')">
            </template>
          </FormField>
          <FormField id="province" label="Provincia" :error="errors.province">
            <template #default="{ id, describedBy, invalid }">
              <select :id="id" v-model="form.province" :aria-describedby="describedBy" :aria-invalid="invalid" @change="clearErr('province')">
                <option value="">Elegí una provincia</option>
                <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
              </select>
            </template>
          </FormField>
          <FormField id="canton" label="Cantón" :error="errors.canton">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="form.canton" autocomplete="address-level2" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearErr('canton')">
            </template>
          </FormField>
          <FormField id="addressLine" label="Otras señas" optional class="grid__full">
            <template #default="{ id }">
              <input :id="id" v-model="form.addressLine" autocomplete="street-address">
            </template>
          </FormField>
        </div>
        <div class="actions">
          <button type="submit" class="btn btn--primary" :disabled="saving || !dirty">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="spin" /> {{ saving ? 'Guardando…' : 'Guardar cambios' }}
          </button>
          <button v-if="dirty" type="button" class="btn btn--ghost" @click="reset">Descartar</button>
        </div>
      </form>

      <div class="side">
        <!-- Cuenta (solo lectura) -->
        <section class="card sec" aria-labelledby="acc-title">
          <h2 id="acc-title">Cuenta</h2>
          <dl class="facts">
            <div><dt>Usuario</dt><dd>{{ user.username }}</dd></div>
            <div>
              <dt>Correo</dt>
              <dd>
                {{ user.email }}
                <span class="badge" :class="user.emailVerified ? 'badge--success' : 'badge--warm'">{{ user.emailVerified ? 'Verificado' : 'Sin verificar' }}</span>
              </dd>
              <dd v-if="!user.emailVerified" class="verify">
                <button v-if="!verifySent" type="button" class="btn btn--outline btn--sm" :disabled="verifySending" @click="sendVerify">
                  <Icon name="lucide:mail" size="14" /> Enviarme el correo de confirmación
                </button>
                <span v-else class="muted" role="status">Te enviamos el enlace. Revisá tu correo.</span>
              </dd>
            </div>
            <div><dt>{{ idLabel }}</dt><dd>{{ maskedId ?? 'Sin registrar' }}</dd></div>
            <div><dt>Tipo de cuenta</dt><dd>{{ roleLabel[user.role] }}</dd></div>
          </dl>
          <p class="muted">Para cambiar el correo o la identificación, escribinos a <a :href="`mailto:${legal.contactEmail}`">{{ legal.contactEmail }}</a>.</p>
        </section>

        <!-- Contraseña -->
        <form class="card sec" novalidate @submit.prevent="savePassword">
          <h2>Cambiar contraseña</h2>
          <p v-if="pwNotice" class="notice" :class="`notice--${pwNotice.tone}`" role="status">{{ pwNotice.text }}</p>
          <FormField id="currentPassword" label="Contraseña actual" :error="pwErrors.currentPassword">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="pw.currentPassword" :type="showPw ? 'text' : 'password'" autocomplete="current-password" :aria-describedby="describedBy" :aria-invalid="invalid">
            </template>
          </FormField>
          <FormField id="newPassword" label="Contraseña nueva" :error="pwErrors.newPassword">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="pw.newPassword" :type="showPw ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="`${describedBy ?? ''} pw-rules`" :aria-invalid="invalid">
            </template>
          </FormField>
          <FormField id="confirmPassword" label="Repetí la contraseña nueva" :error="pwErrors.confirmPassword">
            <template #default="{ id, describedBy, invalid }">
              <input :id="id" v-model="pw.confirmPassword" :type="showPw ? 'text' : 'password'" autocomplete="new-password" :aria-describedby="describedBy" :aria-invalid="invalid">
            </template>
          </FormField>
          <ul id="pw-rules" class="rules" aria-label="Requisitos de la contraseña">
            <li v-for="r in rules" :key="r.label" :class="{ 'is-ok': r.ok }"><Icon :name="r.ok ? 'lucide:circle-check' : 'lucide:circle'" size="16" /> {{ r.label }}</li>
          </ul>
          <label class="check"><input v-model="showPw" type="checkbox"> Mostrar contraseñas</label>
          <p class="muted">Al cambiarla, se cierra tu sesión en los demás dispositivos.</p>
          <div class="actions">
            <button type="submit" class="btn btn--primary" :disabled="pwSaving">
              <Icon v-if="pwSaving" name="lucide:loader-circle" size="16" class="spin" /> {{ pwSaving ? 'Cambiando…' : 'Cambiar contraseña' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<style scoped>
.profile { padding-top: 32px; display: flex; flex-direction: column; gap: 16px; }
.head { padding: 22px; display: flex; flex-wrap: wrap; align-items: center; gap: 18px; }
.head__avatar {
  width: 72px; height: 72px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-forest); color: var(--color-white); font: 700 1.5rem var(--font-display);
}
.head__info { flex: 1; min-width: 220px; }
.head h1 { font-size: clamp(1.75rem, 4vw, 2.25rem); }
.head__meta { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.9375rem; display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
.head__links { display: flex; flex-wrap: wrap; gap: 8px; }

.notice { margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md); font-size: 0.9375rem; }
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.notice--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.notice--warm { background: var(--tint-peach); color: var(--tint-peach-text); }

.cols { display: grid; grid-template-columns: minmax(0, 1.5fr) minmax(300px, 1fr); gap: 16px; align-items: start; }
.side { display: flex; flex-direction: column; gap: 16px; }
.sec { padding: 22px; display: flex; flex-direction: column; gap: 14px; }
.sec h2 { font-size: 1.25rem; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.grid__full { grid-column: 1 / -1; }
.actions { display: flex; flex-wrap: wrap; gap: 8px; }
.actions .btn:disabled { opacity: 0.55; cursor: default; }

.facts { margin: 0; display: grid; gap: 12px; }
.facts dt { font-size: 0.8125rem; color: var(--text-secondary); }
.facts dd { margin: 2px 0 0; font-weight: 500; display: flex; flex-wrap: wrap; align-items: center; gap: 8px; word-break: break-word; }
.verify { margin-top: 8px !important; }
.btn--sm { min-height: 36px; padding: 0 12px; font-size: 0.8125rem; }
.muted { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }

.rules { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: 6px 14px; font-size: 0.8125rem; color: var(--text-secondary); }
.rules li { display: inline-flex; align-items: center; gap: 6px; }
.rules li.is-ok { color: var(--color-forest-dark); }
.check { display: flex; align-items: center; gap: 8px; font-size: 0.9375rem; cursor: pointer; min-height: 32px; }
.check input { width: 18px; height: 18px; accent-color: var(--color-forest); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 900px) {
  .cols { grid-template-columns: minmax(0, 1fr); }
}
@media (max-width: 560px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
}
</style>
