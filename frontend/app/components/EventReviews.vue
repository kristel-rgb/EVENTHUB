<script setup lang="ts">
// Reseñas de un evento: promedio, distribución, la reseña propia (escribir, editar, borrar) y la lista.
// Solo puede calificar quien tuvo entrada y el evento ya ocurrió (lo decide el backend).
import type { ReviewItem, ReviewList } from '~/types/models'

const props = defineProps<{ eventId: string }>()
const route = useRoute()
const session = useSessionStore()
const actions = useReviewActions(props.eventId)

const sort = ref<'recent' | 'best' | 'worst'>('recent')
const limit = 5
const data = ref<ReviewList | null>(null)
const items = ref<ReviewItem[]>([])
const page = ref(1)
const loading = ref(false)
const loadError = ref<string | null>(null)

async function load(reset = true) {
  loading.value = true
  loadError.value = null
  try {
    const p = reset ? 1 : page.value + 1
    const r = await actions.list({ sort: sort.value, page: p, limit })
    data.value = r
    items.value = reset ? r.items : [...items.value, ...r.items]
    page.value = p
  }
  catch (err) { loadError.value = readApiError(err).message }
  finally { loading.value = false }
}
await load()
watch(sort, () => load())
watch(() => session.isLoggedIn, () => load())
// Si se llegó con #resenas (por ejemplo desde Mis entradas), bajar hasta aquí cuando ya cargó
onMounted(() => { if (route.hash === '#resenas') nextTick(() => document.getElementById('resenas')?.scrollIntoView({ block: 'start' })) })
const hasMore = computed(() => data.value ? items.value.length < data.value.total : false)

// ---------- Escribir / editar ----------
const editing = ref(false)
const form = reactive({ rating: 0, comment: '' })
const errors = ref<Record<string, string>>({})
const saving = ref(false)
const notice = ref<string | null>(null)
const mine = computed(() => data.value?.myReview ?? null)

function startEdit() {
  form.rating = mine.value?.rating ?? 0
  form.comment = mine.value?.comment ?? ''
  errors.value = {}
  editing.value = true
  nextTick(() => document.getElementById('rv-rating')?.querySelector('input')?.focus())
}
async function submit() {
  errors.value = {}
  if (form.rating < 1) errors.value.rating = 'Elegí de 1 a 5 estrellas.'
  if (form.comment.trim().length < 10) errors.value.comment = 'Escribí al menos 10 caracteres.'
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    if (mine.value) await actions.update(mine.value._id, form.rating, form.comment.trim())
    else await actions.create(form.rating, form.comment.trim())
    notice.value = mine.value ? 'Tu reseña se actualizó.' : 'Gracias por tu reseña.'
    editing.value = false
    actions.invalidate()
    await load()
  }
  catch (err) {
    const e = readApiError(err)
    errors.value = (e.details as Record<string, string>) ?? { comment: e.message }
    if (!e.details) errors.value = { comment: e.message }
  }
  finally { saving.value = false }
}

const confirmDelete = ref(false)
const deleting = ref(false)
async function remove() {
  if (!mine.value) return
  deleting.value = true
  try {
    await actions.remove(mine.value._id)
    confirmDelete.value = false
    notice.value = 'Tu reseña se eliminó.'
    actions.invalidate()
    await load()
  }
  finally { deleting.value = false }
}

const pct = (n: number) => (data.value?.summary.count ? Math.round((n / data.value.summary.count) * 100) : 0)
const loginTo = computed(() => ({ path: '/login', query: { redirect: `${route.path}#resenas` } }))
</script>

