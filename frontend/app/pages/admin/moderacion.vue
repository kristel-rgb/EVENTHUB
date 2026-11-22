<script setup lang="ts">
// Moderación de comentarios (Super Admin). Un filtro de palabras marca comentarios "para revisar";
// el Super Admin decide si los oculta (con un motivo que ve quien lo escribió) o los deja.
// Ocultar no borra: el comentario sale del sitio y del promedio, pero queda el registro.
// Datos: GET /admin/reviews · PATCH /admin/reviews/:id
import type { ModerationFilters } from '~/composables/useAdmin'
import type { ModerationItem } from '~/types/models'

definePageMeta({ layout: 'panel', panel: 'admin' })
useHead({ title: 'Moderación' })

const route = useRoute()
const router = useRouter()
const tabs = [
  { value: 'flagged', label: 'Para revisar' },
  { value: 'visible', label: 'Visibles' },
  { value: 'hidden', label: 'Ocultos' },
] as const
const filters = computed<ModerationFilters>(() => ({
  status: (tabs.find(t => t.value === route.query.estado)?.value ?? 'flagged'),
  q: typeof route.query.q === 'string' && route.query.q ? route.query.q : undefined,
  page: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
  limit: 20,
}))
const { data, status, error, refresh } = await useModeration(filters)
const actions = useModerationActions()
const searchText = ref(filters.value.q ?? '')
function search() { router.replace({ query: { ...route.query, q: searchText.value.trim() || undefined, pagina: undefined } }) }
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.limit)) : 1))
const notice = ref<string | null>(null)

// Ocultar con motivo
const target = ref<ModerationItem | null>(null)
const reason = ref(moderationReasons[0]!)
const otherReason = ref('')
const hideError = ref<string | null>(null)
const working = ref(false)
function askHide(r: ModerationItem) { target.value = r; reason.value = moderationReasons[0]!; otherReason.value = ''; hideError.value = null }
async function hide() {
  if (!target.value) return
  const text = reason.value === 'Otro' ? otherReason.value.trim() : reason.value
  if (text.length < 3) { hideError.value = 'Escribí el motivo.'; return }
  working.value = true
  try {
    await actions.setHidden(target.value._id, true, text)
    notice.value = `Se ocultó el comentario de ${target.value.author.name}.`
    target.value = null
    clearNuxtData(key => key.startsWith('event-') || key === 'admin-stats')
    await refresh()
  }
  catch (err) { hideError.value = readApiError(err).message }
  finally { working.value = false }
}
async function restore(r: ModerationItem) {
  working.value = true
  try {
    await actions.setHidden(r._id, false)
    notice.value = `El comentario de ${r.author.name} vuelve a estar visible.`
    clearNuxtData(key => key.startsWith('event-') || key === 'admin-stats')
    await refresh()
  }
  catch (err) { notice.value = readApiError(err).message }
  finally { working.value = false }
}
</script>

