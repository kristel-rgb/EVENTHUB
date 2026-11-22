<script setup lang="ts">
// Panel lateral para administrar una cuenta (Super Admin): lo mínimo.
// Se puede cambiar el tipo de cuenta, el nombre de la organización o lugar, si está activa y sus permisos.
// Los datos personales no se tocan aquí (cada persona los cambia desde su perfil).
// Datos: GET /admin/users/:id · Guardar: PATCH /admin/users/:id
import type { AccountDetail, AccountKind, PermissionCatalog } from '~/types/models'

const props = defineProps<{ id: string | null, catalog: PermissionCatalog | null }>()
const emit = defineEmits<{ close: [], changed: [message: string] }>()

const session = useSessionStore()
const actions = useAccountActions()
const dialog = ref<HTMLDialogElement | null>(null)
const data = ref<AccountDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)

const kinds: AccountKind[] = ['organization', 'venue', 'attendee', 'admin']
const form = reactive({ kind: 'attendee' as AccountKind, organizationName: '', status: 'active' as 'active' | 'disabled', permissions: [] as string[] })
const original = ref('')
const dirty = computed(() => JSON.stringify(form) !== original.value)
const isSelf = computed(() => data.value?._id === session.user?._id)
const isOrg = computed(() => form.kind === 'organization' || form.kind === 'venue')
const errors = ref<Record<string, string>>({})
const saveError = ref<string | null>(null)
const saving = ref(false)
const confirmOpen = ref(false)

function fill(d: AccountDetail) {
  data.value = d
  Object.assign(form, { kind: d.kind, organizationName: d.organizationName ?? '', status: d.status, permissions: [...d.permissions] })
  original.value = JSON.stringify(form)
  errors.value = {}
  saveError.value = null
}

async function load(id: string) {
  loading.value = true
  loadError.value = null
  try { fill(await actions.detail(id)) }
  catch (err) { loadError.value = readApiError(err).message }
  finally { loading.value = false }
}
watch(() => props.id, (id) => {
  if (id) { data.value = null; load(id); if (!dialog.value?.open) dialog.value?.showModal() }
  else if (dialog.value?.open) dialog.value.close()
})

// Al cambiar el tipo, los permisos pasan a los del tipo nuevo
const defaultsFor = (k: AccountKind) => (props.catalog?.defaults[k] ?? []).filter(p => k === 'admin' || !props.catalog?.adminOnly.includes(p))
watch(() => form.kind, (k, old) => { if (data.value && old && k !== old) form.permissions = defaultsFor(k) })

function close() {
  if (dirty.value && !window.confirm('Tenés cambios sin guardar. ¿Cerrar de todas formas?')) return
  dialog.value?.close()
}
function onBackdrop(e: MouseEvent) { if (e.target === dialog.value) close() }

// Cambios delicados (desactivar o cambiar el tipo) piden confirmación
const risky = computed(() => data.value && (form.kind !== data.value.kind || (form.status === 'disabled' && data.value.status !== 'disabled')))
function requestSave() {
  errors.value = {}
  if (isOrg.value && form.organizationName.trim().length < 2) {
    errors.organizationName = form.kind === 'venue' ? 'Ingresá el nombre del lugar.' : 'Ingresá el nombre de la organización.'
    return
  }
  if (risky.value) confirmOpen.value = true
  else save()
}
async function save() {
  if (!data.value) return
  saving.value = true
  saveError.value = null
  try {
    const before = data.value
    const r = await actions.update(before._id, {
      kind: form.kind !== before.kind ? form.kind : undefined,
      organizationName: isOrg.value ? form.organizationName.trim() : undefined,
      status: form.status !== before.status ? form.status : undefined,
      permissions: form.permissions,
    })
    confirmOpen.value = false
    fill(r.user)
    emit('changed', `Se guardaron los cambios de ${r.user.name}.${r.closedSessions ? ' Se cerraron sus sesiones abiertas.' : ''}`)
  }
  catch (err) {
    const e = readApiError(err)
    saveError.value = e.message
    if (e.details && typeof e.details === 'object') errors.value = e.details as Record<string, string>
    confirmOpen.value = false
  }
  finally { saving.value = false }
}
</script>