<template>
  <section id="resenas" class="rv" aria-labelledby="rv-title">
    <h2 id="rv-title">Reseñas</h2>

    <p v-if="loadError" class="err" role="alert">{{ loadError }}</p>

    <template v-if="data">
      <!-- Resumen -->
      <div class="rv__summary card">
        <div class="rv__avg">
          <p class="rv__num">{{ data.summary.avg !== null ? data.summary.avg.toLocaleString('es-CR', { minimumFractionDigits: 1 }) : '—' }}</p>
          <StarRating :value="data.summary.avg ?? 0" :size="18" />
          <p class="muted">{{ data.summary.count }} {{ data.summary.count === 1 ? 'reseña' : 'reseñas' }}</p>
        </div>
        <ul class="rv__dist" aria-label="Cantidad de reseñas por estrellas">
          <li v-for="n in [5, 4, 3, 2, 1]" :key="n">
            <span class="rv__dist-label">{{ n }} <Icon name="lucide:star" size="12" aria-hidden="true" /></span>
            <span class="rv__bar" aria-hidden="true"><span :style="{ width: `${pct(data.summary.distribution[n] ?? 0)}%` }" /></span>
            <span class="rv__dist-n">{{ data.summary.distribution[n] ?? 0 }}<span class="sr-only"> con {{ n }} estrellas</span></span>
          </li>
        </ul>
      </div>

      <p v-if="notice" class="ok" role="status"><Icon name="lucide:circle-check" size="16" /> {{ notice }}</p>

      <!-- Mi reseña -->
      <div v-if="mine && !editing" class="card rv__mine">
        <p class="rv__mine-title">Tu reseña</p>
        <p v-if="mine.hidden" class="warn"><Icon name="lucide:eye-off" size="16" /> Ocultada por moderación: {{ mine.hiddenReason }}. Solo vos la ves.</p>
        <StarRating :value="mine.rating" />
        <p class="rv__text">{{ mine.comment }}</p>
        <div v-if="!mine.hidden" class="rv__actions">
          <button type="button" class="btn btn--outline btn--sm" @click="startEdit"><Icon name="lucide:pencil" size="14" /> Editar</button>
          <button type="button" class="btn btn--ghost btn--sm danger" @click="confirmDelete = true"><Icon name="lucide:trash-2" size="14" /> Eliminar</button>
        </div>
      </div>

      <form v-else-if="editing || data.canReview" class="card rv__form" novalidate @submit.prevent="submit">
        <p class="rv__mine-title">{{ mine ? 'Editar tu reseña' : '¿Cómo te fue en este evento?' }}</p>
        <div>
          <StarInput id="rv-rating" v-model="form.rating" :invalid="Boolean(errors.rating)" :described-by="errors.rating ? 'rv-rating-err' : undefined" />
          <p v-if="errors.rating" id="rv-rating-err" class="field-err">{{ errors.rating }}</p>
        </div>
        <FormField id="rv-comment" label="Comentario" :hint="`${form.comment.trim().length}/1000 · Contá qué te gustó y qué mejorarías.`" :error="errors.comment">
          <template #default="{ id, describedBy, invalid }">
            <textarea :id="id" v-model="form.comment" rows="4" maxlength="1000" :aria-describedby="describedBy" :aria-invalid="invalid" />
          </template>
        </FormField>
        <div class="rv__actions">
          <button type="submit" class="btn btn--primary" :disabled="saving">
            <Icon v-if="saving" name="lucide:loader-circle" size="16" class="spin" /> {{ mine ? 'Guardar cambios' : 'Publicar reseña' }}
          </button>
          <button v-if="editing && mine" type="button" class="btn btn--ghost" @click="editing = false">Cancelar</button>
        </div>
      </form>

      <p v-else-if="data.cannotReviewReason" class="muted rv__why">
        <Icon name="lucide:info" size="16" /> {{ data.cannotReviewReason }}
        <NuxtLink v-if="!session.isLoggedIn" :to="loginTo">Ingresar</NuxtLink>
      </p>

      <!-- Lista -->
      <div v-if="data.total || items.length" class="rv__list-head">
        <label class="sort">
          <span>Ordenar</span>
          <select v-model="sort">
            <option value="recent">Más recientes</option>
            <option value="best">Mejor calificadas</option>
            <option value="worst">Peor calificadas</option>
          </select>
        </label>
      </div>
      <ul v-if="items.length" class="rv__list">
        <li v-for="r in items" :key="r._id" class="rv__item">
          <div class="rv__item-head">
            <span class="rv__avatar" aria-hidden="true">{{ r.author.name.charAt(0) }}</span>
            <div>
              <p class="rv__author">{{ r.author.name }}</p>
              <p class="muted">{{ formatShortDate(r.createdAt) }}{{ r.edited ? ' · editada' : '' }}</p>
            </div>
            <StarRating :value="r.rating" class="rv__stars" />
          </div>
          <p class="rv__text">{{ r.comment }}</p>
        </li>
      </ul>
      <p v-else-if="!mine" class="muted">Todavía no hay reseñas de este evento.</p>
      <button v-if="hasMore" type="button" class="btn btn--outline" :disabled="loading" @click="load(false)">Ver más reseñas</button>
    </template>

    <ConfirmDialog :open="confirmDelete" title="¿Eliminar tu reseña?" confirm-label="Eliminar" danger :loading="deleting" @confirm="remove" @close="confirmDelete = false">
      <p>Se borra tu calificación y tu comentario. Podés volver a escribir otra después.</p>
    </ConfirmDialog>
  </section>
