<script setup lang="ts">
// Lista de permisos con casillas, agrupada. Marca cuáles vienen con el tipo de cuenta
// y bloquea los de administración si la cuenta no es Super Admin.
import type { PermissionCatalog } from '~/types/models'

const props = defineProps<{
  catalog: PermissionCatalog
  defaults: string[]          // permisos que trae el tipo de cuenta
  allowAdmin: boolean         // solo un Super Admin puede tener los permisos de administración
  disabled?: boolean
  idPrefix: string
}>()
const model = defineModel<string[]>({ required: true })

const isAdminOnly = (key: string) => props.catalog.adminOnly.includes(key)
function toggle(key: string, on: boolean) {
  model.value = on ? [...new Set([...model.value, key])] : model.value.filter(k => k !== key)
}
const changed = computed(() => {
  const a = [...model.value].sort().join()
  const b = props.defaults.filter(k => props.allowAdmin || !isAdminOnly(k)).sort().join()
  return a !== b
})
function reset() { model.value = props.defaults.filter(k => props.allowAdmin || !isAdminOnly(k)) }
</script>

<template>
  <div class="pp">
    <fieldset v-for="g in catalog.groups" :key="g.key" class="pp__group" :disabled="disabled || (g.key === 'admin' && !allowAdmin)">
      <legend>{{ g.label }}</legend>
      <p v-if="g.key === 'admin' && !allowAdmin" class="pp__note">Solo se pueden dar a una cuenta Super Admin.</p>
      <label v-for="p in g.permissions" :key="p.key" class="pp__item" :for="`${idPrefix}-${p.key}`">
        <input
          :id="`${idPrefix}-${p.key}`" type="checkbox" :checked="model.includes(p.key)"
          @change="toggle(p.key, ($event.target as HTMLInputElement).checked)"
        >
        <span class="pp__label">{{ p.label }}</span>
        <span v-if="defaults.includes(p.key)" class="pp__tag">Del tipo</span>
        <span v-else-if="model.includes(p.key)" class="pp__tag pp__tag--extra">Agregado</span>
      </label>
    </fieldset>
    <div class="pp__foot">
      <p class="pp__count">{{ model.length }} permisos activos{{ changed ? ' · ajustados a mano' : '' }}</p>
      <button v-if="changed && !disabled" type="button" class="btn btn--ghost pp__reset" @click="reset">
        <Icon name="lucide:rotate-ccw" size="14" /> Volver a los del tipo
      </button>
    </div>
  </div>
</template>

<style scoped>
.pp { display: flex; flex-direction: column; gap: 14px; }
.pp__group { border: 1px solid var(--border); border-radius: var(--radius-md); margin: 0; padding: 10px 14px 12px; background: var(--color-white); }
.pp__group:disabled { background: var(--surface-muted); }
.pp__group legend { padding: 0 6px; font-weight: 600; font-size: 0.875rem; }
.pp__note { margin: 0 0 6px; font-size: 0.8125rem; color: var(--text-secondary); }
.pp__item { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 10px; align-items: center; min-height: 36px; cursor: pointer; font-size: 0.9375rem; }
.pp__group:disabled .pp__item { cursor: not-allowed; opacity: 0.6; }
.pp__item input { width: 18px; height: 18px; accent-color: var(--color-forest); }
.pp__tag { font-size: 0.6875rem; font-weight: 600; padding: 2px 8px; border-radius: var(--radius-pill); background: var(--tint-neutral); color: var(--text-secondary); white-space: nowrap; }
.pp__tag--extra { background: var(--tint-peach); color: var(--tint-peach-text); }
.pp__foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 8px; }
.pp__count { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.pp__reset { min-height: 36px; font-size: 0.8125rem; }
</style>