<template>
  <dialog ref="dialog" class="ad" aria-labelledby="ad-title" @close="emit('close')" @click="onBackdrop" @cancel.prevent="close">
    <div class="ad__panel">
      <header class="ad__head">
        <div>
          <p class="ad__kicker">@{{ data?.username }}</p>
          <h2 id="ad-title">{{ data?.name ?? 'Cargando…' }}</h2>
        </div>
        <button type="button" class="ad__close" aria-label="Cerrar" @click="close"><Icon name="lucide:x" size="20" /></button>
      </header>

      <p v-if="loading && !data" class="muted">Cargando…</p>
      <p v-else-if="loadError" class="err" role="alert">{{ loadError }}</p>

      <template v-else-if="data">
        <div class="ad__badges">
          <span class="badge" :class="accountKindInfo[data.kind].badge"><Icon :name="accountKindInfo[data.kind].icon" size="14" /> {{ accountKindInfo[data.kind].label }}</span>
          <span v-if="data.invited" class="badge badge--warm">Invitación pendiente</span>
          <span v-else-if="data.status === 'disabled'" class="badge badge--neutral">Desactivada</span>
          <span v-if="isSelf" class="badge badge--neutral">Tu cuenta</span>
        </div>

        <dl class="ad__facts">
          <div><dt>Contacto</dt><dd>{{ [data.firstName, data.lastName1, data.lastName2].filter(Boolean).join(' ') }}</dd></div>
          <div><dt>Correo</dt><dd>{{ data.email }}</dd></div>
          <div v-if="data.phone"><dt>Teléfono</dt><dd>{{ data.phone }}</dd></div>
          <div><dt>Creada</dt><dd>{{ formatShortDate(data.createdAt) }}</dd></div>
          <div><dt>Último ingreso</dt><dd>{{ data.lastLoginAt ? formatEventDate(data.lastLoginAt) : 'Nunca' }}</dd></div>
          <div v-if="data.role === 'organizer'"><dt>Eventos</dt><dd>{{ data.stats.events }} ({{ data.stats.publishedEvents }} publicados)</dd></div>
          <div v-else><dt>Compras</dt><dd>{{ data.stats.reservations }}</dd></div>
        </dl>

        <p v-if="isSelf" class="note"><Icon name="lucide:info" size="16" /> No podés cambiar el tipo, el estado ni los permisos de tu propia cuenta.</p>

        <section class="ad__sec" aria-labelledby="ad-type">
          <h3 id="ad-type">Tipo de cuenta</h3>
          <div class="grid">
            <FormField id="ad-kind" label="Tipo">
              <template #default="{ id }">
                <select :id="id" v-model="form.kind" :disabled="isSelf">
                  <option v-for="k in kinds" :key="k" :value="k">{{ accountKindInfo[k].label }}</option>
                </select>
              </template>
            </FormField>
            <FormField v-if="isOrg" id="ad-org" :label="form.kind === 'venue' ? 'Nombre del lugar' : 'Nombre de la organización'" :error="errors.organizationName">
              <template #default="{ id, describedBy, invalid }">
                <input :id="id" v-model="form.organizationName" :aria-describedby="describedBy" :aria-invalid="invalid">
              </template>
            </FormField>
          </div>
          <label class="switch" :class="{ 'is-off': form.status === 'disabled' }">
            <input
              type="checkbox" role="switch" :checked="form.status === 'active'" :disabled="isSelf"
              @change="form.status = ($event.target as HTMLInputElement).checked ? 'active' : 'disabled'"
            >
            <span class="switch__track" aria-hidden="true"><span class="switch__dot" /></span>
            <span>{{ form.status === 'active' ? 'Cuenta activa' : 'Cuenta desactivada: no puede ingresar' }}</span>
          </label>
        </section>

        <section v-if="catalog" class="ad__sec" aria-labelledby="ad-perms">
          <h3 id="ad-perms">Permisos</h3>
          <AdminPermissionPicker
            v-model="form.permissions" :catalog="catalog" :defaults="catalog.defaults[form.kind]"
            :allow-admin="form.kind === 'admin'" :disabled="isSelf" id-prefix="ad"
          />
        </section>

        <p v-if="saveError" class="err" role="alert">{{ saveError }}</p>
        <div v-if="!isSelf" class="ad__actions">
          <button type="button" class="btn btn--primary" :disabled="!dirty || saving" @click="requestSave">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="spin" /> Guardar cambios
          </button>
          <button v-if="dirty" type="button" class="btn btn--ghost" @click="fill(data)">Descartar</button>
        </div>
      </template>
    </div>

    <ConfirmDialog
      :open="confirmOpen" :title="`¿Guardar los cambios de ${data?.name}?`" confirm-label="Sí, guardar"
      danger :loading="saving" @confirm="save" @close="confirmOpen = false"
    >
      <p v-if="data && form.kind !== data.kind">El tipo pasa de <strong>{{ accountKindInfo[data.kind].label }}</strong> a <strong>{{ accountKindInfo[form.kind].label }}</strong>. Sus permisos cambian a los del tipo nuevo.</p>
      <p v-if="data && form.status === 'disabled' && data.status !== 'disabled'">La cuenta queda <strong>desactivada</strong>: no va a poder ingresar.</p>
      <p>Se cerrarán sus sesiones abiertas para que el cambio aplique de inmediato.</p>
    </ConfirmDialog>
  </dialog>
