<script setup lang="ts">
// Descargar reportes (RF-03, Organizer). El backend los genera aparte (Lambda) y devuelve una URL temporal (S3).
// Se puede pedir el resumen de todos los eventos o las reservaciones de uno, en CSV (Excel) o PDF.
import type { ReportItem, ReportType } from '~/types/models'

const props = defineProps<{ open: boolean, eventId?: string | null, period?: number }>()
const emit = defineEmits<{ close: [] }>()

const actions = useReportActions()
const dialog = ref<HTMLDialogElement | null>(null)
const type = ref<ReportType>('organizer-summary')
const format = ref<'csv' | 'pdf'>('csv')
const eventId = ref('')
const period = ref(30)
const working = ref(false)
const current = ref<ReportItem | null>(null)
const error = ref<string | null>(null)
const recent = ref<ReportItem[]>([])
let signal = { cancelled: false }

const { data: events } = await useReservationEventOptions()

watch(() => props.open, async (v) => {
  if (!dialog.value) return
  if (v && !dialog.value.open) {
    type.value = props.eventId ? 'event-reservations' : 'organizer-summary'
    eventId.value = props.eventId ?? events.value?.[0]?._id ?? ''
    period.value = props.period ?? 30
    current.value = null
    error.value = null
    dialog.value.showModal()
    try { recent.value = await actions.recent() }
    catch { recent.value = [] }
  }
  if (!v && dialog.value.open) dialog.value.close()
}, { flush: 'post' })

function onClose() {
  signal.cancelled = true
  emit('close')
}

async function generate() {
  error.value = null
  if (type.value === 'event-reservations' && !eventId.value) { error.value = 'Elegí un evento.'; return }
  working.value = true
  current.value = null
  signal = { cancelled: false }
  try {
    const started = await actions.request({ type: type.value, format: format.value, eventId: type.value === 'event-reservations' ? eventId.value : undefined, period: period.value })
    current.value = started
    const done = await actions.waitReady(started._id, signal)
    current.value = done
    if (done.status === 'failed') error.value = 'No se pudo generar el reporte. Probá de nuevo.'
    else recent.value = [done, ...recent.value.filter(r => r._id !== done._id)].slice(0, 10)
  }
  catch (err) {
    if ((err as Error).message !== 'cancelled') error.value = readApiError(err).message
  }
  finally { working.value = false }
}
const typeLabel: Record<ReportType, string> = { 'organizer-summary': 'Resumen de eventos', 'event-reservations': 'Reservaciones de un evento' }
</script>

