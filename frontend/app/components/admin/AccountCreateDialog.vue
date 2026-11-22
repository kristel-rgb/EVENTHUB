<script setup lang="ts">
// Crear una cuenta (Super Admin). La cuenta queda sin contraseña:
// la persona recibe una invitación por correo para elegirla (nadie más la conoce).
// POST /admin/users
import type { AccountKind, PermissionCatalog } from '~/types/models'

const props = defineProps<{ open: boolean, catalog: PermissionCatalog | null }>()
const emit = defineEmits<{ close: [], created: [message: string, id: string] }>()

const actions = useAccountActions()
const dialog = ref<HTMLDialogElement | null>(null)
const kinds: AccountKind[] = ['organization', 'venue', 'attendee', 'admin']

const blank = () => ({ kind: 'organization' as AccountKind, organizationName: '', firstName: '', lastName1: '', lastName2: '', username: '', email: '', phone: '' })
const form = reactive(blank())
const permissions = ref<string[]>([])
const showPerms = ref(false)
const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const saving = ref(false)
const isOrg = computed(() => form.kind === 'organization' || form.kind === 'venue')

const defaultsFor = (k: AccountKind) => (props.catalog?.defaults[k] ?? []).filter(p => k === 'admin' || !props.catalog?.adminOnly.includes(p))
watch(() => form.kind, (k) => { permissions.value = defaultsFor(k) })

watch(() => props.open, (v) => {
  if (!dialog.value) return
  if (v && !dialog.value.open) {
    Object.assign(form, blank()); permissions.value = defaultsFor(form.kind)
    errors.value = {}; serverError.value = null; showPerms.value = false
    dialog.value.showModal()
  }
  if (!v && dialog.value.open) dialog.value.close()
}, { flush: 'post' })

function validate() {
  const e: Record<string, string> = {}
  if (isOrg.value && form.organizationName.trim().length < 2) e.organizationName = form.kind === 'venue' ? 'Ingresá el nombre del lugar.' : 'Ingresá el nombre de la organización.'
  if (form.firstName.trim().length < 2) e.firstName = 'Ingresá el nombre.'
  if (form.lastName1.trim().length < 2) e.lastName1 = 'Ingresá el primer apellido.'
  if (!/^[a-zA-Z0-9._]{4,20}$/.test(form.username.trim())) e.username = 'De 4 a 20 letras, números, puntos o guiones bajos.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) e.email = 'Ingresá un correo válido.'
  if (form.phone.trim() && !/^[2-8]\d{7}$/.test(cleanPhone(form.phone))) e.phone = 'Teléfono de 8 dígitos.'
  return e
}

async function submit() {
  serverError.value = null
  errors.value = validate()
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    const r = await actions.create({
      kind: form.kind, organizationName: isOrg.value ? form.organizationName.trim() : undefined,
      firstName: form.firstName.trim(), lastName1: form.lastName1.trim(), lastName2: form.lastName2.trim() || undefined,
      username: form.username.trim(), email: form.email.trim(), phone: cleanPhone(form.phone) || undefined,
      permissions: permissions.value,
    })
    emit('created', `Cuenta creada: ${r.user.name}. Enviamos la invitación a ${r.invitationSentTo} para que elija su contraseña.`, r.user._id)
  }
  catch (err) {
    const e = readApiError(err)
    serverError.value = e.message
    if (e.details && typeof e.details === 'object') errors.value = e.details as Record<string, string>
  }
  finally { saving.value = false }
}
</script>

