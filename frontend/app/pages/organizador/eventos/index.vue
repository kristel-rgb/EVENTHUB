<script setup lang="ts">
// Mis eventos: lista de todos los eventos del organizador con pestañas por estado,
// búsqueda, orden y acciones (editar, vista previa, publicar, duplicar, cancelar, eliminar).
import type { OrganizerEvent } from '~/types/models'
import type { OrganizerEventFilters } from '~/composables/useOrganizerEvents'
import type { MenuAction } from '~/types/ui'

definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Mis eventos' })

const route = useRoute()
const router = useRouter()
const actions = useEventActions()

// ---------- Filtros en la URL ----------
const tabs = [
  { value: 'all', label: 'Todos' },
  { value: 'published', label: 'Publicados' },
  { value: 'draft', label: 'Borradores' },
  { value: 'finished', label: 'Finalizados' },
  { value: 'cancelled', label: 'Cancelados' },
] as const
const statusFromUrl: Record<string, OrganizerEventFilters['status']> = {
  publicado: 'published', borrador: 'draft', finalizado: 'finished', cancelado: 'cancelled',
}
const urlFromStatus = Object.fromEntries(Object.entries(statusFromUrl).map(([k, v]) => [v, k]))

const filters = computed<OrganizerEventFilters>(() => ({
  status: statusFromUrl[String(route.query.estado)] ?? 'all',
  q: typeof route.query.q === 'string' && route.query.q ? route.query.q : undefined,
  sort: (['date', 'recent', 'occupancy', 'revenue'] as const).find(s => s === route.query.orden) ?? 'date',
  page: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
  limit: 10,
}))
function setQuery(changes: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, pagina: undefined, ...changes } })
}

const { data, status, error, refresh } = await useOrganizerEvents(filters)
const searchText = ref(filters.value.q ?? '')
watch(() => filters.value.q, (q) => { searchText.value = q ?? '' })
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.limit)) : 1))

// ---------- Avisos (después de guardar, publicar, etc.) ----------
const notice = ref<{ tone: 'ok' | 'error', text: string, link?: { to: string, label: string } } | null>(null)
const noticeFromUrl: Record<string, string> = {
  creado: 'El evento quedó guardado como borrador.',
  guardado: 'Los cambios se guardaron.',
  publicado: 'El evento ya está publicado y visible en el sitio.',
}
if (typeof route.query.aviso === 'string' && noticeFromUrl[route.query.aviso]) {
  notice.value = { tone: 'ok', text: noticeFromUrl[route.query.aviso]! }
  router.replace({ query: { ...route.query, aviso: undefined } })
}

// ---------- Acciones por estado ----------
function menuFor(e: OrganizerEvent): MenuAction[] {
  const view: MenuAction = { key: 'view', label: 'Ver en el sitio', icon: 'lucide:external-link', to: `/eventos/${e._id}`, external: true }
  const preview: MenuAction = { key: 'preview', label: 'Vista previa', icon: 'lucide:eye', to: `/eventos/${e._id}?vista=previa`, external: true }
  const edit: MenuAction = { key: 'edit', label: 'Editar', icon: 'lucide:pencil', to: `/organizador/eventos/${e._id}/editar` }
  const reservations: MenuAction = { key: 'reservations', label: 'Ver reservas', icon: 'lucide:ticket', to: `/organizador/reservaciones?evento=${e._id}` }
  const dup: MenuAction = { key: 'duplicate', label: 'Duplicar', icon: 'lucide:copy' }
  const report: MenuAction = { key: 'report', label: 'Descargar reporte', icon: 'lucide:file-down' }
  switch (e.displayStatus) {
    case 'draft':
      return [edit, preview, { key: 'publish', label: 'Publicar', icon: 'lucide:send' }, dup, { key: 'delete', label: 'Eliminar borrador', icon: 'lucide:trash-2', danger: true }]
    case 'published':
      return [view, edit, reservations, report, dup, { key: 'cancel', label: 'Cancelar evento', icon: 'lucide:ban', danger: true }]
    case 'finished':
      return [view, reservations, report, dup]
    default:
      return [reservations, report, dup]
  }
}

const working = ref(false)
const confirm = ref<{ type: 'cancel' | 'delete', event: OrganizerEvent } | null>(null)
const confirmError = ref<string | null>(null)