<template>
  <div class="page">
    <header>
      <h1>Moderación</h1>
      <p class="sub">Revisá los comentarios que el filtro marcó y ocultá los que no cumplen las reglas. Ocultar no borra: queda el registro.</p>
    </header>

    <p v-if="notice" class="notice" role="status">
      <Icon name="lucide:circle-check" size="18" /> <span>{{ notice }}</span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <nav class="tabs" aria-label="Filtrar comentarios">
      <NuxtLink
        v-for="t in tabs" :key="t.value" :to="{ query: { ...route.query, estado: t.value === 'flagged' ? undefined : t.value, pagina: undefined } }"
        class="tabs__item" :class="{ 'is-on': filters.status === t.value }" :aria-current="filters.status === t.value ? 'page' : undefined" replace
      >
        {{ t.label }} <span class="tabs__count" :class="{ 'is-alert': t.value === 'flagged' && (data?.counts.flagged ?? 0) > 0 }">{{ data?.counts[t.value] ?? 0 }}</span>
      </NuxtLink>
    </nav>

    <form class="search" role="search" @submit.prevent="search">
      <Icon name="lucide:search" size="18" />
      <label for="mod-search" class="sr-only">Buscar comentarios</label>
      <input id="mod-search" v-model="searchText" type="search" placeholder="Texto, evento o autor">
    </form>

    <p v-if="status === 'pending' && !data" class="state">Cargando…</p>
    <p v-else-if="error" class="state state--error">No pudimos cargar los comentarios.</p>
    <div v-else-if="data && !data.items.length" class="state">
      <Icon name="lucide:shield-check" size="40" />
      <p>{{ filters.status === 'flagged' ? 'No hay comentarios para revisar.' : 'No hay comentarios con este filtro.' }}</p>
    </div>
    <ul v-else-if="data" class="list">
      <li v-for="r in data.items" :key="r._id" class="card item" :class="{ 'is-hidden': r.hidden }">
        <div class="item__head">
          <StarRating :value="r.rating" />
          <span v-if="r.flagged" class="badge badge--urgent"><Icon name="lucide:flag" size="12" /> Para revisar</span>
          <span v-if="r.hidden" class="badge badge--neutral"><Icon name="lucide:eye-off" size="12" /> Oculto</span>
        </div>
        <p class="item__text">{{ r.comment }}</p>
        <p class="muted">
          <strong>{{ r.author.name }}</strong> (@{{ r.author.username }}) en
          <NuxtLink :to="`/eventos/${r.event._id}#resenas`">{{ r.event.name }}</NuxtLink> · {{ formatShortDate(r.createdAt) }}
        </p>
        <p v-if="r.hidden" class="item__why">Motivo: {{ r.hiddenReason }} · {{ r.hiddenBy }} · {{ r.hiddenAt ? formatShortDate(r.hiddenAt) : '' }}</p>
        <div class="item__actions">
          <button v-if="!r.hidden" type="button" class="btn btn--outline btn--sm danger" :disabled="working" @click="askHide(r)"><Icon name="lucide:eye-off" size="14" /> Ocultar</button>
          <button v-else type="button" class="btn btn--outline btn--sm" :disabled="working" @click="restore(r)"><Icon name="lucide:eye" size="14" /> Volver a mostrar</button>
        </div>
      </li>
    </ul>

    <nav v-if="data && totalPages > 1" class="pager" aria-label="Paginación">
      <NuxtLink v-if="filters.page > 1" :to="{ query: { ...route.query, pagina: filters.page - 1 } }" class="btn btn--outline">Anterior</NuxtLink>
      <span class="muted">Página {{ filters.page }} de {{ totalPages }}</span>
      <NuxtLink v-if="filters.page < totalPages" :to="{ query: { ...route.query, pagina: filters.page + 1 } }" class="btn btn--outline">Siguiente</NuxtLink>
    </nav>

    <ConfirmDialog :open="Boolean(target)" title="Ocultar comentario" confirm-label="Ocultar" danger :loading="working" :error="hideError" @confirm="hide" @close="target = null">
      <p class="quote">«{{ target?.comment }}»</p>
      <fieldset class="reasons">
        <legend>Motivo (se lo mostramos a quien lo escribió)</legend>
        <label v-for="m in moderationReasons" :key="m" class="reason"><input v-model="reason" type="radio" name="reason" :value="m"> {{ m }}</label>
        <input v-if="reason === 'Otro'" v-model="otherReason" class="other" maxlength="200" placeholder="Escribí el motivo" aria-label="Otro motivo">
      </fieldset>
    </ConfirmDialog>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
.sub { margin: 4px 0 0; color: var(--text-secondary); max-width: 70ch; }
.notice { margin: 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.notice > span { flex: 1; }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }
.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; }
.tabs__item { display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 14px; white-space: nowrap; color: var(--text-secondary); text-decoration: none; font-weight: 600; font-size: 0.9375rem; border-bottom: 3px solid transparent; margin-bottom: -1px; }
.tabs__item.is-on { color: var(--color-ink); border-bottom-color: var(--color-forest); }
.tabs__count { background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.75rem; padding: 1px 8px; border-radius: var(--radius-pill); }
.tabs__count.is-alert { background: var(--color-raspberry); color: var(--color-white); }
.search { display: flex; align-items: center; gap: 8px; padding: 0 14px; min-height: 46px; background: var(--color-white); border: 1.5px solid var(--border); border-radius: var(--radius-md); color: var(--text-secondary); max-width: 520px; }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font: 1rem var(--font-body); color: var(--color-ink); }
.search:focus-within { border-color: var(--color-forest); }
.state { padding: 40px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 10px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }
.list { list-style: none; margin: 0; padding: 0; display: grid; gap: 12px; }
.item { padding: 16px 18px; display: flex; flex-direction: column; gap: 8px; }
.item p { margin: 0; }
.item.is-hidden { background: var(--surface-muted); }
.item__head { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.item__head .badge { display: inline-flex; align-items: center; gap: 4px; }
.item__text { line-height: 1.6; }
.item__why { font-size: 0.875rem; color: var(--tint-peach-text); }
.item__actions { display: flex; gap: 8px; }
.btn--sm { min-height: 38px; padding: 0 14px; font-size: 0.875rem; }
.danger { color: var(--color-raspberry-dark); }
.muted { color: var(--text-secondary); font-size: 0.875rem; }
.pager { display: flex; justify-content: center; align-items: center; gap: 14px; }
.quote { font-style: italic; margin: 0 0 10px; }
.reasons { border: 0; margin: 0; padding: 0; display: grid; gap: 6px; }
.reasons legend { font-weight: 600; font-size: 0.875rem; margin-bottom: 6px; padding: 0; }
.reason { display: flex; gap: 8px; align-items: center; cursor: pointer; }
.reason input { accent-color: var(--color-forest); width: 18px; height: 18px; }
.other { min-height: 42px; padding: 0 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border); font: 1rem var(--font-body); }
</style>
