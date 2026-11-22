<script setup lang="ts">
// Reservaciones: quién compró, cuántas entradas, si pagó y si ya ingresó.
// Datos: GET /organizer/reservations · Detalle: panel lateral (ReservationDrawer).
// Regla: una reservación "pendiente de pago" guarda los espacios 3 h; si no se paga, se cancela sola.
import type { ReservationFilters } from '~/composables/useReservations'

definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Reservaciones' })

const route = useRoute()
const router = useRouter()

// ---------- Selector de evento ----------
const { data: eventOptions } = await useReservationEventOptions()
const now = Date.now()
// Por defecto se abre el próximo evento publicado; ?evento=todos muestra todos
const defaultEvent = computed(() =>
  eventOptions.value?.find(e => e.displayStatus === 'published' && new Date(e.date).getTime() > now)?._id ?? '',
)
const selectedEvent = computed(() => {
  const q = route.query.evento
  if (q === 'todos') return ''
  if (typeof q === 'string' && eventOptions.value?.some(e => e._id === q)) return q
  return defaultEvent.value
})
const groups = computed(() => {
  const list = eventOptions.value ?? []
  return [
    { label: 'Próximos', items: list.filter(e => e.displayStatus === 'published') },
    { label: 'Finalizados', items: list.filter(e => e.displayStatus === 'finished').reverse() },
    { label: 'Cancelados', items: list.filter(e => e.displayStatus === 'cancelled') },
  ].filter(g => g.items.length)
})

// ---------- Filtros en la URL ----------
const tabs = [
  { value: '', label: 'Todas', count: 'all' },
  { value: 'confirmed', label: 'Pagadas', count: 'confirmed' },
  { value: 'pending', label: 'Pago pendiente', count: 'pending' },
  { value: 'cancelled', label: 'Canceladas', count: 'cancelled' },
] as const
const statusFromUrl: Record<string, ReservationFilters['status']> = { pagadas: 'confirmed', pendientes: 'pending', canceladas: 'cancelled' }
const urlFromStatus: Record<string, string> = { confirmed: 'pagadas', pending: 'pendientes', cancelled: 'canceladas' }

const filters = computed<ReservationFilters>(() => ({
  event: selectedEvent.value,
  status: statusFromUrl[String(route.query.estado)] ?? '',
  q: typeof route.query.q === 'string' && route.query.q ? route.query.q : undefined,
  sort: (['recent', 'oldest', 'total', 'quantity'] as const).find(s => s === route.query.orden) ?? 'recent',
  page: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
  limit: 20,
}))
function setQuery(changes: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, pagina: undefined, ...changes } })
}
function onEventChange(e: Event) {
  const v = (e.target as HTMLSelectElement).value
  setQuery({ evento: v === '' ? 'todos' : v, estado: undefined })
}

const { data, status, error, refresh } = await useOrganizerReservations(filters)
const searchText = ref(filters.value.q ?? '')
watch(() => filters.value.q, (q) => { searchText.value = q ?? '' })
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.limit)) : 1))
const allEvents = computed(() => !filters.value.event)
const currentEvent = computed(() => eventOptions.value?.find(e => e._id === filters.value.event) ?? null)

// ---------- Resumen ----------
const s = computed(() => data.value?.summary)
const soldPct = computed(() => (s.value?.capacity ? Math.min(100, Math.round((s.value.ticketsSold / s.value.capacity) * 100)) : 0))
const inPct = computed(() => (s.value?.ticketsSold ? Math.round((s.value.checkedIn / s.value.ticketsSold) * 100) : 0))

