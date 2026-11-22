<script setup lang="ts">
// Validar entradas en la puerta: se escanea el QR con la cámara (o se escribe el código)
// y la pantalla dice de inmediato si la persona puede ingresar.
// Datos: GET /organizer/checkin/events · GET /organizer/checkin · POST /tickets/validate · POST /tickets/:id/undo-validation
// La entrada la valida SIEMPRE el backend (firma del QR, evento correcto, que no esté usada).
import type { ScanInfo } from '~/types/models'
import type { QrScanner, ScannerError } from '~/utils/qrScanner'

definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Validar entradas' })

const route = useRoute()
const router = useRouter()
const actions = useCheckinActions()

// ---------- Evento ----------
const { data: events } = await useCheckinEvents()
const eventId = computed(() => {
  const q = route.query.evento
  if (typeof q === 'string' && events.value?.some(e => e._id === q)) return q
  return events.value?.[0]?._id ?? ''
})
const current = computed(() => events.value?.find(e => e._id === eventId.value) ?? null)
const { data: status } = await useCheckinStatus(eventId)

const counts = reactive({ sold: 0, checkedIn: 0 })
watch(status, (s) => { if (s) { counts.sold = s.sold; counts.checkedIn = s.checkedIn } }, { immediate: true })
const pct = computed(() => (counts.sold ? Math.round((counts.checkedIn / counts.sold) * 100) : 0))

function whenLabel(iso: string) {
  const diff = new Date(iso).getTime() - Date.now()
  if (diff < 0) return 'En curso'
  const days = Math.floor(diff / 86_400_000)
  return days === 0 ? 'Hoy' : days === 1 ? 'Mañana' : `En ${days} días`
}

// ---------- Ajustes de este dispositivo (se guardan en el navegador) ----------
const gate = ref('')
const sound = ref(true)
onMounted(() => {
  try {
    gate.value = localStorage.getItem('eh-gate') ?? ''
    sound.value = localStorage.getItem('eh-scan-sound') !== '0'
  }
  catch { /* almacenamiento no disponible */ }
})
watch(gate, (v) => { try { localStorage.setItem('eh-gate', v.trim()) } catch { /* nada */ } })
watch(sound, (v) => { try { localStorage.setItem('eh-scan-sound', v ? '1' : '0') } catch { /* nada */ } })

// ---------- Historial de esta sesión ----------
interface Entry { key: string, ok: boolean, title: string, name: string, code: string, at: string, ticketId?: string, undoUntil?: number, gate?: string | null }
const history = ref<Entry[]>([])
const fromServer = (s: ScanInfo): Entry => ({
  key: `${s.ticket._id}-${s.usedAt}`, ok: true, title: 'Válida', name: s.holder.name, code: s.ticket.code, at: s.usedAt ?? '',
  ticketId: s.ticket._id, gate: s.gate, undoUntil: s.canUndo && s.usedAt ? new Date(s.usedAt).getTime() + 120_000 : undefined,
})
watch(status, (s) => { history.value = s ? s.recent.map(fromServer) : [] }, { immediate: true })

// Reloj para saber hasta cuándo se puede deshacer
const now = ref(Date.now())
let clock = 0
onMounted(() => { clock = window.setInterval(() => { now.value = Date.now() }, 5000) })
onBeforeUnmount(() => clearInterval(clock))

// ---------- Resultado ----------
type Result =
  | { ok: true, info: ScanInfo }
  | { ok: false, code: string, message: string, info: Partial<ScanInfo> | null }
const result = ref<Result | null>(null)
const checking = ref(false)
const resultBox = ref<HTMLElement | null>(null)
let autoNext = 0

const rejectInfo = computed(() => (result.value && !result.value.ok ? scanRejectInfo[result.value.code] ?? { title: 'No se pudo validar', action: result.value.message, icon: 'lucide:circle-x' } : null))

