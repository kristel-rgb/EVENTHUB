<script setup lang="ts">
// Layout de panel: menú lateral oscuro + contenido.
// Lo usan las páginas del organizador y del administrador.
// Cada página elige su menú con: definePageMeta({ layout: 'panel', panel: 'organizer' | 'admin' })

type NavItem = { to: string, label: string, icon: string }

const route = useRoute()
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })

const session = useSessionStore()
const { logout } = useAuth()

// Organizar eventos (Organización y Super Admin)
const organizerItems: NavItem[] = [
  { to: '/organizador', label: 'Resumen', icon: 'lucide:layout-dashboard' },
  { to: '/organizador/eventos', label: 'Mis eventos', icon: 'lucide:calendar-days' },
  { to: '/organizador/reservaciones', label: 'Reservaciones', icon: 'lucide:ticket' },
  { to: '/organizador/validar', label: 'Validar entradas', icon: 'lucide:scan-line' },
]
// Debajo, separado: el resto del sitio. La Organización solo tiene Buscar;
// el Super Admin además tiene Cuentas y permisos, Inicio y Mis entradas.
const siteItems = computed<NavItem[]>(() => session.role === 'admin'
  ? [
      { to: '/admin', label: 'Resumen general', icon: 'lucide:chart-pie' },
      { to: '/admin/cuentas', label: 'Cuentas y permisos', icon: 'lucide:user-cog' },
      { to: '/admin/categorias', label: 'Categorías', icon: 'lucide:tags' },
      { to: '/admin/moderacion', label: 'Moderación', icon: 'lucide:shield-check' },
      { to: '/', label: 'Inicio', icon: 'lucide:house' },
      { to: '/buscar', label: 'Buscar eventos', icon: 'lucide:search' },
      { to: '/mis-entradas', label: 'Mis entradas', icon: 'lucide:ticket-check' },
    ]
  : [{ to: '/buscar', label: 'Buscar eventos', icon: 'lucide:search' }])

const who = computed(() => session.user?.organizationName || session.user?.name || '')
</script>

<template>
  <div class="panel">
    <aside class="panel-side theme-fixed" aria-label="Menú del panel">
      <div class="panel-side__top">
        <AppLogo variant="light" class="panel-side__logo" />
        <button
          class="panel-side__toggle"
          :aria-expanded="menuOpen"
          aria-controls="panel-nav"
          aria-label="Abrir menú"
          @click="menuOpen = !menuOpen"
        >
          <Icon :name="menuOpen ? 'lucide:x' : 'lucide:menu'" size="22" />
        </button>
      </div>

      <!-- En computadora: solo íconos; el nombre aparece al pasar el mouse o con el teclado -->
      <nav id="panel-nav" class="panel-nav" :class="{ 'is-open': menuOpen }" aria-label="Panel">
        <NuxtLink
          v-for="item in organizerItems"
          :key="item.to"
          :to="item.to"
          class="panel-nav__link"
          exact-active-class="is-active"
        >
          <Icon :name="item.icon" size="22" />
          <span class="panel-nav__label">{{ item.label }}</span>
        </NuxtLink>
        <span class="panel-nav__sep" role="separator" aria-hidden="true" />
        <NuxtLink
          v-for="item in siteItems"
          :key="item.to"
          :to="item.to"
          class="panel-nav__link"
          exact-active-class="is-active"
        >
          <Icon :name="item.icon" size="22" />
          <span class="panel-nav__label">{{ item.label }}</span>
        </NuxtLink>
        <NuxtLink to="/perfil" class="panel-nav__link panel-nav__me">
          <span class="panel-nav__avatar" aria-hidden="true">{{ who.slice(0, 1).toUpperCase() }}</span>
          <span class="panel-nav__label">Perfil · {{ who }} ({{ session.role ? roleLabel[session.role] : '' }})</span>
        </NuxtLink>
        <button type="button" class="panel-nav__link panel-nav__logout" @click="logout">
          <Icon name="lucide:log-out" size="22" />
          <span class="panel-nav__label">Cerrar sesión</span>
        </button>
      </nav>
    </aside>

    <main id="contenido" class="panel-main" tabindex="-1">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.panel { min-height: 100vh; display: flex; flex-wrap: wrap; }

