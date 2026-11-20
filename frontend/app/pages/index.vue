<script setup lang="ts">
// Portada: presentación, buscador, categorías y una vista previa de los próximos eventos.
// El listado completo y los filtros están en /eventos.
import type { EventFilters } from '~/composables/useCatalog'

useHead({ title: 'Inicio' })
const { home } = useAppConfig()

const searchText = ref('')
function search() {
  const q = searchText.value.trim()
  navigateTo({ path: '/eventos', query: q ? { q } : {} })
}

const upcomingFilters = ref<EventFilters>({ page: 1, limit: home.upcomingCount })
const { data: categories } = await useCategories()
const { data: upcoming, error } = await useEvents(upcomingFilters, 'home-upcoming')
</script>

<template>
  <section class="container hero">
    <h1 class="hero__title">
      {{ home.title.before }} <span class="hero__green">{{ home.title.highlight }}</span>
      {{ home.title.middle }} <span class="hero__tag">{{ home.title.tag }}</span>
    </h1>
    <div class="hero__side">
      <p class="hero__lead">{{ home.lead }}</p>
      <form class="search" role="search" @submit.prevent="search">
        <label for="home-search" class="sr-only">Buscar eventos</label>
        <input id="home-search" v-model="searchText" type="search" :placeholder="home.searchPlaceholder">
        <button type="submit" class="btn btn--primary">Buscar</button>
      </form>
    </div>
  </section>

  <section v-if="categories?.length" class="container block" aria-labelledby="cats-title">
    <h2 id="cats-title" class="block__title">{{ home.categoriesTitle }}</h2>
    <div class="cats">
      <NuxtLink
        v-for="c in categories"
        :key="c._id"
        :to="{ path: '/eventos', query: { categoria: c.slug } }"
        class="cat"
        :style="{ background: eventPoster(c.slug).bg, color: eventPoster(c.slug).ink }"
      >
        <span class="cat__name">{{ c.name }}</span>
        <Icon name="lucide:arrow-up-right" size="20" class="cat__arrow" />
      </NuxtLink>
    </div>
  </section>

  <section v-if="!error && upcoming?.items.length" class="container block" aria-labelledby="upcoming-title">
    <div class="block__head">
      <h2 id="upcoming-title" class="block__title">{{ home.upcomingTitle }}</h2>
      <NuxtLink to="/eventos" class="block__more">
        {{ home.seeAllLabel }} <Icon name="lucide:arrow-right" size="16" />
      </NuxtLink>
    </div>
    <div class="grid">
      <EventCard v-for="ev in upcoming.items" :key="ev._id" :event="ev" />
    </div>
  </section>
</template>

<style scoped>
.hero {
  padding-top: 56px; padding-bottom: 24px;
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
.search input { flex: 1 1 200px; border: 0; outline: none; background: transparent; padding: 10px 12px; font: 16px var(--font-body); color: var(--color-ink); }

.block { padding-top: 48px; }
.block__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.block__title { font-size: 30px; margin-bottom: 20px; }
.block__head .block__title { margin-bottom: 0; }
.block__more { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }

.cats { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 170px), 1fr)); gap: 12px; }
.cat {
  min-height: 96px; padding: 16px; border-radius: var(--radius-lg); text-decoration: none;
  display: flex; flex-direction: column; justify-content: space-between;
  transition: transform .15s;
}
.cat:hover { transform: translateY(-2px); }
.cat__name { font-family: var(--font-display); font-weight: 600; font-size: 19px; letter-spacing: -0.02em; }
.cat__arrow { align-self: flex-end; opacity: 0.8; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; }
</style>