async function check(input: { qrValue?: string, code?: string }) {
  if (!eventId.value || checking.value) return
  checking.value = true
  scanner?.pause()
  try {
    const r = await actions.validate({ event: eventId.value, ...input, gate: gate.value.trim() || undefined })
    counts.sold = r.sold
    counts.checkedIn = r.checkedIn
    result.value = { ok: true, info: r }
    history.value.unshift({ ...fromServer(r), key: `${r.ticket._id}-${Date.now()}` })
    scanFeedback(true, sound.value)
    // Si nadie toca nada, a los 3 segundos vuelve a escanear
    autoNext = window.setTimeout(next, 3000)
  }
  catch (err) {
    const e = readApiError(err)
    const info = (e.details ?? null) as Partial<ScanInfo> | null
    result.value = { ok: false, code: e.code, message: e.message, info }
    const title = scanRejectInfo[e.code]?.title ?? 'No válida'
    history.value.unshift({ key: `r-${Date.now()}`, ok: false, title, name: info?.holder?.name ?? '—', code: info?.ticket?.code ?? input.code ?? '—', at: new Date().toISOString() })
    scanFeedback(false, sound.value)
  }
  finally {
    checking.value = false
    history.value = history.value.slice(0, 30)
    await nextTick()
    resultBox.value?.focus()
  }
}

function next() {
  clearTimeout(autoNext)
  result.value = null
  scanner?.resume()
}
function keep() { clearTimeout(autoNext) } // si tocan la pantalla de resultado, no se cierra sola

// ---------- Deshacer ----------
const undoing = ref<string | null>(null)
const undoError = ref<string | null>(null)
async function undo(ticketId: string) {
  undoing.value = ticketId
  undoError.value = null
  clearTimeout(autoNext)
  try {
    const r = await actions.undo(ticketId)
    counts.sold = r.sold
    counts.checkedIn = r.checkedIn
    history.value = history.value.filter(h => h.ticketId !== ticketId || !h.ok)
    if (result.value?.ok && result.value.info.ticket._id === ticketId) next()
  }
  catch (err) { undoError.value = readApiError(err).message }
  finally { undoing.value = null }
}
const canUndo = (e: Entry) => Boolean(e.ok && e.ticketId && e.undoUntil && e.undoUntil > now.value)

// ---------- Código escrito a mano ----------
const manual = ref('')
const manualError = ref<string | null>(null)
function submitManual() {
  const v = manual.value.trim()
  if (!/\d/.test(v)) { manualError.value = 'Escribí el código que aparece en la entrada, por ejemplo EH-1042.'; return }
  manualError.value = null
  manual.value = ''
  check({ code: v })
}

// ---------- Cámara ----------
const video = ref<HTMLVideoElement | null>(null)
let scanner: QrScanner | null = null
const camOn = ref(false)
const camStarting = ref(false)
const camError = ref<ScannerError | null>(null)
let lastText = ''
let lastAt = 0

async function startCamera() {
  if (!video.value || scanner) return
  camStarting.value = true
  camError.value = null
  try {
    scanner = await startQrScanner(video.value, (text) => {
      // El mismo QR frente a la cámara se lee muchas veces por segundo: solo cuenta una vez cada 4 s
      if (text === lastText && Date.now() - lastAt < 4000) return
      lastText = text
      lastAt = Date.now()
      check({ qrValue: text })
    })
    camOn.value = true
    if (result.value) scanner.pause()
  }
  catch (err) { camError.value = ((err as { kind?: ScannerError }).kind) ?? 'unknown' }
  finally { camStarting.value = false }
}
function stopCamera() {
  scanner?.stop()
  scanner = null
  camOn.value = false
}
onMounted(() => { if (eventId.value) startCamera() })
onBeforeUnmount(() => { stopCamera(); clearTimeout(autoNext) })

function onEventChange(e: Event) {
  next()
  router.replace({ query: { ...route.query, evento: (e.target as HTMLSelectElement).value } })
}
</script>

