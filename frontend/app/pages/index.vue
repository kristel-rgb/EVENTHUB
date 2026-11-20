<script setup lang="ts">
import type { EventFilters } from '~/composables/useCatalog'

// Catálogo público (tarea F03). Todos los datos vienen de la API:
// GET /categories y GET /events con búsqueda, categoría y paginación.
useHead({ title: 'Explorar eventos' })
const { home } = useAppConfig()

const searchText = ref('')
// Permite llegar filtrado por categoría, por ejemplo desde el detalle: /?categoria=musica
const route = useRoute()
const initialCategory = typeof route.query.categoria === 'string' ? route.query.categoria : undefined
const filters = ref<EventFilters>({ page: 1, limit: 8, category: initialCategory })

const { data: categories } = await useCategories()
const { data: result, status, error, refresh } = await useEvents(filters)

const totalPages = computed(() =>
  result.value ? Math.max(1, Math.ceil(result.value.total / result.value.limit)) : 1,
)

function applySearch() {
  filters.value = { ...filters.value, q: searchText.value.trim() || undefined, page: 1 }
}
function pickCategory(slug?: string) {
  filters.value = { ...filters.value, category: slug, page: 1 }
}
function goToPage(page: number) {
  filters.value = { ...filters.value, page }
}
</script>

<template>
  <section class="container hero">
    <h1 class="hero__title">
      {{ home.title.before }} <span class="hero__green">{{ home.title.highlight }}</span>
      {{ home.title.middle }} <span class="hero__tag">{{ home.title.tag }}</span>
    </h1>
    <div class="hero__side">
      <p class="hero__lead">{{ home.lead }}</p>
      <form class="search" role="search" @submit.prevent="applySearch">
        <label for="search" class="sr-only">Buscar eventos</label>
        <input id="search" v-model="searchText" type="search" :placeholder="home.searchPlaceholder">
        <button type="submit" class="btn btn--primary">Buscar</button>
      </form>
    </div>
  </section>

  <section class="container" aria-label="Filtros por categoría">
    <div class="chips">
      <button
        class="chip"
        :class="{ 'is-active': !filters.category }"
        :aria-pressed="!filters.category"
        @click="pickCategory(undefined)"
      >
        Todos
      </button>
      <button
        v-for="c in categories"
        :key="c._id"
        class="chip"
        :class="{ 'is-active': filters.category === c.slug }"
        :aria-pressed="filters.category === c.slug"
        @click="pickCategory(c.slug)"
      >
        {{ c.name }}
      </button>
    </div>
  </section>

  <section class="container events" aria-labelledby="events-title">
    <div class="events__head">
      <h2 id="events-title">{{ home.eventsTitle }}</h2>
      <p v-if="result" class="events__count">{{ result.total }} resultados</p>
    </div>

    <p v-if="status === 'pending' && !result" class="state">Cargando eventos…</p>

    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar los eventos. Revisá tu conexión e intentá de nuevo.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>

    <div v-else-if="result && result.items.length === 0" class="state">
      <p>No encontramos eventos con esos filtros.</p>
      <button class="btn btn--ghost" @click="searchText = ''; filters = { page: 1, limit: 8 }">Ver todos</button>
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
.hero {
  padding-top: 48px; padding-bottom: 32px;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr)); gap: 40px; align-items: end;
}
.hero__title { font-size: clamp(44px, 7vw, 88px); line-height: 0.95; letter-spacing: -0.045em; }
.hero__green { color: var(--color-forest); }
.hero__tag { display: inline-block; background: var(--color-peach); padding: 0 12px; border-radius: 14px; transform: rotate(-2deg); }
.hero__side { display: flex; flex-direction: column; gap: 16px; }
.hero__lead { font-size: 18px; color: var(--text-secondary); margin: 0; }

.search {
  display: flex; flex-wrap: wrap; gap: 8px; padding: 8px;
  background: var(--color-white); border: 1.5px solid var(--color-ink); border-radius: 20px;
}
.search input {
  flex: 1 1 200px; border: 0; outline: none; background: transparent;
  padding: 10px 12px; font: 16px var(--font-body); color: var(--color-ink);
}

.chips { display: flex; flex-wrap: wrap; gap: 10px; padding-bottom: 8px; }
.chip {
  min-height: 44px; padding: 0 18px; border-radius: var(--radius-pill); cursor: pointer;
  background: var(--color-white); border: 1.5px solid var(--border); color: var(--color-ink);
  font: 500 14px var(--font-body);
}
.chip:hover { border-color: var(--color-forest); }
.chip.is-active { background: var(--color-forest); border-color: var(--color-forest); color: var(--color-white); }

.events { padding-top: 32px; }
.events__head { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 20px; }
.events__head h2 { font-size: 30px; }
.events__count { margin: 0; color: var(--text-secondary); font-size: 14px; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; transition: opacity .15s; }
.grid.is-loading { opacity: 0.5; }

.state { padding: 40px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.pager { display: flex; justify-content: center; gap: 8px; margin-top: 36px; }
.pager__btn {
  min-width: 44px; height: 44px; border-radius: 12px; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid var(--border); background: transparent; color: var(--color-ink); font: 500 15px var(--font-body);
}
.pager__btn:hover:not(:disabled) { border-color: var(--color-ink); }
.pager__btn.is-active { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-sand); }
.pager__btn:disabled { opacity: 0.4; cursor: default; }
</style>