/* ---------- Computadora: barra angosta de íconos ---------- */
.panel-side {
  flex: 0 0 84px; position: sticky; top: 0; height: 100vh; z-index: 5;
  background: var(--color-ink); color: var(--color-sand);
  padding: 18px 12px; display: flex; flex-direction: column; align-items: center; gap: 24px;
}
.panel-side__top { display: flex; align-items: center; justify-content: center; }
.panel-side__logo :deep(.logo__text) { display: none; }
.panel-side__toggle {
  display: none; background: transparent; border: 0; color: var(--color-sand);
  width: 44px; height: 44px; border-radius: var(--radius-sm); cursor: pointer;
  align-items: center; justify-content: center;
}

.panel-nav { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 1; width: 100%; }
.panel-nav__link {
  position: relative; width: 52px; height: 52px; border-radius: 14px;
  display: flex; align-items: center; justify-content: center;
  color: var(--text-on-dark-muted); text-decoration: none;
}
.panel-nav__link:hover { background: var(--surface-dark-2); color: var(--color-sand); }
.panel-nav__link.is-active { background: var(--color-sand); color: var(--color-ink); }
.panel-nav__me { margin-top: auto; }
.panel-nav__sep { width: 32px; height: 1px; background: var(--surface-dark-2); margin: 6px 0; flex-shrink: 0; }
.panel-nav__logout { border: 0; background: transparent; cursor: pointer; font: inherit; }
.panel-nav__avatar {
  width: 34px; height: 34px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-peach); color: #1F2A24; font-weight: 700; font-size: 0.875rem;
}

/* Etiqueta tipo globo a la derecha del ícono */
.panel-nav__label {
  position: absolute; left: calc(100% + 12px); top: 50%; transform: translateY(-50%);
  white-space: nowrap; padding: 6px 10px; border-radius: 8px;
  background: var(--color-ink); color: var(--color-sand); border: 1px solid var(--surface-dark-2);
  font-size: 0.8125rem; font-weight: 600; pointer-events: none;
  opacity: 0; transition: opacity .12s; /* invisible pero legible para lectores de pantalla */
}
.panel-nav__link:hover .panel-nav__label,
.panel-nav__link:focus-visible .panel-nav__label { opacity: 1; }

/* Pantallas bajas: la barra del Super Admin tiene muchos íconos, se achican para que entren */
@media (min-width: 861px) and (max-height: 860px) {
  .panel-side { gap: 12px; padding-top: 12px; padding-bottom: 12px; }
  .panel-nav { gap: 3px; }
  .panel-nav__link { width: 44px; height: 44px; }
  .panel-nav__sep { margin: 3px 0; }
}
.panel-main { flex: 1 1 0; min-width: 0; padding: 28px 36px 48px; }
/* Páginas públicas que la Organización abre dentro del panel (Buscar, detalle, Perfil): sin doble margen */
.panel-main :deep(.container) { padding-left: 0; padding-right: 0; }

/* ---------- Celular: barra arriba con menú desplegable y nombres visibles ---------- */
@media (max-width: 860px) {
  .panel-side {
    flex-basis: 100%; position: static; height: auto;
    flex-direction: column; align-items: stretch; padding: 12px 16px; gap: 8px;
  }
  .panel-side__top { justify-content: space-between; }
  .panel-side__logo :deep(.logo__text) { display: inline; }
  .panel-side__toggle { display: inline-flex; }
  .panel-nav { display: none; align-items: stretch; }
  .panel-nav.is-open { display: flex; }
  .panel-nav__link { width: auto; height: 48px; justify-content: flex-start; gap: 12px; padding: 0 14px; }
  .panel-nav__label { position: static; transform: none; opacity: 1; background: none; border: 0; padding: 0; font-size: 0.9375rem; font-weight: 500; color: inherit; }
  .panel-nav__sep { width: 100%; }
  .panel-nav__me { margin-top: 8px; }
  .panel-main { padding: 24px 18px 40px; }
}
</style>