<template>
  <div class="page">
    <header class="head">
      <h1>Validar entradas</h1>
      <label v-if="events?.length" class="picker">
        <span class="sr-only">Evento</span>
        <Icon name="lucide:calendar-days" size="18" aria-hidden="true" />
        <select :value="eventId" @change="onEventChange">
          <option v-for="e in events" :key="e._id" :value="e._id">{{ whenLabel(e.date) }} · {{ e.name }} · {{ formatTime(e.date) }}</option>
        </select>
      </label>
    </header>

    <!-- Sin eventos para validar -->
    <div v-if="!events?.length" class="card empty">
      <Icon name="lucide:scan-line" size="40" />
      <p><strong>No hay eventos para validar</strong></p>
      <p>Aparecen aquí los eventos publicados desde 7 días antes hasta 12 horas después de que empiezan.</p>
      <NuxtLink to="/organizador/eventos" class="btn btn--outline">Ir a Mis eventos</NuxtLink>
    </div>

    <template v-else-if="current">
      <!-- Contador -->
      <section class="counter card theme-fixed" aria-label="Ingresos del evento">
        <div class="counter__top">
          <div>
            <p class="counter__name">{{ current.name }}</p>
            <p class="counter__meta">{{ formatEventDate(current.date) }} · {{ current.location }}</p>
          </div>
          <p class="counter__num" aria-live="polite"><strong>{{ formatNumber(counts.checkedIn) }}</strong> de {{ formatNumber(counts.sold) }} ingresaron</p>
        </div>
        <div class="counter__bar" role="progressbar" :aria-valuenow="pct" aria-valuemin="0" aria-valuemax="100" :aria-label="`${pct}% ingresaron`"><span :style="{ width: `${pct}%` }" /></div>
      </section>

      <div class="grid">
        <!-- Lector -->
        <section class="scan" aria-label="Lector de entradas">
          <div class="cam" :class="{ 'is-off': !camOn }">
            <video ref="video" class="cam__video" aria-hidden="true" />
            <div v-if="camOn" class="cam__frame" aria-hidden="true" />
            <p v-if="camOn && !result" class="cam__hint">{{ checking ? 'Revisando…' : 'Apuntá al código QR de la entrada' }}</p>

            <div v-if="!camOn" class="cam__off">
              <Icon name="lucide:camera-off" size="36" />
              <p v-if="camError">{{ scannerErrorText[camError] }}</p>
              <p v-else>{{ camStarting ? 'Encendiendo la cámara…' : 'La cámara está apagada.' }}</p>
              <button v-if="camError !== 'insecure' && camError !== 'not-supported'" type="button" class="btn btn--light" :disabled="camStarting" @click="startCamera">
                <Icon name="lucide:camera" size="16" /> {{ camError ? 'Intentar de nuevo' : 'Encender cámara' }}
              </button>
            </div>

            <!-- Resultado (ocupa todo el lector) -->
            <div
              v-if="result" ref="resultBox" class="res" :class="result.ok ? 'res--ok' : 'res--bad'"
              tabindex="-1" role="alert" @pointerdown="keep"
            >
              <template v-if="result.ok">
                <Icon name="lucide:circle-check" size="64" />
                <p class="res__title">Entrada válida</p>
                <p class="res__action">Puede ingresar</p>
                <div class="res__det">
                  <strong>{{ result.info.holder.name }}</strong>
                  <span>{{ result.info.ticket.code }} · Entrada {{ result.info.ticket.position.n }} de {{ result.info.ticket.position.of }}</span>
                  <span>Reservación {{ result.info.reservation.code }} · {{ result.info.reservation.paymentStatus === 'free' ? 'Gratis' : 'Pagada' }}</span>
                </div>
              </template>
              <template v-else>
                <Icon :name="rejectInfo!.icon" size="64" />
                <p class="res__title">{{ rejectInfo!.title }}</p>
                <p class="res__action">{{ rejectInfo!.action }}</p>
                <div v-if="result.info?.holder || result.code === 'TICKET_WRONG_EVENT'" class="res__det">
                  <strong v-if="result.info?.holder">{{ result.info.holder.name }}</strong>
                  <span v-if="result.info?.ticket">{{ result.info.ticket.code }}</span>
                  <span v-if="result.code === 'TICKET_ALREADY_USED' && result.info?.usedAt">
                    Usada {{ formatShortDate(result.info.usedAt) }} a las {{ formatTime(result.info.usedAt) }}{{ result.info.gate ? ` · ${result.info.gate}` : '' }}
                  </span>
                  <span v-if="result.code === 'TICKET_WRONG_EVENT'">{{ result.message }}</span>
                </div>
              </template>
              <div class="res__btns">
                <button type="button" class="btn btn--light res__next" @click="next"><Icon name="lucide:scan-line" size="18" /> Escanear siguiente</button>
                <button
                  v-if="result.ok && result.info.canUndo" type="button" class="btn res__undo"
                  :disabled="undoing === result.info.ticket._id" @click="undo(result.info.ticket._id)"
                >
                  <Icon name="lucide:undo-2" size="16" /> Deshacer
                </button>
              </div>
            </div>
          </div>

          <div class="cam__tools">
            <button v-if="camOn" type="button" class="btn btn--ghost" @click="stopCamera"><Icon name="lucide:camera-off" size="16" /> Apagar cámara</button>
            <label class="toggle">
              <input v-model="sound" type="checkbox">
              <span>Sonido</span>
            </label>
          </div>

          <!-- Código a mano -->
          <form class="manual card" novalidate @submit.prevent="submitManual">
            <label for="manual-code" class="manual__label">¿No se lee el QR? Escribí el código de la entrada</label>
            <div class="manual__row">
              <input
                id="manual-code" v-model="manual" class="manual__input" inputmode="text" autocomplete="off" autocapitalize="characters"
                placeholder="EH-1042" :aria-invalid="Boolean(manualError)" :aria-describedby="manualError ? 'manual-error' : undefined"
                @input="manualError = null"
              >
              <button type="submit" class="btn btn--primary" :disabled="checking">Validar</button>
            </div>
            <p v-if="manualError" id="manual-error" class="manual__error">{{ manualError }}</p>
          </form>

          <details class="settings card">
            <summary><Icon name="lucide:settings-2" size="16" /> Este dispositivo</summary>
            <label for="gate" class="manual__label">Nombre de la puerta (opcional)</label>
            <input id="gate" v-model="gate" class="manual__input" maxlength="40" placeholder="Puerta 1" aria-describedby="gate-hint">
            <p id="gate-hint" class="muted">Se guarda en este navegador y aparece en cada validación, para saber por dónde ingresó cada persona.</p>
          </details>
        </section>

        <!-- Últimas validaciones -->
        <section class="card recent" aria-labelledby="recent-title">
          <h2 id="recent-title">Últimas validaciones</h2>
          <p v-if="undoError" class="recent__error" role="alert">{{ undoError }}</p>
          <ul v-if="history.length" class="recent__list">
            <li v-for="h in history" :key="h.key" class="recent__item">
              <Icon :name="h.ok ? 'lucide:circle-check' : 'lucide:circle-x'" size="18" :class="h.ok ? 'is-ok' : 'is-bad'" />
              <span class="recent__who">
                <span class="recent__name">{{ h.name }}</span>
                <span class="muted">{{ h.code }}{{ h.gate ? ` · ${h.gate}` : '' }}</span>
              </span>
              <span class="recent__right">
                <span :class="h.ok ? 'is-ok' : 'is-bad'">{{ h.title }}</span>
                <span class="muted">{{ h.at ? formatTime(h.at) : '' }}</span>
                <button
                  v-if="canUndo(h)" type="button" class="recent__undo" :disabled="undoing === h.ticketId"
                  :aria-label="`Deshacer la validación de ${h.code}`" @click="undo(h.ticketId!)"
                >Deshacer</button>
              </span>
            </li>
          </ul>
          <p v-else class="muted">Todavía no se ha validado ninguna entrada de este evento.</p>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
