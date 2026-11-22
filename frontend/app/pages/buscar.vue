<script setup lang="ts">
// Página "Buscar": búsqueda y listado completo de eventos con filtros.
// Todos los filtros viven en la URL, por ejemplo:
//   /buscar?q=jazz&categoria=conciertos&fecha=fin-de-semana&precio=gratis&lugar=...&pagina=2
// así se pueden compartir y el botón "atrás" del navegador funciona.
import type { EventFilters } from '~/composables/useCatalog'

const route = useRoute()
const router = useRouter()
const { searchPage: text } = useAppConfig()

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

// Filtros tal como están en la URL (en español)
const urlFilters = computed(() => ({
  q: str(route.query.q),
  categoria: str(route.query.categoria),
  fecha: isDateRangeKey(route.query.fecha) ? route.query.fecha : undefined,
  precio: route.query.precio === 'gratis' || route.query.precio === 'pago' ? route.query.precio : undefined,
  lugar: str(route.query.lugar),
  pagina: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
}))

// Filtros traducidos al formato de la API
const filters = computed<EventFilters>(() => {
  const u = urlFilters.value
  const range = dateRange(u.fecha)
  return {
    q: u.q,
    category: u.categoria,
    from: range?.from,
    to: range?.to,
    price: u.precio === 'gratis' ? 'free' : u.precio === 'pago' ? 'paid' : undefined,
    location: u.lugar,
    page: u.pagina,
    limit: text.perPage,
  }
})

const { data: categories } = await useCategories()
const { data: locations } = await useLocations()
const { data: result, status, error, refresh } = await useEvents(filters, 'events-search')

// El texto del buscador sigue a la URL (por ejemplo al usar "atrás")
const searchText = ref(urlFilters.value.q ?? '')
watch(() => urlFilters.value.q, (q) => { searchText.value = q ?? '' })

const activeCategory = computed(() => categories.value?.find(c => c.slug === urlFilters.value.categoria))
const totalPages = computed(() => (result.value ? Math.max(1, Math.ceil(result.value.total / result.value.limit)) : 1))
const hasFilters = computed(() => {
  const u = urlFilters.value
  return Boolean(u.q || u.categoria || u.fecha || u.precio || u.lugar)
})

const heading = computed(() => {
  const u = urlFilters.value
  if (u.q) return `Resultados para «${result.value?.didYouMean ?? u.q}»`
  if (activeCategory.value) return activeCategory.value.name
  if (u.lugar) return `Eventos en ${u.lugar.split(',')[0]}`
  if (u.fecha) return dateRangeOptions.find(o => o.value === u.fecha)?.label ?? text.title
  if (u.precio === 'gratis') return 'Eventos gratis'
  return text.title
})
useHead({ title: () => heading.value })

type UrlChanges = Partial<Record<'q' | 'categoria' | 'fecha' | 'precio' | 'lugar', string | undefined>> & { pagina?: number }

/** Cambia filtros en la URL. Cualquier cambio que no sea de página vuelve a la página 1. */
function setQuery(changes: UrlChanges) {
  const { pagina: _ignored, ...current } = urlFilters.value
  const next = { ...current, pagina: undefined as number | undefined, ...changes }
  router.push({
    query: {
      q: next.q || undefined,
      categoria: next.categoria || undefined,
      fecha: next.fecha || undefined,
      precio: next.precio || undefined,
      lugar: next.lugar || undefined,
      pagina: next.pagina && next.pagina > 1 ? String(next.pagina) : undefined,
    },
  })
}

function onSelect(key: 'fecha' | 'precio' | 'lugar', e: Event) {
  setQuery({ [key]: (e.target as HTMLSelectElement).value || undefined })
}

