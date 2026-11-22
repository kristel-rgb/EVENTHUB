<script setup lang="ts">
// Campo de formulario con etiqueta, ayuda y mensaje de error accesibles.
// El input va en el slot y recibe { id, describedBy, invalid }.
const props = defineProps<{ id: string, label: string, error?: string, hint?: string, optional?: boolean }>()
const describedBy = computed(() =>
  [props.error ? `${props.id}-error` : '', props.hint ? `${props.id}-hint` : ''].filter(Boolean).join(' ') || undefined,
)
</script>

<template>
  <div class="field" :class="{ 'is-invalid': error }">
    <label :for="id" class="field__label">
      {{ label }} <span v-if="optional" class="field__optional">(opcional)</span>
    </label>
    <slot :id="id" :described-by="describedBy" :invalid="Boolean(error)" />
    <p v-if="hint && !error" :id="`${id}-hint`" class="field__hint">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="field__error">
      <Icon name="lucide:circle-alert" size="14" /> {{ error }}
    </p>
  </div>
</template>

<style scoped>
.field { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.field__label { font-size: 0.875rem; font-weight: 600; }
.field__optional { font-weight: 400; color: var(--text-secondary); }
.field__hint { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.field__error { margin: 0; font-size: 0.8125rem; color: var(--color-raspberry-dark); display: flex; align-items: center; gap: 4px; }

.field :slotted(input:not([type='checkbox'])),
.field :slotted(select) {
  width: 100%; min-height: 48px; padding: 0 14px; border-radius: var(--radius-md);
  border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink);
  font: 1rem var(--font-body);
}
.field :slotted(input:hover), .field :slotted(select:hover) { border-color: var(--text-secondary); }
.field :slotted(input:focus), .field :slotted(select:focus) { outline: none; border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.field.is-invalid :slotted(input), .field.is-invalid :slotted(select) { border-color: var(--color-raspberry); }
</style>