.head h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
.picker {
  display: flex; align-items: center; gap: 8px; padding-left: 14px; min-height: 46px; max-width: 100%;
  background: var(--color-white); border: 1.5px solid var(--border); border-radius: var(--radius-pill); color: var(--color-forest);
}
.picker:focus-within { border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.picker select { border: 0; background: transparent; min-height: 44px; padding: 0 14px 0 0; font: 600 0.9375rem var(--font-body); color: var(--color-ink); max-width: min(460px, 75vw); outline: none; }

.empty { padding: 40px 20px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 10px; color: var(--text-secondary); }
.empty p { margin: 0; max-width: 46ch; }

.counter { padding: 16px 18px; background: var(--color-forest); color: var(--color-sand); border: 0; }
.counter p { margin: 0; }
.counter__top { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 8px 16px; }
.counter__name { font: 700 1.25rem var(--font-display); letter-spacing: -0.02em; }
.counter__meta { font-size: 0.875rem; color: var(--on-forest-muted); }
.counter__meta::first-letter { text-transform: uppercase; }
.counter__num { font-size: 0.9375rem; }
.counter__num strong { font: 700 1.75rem var(--font-display); }
.counter__bar { height: 8px; border-radius: var(--radius-pill); background: rgb(255 255 255 / 0.18); margin-top: 10px; }
.counter__bar span { display: block; height: 8px; border-radius: var(--radius-pill); background: var(--color-peach); transition: width .3s; }

.grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(280px, 1fr); gap: 16px; align-items: start; }
.scan { display: flex; flex-direction: column; gap: 10px; }