// ---------- Detalle ----------
const openId = ref<string | null>(typeof route.query.reserva === 'string' ? route.query.reserva : null)
const notice = ref<string | null>(null)
function onChanged(msg: string) { notice.value = msg; refresh() }
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>Reservaciones</h1>
        <p class="sub">Quién compró, cuántas entradas, si pagó y si ya ingresó.</p>
      </div>
      <label class="picker">
        <span class="sr-only">Evento</span>
        <Icon name="lucide:calendar-days" size="18" aria-hidden="true" />
        <select :value="filters.event" @change="onEventChange">
          <option value="">Todos mis eventos</option>
          <optgroup v-for="g in groups" :key="g.label" :label="g.label">
            <option v-for="e in g.items" :key="e._id" :value="e._id">{{ e.name }} · {{ formatShortDate(e.date) }}</option>
          </optgroup>
        </select>
      </label>
    </header>

    <p v-if="notice" class="notice" role="status">
      <Icon name="lucide:circle-check" size="18" /> <span>{{ notice }}</span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <!-- Resumen -->
    <section v-if="s" class="stats" aria-label="Resumen">
      <div class="card stat">
        <p class="stat__label">Reservaciones pagadas</p>
        <p class="stat__value">{{ formatNumber(s.reservations) }}</p>
        <p class="stat__foot">{{ s.newThisWeek ? `+${formatNumber(s.newThisWeek)} en los últimos 7 días` : 'Ninguna nueva esta semana' }}</p>
      </div>
      <div class="card stat">
        <p class="stat__label">Entradas vendidas</p>
        <p class="stat__value">{{ formatNumber(s.ticketsSold) }} <span>/ {{ formatNumber(s.capacity) }}</span></p>
        <div class="bar" role="img" :aria-label="`${soldPct}% de la capacidad`"><span :style="{ width: `${soldPct}%` }" /></div>
        <p v-if="s.ticketsPending" class="stat__foot stat__foot--warm">{{ s.ticketsPending }} más esperando pago</p>
      </div>
      <div class="card stat">
        <p class="stat__label">Ingresos</p>
        <p class="stat__value">{{ formatPriceCompact(s.revenue) }}</p>
        <p class="stat__foot">{{ s.unitPrice === null ? 'Solo lo pagado' : s.unitPrice === 0 ? 'Evento gratuito' : `${formatPrice(s.unitPrice)} por entrada` }}</p>
      </div>
      <div class="card stat">
        <p class="stat__label">Ingresaron</p>
        <p class="stat__value">{{ formatNumber(s.checkedIn) }} <span>/ {{ formatNumber(s.ticketsSold) }}</span></p>
        <p class="stat__foot">{{ s.checkedIn ? `${inPct}% de las entradas` : 'Se actualiza al validar en la puerta' }}</p>
      </div>
    </section>

    <!-- Pestañas -->
    <nav class="tabs" aria-label="Filtrar por estado">
      <NuxtLink
        v-for="t in tabs" :key="t.value"
        :to="{ query: { ...route.query, estado: t.value ? urlFromStatus[t.value] : undefined, pagina: undefined } }"
        class="tabs__item" :class="{ 'is-on': filters.status === t.value }"
        :aria-current="filters.status === t.value ? 'page' : undefined" replace
      >
        {{ t.label }} <span class="tabs__count">{{ data?.counts[t.count] ?? 0 }}</span>
      </NuxtLink>
    </nav>

    <!-- Búsqueda y orden -->
    <div class="tools">
      <form class="search" role="search" @submit.prevent="setQuery({ q: searchText.trim() || undefined })">
        <Icon name="lucide:search" size="18" />
        <label for="res-search" class="sr-only">Buscar reservaciones</label>
        <input id="res-search" v-model="searchText" type="search" placeholder="Nombre, correo o código (R-1A2B, EH-1042)">
      </form>
      <label class="sort">
        <span>Ordenar</span>
        <select :value="filters.sort" @change="setQuery({ orden: ($event.target as HTMLSelectElement).value === 'recent' ? undefined : ($event.target as HTMLSelectElement).value })">
          <option value="recent">Más recientes</option>
          <option value="oldest">Más antiguas</option>
          <option value="total">Mayor total</option>
          <option value="quantity">Más entradas</option>
        </select>
      </label>
    </div>

    <p v-if="status === 'pending' && !data" class="state">Cargando reservaciones…</p>
    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar las reservaciones.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>
    <div v-else-if="data && data.items.length === 0" class="state">
      <Icon name="lucide:ticket" size="40" />
      <p v-if="filters.q || filters.status">No hay reservaciones con estos filtros.</p>
      <p v-else>{{ currentEvent ? `«${currentEvent.name}» todavía no tiene reservaciones.` : 'Tus eventos todavía no tienen reservaciones.' }}</p>
    </div>

    <!-- Tabla -->
    <div v-else-if="data" class="card list" :class="{ 'is-loading': status === 'pending' }">
      <table class="tbl">
        <caption class="sr-only">Reservaciones{{ currentEvent ? ` de ${currentEvent.name}` : '' }}. Abrí una para ver el detalle.</caption>
        <thead>
          <tr>
            <th scope="col">Cliente</th>
            <th v-if="allEvents" scope="col">Evento</th>
            <th scope="col">Reservación</th>
            <th scope="col" class="num">Cant.</th>
            <th scope="col" class="num">Total</th>
            <th scope="col">Comprada</th>
            <th scope="col">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in data.items" :key="r._id" :class="{ 'is-open': openId === r._id, 'is-cancelled': r.status === 'cancelled' }" @click="openId = r._id">
            <td class="who">
              <button type="button" class="who__btn" @click.stop="openId = r._id">{{ r.customer.name }}</button>
              <span class="muted">{{ r.customer.email }}</span>
            </td>
            <td v-if="allEvents" class="ev"><span>{{ r.event.name }}</span><span class="muted cap">{{ formatShortDate(r.event.date) }}</span></td>
            <td class="code">{{ r.code }}</td>
            <td class="num">{{ r.quantity }}</td>
            <td class="num money">{{ r.total ? formatPrice(r.total) : 'Gratis' }}</td>
            <td><span class="cap">{{ formatShortDate(r.createdAt) }}</span><span class="muted">{{ formatTime(r.createdAt) }}</span></td>
            <td>
              <span class="badge" :class="reservationStateInfo(r).badge">{{ reservationStateInfo(r).label }}</span>
              <span v-if="r.status === 'pending' && r.expiresAt" class="muted">Vence {{ formatTime(r.expiresAt) }}</span>
              <span v-else-if="r.ticketsUsed" class="muted">{{ r.ticketsUsed }} de {{ r.quantity }} ingresaron</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="data && totalPages > 1" class="pager" aria-label="Paginación">
      <button class="btn btn--outline" :disabled="filters.page <= 1" @click="setQuery({ pagina: String(filters.page - 1) })">Anterior</button>
      <span class="muted">Página {{ filters.page }} de {{ totalPages }} · {{ formatNumber(data.total) }} reservaciones</span>
      <button class="btn btn--outline" :disabled="filters.page >= totalPages" @click="setQuery({ pagina: String(filters.page + 1) })">Siguiente</button>
    </nav>

    <ClientOnly>
      <ReservationDrawer :id="openId" @close="openId = null" @changed="onChanged" />
    </ClientOnly>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
