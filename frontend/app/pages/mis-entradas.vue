<script setup lang="ts">
// Mis entradas: activas (por usar) e historial (usadas, vencidas, canceladas).
// Datos: GET /me/tickets · Al hacer clic se abre el boleto en una ventana.
const { tickets: text } = useAppConfig()
definePageMeta({ auth: true }) // solo con sesión
const route = useRoute()
useHead({ title: text.title })

const { data, status, error, refresh } = await useMyTickets()

const tab = ref<'active' | 'history'>('active')

// A cada entrada le agregamos su estado visual y su número dentro de la compra ("1 de 3")
const entries = computed(() => {
  const now = Date.now()
  const counters = new Map<string, number>()
  return (data.value ?? []).map((t) => {
    const n = (counters.get(t.reservation._id) ?? 0) + 1
    counters.set(t.reservation._id, n)
    const state = ticketState(t, text.soonDays, now)
    return { ticket: t, state, info: ticketStateInfo[state], n, of: t.reservation.quantity, date: formatDateParts(t.event.date) }
  })
})
type Entry = typeof entries.value[number]

// Activas: la más próxima primero · Historial: la más reciente primero
const active = computed(() => entries.value.filter(e => e.state === 'active' || e.state === 'soon'))
const history = computed(() => entries.value.filter(e => e.state !== 'active' && e.state !== 'soon').reverse())
const soonCount = computed(() => active.value.filter(e => e.state === 'soon').length)
const shown = computed(() => (tab.value === 'active' ? active.value : history.value))

const selected = ref<Entry | null>(null)
// Si llega desde el inicio con ?entrada=<id>, se abre ese boleto
onMounted(() => {
  const id = route.query.entrada
  const found = typeof id === 'string' ? entries.value.find(e => e.ticket._id === id) : undefined
  if (found) selected.value = found
})

// ---------- Reservaciones esperando pago (guardan los espacios 3 h; después se cancelan solas) ----------
const { data: pending, refresh: refreshPending } = await useMyReservations('pending')
const actions = useReservationActions('customer')

// ---------- Reenviar y cancelar ----------
const notice = ref<{ tone: 'ok' | 'error', text: string } | null>(null)
const modalMsg = ref<{ tone: 'ok' | 'error', text: string } | null>(null)
const resending = ref(false)
watch(selected, () => { modalMsg.value = null })

const canManage = computed(() => selected.value && (selected.value.state === 'active' || selected.value.state === 'soon'))

async function resend() {
  if (!selected.value) return
  resending.value = true
  modalMsg.value = null
  try {
    const r = await actions.resend(selected.value.ticket.reservation._id)
    modalMsg.value = { tone: 'ok', text: `Te enviamos las entradas a ${r.sentTo}. Revisá también la carpeta de spam.` }
  }
  catch (err) { modalMsg.value = { tone: 'error', text: readApiError(err).message } }
  finally { resending.value = false }
}

// Qué se va a cancelar: una reservación completa (todas sus entradas)
const toCancel = ref<{ id: string, name: string, quantity: number, pending: boolean } | null>(null)
const cancelling = ref(false)
const cancelError = ref<string | null>(null)
function askCancelSelected() {
  const t = selected.value!.ticket
  toCancel.value = { id: t.reservation._id, name: t.event.name, quantity: t.reservation.quantity, pending: false }
  cancelError.value = null
}
function askCancelPending(r: { _id: string, quantity: number, event: { name: string } }) {
  toCancel.value = { id: r._id, name: r.event.name, quantity: r.quantity, pending: true }
  cancelError.value = null
}
async function confirmCancel() {
  if (!toCancel.value) return
  cancelling.value = true
  cancelError.value = null
  try {
    await actions.cancel(toCancel.value.id)
    notice.value = { tone: 'ok', text: `Cancelaste tu reservación de «${toCancel.value.name}».` }
    toCancel.value = null
    selected.value = null
    await Promise.all([refresh(), refreshPending()])
  }
  catch (err) { cancelError.value = readApiError(err).message }
  finally { cancelling.value = false }
}
</script>

