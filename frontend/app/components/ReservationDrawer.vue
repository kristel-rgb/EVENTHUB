<script setup lang="ts">
// Panel lateral con el detalle de una reservación (panel del organizador).
// Datos: GET /organizer/reservations/:id · Acciones: reenviar entradas y cancelar.
import type { ReservationDetail } from '~/types/models'

const props = defineProps<{ id: string | null }>()
const emit = defineEmits<{ close: [], changed: [message: string] }>()

const actions = useReservationActions('organizer')
const dialog = ref<HTMLDialogElement | null>(null)
const data = ref<ReservationDetail | null>(null)
const loading = ref(false)
const loadError = ref<string | null>(null)
const message = ref<{ tone: 'ok' | 'error', text: string } | null>(null)
const resending = ref(false)
const confirmOpen = ref(false)
const cancelling = ref(false)
const cancelError = ref<string | null>(null)

async function load(id: string) {
  loading.value = true
  loadError.value = null
  message.value = null
  try { data.value = await actions.detail(id) }
  catch (err) { loadError.value = readApiError(err).message }
  finally { loading.value = false }
}

watch(() => props.id, (id) => {
  if (id) {
    data.value = null
    load(id)
    if (!dialog.value?.open) dialog.value?.showModal()
  }
  else if (dialog.value?.open) dialog.value.close()
})

// Si la página se abre con ?reserva=<id>, el panel arranca abierto
onMounted(() => {
  if (props.id) { load(props.id); dialog.value?.showModal() }
})

function close() { dialog.value?.close() }
function onBackdrop(e: MouseEvent) { if (e.target === dialog.value) close() }

async function resend() {
  if (!data.value) return
  resending.value = true
  message.value = null
  try {
    const r = await actions.resend(data.value._id)
    message.value = { tone: 'ok', text: `Enviamos las entradas a ${r.sentTo}.` }
    data.value = { ...data.value, ticketsSentAt: r.sentAt }
  }
  catch (err) { message.value = { tone: 'error', text: readApiError(err).message } }
  finally { resending.value = false }
}

async function cancel() {
  if (!data.value) return
  cancelling.value = true
  cancelError.value = null
  try {
    await actions.cancel(data.value._id)
    confirmOpen.value = false
    emit('changed', `La reservación ${data.value.code} quedó cancelada y se liberaron ${data.value.quantity} ${data.value.quantity === 1 ? 'espacio' : 'espacios'}.`)
    await load(data.value._id)
  }
  catch (err) { cancelError.value = readApiError(err).message }
  finally { cancelling.value = false }
}

const state = computed(() => (data.value ? reservationStateInfo(data.value) : null))
const ticketInfo: Record<string, { label: string, badge: string }> = {
  active: { label: 'Activa', badge: 'badge--success' },
  used: { label: 'Usada', badge: 'badge--warm' },
  cancelled: { label: 'Anulada', badge: 'badge--neutral' },
}
const payLine = computed(() => {
  const r = data.value
  if (!r) return ''
  if (r.paymentStatus === 'free') return 'Evento gratuito'
  if (r.paymentStatus === 'paid') return `Pagada${r.paidAt ? ` el ${formatEventDate(r.paidAt)}` : ''}`
  return r.status === 'pending' && r.expiresAt ? `Pendiente · se cancela sola a las ${formatTime(r.expiresAt)}` : 'No se confirmó'
})
</script>