.head h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
.sub { margin: 4px 0 0; color: var(--text-secondary); }
.picker {
  display: flex; align-items: center; gap: 8px; padding-left: 14px; min-height: 46px; max-width: 100%;
  background: var(--color-white); border: 1.5px solid var(--border); border-radius: var(--radius-pill); color: var(--color-forest);
}
.picker:focus-within { border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.picker select { border: 0; background: transparent; min-height: 44px; padding: 0 14px 0 0; font: 600 0.9375rem var(--font-body); color: var(--color-ink); max-width: min(420px, 70vw); outline: none; }

.notice { margin: 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.notice > span { flex: 1; }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }

.stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }
.stat { padding: 16px; display: flex; flex-direction: column; gap: 4px; }
.stat p { margin: 0; }
.stat__label { font-size: 0.8125rem; color: var(--text-secondary); font-weight: 600; }
.stat__value { font: 700 1.75rem/1.1 var(--font-display); letter-spacing: -0.03em; }
.stat__value span { font-size: 1rem; color: var(--text-secondary); font-weight: 500; letter-spacing: 0; }
.stat__foot { font-size: 0.8125rem; color: var(--text-secondary); }
.stat__foot--warm { color: var(--tint-peach-text); font-weight: 600; }
.bar { height: 8px; border-radius: var(--radius-pill); background: var(--track); margin: 4px 0 2px; }
.bar span { display: block; height: 8px; border-radius: var(--radius-pill); background: var(--color-forest); }

