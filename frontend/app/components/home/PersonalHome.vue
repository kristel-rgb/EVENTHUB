<script setup lang="ts">
// Parte de arriba del inicio cuando un cliente ya ingresó (reemplaza al hero):
// saludo + buscador, su próxima entrada, novedades y lo más esperado.
// Datos: GET /me/tickets · GET /me/feed · GET /events?sort=popular
import type { EventFilters } from '~/composables/useCatalog'

const session = useSessionStore()
const { home, tickets: ticketText } = useAppConfig()
const t = home.personal

const name = computed(() => session.user?.firstName || session.user?.username || '')
const today = computed(() => new Intl.DateTimeFormat('es-CR', { timeZone: 'America/Costa_Rica', weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()))

// ---------- Buscador ----------
const q = ref('')
function search() {
  navigateTo({ path: '/buscar', query: q.value.trim() ? { q: q.value.trim() } : {} })
}

// ---------- Próxima entrada ----------
const { data: myTickets } = await useMyTickets()
const now = Date.now()
const upcomingTickets = computed(() => (myTickets.value ?? [])
  .filter(tk => tk.status === 'active' && tk.event.status === 'published' && new Date(tk.event.date).getTime() > now - 6 * 3600_000)
  .sort((a, b) => a.event.date.localeCompare(b.event.date)))
const next = computed(() => upcomingTickets.value[0] ?? null)
// Cuántas entradas tiene para ese mismo evento y cuántos eventos más le esperan
const sameEvent = computed(() => (next.value ? upcomingTickets.value.filter(tk => tk.event._id === next.value!.event._id).length : 0))
const otherEvents = computed(() => new Set(upcomingTickets.value.map(tk => tk.event._id)).size - (next.value ? 1 : 0))
const isSoon = computed(() => (next.value ? new Date(next.value.event.date).getTime() - now < ticketText.soonDays * 86_400_000 : false))
const poster = computed(() => eventPoster(next.value?.event.category.slug ?? ''))
const parts = computed(() => (next.value ? formatDateParts(next.value.event.date) : null))

// ---------- Novedades ----------
const { data: feed, error: feedError } = await useMyFeed()
const feedItems = computed(() => feed.value?.items.slice(0, 5) ?? [])

// ---------- Lo más esperado ----------
const popularFilters = ref<EventFilters>({ sort: 'popular', page: 1, limit: t.popularCount })
const { data: popular } = await useEvents(popularFilters, 'home-popular')
</script>

<template>
  <section class="welcome" aria-labelledby="welcome-title">
    <div class="container welcome__inner">
      <div>
        <p class="welcome__date">{{ today }}</p>
        <h1 id="welcome-title" class="welcome__title">{{ t.greeting }}, <span>{{ name }}</span></h1>
      </div>
      <form class="welcome__search" role="search" @submit.prevent="search">
        <Icon name="lucide:search" size="20" aria-hidden="true" />
        <label for="home-q" class="sr-only">Buscar eventos</label>
        <input id="home-q" v-model="q" type="search" :placeholder="t.searchPlaceholder">
        <button type="submit" class="btn btn--primary">Buscar</button>
      </form>
    </div>
  </section>

  <div class="container top">
    <!-- Próxima entrada -->
    <section class="card next" aria-labelledby="next-title">
      <h2 id="next-title" class="top__title">{{ t.nextTicketTitle }}</h2>
      <template v-if="next && parts">
        <div class="next__body">
          <span class="next__date" :style="{ background: poster.bg, color: poster.ink }" aria-hidden="true">
            <span class="next__wd">{{ parts.weekday }}</span>
            <span class="next__day">{{ parts.day }}</span>
            <span class="next__mo">{{ parts.month }}</span>
          </span>
          <div class="next__info">
            <NuxtLink :to="`/eventos/${next.event._id}`" class="next__name">{{ next.event.name }}</NuxtLink>
            <p class="next__meta"><Icon name="lucide:clock" size="14" /> {{ formatEventDate(next.event.date) }}</p>
            <p class="next__meta"><Icon name="lucide:map-pin" size="14" /> {{ next.event.location }}</p>
            <p class="next__when" :class="{ 'is-soon': isSoon }">
              {{ timeUntil(next.event.date) }} · {{ sameEvent }} {{ sameEvent === 1 ? 'entrada' : 'entradas' }}
            </p>
          </div>
        </div>
        <div class="next__actions">
          <NuxtLink :to="{ path: '/mis-entradas', query: { entrada: next._id } }" class="btn btn--primary">
            <Icon name="lucide:qr-code" size="16" /> Ver mi entrada
          </NuxtLink>
          <NuxtLink v-if="otherEvents > 0" to="/mis-entradas" class="btn btn--ghost">
            {{ otherEvents === 1 ? 'y 1 evento más' : `y ${otherEvents} eventos más` }}
          </NuxtLink>
        </div>
      </template>
      <div v-else class="next__empty">
        <Icon name="lucide:ticket" size="32" />
        <p>Todavía no tenés entradas para próximos eventos.</p>
        <NuxtLink to="/buscar" class="btn btn--outline">Buscar algo para hacer</NuxtLink>
      </div>
    </section>

    <!-- Novedades -->
    <section class="card feed" aria-labelledby="feed-title">
      <h2 id="feed-title" class="top__title">{{ t.feedTitle }}</h2>
      <p v-if="feedError" class="feed__empty">No pudimos cargar las novedades.</p>
      <ul v-else-if="feedItems.length" class="feed__list">
        <li v-for="f in feedItems" :key="f._id">
          <NuxtLink :to="`/eventos/${f.event._id}`" class="feed__item">
            <span class="feed__icon" :class="`is-${feedTypeInfo[f.type].tone}`" aria-hidden="true">
              <Icon :name="feedTypeInfo[f.type].icon" size="18" />
            </span>
            <span class="feed__text">
              <span class="feed__head">{{ f.title }} · <strong>{{ f.event.name }}</strong></span>
              <span class="feed__desc">{{ f.text }}</span>
            </span>
            <Icon name="lucide:chevron-right" size="18" class="feed__chev" aria-hidden="true" />
          </NuxtLink>
        </li>
      </ul>
      <p v-else class="feed__empty">{{ t.feedEmpty }}</p>
    </section>
  </div>

  <!-- Lo más esperado -->
  <section v-if="popular?.items.length" class="container block" aria-labelledby="popular-title">
    <div class="block__head">
      <h2 id="popular-title" class="block__title">{{ t.popularTitle }}</h2>
      <NuxtLink to="/buscar" class="block__more">{{ home.seeAllLabel }} <Icon name="lucide:arrow-right" size="16" /></NuxtLink>
    </div>
    <div class="grid">
      <EventCard v-for="ev in popular.items" :key="ev._id" :event="ev" />
    </div>
  </section>
</template>

<style scoped>
.welcome { background: var(--color-forest); color: var(--color-sand); padding: 32px 0 72px; }
.welcome__inner { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 20px; }
.welcome__date { margin: 0; font-size: 0.9375rem; color: var(--on-forest-muted); }
.welcome__date::first-letter { text-transform: uppercase; }
.welcome__title { font-size: clamp(2.25rem, 5vw, 3.25rem); letter-spacing: -0.04em; color: var(--color-sand); margin-top: 4px; }
.welcome__title span { color: var(--color-peach); }
.welcome__search {
  flex: 1 1 360px; max-width: 520px; display: flex; align-items: center; gap: 10px;
  background: var(--color-white); color: var(--text-secondary); border-radius: var(--radius-pill); padding: 6px 6px 6px 18px;
}
.welcome__search:focus-within { outline: 3px solid var(--color-peach); outline-offset: 2px; }
.welcome__search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font: 1rem var(--font-body); color: var(--color-ink); min-height: 44px; }
.welcome__search .btn { border-radius: var(--radius-pill); }