<template>
  <dialog ref="dialog" class="dr" aria-labelledby="dr-title" @close="emit('close')" @click="onBackdrop">
    <div class="dr__panel">
      <header class="dr__head">
        <div>
          <p class="dr__kicker">Reservación {{ data?.code }}</p>
          <h2 id="dr-title">{{ data?.customer.name ?? 'Cargando…' }}</h2>
        </div>
        <button type="button" class="dr__close" aria-label="Cerrar detalle" @click="close"><Icon name="lucide:x" size="20" /></button>
      </header>

      <p v-if="loading && !data" class="dr__state">Cargando…</p>
      <p v-else-if="loadError" class="dr__state dr__state--error" role="alert">{{ loadError }}</p>

      <template v-else-if="data">
        <span class="badge" :class="state?.badge"><Icon :name="state!.icon" size="14" /> {{ state?.label }}</span>

        <p v-if="message" class="dr__msg" :class="`dr__msg--${message.tone}`" role="status">{{ message.text }}</p>

        <p v-if="data.status === 'pending'" class="dr__note">
          <Icon name="lucide:hourglass" size="16" />
          Los espacios quedan guardados mientras se confirma el pago. Si no se confirma antes de las {{ formatTime(data.expiresAt!) }}, la reservación se cancela sola y los espacios se liberan.
        </p>
        <p v-if="data.status === 'cancelled'" class="dr__note dr__note--muted">
          <Icon name="lucide:circle-x" size="16" />
          Cancelada {{ cancelledByLabel[data.cancelledBy ?? 'customer'] }}{{ data.cancelledAt ? ` · ${formatEventDate(data.cancelledAt)}` : '' }}.
        </p>

        <section class="dr__sec" aria-labelledby="dr-contact">
          <h3 id="dr-contact">Contacto</h3>
          <p><a :href="`mailto:${data.customer.email}`">{{ data.customer.email }}</a></p>
          <p v-if="data.customer.phone"><a :href="`tel:${data.customer.phone}`">{{ data.customer.phone }}</a></p>
        </section>

        <dl class="dr__grid">
          <div><dt>Evento</dt><dd>{{ data.event.name }}<span class="muted">{{ formatEventDate(data.event.date) }}</span></dd></div>
          <div><dt>Comprada</dt><dd>{{ formatEventDate(data.createdAt) }}</dd></div>
          <div><dt>Total</dt><dd>{{ data.total ? formatPrice(data.total) : 'Gratis' }}<span v-if="data.total" class="muted">{{ data.quantity }} × {{ formatPrice(data.unitPrice) }}</span></dd></div>
          <div><dt>Pago</dt><dd>{{ payLine }}<span v-if="data.paymentRef" class="muted">Referencia {{ data.paymentRef }}</span></dd></div>
        </dl>

        <section class="dr__sec" aria-labelledby="dr-tickets">
          <h3 id="dr-tickets">Entradas</h3>
          <ul v-if="data.tickets.length" class="tks">
            <li v-for="t in data.tickets" :key="t._id">
              <span class="tks__code">{{ t.code }}</span>
              <span class="badge" :class="ticketInfo[t.status]?.badge">
                {{ ticketInfo[t.status]?.label }}<template v-if="t.usedAt"> · {{ formatShortDate(t.usedAt) }} {{ formatTime(t.usedAt) }}</template>
              </span>
            </li>
          </ul>
          <p v-else class="muted">Las entradas se emiten cuando se confirma el pago.</p>
          <p v-if="data.ticketsSentAt" class="muted">Último envío por correo: {{ formatEventDate(data.ticketsSentAt) }}</p>
        </section>

        <div class="dr__actions">
          <button v-if="data.canResend" type="button" class="btn btn--outline" :disabled="resending" @click="resend">
            <Icon :name="resending ? 'lucide:loader-circle' : 'lucide:mail'" size="16" :class="{ spin: resending }" /> Reenviar entradas
          </button>
          <NuxtLink v-if="data.status === 'confirmed' && data.event.status === 'published'" :to="`/organizador/validar?evento=${data.event._id}`" class="btn btn--outline">
            <Icon name="lucide:scan-line" size="16" /> Validar en la puerta
          </NuxtLink>
          <button v-if="data.canCancel" type="button" class="btn btn--danger-ghost" @click="cancelError = null; confirmOpen = true">
            <Icon name="lucide:ban" size="16" /> Cancelar reservación
          </button>
        </div>
      </template>
    </div>

    <ConfirmDialog
      :open="confirmOpen"
      :title="`¿Cancelar la reservación ${data?.code}?`"
      confirm-label="Cancelar reservación"
      danger
      :loading="cancelling"
      :error="cancelError"
      @confirm="cancel"
      @close="confirmOpen = false"
    >
      <p>
        Se anulan {{ data?.quantity === 1 ? 'la entrada' : `las ${data?.quantity} entradas` }} de {{ data?.customer.name }}, se liberan los espacios y le avisaremos por correo.
        Esto no se puede deshacer.
      </p>
    </ConfirmDialog>
  </dialog>
</template>

<style scoped>
.dr { margin: 0 0 0 auto; height: 100dvh; max-height: 100dvh; width: min(460px, 100vw); max-width: 100vw; padding: 0; border: 0; background: var(--color-sand); color: var(--color-ink); }
.dr::backdrop { background: rgb(15 20 18 / 0.45); }
.dr[open] { animation: slide .2s ease-out; }
@keyframes slide { from { transform: translateX(24px); opacity: 0; } }
@media (prefers-reduced-motion: reduce) { .dr[open] { animation: none; } }
:global([data-motion='reduce']) .dr[open] { animation: none; }
.dr__panel { padding: 22px; display: flex; flex-direction: column; gap: 16px; min-height: 100%; }
.dr__head { display: flex; justify-content: space-between; gap: 12px; align-items: flex-start; }
.dr__kicker { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600; }
.dr__head h2 { font-size: 1.5rem; margin-top: 2px; }
.dr__close { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tint-neutral); color: var(--color-ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.badge { align-self: flex-start; display: inline-flex; align-items: center; gap: 6px; }
.dr__state { color: var(--text-secondary); }
.dr__state--error { color: var(--color-raspberry-dark); }
.dr__msg { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.875rem; }
.dr__msg--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.dr__msg--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.dr__note { margin: 0; display: flex; gap: 8px; align-items: flex-start; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-peach); color: var(--tint-peach-text); font-size: 0.875rem; line-height: 1.45; }
.dr__note :deep(svg) { flex-shrink: 0; margin-top: 2px; }
.dr__note--muted { background: var(--tint-neutral); color: var(--text-secondary); }
.dr__sec h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); font-family: var(--font-body); font-weight: 600; margin-bottom: 6px; }
.dr__sec p { margin: 0 0 4px; }
.dr__grid { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; padding: 14px; background: var(--color-white); border-radius: var(--radius-md); border: 1px solid var(--border); }
.dr__grid dt { font-size: 0.75rem; color: var(--text-secondary); }
.dr__grid dd { margin: 2px 0 0; font-weight: 500; font-size: 0.9375rem; }
.muted { display: block; color: var(--text-secondary); font-size: 0.8125rem; font-weight: 400; }
.tks { list-style: none; margin: 0 0 6px; padding: 0; display: grid; gap: 6px; }
.tks li { display: flex; justify-content: space-between; align-items: center; gap: 10px; padding: 8px 12px; background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-md); }
.tks__code { font-family: ui-monospace, monospace; font-weight: 600; }
.dr__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 8px; }
.dr__actions .btn:disabled { opacity: 0.6; cursor: progress; }
.btn--danger-ghost { background: transparent; border: 1.5px solid transparent; color: var(--color-raspberry-dark); }
.btn--danger-ghost:hover { background: var(--tint-raspberry); }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
