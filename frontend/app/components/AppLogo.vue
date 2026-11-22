<script setup lang="ts">
// variant "dark": logo sobre fondo claro · "light": logo sobre fondo oscuro
withDefaults(defineProps<{ variant?: 'dark' | 'light' }>(), { variant: 'dark' })
</script>

<template>
  <NuxtLink to="/" class="logo" :class="`logo--${variant}`">
    <span class="logo__mark" aria-hidden="true">
      <Icon name="lucide:ticket" size="18" />
    </span>
    <span class="logo__text">eventhub</span>
  </NuxtLink>
</template>

<style scoped>
.logo { display: inline-flex; align-items: center; gap: 10px; text-decoration: none; }
.logo__mark {
  width: 34px; height: 34px; border-radius: var(--radius-sm);
  display: flex; align-items: center; justify-content: center;
}
.logo__text { font-family: var(--font-display); font-weight: 700; font-size: 1.375rem; letter-spacing: -0.02em; }

.logo--dark { color: var(--color-ink); }
.logo--dark .logo__mark { background: var(--color-ink); color: var(--color-peach); }

.logo--light { color: var(--color-sand); }
.logo--light .logo__mark { background: var(--color-peach); color: var(--color-ink); }
</style>