/* Las dos tarjetas suben un poco sobre la banda verde */
.top { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr); gap: 16px; margin-top: -48px; position: relative; }
.top__title { font-size: 1.25rem; margin-bottom: 14px; }

.next, .feed { padding: 20px; display: flex; flex-direction: column; }
.next__body { display: flex; gap: 16px; align-items: stretch; }
.next__date {
  flex: 0 0 84px; border-radius: 16px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  padding: 10px 4px; text-transform: uppercase;
}
.next__wd, .next__mo { font-size: 0.75rem; font-weight: 600; letter-spacing: 0.08em; }
.next__day { font: 700 2.25rem/1 var(--font-display); }
.next__info { min-width: 0; display: flex; flex-direction: column; gap: 4px; }
.next__name { font: 600 1.25rem/1.2 var(--font-display); color: var(--color-ink); text-decoration: none; letter-spacing: -0.01em; }
.next__name:hover { color: var(--color-forest); text-decoration: underline; }
.next__meta { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.875rem; color: var(--text-secondary); }
.next__meta::first-letter { text-transform: uppercase; }
.next__when { margin: 4px 0 0; font-size: 0.875rem; font-weight: 600; color: var(--color-forest-dark); }
.next__when.is-soon { color: var(--color-raspberry-dark); }
.next__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; padding-top: 16px; }
.next__empty { flex: 1; display: flex; flex-direction: column; align-items: flex-start; gap: 10px; color: var(--text-secondary); }
.next__empty p { margin: 0; }

.feed__list { list-style: none; margin: 0; padding: 0; }
.feed__list li + li { border-top: 1px solid var(--track); }
.feed__item { display: grid; grid-template-columns: 36px minmax(0, 1fr) 18px; gap: 12px; align-items: center; padding: 10px 4px; text-decoration: none; color: var(--color-ink); border-radius: var(--radius-sm); }
.feed__item:hover { background: var(--surface-muted); }
.feed__icon { width: 36px; height: 36px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.feed__icon.is-urgent { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.feed__icon.is-warm { background: var(--tint-peach); color: var(--tint-peach-text); }
.feed__icon.is-info { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.feed__icon.is-ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.feed__text { display: flex; flex-direction: column; min-width: 0; }
.feed__head { font-size: 0.9375rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.feed__head strong { font-weight: 600; }
.feed__desc { font-size: 0.875rem; color: var(--text-secondary); }
.feed__chev { color: var(--text-secondary); }
.feed__empty { margin: 0; color: var(--text-secondary); }

.block { padding-top: 56px; }
.block__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.block__title { font-size: 1.875rem; }
.block__more { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; }

@media (max-width: 900px) {
  .top { grid-template-columns: minmax(0, 1fr); }
}
</style>
