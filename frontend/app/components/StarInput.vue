<script setup lang="ts">
// Elegir de 1 a 5 estrellas: es un grupo de botones de opción (funciona con teclado y lector de pantalla)
defineProps<{ id: string, invalid?: boolean, describedBy?: string }>()
const model = defineModel<number>({ required: true })
const hover = ref(0)
</script>

<template>
  <div :id="id" class="si" role="radiogroup" aria-label="Calificación" :aria-invalid="invalid" :aria-describedby="describedBy" @mouseleave="hover = 0">
    <label v-for="i in 5" :key="i" class="si__star" :class="{ 'is-on': (hover || model) >= i }" @mouseenter="hover = i">
      <input v-model="model" type="radio" :name="id" :value="i" class="sr-only">
      <Icon name="lucide:star" size="30" aria-hidden="true" />
      <span class="sr-only">{{ i }} {{ i === 1 ? 'estrella' : 'estrellas' }} · {{ ratingWords[i] }}</span>
    </label>
    <span class="si__word" aria-hidden="true">{{ ratingWords[hover || model] }}</span>
  </div>
</template>

<style scoped>
.si { display: inline-flex; align-items: center; gap: 2px; }
.si__star { cursor: pointer; color: var(--track); display: inline-flex; padding: 4px; border-radius: 8px; }
.si__star.is-on { color: #E0894F; }
.si__star.is-on :deep(svg) { fill: currentColor; }
.si__star:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 1px; }
.si__word { margin-left: 8px; font-weight: 600; color: var(--text-secondary); min-width: 90px; }
</style>