async function run(fn: () => Promise<void>) {
  working.value = true
  notice.value = null
  try { await fn() }
  catch (err) {
    const e = readApiError(err)
    if (confirm.value) confirmError.value = e.message
    else notice.value = { tone: 'error', text: e.message }
    return false
  }
  finally { working.value = false }
  return true
}

const reportFor = ref<string | null>(null)
function onAction(key: string, e: OrganizerEvent) {
  if (key === 'report') { reportFor.value = e._id; return }
  if (key === 'publish') {
    run(async () => {
      try {
        await actions.publish(e._id)
        notice.value = { tone: 'ok', text: `«${e.name}» ya está publicado.`, link: { to: `/eventos/${e._id}`, label: 'Ver en el sitio' } }
        await refresh()
      }
      catch (err) {
        const ae = readApiError(err)
        if (ae.code === 'EVENT_INCOMPLETE') {
          notice.value = { tone: 'error', text: `A «${e.name}» le falta información para publicarse.`, link: { to: `/organizador/eventos/${e._id}/editar?revisar=1`, label: 'Completar datos' } }
          return
        }
        throw err
      }
    })
  }
  else if (key === 'duplicate') {
    run(async () => {
      const copy = await actions.duplicate(e._id)
      await navigateTo(`/organizador/eventos/${copy._id}/editar?duplicado=1`)
    })
  }
  else if (key === 'cancel' || key === 'delete') {
    confirmError.value = null
    confirm.value = { type: key, event: e }
  }
}

async function onConfirm() {
  const c = confirm.value
  if (!c) return
  const ok = await run(async () => {
    if (c.type === 'cancel') {
      const res = await actions.cancel(c.event._id)
      notice.value = { tone: 'ok', text: `«${c.event.name}» quedó cancelado. Se avisó por correo a ${res.notified} ${res.notified === 1 ? 'persona' : 'personas'}.` }
    }
    else {
      await actions.remove(c.event._id)
      notice.value = { tone: 'ok', text: `Se eliminó el borrador «${c.event.name}».` }
    }
  })
  if (ok) { confirm.value = null; await refresh() }
}

