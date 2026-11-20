<script setup lang="ts">
// Página de búsqueda y listado completo de eventos.
// Los filtros viven en la URL (/eventos?q=jazz&categoria=conciertos&pagina=2),
// así se pueden compartir y el botón "atrás" del navegador funciona.
import type { EventFilters } from '~/composables/useCatalog'

const route = useRoute()
const router = useRouter()
const { eventsPage: text } = useAppConfig()

const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined)

const filters = computed<EventFilters>(() => ({
  q: str(route.query.q),
  category: str(route.query.categoria),
  page: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
  limit: text.perPage,
}))

const { data: categories } = await useCategories()
const { data: result, status, error, refresh } = await useEvents(filters, 'events-search')

// El texto del buscador sigue a la URL (por ejemplo al usar "atrás")
const searchText = ref(filters.value.q ?? '')
watch(() => filters.value.q, (q) => { searchText.value = q ?? '' })

const activeCategory = computed(() => categories.value?.find(c => c.slug === filters.value.category))
const totalPages = computed(() => (result.value ? Math.max(1, Math.ceil(result.value.total / result.value.limit)) : 1))

const heading = computed(() => {
  if (filters.value.q) return `Resultados para «${result.value?.didYouMean ?? filters.value.q}»`
  if (activeCategory.value) return activeCategory.value.name
  return text.title
})
useHead({ title: () => heading.value })

/** Cambia los filtros en la URL. Cualquier cambio que no sea de página vuelve a la página 1. */
function setQuery(changes: { q?: string, categoria?: string, pagina?: number }) {
  const next = { q: filters.value.q, categoria: filters.value.category, pagina: undefined as number | undefined, ...changes }
  router.push({
    query: {
      q: next.q || undefined,
      categoria: next.categoria || undefined,
      pagina: next.pagina && next.pagina > 1 ? String(next.pagina) : undefined,
    },
  })
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

    <div class="chips" role="group" aria-label="Filtrar por categoría">
      <button
        class="chip"
        :class="{ 'is-active': !filters.category }"
        :aria-pressed="!filters.category"
        @click="setQuery({ categoria: undefined })"
      >
        {{ text.allCategoriesLabel }}
      </button>
      <button
        v-for="c in categories"
        :key="c._id"
        class="chip"
        :class="{ 'is-active': filters.category === c.slug }"
        :aria-pressed="filters.category === c.slug"
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
        No encontramos «{{ filters.q }}». ¿Quisiste decir
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
        <button class="pager__btn" :disabled="filters.page <= 1" aria-label="Página anterior" @click="goToPage(filters.page - 1)">
          <Icon name="lucide:chevron-left" size="18" />
        </button>
        <button
          v-for="p in totalPages"
          :key="p"
          class="pager__btn"
          :class="{ 'is-active': p === filters.page }"
          :aria-current="p === filters.page ? 'page' : undefined"
          @click="goToPage(p)"
        >
          {{ p }}
        </button>
        <button class="pager__btn" :disabled="filters.page >= totalPages" aria-label="Página siguiente" @click="goToPage(filters.page + 1)">
          <Icon name="lucide:chevron-right" size="18" />
        </button>
      </nav>
    </template>
  </section>
</template>

<style scoped>
.search-head { padding-top: 40px; }
.search-head h1 { font-size: clamp(36px, 5vw, 56px); letter-spacing: -0.04em; margin-bottom: 20px; }

.search {
  display: flex; align-items: center; gap: 8px; padding: 8px 8px 8px 16px; max-width: 720px;
  background: var(--color-white); border: 1.5px solid var(--color-ink); border-radius: 20px;
}
.search__icon { color: var(--text-secondary); flex-shrink: 0; }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; padding: 10px 4px; font: 16px var(--font-body); color: var(--color-ink); }

.chips { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 20px; }
.chip {
  min-height: 44px; padding: 0 18px; border-radius: var(--radius-pill); cursor: pointer;
  background: var(--color-white); border: 1.5px solid var(--border); color: var(--color-ink); font: 500 14px var(--font-body);
}
.chip:hover { border-color: var(--color-forest); }
.chip.is-active { background: var(--color-forest); border-color: var(--color-forest); color: var(--color-white); }

.results { padding-top: 28px; scroll-margin-top: 16px; }
.results__count { color: var(--text-secondary); font-size: 14px; margin: 0 0 16px; }

.suggest {
  display: flex; align-items: flex-start; gap: 10px; padding: 14px 18px; margin-bottom: 20px;
  background: var(--tint-peach); color: var(--tint-peach-text); border-radius: var(--radius-md);
}
.suggest p { margin: 0; }
.suggest__link {
  background: none; border: 0; padding: 0; cursor: pointer;
  font: inherit; font-weight: 700; color: var(--color-raspberry-dark); text-decoration: underline;
}

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; transition: opacity .15s; }
.grid.is-loading { opacity: 0.5; }

.state { padding: 48px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.pager { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 36px; }
.pager__btn {
  min-width: 44px; height: 44px; border-radius: 12px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: transparent; color: var(--color-ink); font: 500 15px var(--font-body);
}
.pager__btn:hover:not(:disabled) { border-color: var(--color-ink); }
.pager__btn.is-active { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-sand); }
.pager__btn:disabled { opacity: 0.4; cursor: default; }
</style>