<template>
  <section class="container tickets">
    <header class="tickets__head">
      <h1>{{ text.title }}</h1>
      <p v-if="data" class="tickets__summary">
        {{ active.length }} {{ active.length === 1 ? 'entrada activa' : 'entradas activas' }}
        <template v-if="soonCount > 0">
          · <strong>{{ soonCount }} para los próximos {{ text.soonDays }} días</strong>
        </template>
      </p>
    </header>

    <p v-if="notice" class="notice" :class="`notice--${notice.tone}`" role="status">
      <Icon name="lucide:circle-check" size="18" /> <span>{{ notice.text }}</span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <!-- Reservaciones esperando pago -->
    <section v-if="pending?.length" class="pending" aria-labelledby="pending-title">
      <h2 id="pending-title"><Icon name="lucide:hourglass" size="20" /> Esperando pago</h2>
      <p class="pending__help">Guardamos tus espacios por 3 horas. Si el pago no se confirma a tiempo, la reservación se cancela sola y no se te cobra nada.</p>
      <ul class="pending__list">
        <li v-for="r in pending" :key="r._id" class="pending__item">
          <div class="pending__info">
            <NuxtLink :to="`/eventos/${r.event._id}`" class="pending__name">{{ r.event.name }}</NuxtLink>
            <span class="pending__meta">{{ r.quantity }} {{ r.quantity === 1 ? 'entrada' : 'entradas' }} · {{ formatPrice(r.total) }} · {{ r.code }}</span>
          </div>
          <span class="badge badge--warm">Vence a las {{ formatTime(r.expiresAt!) }}</span>
          <button type="button" class="btn btn--ghost pending__cancel" @click="askCancelPending(r)">Cancelar</button>
        </li>
      </ul>
    </section>

    <div class="tabs" role="tablist" aria-label="Tipo de entradas">
      <button
        id="tab-active"
        role="tab"
        class="tabs__btn"
        :aria-selected="tab === 'active'"
        aria-controls="tickets-panel"
        @click="tab = 'active'"
      >
        {{ text.activeTab }} <span class="tabs__count">{{ active.length }}</span>
      </button>
      <button
        id="tab-history"
        role="tab"
        class="tabs__btn"
        :aria-selected="tab === 'history'"
        aria-controls="tickets-panel"
        @click="tab = 'history'"
      >
        {{ text.historyTab }} <span class="tabs__count">{{ history.length }}</span>
      </button>
    </div>

    <div id="tickets-panel" role="tabpanel" :aria-labelledby="tab === 'active' ? 'tab-active' : 'tab-history'">
      <p v-if="status === 'pending' && !data" class="state">Cargando tus entradas…</p>

      <div v-else-if="error" class="state state--error">
        <p>No pudimos cargar tus entradas.</p>
        <button class="btn btn--outline" @click="refresh()">Reintentar</button>
      </div>

      <div v-else-if="shown.length === 0" class="state">
        <Icon name="lucide:ticket" size="40" />
        <p>{{ tab === 'active' ? text.emptyActive : text.emptyHistory }}</p>
        <NuxtLink v-if="tab === 'active'" to="/buscar" class="btn btn--primary">{{ text.findEvents }}</NuxtLink>
      </div>

      <ul v-else class="list">
        <li v-for="e in shown" :key="e.ticket._id">
          <button class="tk" :class="`is-${e.state}`" @click="selected = e">
            <span
              class="tk__date"
              :style="{ background: eventPoster(e.ticket.event.category.slug).bg, color: eventPoster(e.ticket.event.category.slug).ink }"
            >
              <span class="tk__weekday">{{ e.date.weekday }}</span>
              <span class="tk__day">{{ e.date.day }}</span>
              <span class="tk__month">{{ e.date.month }}</span>
            </span>

            <span class="tk__info">
              <span class="tk__name">{{ e.ticket.event.name }}</span>
              <span class="tk__meta">
                <Icon name="lucide:clock" size="14" /> {{ formatTime(e.ticket.event.date) }}
                <Icon name="lucide:map-pin" size="14" /> {{ e.ticket.event.location }}
              </span>
              <span class="tk__code">{{ e.ticket.code }} · Entrada {{ e.n }} de {{ e.of }}</span>
            </span>

            <span class="tk__side">
              <span class="badge" :class="e.info.badge">{{ e.info.label }}</span>
              <span v-if="e.state === 'active' || e.state === 'soon'" class="tk__when">{{ timeUntil(e.ticket.event.date) }}</span>
              <Icon name="lucide:chevron-right" size="20" class="tk__chev" />
            </span>
          </button>
        </li>
      </ul>
    </div>
  </section>

  <TicketModal
    :ticket="selected?.ticket ?? null"
    :position="selected ? `Entrada ${selected.n} de ${selected.of}` : ''"
    @close="selected = null"
  >
    <template v-if="canManage" #extra>
      <div class="manage">
        <p v-if="modalMsg" class="manage__msg" :class="`manage__msg--${modalMsg.tone}`" role="status">{{ modalMsg.text }}</p>
        <div class="manage__btns">
          <button type="button" class="btn btn--outline" :disabled="resending" @click="resend">
            <Icon :name="resending ? 'lucide:loader-circle' : 'lucide:mail'" size="16" /> Reenviarme las entradas
          </button>
          <button type="button" class="btn btn--ghost manage__cancel" @click="askCancelSelected">
            <Icon name="lucide:ban" size="16" /> Cancelar reservación
          </button>
        </div>
      </div>
    </template>
  </TicketModal>

  <ConfirmDialog
    :open="Boolean(toCancel)"
    :title="`¿Cancelar tu reservación de «${toCancel?.name}»?`"
    confirm-label="Sí, cancelar"
    danger
    :loading="cancelling"
    :error="cancelError"
    @confirm="confirmCancel"
    @close="toCancel = null"
  >
    <p v-if="toCancel?.pending">Se liberan los espacios que estábamos guardando. Como el pago no se confirmó, no se te cobra nada.</p>
    <p v-else>
      Se {{ toCancel?.quantity === 1 ? 'anula la entrada' : `anulan las ${toCancel?.quantity} entradas` }} de esta compra y ya no {{ toCancel?.quantity === 1 ? 'servirá' : 'servirán' }} para ingresar.
      Esto no se puede deshacer.
    </p>
  </ConfirmDialog>