<template>
  <dialog ref="dialog" class="rd" aria-labelledby="rd-title" @close="onClose">
    <form class="rd__box" novalidate @submit.prevent="generate">
      <header class="rd__head">
        <h2 id="rd-title">Descargar reporte</h2>
        <button type="button" class="rd__close" aria-label="Cerrar" @click="dialog?.close()"><Icon name="lucide:x" size="20" /></button>
      </header>

      <fieldset class="opts">
        <legend>¿Qué querés descargar?</legend>
        <label class="opt" :class="{ 'is-on': type === 'organizer-summary' }">
          <input v-model="type" type="radio" value="organizer-summary" class="sr-only">
          <Icon name="lucide:chart-column" size="20" />
          <span><strong>Resumen de eventos</strong><span class="muted">Ventas, ocupación e ingresos de cada evento.</span></span>
        </label>
        <label class="opt" :class="{ 'is-on': type === 'event-reservations' }">
          <input v-model="type" type="radio" value="event-reservations" class="sr-only">
          <Icon name="lucide:list" size="20" />
          <span><strong>Reservaciones de un evento</strong><span class="muted">Lista de compradores, tipo de entrada, pago y estado.</span></span>
        </label>
      </fieldset>

      <div class="grid">
        <FormField v-if="type === 'event-reservations'" id="rd-event" label="Evento">
          <template #default="{ id }">
            <select :id="id" v-model="eventId">
              <option v-for="e in events" :key="e._id" :value="e._id">{{ e.name }} · {{ formatShortDate(e.date) }}</option>
            </select>
          </template>
        </FormField>
        <FormField v-else id="rd-period" label="Ventas de los últimos">
          <template #default="{ id }">
            <select :id="id" v-model.number="period">
              <option :value="7">7 días</option>
              <option :value="30">30 días</option>
              <option :value="90">90 días</option>
            </select>
          </template>
        </FormField>
        <fieldset class="fmt">
          <legend>Formato</legend>
          <label class="chip" :class="{ 'is-on': format === 'csv' }"><input v-model="format" type="radio" value="csv" class="sr-only"> CSV (Excel)</label>
          <label class="chip" :class="{ 'is-on': format === 'pdf' }"><input v-model="format" type="radio" value="pdf" class="sr-only"> PDF</label>
        </fieldset>
      </div>

      <div v-if="current" class="status" role="status" aria-live="polite">
        <template v-if="current.status === 'processing'"><Icon name="lucide:loader-circle" size="18" class="spin" /> Generando el reporte… puede tardar unos segundos.</template>
        <template v-else-if="current.status === 'ready' && current.url">
          <Icon name="lucide:circle-check" size="18" /> Listo.
          <a :href="actions.absolute(current.url)" :download="current.fileName ?? true" class="btn btn--primary btn--sm"><Icon name="lucide:download" size="16" /> Descargar {{ current.format.toUpperCase() }}</a>
          <span class="muted">El enlace vence a las {{ formatTime(current.expiresAt!) }}.</span>
        </template>
      </div>
      <p v-if="error" class="err" role="alert">{{ error }}</p>

      <div class="rd__actions">
        <button type="button" class="btn btn--outline" @click="dialog?.close()">Cerrar</button>
        <button type="submit" class="btn btn--primary" :disabled="working">
          <Icon :name="working ? 'lucide:loader-circle' : 'lucide:file-down'" size="16" :class="{ spin: working }" /> Generar reporte
        </button>
      </div>

      <section v-if="recent.length" class="recent" aria-labelledby="rd-recent">
        <h3 id="rd-recent">Generados recientemente</h3>
        <ul>
          <li v-for="r in recent" :key="r._id">
            <span>{{ r.title }} <span class="muted">· {{ r.format.toUpperCase() }} · {{ formatTime(r.createdAt) }}</span></span>
            <a v-if="r.status === 'ready' && r.url && r.expiresAt && new Date(r.expiresAt).getTime() > Date.now()" :href="actions.absolute(r.url)" :download="r.fileName ?? true">Descargar</a>
            <span v-else class="muted">{{ r.status === 'processing' ? 'Generando…' : 'Vencido' }}</span>
          </li>
        </ul>
      </section>
      <p class="muted note">{{ typeLabel[type] }}: el archivo se genera aparte y se descarga desde un enlace temporal.</p>
    </form>
  </dialog>
</template>

<style scoped>
.rd { border: 0; padding: 0; background: transparent; width: min(600px, 94vw); max-width: none; max-height: 92vh; overflow: auto; }
.rd::backdrop { background: rgba(31, 42, 36, 0.65); }
.rd__box { background: var(--color-sand); color: var(--color-ink); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.rd__head { display: flex; justify-content: space-between; align-items: center; }
.rd__head h2 { font-size: 1.5rem; }
.rd__close { width: 44px; height: 44px; border-radius: 50%; border: 0; background: var(--tint-neutral); color: var(--color-ink); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.opts, .fmt { border: 0; margin: 0; padding: 0; }
.opts { display: grid; gap: 8px; }
.opts legend, .fmt legend { padding: 0; margin-bottom: 8px; font-weight: 600; font-size: 0.875rem; }
.opt { display: grid; grid-template-columns: 24px minmax(0, 1fr); gap: 10px; align-items: center; padding: 12px; cursor: pointer; border: 1.5px solid var(--border); border-radius: var(--radius-md); background: var(--color-white); }
.opt span { display: flex; flex-direction: column; }
.opt :deep(svg) { color: var(--color-forest); }
.opt.is-on { border-color: var(--color-forest); box-shadow: 0 0 0 2px var(--tint-forest); }
.opt:focus-within, .chip:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.grid { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 14px; align-items: end; }
.fmt { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { min-height: 44px; padding: 0 14px; border-radius: var(--radius-pill); cursor: pointer; display: inline-flex; align-items: center; border: 1.5px solid var(--border); background: var(--color-white); font-weight: 500; }
.chip.is-on { background: var(--color-forest); border-color: var(--color-forest); color: var(--color-white); }
.status { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.btn--sm { min-height: 38px; padding: 0 14px; font-size: 0.875rem; }
.err { margin: 0; color: var(--color-raspberry-dark); font-weight: 600; }
.rd__actions { display: flex; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
.rd__actions .btn:disabled { opacity: 0.6; cursor: progress; }
.recent h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); font-family: var(--font-body); margin-bottom: 6px; }
.recent ul { list-style: none; margin: 0; padding: 0; }
.recent li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 0; border-top: 1px solid var(--track); font-size: 0.875rem; }
.recent a { font-weight: 600; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; font-weight: 400; }
.note { margin: 0; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 560px) { .grid { grid-template-columns: minmax(0, 1fr); } }
</style>