</template>

<style scoped>
.ad { margin: 0 0 0 auto; height: 100dvh; max-height: 100dvh; width: min(520px, 100vw); max-width: 100vw; padding: 0; border: 0; background: var(--color-sand); color: var(--color-ink); }
.ad::backdrop { background: rgb(15 20 18 / 0.45); }
.ad__panel { padding: 22px; display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
.ad__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.ad__kicker { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600; }
.ad__head h2 { font-size: 1.5rem; margin-top: 2px; }
.ad__close { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tint-neutral); color: var(--color-ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ad__badges { display: flex; flex-wrap: wrap; gap: 6px; }
.ad__badges .badge { display: inline-flex; align-items: center; gap: 6px; }
.ad__facts { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; padding: 14px; background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-md); }
.ad__facts dt { font-size: 0.75rem; color: var(--text-secondary); }
.ad__facts dd { margin: 2px 0 0; font-weight: 500; word-break: break-word; }
.ad__sec { display: flex; flex-direction: column; gap: 12px; }
.ad__sec h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); font-family: var(--font-body); font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.note { margin: 0; display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.875rem; }
.switch { display: inline-flex; align-items: center; gap: 10px; cursor: pointer; min-height: 44px; font-weight: 500; position: relative; }
.switch input { position: absolute; opacity: 0; width: 1px; height: 1px; }
.switch__track { width: 44px; height: 26px; border-radius: 13px; background: var(--color-forest); position: relative; flex-shrink: 0; transition: background .15s; }
.switch__dot { position: absolute; top: 3px; left: 21px; width: 20px; height: 20px; border-radius: 50%; background: var(--color-white); transition: left .15s; }
.switch.is-off .switch__track { background: var(--text-secondary); }
.switch.is-off .switch__dot { left: 3px; }
.switch input:focus-visible + .switch__track { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.switch input:disabled ~ * { opacity: 0.6; cursor: not-allowed; }
.ad__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 8px; }
.ad__actions .btn:disabled { opacity: 0.55; cursor: default; }
.muted { color: var(--text-secondary); }
.err { margin: 0; color: var(--color-raspberry-dark); font-weight: 600; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .grid, .ad__facts { grid-template-columns: minmax(0, 1fr); } }
</style>