const resultsTop = ref<HTMLElement | null>(null)
function goToPage(page: number) {
  setQuery({ pagina: page })
  resultsTop.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <section class="container search-head">
    <h1>{{ heading }}</h1>
    <form class="search" role="search" @submit.prevent="setQuery({ q: searchText.trim() })">
      <Icon name="lucide:search" size="20" class="search__icon" />
      <label for="search" class="sr-only">Buscar eventos</label>
      <input id="search" v-model="searchText" type="search" :placeholder="text.searchPlaceholder">
      <button type="submit" class="btn btn--primary">Buscar</button>
    </form>

    <!-- Filtros: fecha, precio y lugar -->
    <div class="filters" role="group" aria-label="Filtros">
      <label class="filter">
        <span class="filter__label"><Icon name="lucide:calendar" size="16" /> Fecha</span>
        <select :value="urlFilters.fecha ?? ''" @change="onSelect('fecha', $event)">
          <option v-for="o in dateRangeOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
        </select>
      </label>

      <label class="filter">
        <span class="filter__label"><Icon name="lucide:wallet" size="16" /> Precio</span>
        <select :value="urlFilters.precio ?? ''" @change="onSelect('precio', $event)">
          <option value="">Cualquier precio</option>
          <option value="gratis">Gratis</option>
          <option value="pago">De pago</option>
        </select>
      </label>

      <label class="filter filter--wide">
        <span class="filter__label"><Icon name="lucide:map-pin" size="16" /> Lugar</span>
        <select :value="urlFilters.lugar ?? ''" @change="onSelect('lugar', $event)">
          <option value="">Todos los lugares</option>
          <option v-for="l in locations" :key="l.name" :value="l.name">{{ l.name }} ({{ l.count }})</option>
        </select>
      </label>

      <button v-if="hasFilters" type="button" class="btn btn--ghost filters__clear" @click="router.push({ query: {} })">
        <Icon name="lucide:x" size="16" /> Limpiar filtros
      </button>
    </div>

    <div class="chips" role="group" aria-label="Filtrar por categoría">
      <button
        class="chip"
        :class="{ 'is-active': !urlFilters.categoria }"
        :aria-pressed="!urlFilters.categoria"
        @click="setQuery({ categoria: undefined })"
      >
        {{ text.allCategoriesLabel }}
      </button>
      <button
        v-for="c in categories"
        :key="c._id"
        class="chip"
        :class="{ 'is-active': urlFilters.categoria === c.slug }"
        :aria-pressed="urlFilters.categoria === c.slug"
        @click="setQuery({ categoria: c.slug })"
      >
        {{ c.name }}
      </button>
    </div>
  </section>

  <section ref="resultsTop" class="container results" aria-live="polite">
    <!-- ¿Quisiste decir...? -->
    <div v-if="result?.didYouMean" class="suggest">
      <Icon name="lucide:sparkles" size="20" />
      <p>
        No encontramos «{{ urlFilters.q }}». ¿Quisiste decir
        <button class="suggest__link" @click="setQuery({ q: result.didYouMean! })">{{ result.didYouMean }}</button>?
        Te mostramos esos resultados.
      </p>
    </div>

    <p v-if="result && result.total > 0" class="results__count">
      {{ result.total }} {{ result.total === 1 ? 'evento' : 'eventos' }}
    </p>

    <p v-if="status === 'pending' && !result" class="state">Buscando eventos…</p>

    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar los eventos. Revisá tu conexión e intentá de nuevo.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="state">
      <Icon name="lucide:search-x" size="40" />
      <p>{{ text.emptyText }}</p>
      <button class="btn btn--outline" @click="router.push({ query: {} })">{{ text.resetLabel }}</button>
    </div>

    <template v-else-if="result">
      <div class="grid" :class="{ 'is-loading': status === 'pending' }">
        <EventCard v-for="ev in result.items" :key="ev._id" :event="ev" />
      </div>

      <nav v-if="totalPages > 1" class="pager" aria-label="Paginación">
        <button class="pager__btn" :disabled="urlFilters.pagina <= 1" aria-label="Página anterior" @click="goToPage(urlFilters.pagina - 1)">
          <Icon name="lucide:chevron-left" size="18" />
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          class="pager__btn"
          :class="{ 'is-active': p === urlFilters.pagina }"
          :aria-current="p === urlFilters.pagina ? 'page' : undefined"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button class="pager__btn" :disabled="urlFilters.pagina >= totalPages" aria-label="Página siguiente" @click="goToPage(urlFilters.pagina + 1)">
          <Icon name="lucide:chevron-right" size="18" />
        </button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.search-head { padding-top: 40px; }
.search-head h1 { font-size: clamp(2.25rem, 5vw, 3.5rem); letter-spacing: -0.04em; margin-bottom: 20px; }

.search {
  display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 16px; max-width: 720px;
  background: var(--color-white); border: 1.5px solid var(--color-ink); border-radius: 20px;
}
.search__icon { color: var(--text-secondary); flex-shrink: 0; }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; padding: 10px 4px; font: 1rem var(--font-body); color: var(--color-ink); }

.filters { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 12px; margin-top: 20px; }
.filter { display: flex; flex-direction: column; gap: 6px; flex: 1 1 180px; max-width: 240px; }
.filter--wide { flex-basis: 280px; max-width: 360px; }
.filter__label { display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
.filter select {
  min-height: 44px; padding: 0 36px 0 14px; border-radius: var(--radius-md);
  border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink);
  font: 500 0.9375rem var(--font-body); cursor: pointer; appearance: none;
  background-image: linear-gradient(45deg, transparent 50%, currentColor 50%), linear-gradient(135deg, currentColor 50%, transparent 50%);
  background-position: calc(100% - 18px) 50%, calc(100% - 13px) 50%;
  background-size: 5px 5px; background-repeat: no-repeat;
}
.filter select:hover { border-color: var(--color-forest); }
.filters__clear { min-height: 44px; }

.chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 16px; }
.chip {
  min-height: 44px; padding: 0 18px; border-radius: var(--radius-pill); cursor: pointer;
  background: var(--color-white); border: 1.5px solid var(--border); color: var(--color-ink); font: 500 0.875rem var(--font-body);
}
.chip:hover { border-color: var(--color-forest); }
.chip.is-active { background: var(--color-forest); border-color: var(--color-forest); color: var(--color-white); }

.results { padding-top: 28px; scroll-margin-top: 16px; }
.results__count { color: var(--text-secondary); font-size: 0.875rem; margin: 0 0 16px; }

.suggest {
  display: flex; align-items: flex-start; gap: 10px; padding: 14px 18px; margin-bottom: 20px;
  background: var(--tint-peach); color: var(--tint-peach-text); border-radius: var(--radius-md);
}
.suggest p { margin: 0; }
.suggest__link { background: none; border: 0; padding: 0; cursor: pointer; font: inherit; font-weight: 700; color: var(--color-raspberry-dark); text-decoration: underline; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; transition: opacity .15s; }
.grid.is-loading { opacity: 0.5; }

.state { padding: 48px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.pager { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 36px; }
.pager__btn {
  min-width: 44px; height: 44px; border-radius: 12px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: transparent; color: var(--color-ink); font: 500 0.9375rem var(--font-body);
}
.pager__btn:hover:not(:disabled) { border-color: var(--color-ink); }
.pager__btn.is-active { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-sand); }
.pager__btn:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 560px) {
  .filter, .filter--wide { max-width: none; flex-basis: 100%; }
}
</style>
