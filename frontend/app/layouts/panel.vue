<script setup lang="ts">
// Layout de panel: menú lateral oscuro + contenido.
// Lo usan las páginas del organizador y del administrador.
// Cada página elige su menú con: definePageMeta({ layout: 'panel', panel: 'organizer' | 'admin' })

type NavItem = { to: string, label: string, icon: string }

const route = useRoute()
const menuOpen = ref(false)
watch(() => route.fullPath, () => { menuOpen.value = false })

const menus: Record<'organizer' | 'admin', NavItem[]> = {
  organizer: [
    { to: '/organizador', label: 'Resumen', icon: 'lucide:layout-dashboard' },
    { to: '/organizador/eventos', label: 'Mis eventos', icon: 'lucide:calendar-days' },
    { to: '/organizador/reservaciones', label: 'Reservaciones', icon: 'lucide:ticket' },
    { to: '/organizador/validar', label: 'Validar entradas', icon: 'lucide:scan-line' },
  ],
  admin: [
    { to: '/admin', label: 'Resumen', icon: 'lucide:layout-dashboard' },
    { to: '/admin/usuarios', label: 'Usuarios', icon: 'lucide:users' },
    { to: '/admin/eventos', label: 'Eventos', icon: 'lucide:calendar-days' },
    { to: '/admin/reservaciones', label: 'Reservaciones', icon: 'lucide:ticket' },
    { to: '/admin/categorias', label: 'Categorías', icon: 'lucide:tags' },
    { to: '/admin/moderacion', label: 'Moderación', icon: 'lucide:shield-check' },
  ],
}

const items = computed(() => menus[(route.meta.panel as 'organizer' | 'admin') ?? 'organizer'])
</script>

<template>
  <div class="panel">
    <aside class="panel-side theme-fixed">
      <div class="panel-side__top">
        <AppLogo variant="light" />
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

      <nav id="panel-nav" class="panel-nav" :class="{ 'is-open': menuOpen }" aria-label="Panel">
        <NuxtLink
          v-for="item in items"
          :key="item.to"
          :to="item.to"
          class="panel-nav__link"
          exact-active-class="is-active"
        >
          <Icon :name="item.icon" size="18" />
          {{ item.label }}
        </NuxtLink>
        <NuxtLink to="/" class="panel-nav__link panel-nav__back">
          <Icon name="lucide:arrow-left" size="18" />
          Volver al sitio
        </NuxtLink>
      </nav>
    </aside>

    <main class="panel-main">
      <slot />
    </main>
  </div>
</template>

<style scoped>
.panel { min-height: 100vh; display: flex; flex-wrap: wrap; }

.panel-side {
  flex: 1 1 240px; max-width: 260px;
  background: var(--color-ink); color: var(--color-sand);
  padding: 24px 16px; display: flex; flex-direction: column; gap: 24px;
}
.panel-side__top { display: flex; align-items: center; justify-content: space-between; padding: 0 8px; }
.panel-side__toggle {
  display: none; background: transparent; border: 0; color: var(--color-sand);
  width: 44px; height: 44px; border-radius: var(--radius-sm); cursor: pointer;
  align-items: center; justify-content: center;
}

.panel-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.panel-nav__link {
  display: flex; align-items: center; gap: 10px;
  min-height: 44px; padding: 0 14px; border-radius: 12px;
  color: var(--text-on-dark-muted); text-decoration: none; font-weight: 500; font-size: 0.9375rem;
}
.panel-nav__link:hover { background: var(--surface-dark-2); color: var(--color-sand); }
.panel-nav__link.is-active { background: var(--color-sand); color: var(--color-ink); }
.panel-nav__back { margin-top: auto; }

.panel-main { flex: 999 1 560px; min-width: 0; padding: 32px 40px 48px; }

/* Móvil: el menú lateral pasa arriba y se despliega */
@media (max-width: 860px) {
  .panel-side { max-width: none; flex-basis: 100%; padding: 14px 16px; gap: 8px; }
  .panel-side__toggle { display: inline-flex; }
  .panel-nav { display: none; }
  .panel-nav.is-open { display: flex; }
  .panel-main { padding: 24px 20px 40px; }
}
</style>