</template>

<style scoped>
.rv { margin-top: 32px; display: flex; flex-direction: column; gap: 14px; scroll-margin-top: 20px; }
.rv h2 { font-size: 1.375rem; }
.rv p { margin: 0; }
.rv__summary { padding: 18px; display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 20px; align-items: center; }
.rv__avg { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.rv__num { font: 700 2.75rem/1 var(--font-display); letter-spacing: -0.04em; }
.rv__dist { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.rv__dist li { display: grid; grid-template-columns: 36px minmax(0, 1fr) 32px; gap: 8px; align-items: center; font-size: 0.8125rem; }
.rv__dist-label { display: inline-flex; align-items: center; gap: 3px; color: var(--text-secondary); }
.rv__bar { height: 8px; border-radius: var(--radius-pill); background: var(--track); overflow: hidden; }
.rv__bar span { display: block; height: 100%; background: #E0894F; }
.rv__dist-n { text-align: right; color: var(--text-secondary); }
.rv__mine, .rv__form { padding: 18px; display: flex; flex-direction: column; gap: 12px; }
.rv__mine-title { font-weight: 700; }
.rv__text { line-height: 1.6; white-space: pre-line; }
.rv__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.rv__actions .btn:disabled { opacity: 0.6; cursor: progress; }
.btn--sm { min-height: 38px; padding: 0 14px; font-size: 0.875rem; }
.danger { color: var(--color-raspberry-dark); }
.rv__why { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.rv__list-head { display: flex; justify-content: flex-end; }
.sort { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.875rem; }
.sort select { min-height: 40px; padding: 0 10px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); font: 500 0.875rem var(--font-body); }
.rv__list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; }
.rv__item { padding: 16px 0; border-top: 1px solid var(--track); display: flex; flex-direction: column; gap: 8px; }
.rv__item-head { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto; gap: 10px; align-items: center; }
.rv__avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--tint-forest); color: var(--color-forest-dark); display: inline-flex; align-items: center; justify-content: center; font-weight: 700; }
.rv__author { font-weight: 600; }
.muted { color: var(--text-secondary); font-size: 0.875rem; }
.ok { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.warn { display: flex; gap: 8px; align-items: center; padding: 10px 12px; border-radius: var(--radius-md); background: var(--tint-peach); color: var(--tint-peach-text); font-size: 0.875rem; }
.err, .field-err { color: var(--color-raspberry-dark); font-size: 0.875rem; }
.rv :deep(textarea) { width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); font: 1rem/1.5 var(--font-body); resize: vertical; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .rv__summary { grid-template-columns: minmax(0, 1fr); } }
</style>
