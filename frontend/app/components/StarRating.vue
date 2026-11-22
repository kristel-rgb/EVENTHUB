<script setup lang="ts">
// Estrellas de solo lectura (con texto para lectores de pantalla)
const props = withDefaults(defineProps<{ value: number, size?: number }>(), { size: 16 })
const label = computed(() => `${props.value.toLocaleString('es-CR', { maximumFractionDigits: 1 })} de 5 estrellas`)
const fill = (i: number) => Math.max(0, Math.min(1, props.value - (i - 1)))
</script>

<template>
  <span class="stars" role="img" :aria-label="label">
    <span v-for="i in 5" :key="i" class="stars__one" :style="{ width: `${size}px`, height: `${size}px` }" aria-hidden="true">
      <Icon name="lucide:star" :size="String(size)" class="stars__bg" />
      <span class="stars__fill" :style="{ width: `${fill(i) * 100}%` }"><Icon name="lucide:star" :size="String(size)" /></span>
    </span>
  </span>
</template>

<style scoped>
.stars { display: inline-flex; gap: 2px; vertical-align: middle; }
.stars__one { position: relative; display: inline-block; }
.stars__bg { color: var(--track); position: absolute; inset: 0; }
.stars__fill { position: absolute; inset: 0; overflow: hidden; color: #E0894F; }
.stars__fill :deep(svg) { fill: currentColor; }
</style>
