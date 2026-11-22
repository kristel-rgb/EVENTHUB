<script setup lang="ts">
// Categorías (Super Admin): crear, renombrar y eliminar. Una categoría con eventos no se puede eliminar.
// Datos: GET/POST /admin/categories · PATCH/DELETE /admin/categories/:id
import type { AdminCategory } from '~/types/models'

definePageMeta({ layout: 'panel', panel: 'admin' })
useHead({ title: 'Categorías' })

const { data, status, error, refresh } = await useAdminCategories()
const actions = useCategoryActions()
const notice = ref<{ tone: 'ok' | 'error', text: string } | null>(null)

// Crear
const newName = ref('')
const newError = ref<string | null>(null)
const creating = ref(false)
async function create() {
  newError.value = newName.value.trim().length < 3 ? 'Entre 3 y 40 caracteres.' : null
  if (newError.value) return
  creating.value = true
  try {
    const c = await actions.create(newName.value)
    notice.value = { tone: 'ok', text: `Se creó la categoría «${c.name}».` }
    newName.value = ''
    await refresh()
  }
  catch (err) { newError.value = readApiError(err).message }
  finally { creating.value = false }
}

// Renombrar en la misma fila
const editId = ref<string | null>(null)
const editName = ref('')
const editError = ref<string | null>(null)
function startEdit(c: AdminCategory) {
  editId.value = c._id; editName.value = c.name; editError.value = null
  nextTick(() => document.getElementById(`cat-edit-${c._id}`)?.focus())
}
async function saveEdit(c: AdminCategory) {
  if (editName.value.trim() === c.name) { editId.value = null; return }
  try {
    const r = await actions.rename(c._id, editName.value)
    notice.value = { tone: 'ok', text: `«${c.name}» ahora se llama «${r.name}».` }
    editId.value = null
    await refresh()
  }
  catch (err) { editError.value = readApiError(err).message }
}

// Eliminar
const toDelete = ref<AdminCategory | null>(null)
const deleting = ref(false)
const deleteError = ref<string | null>(null)
async function confirmDelete() {
  if (!toDelete.value) return
  deleting.value = true
  deleteError.value = null
  try {
    await actions.remove(toDelete.value._id)
    notice.value = { tone: 'ok', text: `Se eliminó «${toDelete.value.name}».` }
    toDelete.value = null
    await refresh()
  }
  catch (err) { deleteError.value = readApiError(err).message }
  finally { deleting.value = false }
}
</script>

<template>
  <div class="page">
    <header>
      <h1>Categorías</h1>
      <p class="sub">Son los filtros de Buscar y lo que elige cada organización al crear un evento.</p>
    </header>

    <p v-if="notice" class="notice" :class="`notice--${notice.tone}`" role="status">
      <Icon name="lucide:circle-check" size="18" /> <span>{{ notice.text }}</span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <form class="card new" novalidate @submit.prevent="create">
      <FormField id="cat-new" label="Nueva categoría" :hint="newName.trim() ? `Se va a ver en Buscar como «${newName.trim()}»` : 'Por ejemplo: Música electrónica'" :error="newError ?? undefined">
        <template #default="{ id, describedBy, invalid }">
          <input :id="id" v-model="newName" maxlength="40" :aria-describedby="describedBy" :aria-invalid="invalid" @input="newError = null">
        </template>
      </FormField>
      <button type="submit" class="btn btn--primary" :disabled="creating"><Icon name="lucide:plus" size="16" /> Crear</button>
    </form>

    <p v-if="status === 'pending' && !data" class="state">Cargando…</p>
    <p v-else-if="error" class="state state--error">No pudimos cargar las categorías.</p>
    <div v-else-if="data" class="card list">
      <table class="tbl">
        <caption class="sr-only">Categorías y cuántos eventos usan cada una</caption>
        <thead><tr><th scope="col">Nombre</th><th scope="col">Dirección en Buscar</th><th scope="col" class="num">Eventos</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="c in data" :key="c._id">
            <td>
              <form v-if="editId === c._id" class="inline" novalidate @submit.prevent="saveEdit(c)">
                <label :for="`cat-edit-${c._id}`" class="sr-only">Nombre de la categoría</label>
                <input :id="`cat-edit-${c._id}`" v-model="editName" maxlength="40" :aria-invalid="Boolean(editError)" :aria-describedby="editError ? `cat-err-${c._id}` : undefined" @keydown.esc="editId = null">
                <button type="submit" class="btn btn--primary btn--sm">Guardar</button>
                <button type="button" class="btn btn--ghost btn--sm" @click="editId = null">Cancelar</button>
                <span v-if="editError" :id="`cat-err-${c._id}`" class="err">{{ editError }}</span>
              </form>
              <strong v-else>{{ c.name }}</strong>
            </td>
            <td class="muted"><NuxtLink :to="{ path: '/buscar', query: { categoria: c.slug } }">?categoria={{ c.slug }}</NuxtLink></td>
            <td class="num">{{ c.events }} <span class="muted">({{ c.published }} publicados)</span></td>
            <td class="acts">
              <button type="button" class="icon-btn" :aria-label="`Renombrar ${c.name}`" @click="startEdit(c)"><Icon name="lucide:pencil" size="16" /></button>
              <button
                type="button" class="icon-btn icon-btn--danger" :disabled="c.events > 0"
                :aria-label="c.events > 0 ? `No se puede eliminar ${c.name}: tiene eventos` : `Eliminar ${c.name}`"
                :title="c.events > 0 ? 'Tiene eventos: no se puede eliminar' : 'Eliminar'" @click="toDelete = c; deleteError = null"
              ><Icon name="lucide:trash-2" size="16" /></button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <ConfirmDialog :open="Boolean(toDelete)" :title="`¿Eliminar «${toDelete?.name}»?`" confirm-label="Eliminar" danger :loading="deleting" :error="deleteError" @confirm="confirmDelete" @close="toDelete = null">
      <p>Deja de aparecer en Buscar y en el formulario de eventos. Ningún evento la usa.</p>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
.sub { margin: 4px 0 0; color: var(--text-secondary); }
.notice { margin: 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); }
.notice > span { flex: 1; }
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.notice--error { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }
.new { padding: 16px 18px; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 12px; align-items: start; }
.new .btn { margin-top: 26px; min-height: 46px; }
.state { color: var(--text-secondary); }
.state--error { color: var(--color-raspberry-dark); }
.list { overflow: hidden; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); padding: 12px 14px 8px; }
.tbl td { padding: 10px 14px; border-top: 1px solid var(--track); vertical-align: middle; }
.num { text-align: right; white-space: nowrap; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; }
.acts { text-align: right; white-space: nowrap; }
.icon-btn { width: 40px; height: 40px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; margin-left: 4px; }
.icon-btn--danger { color: var(--color-raspberry-dark); }
.icon-btn:disabled { opacity: 0.35; cursor: not-allowed; }
.inline { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.inline input { min-height: 38px; padding: 0 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); font: 1rem var(--font-body); }
.inline input[aria-invalid='true'] { border-color: var(--color-raspberry); }
.btn--sm { min-height: 38px; padding: 0 12px; font-size: 0.875rem; }
.err { width: 100%; color: var(--color-raspberry-dark); font-size: 0.8125rem; }
@media (max-width: 640px) {
  .new { grid-template-columns: minmax(0, 1fr); }
  .new .btn { margin-top: 0; }
  .tbl th:nth-child(2), .tbl td:nth-child(2) { display: none; }
}
</style>
