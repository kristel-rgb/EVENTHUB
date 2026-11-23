<script setup lang="ts">
// Layout público: encabezado con navegación + pie de página.
// Lo usan el catálogo, el detalle del evento, login, registro y "mis entradas".
const menuOpen = ref(false)
const route = useRoute()

// Cierra el menú móvil al cambiar de página
watch(() => route.fullPath, () => { menuOpen.value = false })

// Menú y textos generales desde app.config.ts
const { nav, site, footerLinks } = useAppConfig()
const session = useSessionStore()
const { logout } = useAuth()

// Cada tipo de usuario ve su menú:
//   sin cuenta → Inicio, Buscar · Ingresar, Crear cuenta
//   cliente → + Mis entradas · Perfil, Cerrar sesión
//   organización y super admin → + Organizar eventos
const links = computed(() => nav.filter(l =>
  !(session.role === 'organizer' && (l.to === '/' || l.to === '/mis-entradas'))
  && (l.show === 'all'
  || (l.show === 'user' && session.isLoggedIn)
  || (l.show === 'organizer' && canOrganize(session.role))),
))
const firstName = computed(() => session.user?.organizationName || session.user?.firstName || session.user?.username || '')
const loggingOut = ref(false)
async function onLogout() {
  loggingOut.value = true
  try { await logout() }
  finally { loggingOut.value = false }
}

// En la portada el encabezado va transparente encima de la imagen del hero
// (el cliente con sesión tiene un inicio personal con encabezado normal)
const isHome = computed(() => route.path === '/' && !(session.isLoggedIn && session.role === 'attendee'))
</script>

<template>
  <div class="site">
    <header class="site-header" :class="{ 'site-header--overlay theme-fixed': isHome }">
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
          <div v-if="session.isLoggedIn" class="site-nav__actions">
            <NuxtLink to="/perfil" class="btn btn--ghost btn--pill site-nav__me">
              <span class="site-nav__avatar" aria-hidden="true">{{ firstName.slice(0, 1).toUpperCase() }}</span>
              <span>Perfil</span>
            </NuxtLink>
            <button type="button" class="btn btn--pill site-nav__cta" :disabled="loggingOut" @click="onLogout">
              <Icon name="lucide:log-out" size="16" /> Cerrar sesión
            </button>
          </div>
          <div v-else class="site-nav__actions">
            <NuxtLink :to="{ path: '/login', query: route.path === '/' ? {} : { redirect: route.fullPath } }" class="btn btn--ghost btn--pill">Ingresar</NuxtLink>
            <NuxtLink to="/registro" class="btn btn--pill site-nav__cta">Crear cuenta</NuxtLink>
          </div>
        </nav>
      </div>
    </header>

    <main id="contenido" class="site-main" tabindex="-1">
      <slot />
    </main>

    <footer class="site-footer theme-fixed">
      <div class="container site-footer__inner">
        <AppLogo variant="light" />
        <nav class="site-footer__links" aria-label="Información legal">
          <NuxtLink v-for="l in footerLinks" :key="l.to" :to="l.to">{{ l.label }}</NuxtLink>
        </nav>
        <p>© {{ new Date().getFullYear() }} {{ site.name }} · {{ site.footerNote }}</p>
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
.site-nav__link { color: var(--color-ink); text-decoration: none; font-weight: 500; font-size: 0.9375rem; }
.site-nav__link:hover { color: var(--color-forest); }
.site-nav__link.router-link-exact-active { color: var(--color-forest); }
.site-nav__actions { display: flex; gap: 8px; }
.site-nav__cta { background: var(--color-ink); color: var(--color-sand); }
.site-nav__cta:hover { background: var(--color-forest-dark); color: var(--color-white); }

.site-header__toggle { display: none; }
.site-nav__me { gap: 8px; }
.site-nav__avatar {
  width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-peach); color: var(--on-peach); font-weight: 700; font-size: 0.8125rem;
}
.site-nav__cta:disabled { opacity: 0.6; cursor: progress; }

.site-footer { background: var(--color-ink); color: var(--text-on-dark-muted); margin-top: 64px; }
.site-footer__inner {
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px;
  padding-top: 28px; padding-bottom: 28px; font-size: 0.875rem;
}
.site-footer p { margin: 0; }
.site-footer__links { display: flex; flex-wrap: wrap; gap: 4px 20px; }
.site-footer__links a { color: var(--color-sand); text-decoration: none; display: inline-flex; align-items: center; min-height: 44px; }
.site-footer__links a:hover { color: var(--color-peach); text-decoration: underline; }

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
