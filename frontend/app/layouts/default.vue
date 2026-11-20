<script setup lang="ts">
// Layout público: encabezado con navegación + pie de página.
// Lo usan el catálogo, el detalle del evento, login, registro y "mis entradas".
const menuOpen = ref(false)
const route = useRoute()

// Cierra el menú móvil al cambiar de página
watch(() => route.fullPath, () => { menuOpen.value = false })

// Menú y textos generales desde app.config.ts
const { nav: links, site } = useAppConfig()

// En la portada el encabezado va transparente encima de la imagen del hero
const isHome = computed(() => route.path === '/')
</script>

<template>
  <div class="site">
    <header class="site-header" :class="{ 'site-header--overlay': isHome }">
      <div class="container site-header__inner">
        <AppLogo :variant="isHome ? 'light' : 'dark'" />

        <button
          class="btn btn--ghost site-header__toggle"
          :aria-expanded="menuOpen"
          aria-controls="site-nav"
          aria-label="Abrir menú"
          @click="menuOpen = !menuOpen"
        >
          <Icon :name="menuOpen ? 'lucide:x' : 'lucide:menu'" size="22" />
        </button>

        <nav id="site-nav" class="site-nav" :class="{ 'is-open': menuOpen }" aria-label="Principal">
          <NuxtLink v-for="l in links" :key="l.to" :to="l.to" class="site-nav__link">
            {{ l.label }}
          </NuxtLink>
          <div class="site-nav__actions">
            <NuxtLink to="/login" class="btn btn--ghost btn--pill">Ingresar</NuxtLink>
            <NuxtLink to="/registro" class="btn btn--pill site-nav__cta">Crear cuenta</NuxtLink>
          </div>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">
      <div class="container site-footer__inner">
        <AppLogo variant="light" />
        <p>{{ site.footerNote }}</p>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.site { min-height: 100vh; display: flex; flex-direction: column; }
.site-main { flex: 1; }

.site-header__inner {
  display: flex; align-items: center; justify-content: space-between; gap: 16px;
  padding-top: 18px; padding-bottom: 18px;
}

.site-nav { display: flex; align-items: center; gap: 28px; }
.site-nav__link { color: var(--color-ink); text-decoration: none; font-weight: 500; font-size: 15px; }
.site-nav__link:hover { color: var(--color-forest); }
.site-nav__link.router-link-exact-active { color: var(--color-forest); }
.site-nav__actions { display: flex; gap: 8px; }
.site-nav__cta { background: var(--color-ink); color: var(--color-sand); }
.site-nav__cta:hover { background: var(--color-forest-dark); color: var(--color-white); }

.site-header__toggle { display: none; }

.site-footer { background: var(--color-ink); color: var(--text-on-dark-muted); margin-top: 64px; }
.site-footer__inner {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding-top: 28px; padding-bottom: 28px; font-size: 14px;
}
.site-footer p { margin: 0; }

/* Portada: encabezado transparente con texto claro sobre la imagen */
.site-header--overlay { position: absolute; top: 0; left: 0; right: 0; z-index: 10; }
.site-header--overlay .site-nav__link { color: var(--color-sand); }
.site-header--overlay .site-nav__link:hover,
.site-header--overlay .site-nav__link.router-link-exact-active { color: var(--color-peach); }
.site-header--overlay .btn--ghost { color: var(--color-sand); }
.site-header--overlay .btn--ghost:hover { background: rgba(247, 241, 232, 0.14); color: var(--color-sand); }
.site-header--overlay .site-nav__cta { background: var(--color-sand); color: var(--color-ink); }
.site-header--overlay .site-nav__cta:hover { background: var(--color-peach); color: var(--color-ink); }

/* Móvil: el menú se vuelve desplegable */
@media (max-width: 860px) {
  .site-header__inner { flex-wrap: wrap; }
  .site-header__toggle { display: inline-flex; }
  .site-nav {
    display: none; width: 100%;
    flex-direction: column; align-items: stretch; gap: 4px;
    padding: 8px 0 4px;
  }
  .site-nav.is-open { display: flex; }
  .site-nav__link { padding: 12px 4px; border-bottom: 1px solid var(--border); }
  .site-nav__actions { padding-top: 12px; }
  .site-nav__actions > * { flex: 1; }

  .site-header--overlay .site-nav.is-open { background: var(--color-ink); border-radius: 16px; padding: 8px 16px 16px; }
  .site-header--overlay .site-nav__link { border-bottom-color: rgba(247, 241, 232, 0.15); }
}
</style>
