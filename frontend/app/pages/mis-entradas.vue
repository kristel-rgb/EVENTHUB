<script setup lang="ts">
// Mis entradas: activas (por usar) e historial (usadas, vencidas, canceladas).
// Datos: GET /me/tickets · Al hacer clic se abre el boleto en una ventana.
const { tickets: text } = useAppConfig()
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
  />
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

@media (max-width: 560px) {
  .tk { grid-template-columns: 72px minmax(0, 1fr); }
  .tk__side { grid-column: 2; flex-direction: row; justify-content: flex-start; align-items: center; padding: 0 16px 14px; }
  .tk__chev { display: none; }
  .tk__day { font-size: 1.75rem; }
}
</style>