</template>

<style scoped>
.tickets { padding-top: 40px; max-width: 920px; }
.tickets__head h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); letter-spacing: -0.04em; }
.tickets__summary { color: var(--text-secondary); margin: 8px 0 0; }
.tickets__summary strong { color: var(--color-raspberry); }

.tabs { display: flex; gap: 6px; margin: 24px 0 20px; border-bottom: 1px solid var(--border); }
.tabs__btn {
  min-height: 48px; padding: 0 18px; border: 0; background: none; cursor: pointer;
  font: 600 0.9375rem var(--font-body); color: var(--text-secondary);
  border-bottom: 3px solid transparent; margin-bottom: -1px;
  display: inline-flex; align-items: center; gap: 8px;
}
.tabs__btn[aria-selected='true'] { color: var(--color-ink); border-bottom-color: var(--color-forest); }
.tabs__count { background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.75rem; padding: 2px 8px; border-radius: var(--radius-pill); }
.tabs__btn[aria-selected='true'] .tabs__count { background: var(--tint-forest); color: var(--color-forest-dark); }

.state { padding: 48px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }

/* Cada fila parece un boleto pequeño con la fecha en el talón */
.tk {
  position: relative; width: 100%; text-align: left; cursor: pointer;
  display: grid; grid-template-columns: 88px minmax(0, 1fr) auto; align-items: stretch;
  background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-lg);
  padding: 0; overflow: hidden; color: var(--color-ink); font: inherit;
  transition: border-color 0.15s, transform 0.15s;
}
.tk:hover { border-color: var(--color-forest); transform: translateY(-1px); }
.tk.is-soon { border-color: var(--color-raspberry); }

.tk__date {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0;
  padding: 12px 6px; border-right: 2px dashed rgba(31, 42, 36, 0.25);
  text-transform: uppercase;
}
.tk__weekday, .tk__month { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; }
.tk__day { font-family: var(--font-display); font-weight: 700; font-size: 2.125rem; line-height: 1; }

.tk__info { padding: 14px 16px; display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.tk__name { font-family: var(--font-display); font-weight: 600; font-size: 1.125rem; letter-spacing: -0.01em; }
.tk__meta { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; font-size: 0.875rem; color: var(--text-secondary); }
.tk__code { font-family: ui-monospace, 'Courier New', monospace; font-size: 0.75rem; color: var(--text-secondary); }

.tk__side { padding: 14px 16px 14px 0; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; }
.tk__when { font-size: 0.75rem; color: var(--text-secondary); }
.tk__chev { color: var(--text-secondary); }

/* Entradas del historial más apagadas */
.tk.is-used, .tk.is-expired, .tk.is-cancelled { background: var(--surface-muted); }
.tk.is-used .tk__date, .tk.is-expired .tk__date, .tk.is-cancelled .tk__date { filter: grayscale(0.7); opacity: 0.75; }
.tk.is-cancelled .tk__name { text-decoration: line-through; color: var(--text-secondary); }

.notice { margin: 16px 0 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); }
.notice > span { flex: 1; }
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.notice--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }

.pending { margin-top: 24px; padding: 18px; border-radius: var(--radius-lg); background: var(--tint-peach); color: var(--tint-peach-text); }
.pending h2 { display: flex; align-items: center; gap: 8px; font-size: 1.25rem; color: inherit; }
.pending__help { margin: 6px 0 12px; font-size: 0.9375rem; }
.pending__list { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.pending__item { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; padding: 12px 14px; background: var(--color-white); border-radius: var(--radius-md); color: var(--color-ink); }
.pending__info { flex: 1; min-width: 200px; display: flex; flex-direction: column; }
.pending__name { font-weight: 600; color: var(--color-ink); }
.pending__meta { font-size: 0.875rem; color: var(--text-secondary); }
.pending__cancel { color: var(--color-raspberry-dark); }

.manage { margin: 14px auto 0; max-width: 560px; padding: 14px; border-radius: var(--radius-lg); background: var(--color-sand); color: var(--color-ink); display: flex; flex-direction: column; gap: 10px; }
.manage__btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; }
.manage__btns .btn:disabled { opacity: 0.6; cursor: progress; }
.manage__cancel { color: var(--color-raspberry-dark); }
.manage__msg { margin: 0; padding: 10px 12px; border-radius: var(--radius-md); font-size: 0.875rem; text-align: center; }
.manage__msg--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.manage__msg--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }

@media (max-width: 560px) {
  .tk { grid-template-columns: 72px minmax(0, 1fr); }
  .tk__side { grid-column: 2; flex-direction: row; justify-content: flex-start; align-items: center; padding: 0 16px 14px; }
  .tk__chev { display: none; }
  .tk__day { font-size: 1.75rem; }
}
</style>