.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; }
.tabs__item {
  display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 14px; white-space: nowrap;
  color: var(--text-secondary); text-decoration: none; font-weight: 600; font-size: 0.9375rem;
  border-bottom: 3px solid transparent; margin-bottom: -1px;
}
.tabs__item:hover { color: var(--color-ink); }
.tabs__item.is-on { color: var(--color-ink); border-bottom-color: var(--color-forest); }
.tabs__count { background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.75rem; padding: 1px 8px; border-radius: var(--radius-pill); }
.tabs__item.is-on .tabs__count { background: var(--tint-forest); color: var(--color-forest-dark); }

.tools { display: flex; flex-wrap: wrap; gap: 10px; }
.search {
  flex: 1 1 280px; display: flex; align-items: center; gap: 8px; padding: 0 14px; min-height: 46px;
  background: var(--color-white); border: 1.5px solid var(--border); border-radius: var(--radius-md); color: var(--text-secondary);
}
.search:focus-within { border-color: var(--color-forest); }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font: 1rem var(--font-body); color: var(--color-ink); }
.sort { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.875rem; }
.sort select { min-height: 46px; padding: 0 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); font: 500 0.9375rem var(--font-body); }

.state { padding: 48px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.list { overflow: hidden; transition: opacity .15s; }
.list.is-loading { opacity: 0.55; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); padding: 12px 14px 8px; }
.tbl td { padding: 12px 14px; border-top: 1px solid var(--track); vertical-align: middle; font-size: 0.9375rem; }
.tbl tbody tr { cursor: pointer; }
.tbl tbody tr:hover td, .tbl tbody tr.is-open td { background: var(--tint-peach); }
.tbl tbody tr.is-open td { color: var(--color-ink); }
.who__btn { all: unset; cursor: pointer; font-weight: 600; color: var(--color-ink); }
.who__btn:hover { text-decoration: underline; }
.who__btn:focus-visible { outline: 3px solid var(--color-raspberry); outline-offset: 2px; border-radius: 4px; }
.who, .ev { display: table-cell; }
.who .muted, .ev .muted, td .muted { display: block; }
.ev span:first-child { display: block; max-width: 220px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.code { font-family: ui-monospace, monospace; font-size: 0.875rem; }
.num { text-align: right; }
.money { font-weight: 600; white-space: nowrap; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; }
.cap { display: block; }
.cap::first-letter { text-transform: uppercase; }
.is-cancelled .who__btn { color: var(--text-secondary); }
.is-cancelled .money { text-decoration: line-through; color: var(--text-secondary); }

.pager { display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap; }
.pager button:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 1100px) { .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

/* Celular: cada reservación como tarjeta */
@media (max-width: 760px) {
  .tbl thead { display: none; }
  .tbl, .tbl tbody, .tbl tr, .tbl td { display: block; }
  .tbl tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 4px 12px; padding: 14px; border-top: 1px solid var(--track); }
  .tbl td { padding: 0; border: 0; }
  .tbl td.num:not(.money), .tbl .code { display: none; }
  .tbl td:last-child { grid-column: 1 / -1; }
  .stats { grid-template-columns: minmax(0, 1fr); }
}
</style>