.cam { position: relative; border-radius: 22px; overflow: hidden; background: #111814; aspect-ratio: 4 / 3; min-height: 300px; }
.cam__video { width: 100%; height: 100%; object-fit: cover; display: block; }
.cam.is-off .cam__video { visibility: hidden; }
.cam__frame { position: absolute; inset: 0; margin: auto; width: min(62%, 300px); aspect-ratio: 1; border: 4px solid var(--color-peach); border-radius: 22px; box-shadow: 0 0 0 999px rgb(0 0 0 / 0.35); }
.cam__hint { position: absolute; left: 0; right: 0; bottom: 14px; margin: 0; text-align: center; color: #F7F1E8; font-weight: 600; text-shadow: 0 1px 3px rgb(0 0 0 / 0.6); }
.cam__off { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 12px; padding: 24px; text-align: center; color: #F7F1E8; }
.cam__off p { margin: 0; max-width: 40ch; }
.btn--light { background: #F7F1E8; color: #1F2A24; border: 0; }
.btn--light:hover { background: #FDB98A; }

.res { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 20px; text-align: center; outline: none; }
.res--ok { background: #0F5C4D; color: #F7F1E8; }
.res--bad { background: #A3174F; color: #FFFFFF; }
.res p { margin: 0; }
.res__title { font: 700 clamp(1.75rem, 5vw, 2.5rem)/1.05 var(--font-display); letter-spacing: -0.03em; margin-top: 4px !important; }
.res__action { font-size: 1.125rem; font-weight: 600; }
.res__det { margin-top: 8px; display: flex; flex-direction: column; gap: 2px; padding: 10px 14px; border-radius: 14px; background: rgb(255 255 255 / 0.14); font-size: 0.9375rem; min-width: min(320px, 100%); }
.res__det strong { font-size: 1.0625rem; }
.res__btns { display: flex; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 14px; }
.res__next { min-height: 52px; padding: 0 22px; font-size: 1rem; }
.res__undo { background: transparent; color: inherit; border: 1.5px solid currentColor; }
@media (prefers-reduced-motion: no-preference) { .res { animation: pop .18s ease-out; } }
:global([data-motion='reduce']) .res { animation: none !important; }
@keyframes pop { from { opacity: 0; transform: scale(0.98); } }

.cam__tools { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.toggle { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; cursor: pointer; font-weight: 500; }
.toggle input { width: 20px; height: 20px; accent-color: var(--color-forest); }

.manual, .settings { padding: 14px 16px; display: flex; flex-direction: column; gap: 8px; }
.manual__label { font-size: 0.875rem; font-weight: 600; }
.manual__row { display: flex; gap: 8px; }
.manual__input {
  flex: 1; min-width: 0; min-height: 48px; padding: 0 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: var(--color-white); color: var(--color-ink); font: 600 1.0625rem ui-monospace, monospace; text-transform: uppercase;
}
.manual__input:focus { outline: none; border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.manual__input[aria-invalid='true'] { border-color: var(--color-raspberry); }
.manual__error { margin: 0; font-size: 0.8125rem; color: var(--color-raspberry-dark); }
.settings summary { cursor: pointer; display: flex; align-items: center; gap: 8px; font-weight: 600; min-height: 32px; }
.settings #gate { text-transform: none; font-family: var(--font-body); }

.recent { padding: 16px 18px; }
.recent h2 { font-size: 1.25rem; margin-bottom: 8px; }
.recent__error { margin: 0 0 8px; padding: 8px 10px; border-radius: var(--radius-md); background: var(--tint-raspberry); color: var(--color-raspberry-dark); font-size: 0.875rem; }
.recent__list { list-style: none; margin: 0; padding: 0; max-height: 560px; overflow-y: auto; }
.recent__item { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; gap: 10px; align-items: center; padding: 10px 0; border-top: 1px solid var(--track); }
.recent__item:first-child { border-top: 0; }
.recent__who, .recent__right { display: flex; flex-direction: column; min-width: 0; }
.recent__right { align-items: flex-end; font-size: 0.875rem; font-weight: 600; }
.recent__name { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.recent__undo { background: none; border: 0; padding: 4px 0; cursor: pointer; color: var(--color-raspberry-dark); font: 600 0.8125rem var(--font-body); text-decoration: underline; }
.is-ok { color: var(--color-forest-dark); }
.is-bad { color: var(--color-raspberry-dark); }
.muted { color: var(--text-secondary); font-size: 0.8125rem; font-weight: 400; }

/* Celular: el lector arriba, lo demás abajo */
@media (max-width: 900px) {
  .grid { grid-template-columns: minmax(0, 1fr); }
  .cam { aspect-ratio: 3 / 4; max-height: 70vh; }
}
</style>
