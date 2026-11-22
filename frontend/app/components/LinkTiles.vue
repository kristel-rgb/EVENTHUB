<script setup lang="ts">
// Grupo de accesos pequeños que abren /buscar con filtros ya aplicados.
// Se usa en la portada para "¿Qué hacer?" y "Colecciones" con el mismo estilo.
defineProps<{
  items: { label: string, hint: string, icon: string, query: Record<string, string | undefined> }[]
}>()
</script>

<template>
  <ul class="tiles">
    <li v-for="item in items" :key="item.label">
      <NuxtLink :to="{ path: '/buscar', query: item.query }" class="tile">
        <span class="tile__icon" aria-hidden="true"><Icon :name="item.icon" size="20" /></span>
        <span class="tile__text">
          <span class="tile__label">{{ item.label }}</span>
          <span class="tile__hint">{{ item.hint }}</span>
        </span>
        <Icon name="lucide:arrow-right" size="18" class="tile__arrow" />
      </NuxtLink>
    </li>
  </ul>
</template>

<style scoped>
.tiles { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 220px), 1fr)); gap: 12px; }
.tile {
  height: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-md);
  color: var(--color-ink); text-decoration: none; transition: border-color 0.15s;
}
.tile:hover { border-color: var(--color-forest); color: var(--color-ink); }
.tile__icon {
  flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--tint-forest); color: var(--color-forest-dark);
}
.tile__text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
.tile__label { font-weight: 600; font-size: 0.9375rem; line-height: 1.3; }
.tile__hint { font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.35; }
.tile__arrow { flex-shrink: 0; color: var(--text-secondary); transition: transform 0.15s; }
.tile:hover .tile__arrow { transform: translateX(3px); color: var(--color-forest); }
</style>