// ---------- Presentación ----------
const statusInfo: Record<string, { label: string, badge: string }> = {
  published: { label: 'Publicado', badge: 'badge--success' },
  draft: { label: 'Borrador', badge: 'badge--warm' },
  finished: { label: 'Finalizado', badge: 'badge--neutral' },
  cancelled: { label: 'Cancelado', badge: 'badge--neutral' },
}
const occupancy = (e: OrganizerEvent) => (e.capacity ? Math.round((e.reserved / e.capacity) * 100) : 0)
const initials = (name: string) => name.replace(/[^\p{L}\s]/gu, '').split(/\s+/).filter(w => w.length > 2).slice(0, 1).join('').slice(0, 5).toUpperCase()
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>Mis eventos</h1>
        <p v-if="data" class="head__count">{{ data.counts.all }} {{ data.counts.all === 1 ? 'evento' : 'eventos' }}</p>
      </div>
      <NuxtLink to="/organizador/eventos/nuevo" class="btn btn--primary"><Icon name="lucide:plus" size="16" /> Crear evento</NuxtLink>
    </header>

    <p v-if="notice" class="notice" :class="`notice--${notice.tone}`" role="status">
      <Icon :name="notice.tone === 'ok' ? 'lucide:circle-check' : 'lucide:circle-alert'" size="18" />
      <span>{{ notice.text }} <NuxtLink v-if="notice.link" :to="notice.link.to">{{ notice.link.label }}</NuxtLink></span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <!-- Pestañas por estado -->
    <nav class="tabs" aria-label="Filtrar por estado">
      <NuxtLink
        v-for="t in tabs" :key="t.value"
        :to="{ query: { ...route.query, estado: t.value === 'all' ? undefined : urlFromStatus[t.value], pagina: undefined } }"
        class="tabs__item" :class="{ 'is-on': filters.status === t.value }"
        :aria-current="filters.status === t.value ? 'page' : undefined" replace
      >
        {{ t.label }} <span class="tabs__count">{{ data?.counts[t.value] ?? 0 }}</span>
      </NuxtLink>
    </nav>

    <!-- Búsqueda y orden -->
    <div class="tools">
      <form class="search" role="search" @submit.prevent="setQuery({ q: searchText.trim() || undefined })">
        <Icon name="lucide:search" size="18" />
        <label for="ev-search" class="sr-only">Buscar en mis eventos</label>
        <input id="ev-search" v-model="searchText" type="search" placeholder="Buscar por nombre o lugar">
      </form>
      <label class="sort">
        <span>Ordenar</span>
        <select :value="filters.sort" @change="setQuery({ orden: ($event.target as HTMLSelectElement).value === 'date' ? undefined : ($event.target as HTMLSelectElement).value })">
          <option value="date">Más próximo</option>
          <option value="recent">Creado recientemente</option>
          <option value="occupancy">Mayor ocupación</option>
          <option value="revenue">Más ingresos</option>
        </select>
      </label>
    </div>

    <p v-if="status === 'pending' && !data" class="state">Cargando eventos…</p>
    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar tus eventos.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>
    <div v-else-if="data && data.items.length === 0" class="state">
      <Icon name="lucide:calendar-plus" size="40" />
      <template v-if="data.counts.all === 0 && !filters.q">
        <p><strong>Creá tu primer evento</strong></p>
        <NuxtLink to="/organizador/eventos/nuevo" class="btn btn--primary">Crear evento</NuxtLink>
      </template>
      <p v-else>No hay eventos con estos filtros.</p>
    </div>

    <!-- Lista -->
    <div v-else-if="data" class="list card" :class="{ 'is-loading': status === 'pending' || working }">
      <div class="row row--head" aria-hidden="true">
        <span /><span>Evento</span><span>Fecha</span><span>Estado</span><span>Ocupación</span><span class="num">Ingresos</span><span />
      </div>
      <ul class="rows">
        <li v-for="e in data.items" :key="e._id" class="row" :class="`is-${e.displayStatus}`">
          <span class="thumb" :style="{ background: eventPoster(e.category?.slug ?? '').bg, color: eventPoster(e.category?.slug ?? '').ink }" aria-hidden="true">
            <img v-if="e.imageUrl" :src="e.imageUrl" alt="">
            <template v-else>{{ initials(e.name) }}</template>
          </span>
          <span class="info">
            <NuxtLink :to="e.displayStatus === 'draft' ? `/organizador/eventos/${e._id}/editar` : `/eventos/${e._id}`" class="info__name">{{ e.name }}</NuxtLink>
            <span class="info__meta">{{ e.category?.name ?? 'Sin categoría' }} · {{ e.location || 'Sin lugar' }}</span>
          </span>
          <span class="date">
            <template v-if="e.date"><span class="cap">{{ formatShortDate(e.date) }}</span><span class="muted">{{ formatTime(e.date) }}</span></template>
            <span v-else class="muted">Sin fecha</span>
          </span>
          <span><span class="badge" :class="statusInfo[e.displayStatus]?.badge">{{ statusInfo[e.displayStatus]?.label }}</span></span>
          <span class="occ">
            <button v-if="e.displayStatus === 'draft'" type="button" class="btn btn--primary occ__publish" :disabled="working" @click="onAction('publish', e)">
              <Icon name="lucide:send" size="14" /> Publicar
            </button>
            <template v-else-if="e.displayStatus !== 'cancelled'">
              <span class="occ__track"><span class="occ__fill" :class="{ 'is-high': occupancy(e) >= 90, 'is-past': e.displayStatus === 'finished' }" :style="{ width: `${occupancy(e)}%` }" /></span>
              <span class="muted">{{ formatNumber(e.reserved) }} / {{ formatNumber(e.capacity) }}</span>
            </template>
            <span v-else class="muted">—</span>
          </span>
          <span class="num money">{{ e.revenue ? formatPriceCompact(e.revenue) : '—' }}</span>
          <span class="menu"><ActionMenu :actions="menuFor(e)" :label="`Acciones de ${e.name}`" @select="onAction($event, e)" /></span>
        </li>
      </ul>
    </div>

    <nav v-if="data && totalPages > 1" class="pager" aria-label="Paginación">
      <button class="btn btn--outline" :disabled="filters.page <= 1" @click="setQuery({ pagina: String(filters.page - 1) })">Anterior</button>
      <span class="muted">Página {{ filters.page }} de {{ totalPages }}</span>
      <button class="btn btn--outline" :disabled="filters.page >= totalPages" @click="setQuery({ pagina: String(filters.page + 1) })">Siguiente</button>
    </nav>

    <ClientOnly><ReportDialog :open="Boolean(reportFor)" :event-id="reportFor" @close="reportFor = null" /></ClientOnly>

    <!-- Confirmaciones -->
    <ConfirmDialog
      :open="confirm?.type === 'cancel'"
      :title="`¿Cancelar «${confirm?.event.name}»?`"
      confirm-label="Cancelar evento"
      danger
      :confirm-text="confirm?.event.name"
      :loading="working"
      :error="confirmError"
      @confirm="onConfirm"
      @close="confirm = null"
    >
      <p>
        <strong>{{ confirm?.event.attendees ?? 0 }} {{ confirm?.event.attendees === 1 ? 'persona tiene' : 'personas tienen' }} entradas.</strong>
        Les enviaremos un correo y sus entradas quedarán anuladas. Esto no se puede deshacer.
      </p>
    </ConfirmDialog>

    <ConfirmDialog
      :open="confirm?.type === 'delete'"
      :title="`¿Eliminar el borrador «${confirm?.event.name}»?`"
      confirm-label="Eliminar"
      danger
      :loading="working"
      :error="confirmError"
      @confirm="onConfirm"
      @close="confirm = null"
    >
      <p>El borrador se elimina por completo. Esto no se puede deshacer.</p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
