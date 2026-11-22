<script setup lang="ts">
// Portada: hero a pantalla completa con imagen de fondo, próximos eventos,
// accesos rápidos "¿Qué hacer?" y colecciones (todos llevan a /buscar con filtros).
// La búsqueda, las categorías y el listado completo están en /buscar.
import type { EventFilters } from '~/composables/useCatalog'

useHead({ title: 'Inicio' })
const session = useSessionStore()
// Cliente con sesión: inicio personal (saludo, su próxima entrada, novedades y lo más esperado) en vez del hero
const personal = computed(() => session.isLoggedIn && session.role === 'attendee')
const { home } = useAppConfig()

const upcomingFilters = ref<EventFilters>({ page: 1, limit: home.upcomingCount })
const { data: upcoming, error } = await useEvents(upcomingFilters, 'home-upcoming')
</script>

<template>
  <HomePersonalHome v-if="personal" />

  <!-- Hero a pantalla completa (sin sesión) -->
  <section v-else class="hero theme-fixed" aria-labelledby="hero-title">
    <img
      class="hero__img"
      :src="home.heroImage"
      alt=""
      fetchpriority="high"
      decoding="async"
    >
    <div class="hero__shade" aria-hidden="true" />

    <div class="container hero__content">
      <h1 id="hero-title" class="hero__title">
        {{ home.title.before }} <span class="hero__accent">{{ home.title.highlight }}</span>
        {{ home.title.middle }} <span class="hero__tag">{{ home.title.tag }}</span>
      </h1>

      <div class="hero__side">
        <p class="hero__lead">{{ home.lead }}</p>
        <div class="hero__ctas">
          <NuxtLink to="/buscar" class="btn btn--accent hero__btn">
            <Icon name="lucide:search" size="18" /> {{ home.ctaSearch }}
          </NuxtLink>
          <NuxtLink v-if="session.isLoggedIn" to="/mis-entradas" class="btn hero__btn hero__btn--light">
            <Icon name="lucide:ticket" size="18" /> {{ home.ctaTickets }}
          </NuxtLink>
          <NuxtLink v-else to="/registro" class="btn hero__btn hero__btn--light">
            <Icon name="lucide:user-plus" size="18" /> Crear cuenta
          </NuxtLink>
        </div>
      </div>
    </div>

    <a href="#upcoming" class="hero__scroll">
      {{ home.scrollHint }} <Icon name="lucide:chevron-down" size="18" />
    </a>

    <p class="hero__credit">
      Foto: <a :href="home.heroCredit.url" target="_blank" rel="noopener">{{ home.heroCredit.name }}</a> / Unsplash
    </p>
  </section>

  <!-- Próximos eventos (sin cambios) -->
  <section
    v-if="!error && upcoming?.items.length"
    id="upcoming"
    class="container block"
    aria-labelledby="upcoming-title"
  >
    <div class="block__head">
      <h2 id="upcoming-title" class="block__title">{{ home.upcomingTitle }}</h2>
      <NuxtLink to="/buscar" class="block__more">
        {{ home.seeAllLabel }} <Icon name="lucide:arrow-right" size="16" />
      </NuxtLink>
    </div>
    <div class="grid">
      <EventCard v-for="ev in upcoming.items" :key="ev._id" :event="ev" />
    </div>
  </section>

  <!-- ¿Qué hacer? accesos rápidos a /buscar con filtros -->
  <section class="container block" aria-labelledby="quick-title">
    <div class="block__head">
      <h2 id="quick-title" class="block__title">{{ home.quickTitle }}</h2>
    </div>
    <LinkTiles :items="home.quickLinks" />
  </section>

  <!-- Colecciones: grupos de eventos con un tema -->
  <section class="container block" aria-labelledby="collections-title">
    <div class="block__head">
      <h2 id="collections-title" class="block__title">{{ home.collectionsTitle }}</h2>
    </div>
    <LinkTiles :items="home.collections" />
  </section>
</template>

<style scoped>
/* ---------- Hero ---------- */
.hero {
  position: relative;
  min-height: 100svh;               /* ocupa toda la pantalla */
  display: flex; align-items: flex-end;
  padding: 120px 0 96px;             /* espacio para el encabezado y la flecha */
  background: var(--color-ink);      /* color de respaldo si la imagen no carga */
  color: var(--color-sand);
  overflow: hidden;
  isolation: isolate;
}
.hero__img {
  position: absolute; inset: 0; z-index: -2;
  width: 100%; height: 100%; object-fit: cover; object-position: center 30%;
}
/* Capa oscura para que el texto se lea bien sobre la foto */
.hero__shade {
  position: absolute; inset: 0; z-index: -1;
  background:
    linear-gradient(180deg, rgba(31, 42, 36, 0.55) 0%, rgba(31, 42, 36, 0.15) 35%, rgba(31, 42, 36, 0.92) 100%),
    linear-gradient(90deg, rgba(122, 15, 58, 0.35) 0%, rgba(122, 15, 58, 0) 60%);
}

.hero__content {
  width: 100%;
  display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 440px), 1fr));
  gap: 32px 56px; align-items: end;
}
.hero__title {
  font-size: clamp(3rem, 8vw, 6.5rem); line-height: 0.92; letter-spacing: -0.045em;
  color: var(--color-sand); text-wrap: balance;
}
.hero__accent { color: var(--color-peach); }
.hero__tag {
  display: inline-block; background: var(--color-peach); color: var(--color-ink);
  padding: 0 14px; border-radius: 16px; transform: rotate(-2deg);
}

.hero__side { display: flex; flex-direction: column; gap: 22px; max-width: 520px; }
.hero__lead { margin: 0; font-size: clamp(1.0625rem, 1.6vw, 1.25rem); line-height: 1.55; color: #E9E2D6; }
.hero__ctas { display: flex; flex-wrap: wrap; gap: 12px; }
.hero__btn { min-height: 54px; padding: 0 26px; font-size: 1rem; }
.hero__btn--light { background: rgba(247, 241, 232, 0.1); color: var(--color-sand); border-color: rgba(247, 241, 232, 0.7); backdrop-filter: blur(6px); }
.hero__btn--light:hover { background: var(--color-sand); color: var(--color-ink); }

.hero__scroll {
  position: absolute; left: 50%; bottom: 28px; transform: translateX(-50%);
  display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0 12px;
  color: var(--color-sand); text-decoration: none; font-size: 0.875rem; font-weight: 500;
}
.hero__scroll:hover { color: var(--color-peach); }
.hero__scroll .iconify, .hero__scroll svg { animation: nudge 1.6s ease-in-out infinite; }
@keyframes nudge { 50% { transform: translateY(4px); } }

.hero__credit { position: absolute; left: 16px; bottom: 10px; margin: 0; font-size: 0.6875rem; color: rgba(247, 241, 232, 0.7); }
.hero__credit a { color: inherit; }

@media (max-width: 640px) {
  .hero { padding: 104px 0 88px; }
  .hero__credit { left: 16px; bottom: 4px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero__scroll .iconify, .hero__scroll svg { animation: none; }
}

/* ---------- Próximos eventos ---------- */
.block { padding-top: 56px; scroll-margin-top: 16px; }
.block__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: baseline; gap: 12px; margin-bottom: 20px; }
.block__title { font-size: 1.875rem; }
.block__more { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }

.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 260px), 1fr)); gap: 20px; }
</style>