<template>
  <dialog ref="dialog" class="cad" aria-labelledby="cad-title" @close="emit('close')">
    <form class="cad__box" novalidate @submit.prevent="submit">
      <header class="cad__head">
        <h2 id="cad-title">Crear cuenta</h2>
        <button type="button" class="cad__close" aria-label="Cerrar" @click="emit('close')"><Icon name="lucide:x" size="20" /></button>
      </header>

      <fieldset class="kinds">
        <legend>Tipo de cuenta</legend>
        <label v-for="k in kinds" :key="k" class="kind" :class="{ 'is-on': form.kind === k }">
          <input v-model="form.kind" type="radio" name="kind" :value="k" class="sr-only">
          <Icon :name="accountKindInfo[k].icon" size="20" />
          <span class="kind__label">{{ accountKindInfo[k].label }}</span>
          <span class="kind__hint">{{ accountKindInfo[k].hint }}</span>
        </label>
      </fieldset>
      <p v-if="form.kind === 'admin'" class="warn" role="note"><Icon name="lucide:triangle-alert" size="16" /> Un Super Admin puede ver y cambiar todo, incluidas otras cuentas.</p>

      <div class="grid">
        <FormField v-if="isOrg" id="ca-org" :label="form.kind === 'venue' ? 'Nombre del lugar' : 'Nombre de la organización'" class="grid__full" :error="errors.organizationName">
          <template #default="{ id, describedBy, invalid }">
            <input :id="id" v-model="form.organizationName" :placeholder="form.kind === 'venue' ? 'Anfiteatro del Lago' : 'Sonido Vivo Producciones'" :aria-describedby="describedBy" :aria-invalid="invalid">
          </template>
        </FormField>
        <FormField id="ca-first" :label="isOrg ? 'Nombre de la persona de contacto' : 'Nombre'" :error="errors.firstName">
          <template #default="{ id, describedBy, invalid }"><input :id="id" v-model="form.firstName" :aria-describedby="describedBy" :aria-invalid="invalid"></template>
        </FormField>
        <FormField id="ca-last1" label="Primer apellido" :error="errors.lastName1">
          <template #default="{ id, describedBy, invalid }"><input :id="id" v-model="form.lastName1" :aria-describedby="describedBy" :aria-invalid="invalid"></template>
        </FormField>
        <FormField id="ca-last2" label="Segundo apellido" optional>
          <template #default="{ id }"><input :id="id" v-model="form.lastName2"></template>
        </FormField>
        <FormField id="ca-phone" label="Teléfono" optional :error="errors.phone">
          <template #default="{ id, describedBy, invalid }"><input :id="id" v-model="form.phone" type="tel" inputmode="numeric" :aria-describedby="describedBy" :aria-invalid="invalid"></template>
        </FormField>
        <FormField id="ca-user" label="Nombre de usuario" hint="Con este nombre o el correo va a ingresar." :error="errors.username">
          <template #default="{ id, describedBy, invalid }"><input :id="id" v-model="form.username" autocapitalize="none" spellcheck="false" :aria-describedby="describedBy" :aria-invalid="invalid"></template>
        </FormField>
        <FormField id="ca-email" label="Correo" hint="Aquí le llega la invitación." :error="errors.email">
          <template #default="{ id, describedBy, invalid }"><input :id="id" v-model="form.email" type="email" autocapitalize="none" :aria-describedby="describedBy" :aria-invalid="invalid"></template>
        </FormField>
      </div>

      <div v-if="catalog" class="perms">
        <button type="button" class="perms__toggle" :aria-expanded="showPerms" aria-controls="ca-perms" @click="showPerms = !showPerms">
          <Icon :name="showPerms ? 'lucide:chevron-down' : 'lucide:chevron-right'" size="16" />
          Permisos ({{ permissions.length }}) <span class="muted">· por defecto los del tipo de cuenta</span>
        </button>
        <AdminPermissionPicker
          v-show="showPerms" id="ca-perms" v-model="permissions" :catalog="catalog"
          :defaults="catalog.defaults[form.kind]" :allow-admin="form.kind === 'admin'" id-prefix="ca"
        />
      </div>

      <p class="secure"><Icon name="lucide:mail" size="16" /> La cuenta se crea sin contraseña. Le enviamos un correo para que la elija; ni vos ni nadie más la va a conocer.</p>
      <p v-if="serverError" class="err" role="alert">{{ serverError }}</p>

      <div class="cad__actions">
        <button type="button" class="btn btn--outline" @click="emit('close')">Cancelar</button>
        <button type="submit" class="btn btn--primary" :disabled="saving">
          <Icon v-if="saving" name="lucide:loader-circle" size="16" class="spin" /> Crear y enviar invitación
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.cad { border: 0; padding: 0; background: transparent; width: min(720px, 94vw); max-width: none; max-height: 92vh; overflow: auto; }
.cad::backdrop { background: rgba(31, 42, 36, 0.65); }
.cad__box { background: var(--color-sand); color: var(--color-ink); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.cad__head { display: flex; justify-content: space-between; align-items: center; }
.cad__head h2 { font-size: 1.5rem; }
.cad__close { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tint-neutral); color: var(--color-ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.kinds { border: 0; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.kinds legend { padding: 0; margin-bottom: 8px; font-weight: 600; font-size: 0.875rem; }
.kind {
  display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 2px 10px; align-items: center; padding: 12px; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: var(--radius-md); background: var(--color-white);
}
.kind.is-on { border-color: var(--color-forest); box-shadow: 0 0 0 2px var(--tint-forest); }
.kind:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.kind :deep(svg) { color: var(--color-forest); }
.kind__label { font-weight: 600; }
.kind__hint { grid-column: 2; font-size: 0.8125rem; color: var(--text-secondary); }
.warn { margin: 0; display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.grid__full { grid-column: 1 / -1; }
.perms__toggle { all: unset; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; font-weight: 600; min-height: 36px; }
.perms__toggle:focus-visible { outline: 3px solid var(--color-raspberry); outline-offset: 2px; border-radius: 4px; }
.perms .pp { margin-top: 8px; }
.muted { color: var(--text-secondary); font-weight: 400; font-size: 0.875rem; }
.secure { margin: 0; display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); font-size: 0.875rem; }
.err { margin: 0; color: var(--color-raspberry-dark); font-weight: 600; }
.cad__actions { display: flex; justify-content: flex-end; flex-wrap: wrap; gap: 8px; }
.cad__actions .btn:disabled { opacity: 0.6; cursor: progress; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 640px) { .kinds, .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