.head h1 { font-size: 2.5rem; }
.head__count { margin: 4px 0 0; color: var(--text-secondary); }

.notice { margin: 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); font-size: 0.9375rem; }
.notice > span { flex: 1; }
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.notice--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.notice a { color: inherit; font-weight: 700; }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }

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

.list { padding: 4px 0; transition: opacity .15s; }
.list.is-loading { opacity: 0.55; }
.rows { list-style: none; margin: 0; padding: 0; }
.row {
  display: grid; grid-template-columns: 52px minmax(0, 2.2fr) 96px 112px minmax(140px, 1.2fr) 90px 44px;
  gap: 14px; align-items: center; padding: 12px 18px;
}
.rows .row { border-top: 1px solid var(--track); }
.row--head { font-size: 0.75rem; color: var(--text-secondary); padding-top: 10px; padding-bottom: 8px; }

.thumb {
  width: 52px; height: 52px; border-radius: 12px; overflow: hidden; display: flex; align-items: flex-end; padding: 5px;
  font: 700 0.6875rem var(--font-display); letter-spacing: -0.01em; line-height: 1;
}
.thumb img { width: calc(100% + 10px); height: calc(100% + 10px); margin: -5px; object-fit: cover; }
.info { display: flex; flex-direction: column; min-width: 0; }
.info__name { font-weight: 600; color: var(--color-ink); text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.info__name:hover { color: var(--color-forest); text-decoration: underline; }
.info__meta { font-size: 0.8125rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.date { display: flex; flex-direction: column; font-size: 0.875rem; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; }
.cap::first-letter { text-transform: uppercase; }
.occ { display: flex; flex-direction: column; gap: 4px; }
.occ__track { height: 8px; border-radius: var(--radius-pill); background: var(--track); display: block; }
.occ__fill { display: block; height: 8px; border-radius: var(--radius-pill); background: var(--color-forest); }
.occ__fill.is-high { background: var(--color-raspberry); }
.occ__fill.is-past { background: var(--text-secondary); }
.occ__publish { min-height: 36px; padding: 0 12px; font-size: 0.8125rem; align-self: flex-start; }
.num { text-align: right; }
.money { font-weight: 600; }
.menu { display: flex; justify-content: flex-end; }
.row.is-cancelled .info__name { text-decoration: line-through; color: var(--text-secondary); }
.row.is-finished .thumb { opacity: 0.75; }

.pager { display: flex; justify-content: center; align-items: center; gap: 14px; }
.pager button:disabled { opacity: 0.4; cursor: default; }

/* Celular y tablet: cada evento como tarjeta */
@media (max-width: 960px) {
  .row--head { display: none; }
  .row {
    grid-template-columns: 52px minmax(0, 1fr) auto;
    grid-template-areas: 'thumb info menu' 'thumb date status' 'occ occ money';
    row-gap: 8px;
  }
  .thumb { grid-area: thumb; }
  .info { grid-area: info; }
  .menu { grid-area: menu; }
  .date { grid-area: date; flex-direction: row; gap: 6px; align-items: baseline; }
  .row > span:nth-child(4) { grid-area: status; justify-self: end; }
  .occ { grid-area: occ; }
  .money { grid-area: money; align-self: end; }
}
.head h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
</style>
