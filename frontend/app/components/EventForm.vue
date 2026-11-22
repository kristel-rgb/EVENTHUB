<script setup lang="ts">
// Formulario completo de evento (crear y editar).
// Flujo: se guarda como BORRADOR -> "Vista previa" para que la empresa organizadora
// lo revise y apruebe -> "Publicar" (revisa que no falte nada).
// Si el evento ya está publicado, los cambios se ven al instante en el sitio.
import type { OrganizerEvent } from '~/types/models'
import type { EventFormState } from '~/utils/eventForm'

const props = defineProps<{ event?: OrganizerEvent | null }>()

const route = useRoute()
const actions = useEventActions()
const { data: categories } = await useCategories()

const form = reactive<EventFormState>(props.event ? formFromEvent(props.event) : emptyEventForm())
const initial = ref(JSON.stringify(form))
const dirty = computed(() => JSON.stringify(form) !== initial.value)

const id = computed(() => props.event?._id ?? null)
const status = computed(() => props.event?.displayStatus ?? 'draft')
const isPublished = computed(() => status.value === 'published')
const readOnly = computed(() => status.value === 'cancelled' || status.value === 'finished')
const reserved = computed(() => props.event?.reserved ?? 0)

const errors = ref<Record<string, string>>({})
const serverError = ref<string | null>(null)
const notice = ref<{ tone: 'ok' | 'info', text: string } | null>(null)
const saving = ref<false | 'save' | 'publish' | 'preview'>(false)
const summaryBox = ref<HTMLElement | null>(null)

// ---------- Avisos al llegar ----------
if (route.query.duplicado === '1') {
  notice.value = { tone: 'info', text: 'Este evento es una copia y quedó como borrador. Podés cambiar cualquier dato; revisá sobre todo la fecha, la hora y el lugar antes de publicarlo.' }
}
else if (route.query.aviso === 'creado') {
  notice.value = { tone: 'ok', text: 'Borrador guardado. Ya podés abrir la vista previa para que la empresa organizadora lo revise, o publicarlo.' }
}
if (route.query.revisar === '1') errors.value = validateEventForm(form, true, reserved.value)

onMounted(() => {
  if (route.query.duplicado === '1') document.getElementById('ev-startDate')?.focus()
})

// ---------- Ayudas de presentación ----------
const checklist = computed(() => publishChecklist(form))
const missing = computed(() => checklist.value.filter(c => !c.ok && !c.optional).length)
const statusInfo: Record<string, { label: string, badge: string, text: string }> = {
  draft: { label: 'Borrador', badge: 'badge--warm', text: 'No es visible para el público.' },
  published: { label: 'Publicado', badge: 'badge--success', text: 'Visible en el sitio. Los cambios se ven al guardar.' },
  finished: { label: 'Finalizado', badge: 'badge--neutral', text: 'El evento ya ocurrió y no se puede editar.' },
  cancelled: { label: 'Cancelado', badge: 'badge--neutral', text: 'El evento fue cancelado y no se puede editar.' },
}
const errorList = computed(() => Object.entries(errors.value).filter(([, m]) => m))
const fieldLabel: Record<string, string> = {
  name: 'Nombre', category: 'Categoría', summary: 'Resumen', description: 'Descripción', imageAlt: 'Descripción de la imagen',
  startDate: 'Fecha', startTime: 'Hora de inicio', endTime: 'Hora de fin', venueName: 'Lugar', city: 'Ciudad', province: 'Provincia',
  capacity: 'Capacidad', price: 'Precio', maxPerPurchase: 'Máximo por compra', minAge: 'Edad mínima', doorsOpenMinutes: 'Apertura de puertas',
}

function clearError(field: string) {
  if (errors.value[field]) { const { [field]: _gone, ...rest } = errors.value; errors.value = rest }
}

// ---------- Imagen (subida tipo S3 con URL prefirmada) ----------
const uploading = ref(false)
const imageError = ref<string | null>(null)
async function onImage(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  imageError.value = null
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { imageError.value = 'Usá una imagen JPG, PNG o WebP.'; return }
  if (file.size > 5 * 1024 * 1024) { imageError.value = 'La imagen puede pesar hasta 5 MB.'; return }
  uploading.value = true
  try {
    form.imageUrl = await actions.uploadImage(file)
    if (!form.imageAlt) form.imageAlt = `Imagen de ${form.name || 'el evento'}`
  }
  catch (err) { imageError.value = readApiError(err).message }
  finally { uploading.value = false }
}

// ---------- Guardar, vista previa y publicar ----------
async function showErrors() {
  await nextTick()
  summaryBox.value?.focus()
}

async function save(mode: 'save' | 'publish' | 'preview') {
  serverError.value = null
  const full = mode === 'publish' || isPublished.value
  errors.value = validateEventForm(form, full, reserved.value)
  if (errorList.value.length) return showErrors()

  // La pestaña de la vista previa se abre ya (los navegadores bloquean las que se abren después)
  const previewTab = mode === 'preview' ? window.open('about:blank', '_blank') : null
  saving.value = mode
  try {
    const body = inputFromForm(form)
    const saved = id.value ? await actions.update(id.value, body) : await actions.create(body)
    initial.value = JSON.stringify(form)

    if (mode === 'publish') {
      await actions.publish(saved._id)
      return navigateTo('/organizador/eventos?aviso=publicado')
    }
    if (previewTab) previewTab.location.href = `/eventos/${saved._id}?vista=previa`
    if (!id.value) return navigateTo(`/organizador/eventos/${saved._id}/editar?aviso=creado`, { replace: true })
    if (isPublished.value) return navigateTo('/organizador/eventos?aviso=guardado')
    notice.value = { tone: 'ok', text: mode === 'preview' ? 'Borrador guardado. La vista previa se abrió en otra pestaña.' : 'Borrador guardado.' }
  }
  catch (err) {
    previewTab?.close()
    const e = readApiError(err)
    serverError.value = e.message
    if (e.details && typeof e.details === 'object') {
      const mapped: Record<string, string> = {}
      for (const [k, v] of Object.entries(e.details as Record<string, string>)) mapped[apiFieldToForm[k] ?? k] = v
      errors.value = mapped
    }
    showErrors()
  }
  finally {
    saving.value = false
  }
}

// ---------- Cambios sin guardar ----------
onBeforeRouteLeave(() => {
  if (dirty.value && !saving.value) return window.confirm('Tenés cambios sin guardar. ¿Salir de todas formas?')
})
function beforeUnload(e: BeforeUnloadEvent) { if (dirty.value) e.preventDefault() }
onMounted(() => window.addEventListener('beforeunload', beforeUnload))
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
</script>

<template>
  <div class="ef">
    <p v-if="notice" class="notice" :class="`notice--${notice.tone}`" role="status">
      <Icon :name="notice.tone === 'ok' ? 'lucide:circle-check' : 'lucide:copy'" size="18" />
      <span>{{ notice.text }}</span>
    </p>
    <p v-if="readOnly" class="notice notice--info" role="status">
      <Icon name="lucide:lock" size="18" /> <span>{{ statusInfo[status]?.text }}</span>
    </p>

    <!-- Resumen de errores (accesible: recibe el foco y enlaza a cada campo) -->
    <div v-if="errorList.length || serverError" ref="summaryBox" class="errors" tabindex="-1" role="alert">
      <p class="errors__title"><Icon name="lucide:circle-alert" size="18" /> {{ serverError ?? 'Revisá los datos marcados.' }}</p>
      <ul v-if="errorList.length">
        <li v-for="[k, m] in errorList" :key="k"><a :href="`#ev-${k}`">{{ fieldLabel[k] ?? k }}: {{ m }}</a></li>
      </ul>
    </div>

    <div class="ef__layout">
      <form class="ef__form" novalidate @submit.prevent="save('save')">
        <fieldset :disabled="readOnly" class="ef__fields">
          <!-- 1. Información básica -->
          <section class="card sec">
            <h2>Información básica</h2>
            <FormField id="ev-name" label="Nombre del evento" :error="errors.name">
              <template #default="{ id: fid, describedBy, invalid }">
                <input :id="fid" v-model="form.name" maxlength="120" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('name')">
              </template>
            </FormField>
            <FormField id="ev-category" label="Categoría" :error="errors.category">
              <template #default="{ id: fid, describedBy, invalid }">
                <select :id="fid" v-model="form.category" :aria-describedby="describedBy" :aria-invalid="invalid" @change="clearError('category')">
                  <option value="">Elegí una categoría</option>
                  <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
                </select>
              </template>
            </FormField>
            <FormField id="ev-summary" label="Resumen" :hint="`Una frase que aparece debajo del título. ${form.summary.length}/160`" :error="errors.summary">
              <template #default="{ id: fid, describedBy, invalid }">
                <textarea :id="fid" v-model="form.summary" rows="2" maxlength="160" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('summary')" />
              </template>
            </FormField>
            <FormField id="ev-description" label="Descripción completa" :hint="`Contá qué van a vivir los asistentes, el programa, artistas o invitados. Separá los párrafos con Enter. ${form.description.trim().length} caracteres (mínimo 40).`" :error="errors.description">
              <template #default="{ id: fid, describedBy, invalid }">
                <textarea :id="fid" v-model="form.description" rows="8" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('description')" />
              </template>
            </FormField>
          </section>

          <!-- 2. Imagen -->
          <section class="card sec">
            <h2>Imagen</h2>
            <div class="img">
              <div class="img__preview" :class="{ 'is-empty': !form.imageUrl }">
                <img v-if="form.imageUrl" :src="form.imageUrl" :alt="form.imageAlt">
                <span v-else><Icon name="lucide:image" size="28" /> Sin imagen: se mostrará el cartel de color de la categoría.</span>
              </div>
              <div class="img__actions">
                <label class="btn btn--outline img__upload" :class="{ 'is-busy': uploading }">
                  <Icon :name="uploading ? 'lucide:loader-circle' : 'lucide:upload'" size="16" :class="{ spin: uploading }" />
                  {{ uploading ? 'Subiendo…' : form.imageUrl ? 'Cambiar imagen' : 'Subir imagen' }}
                  <input type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" :disabled="uploading || readOnly" @change="onImage">
                </label>
                <button v-if="form.imageUrl" type="button" class="btn btn--ghost" @click="form.imageUrl = null; clearError('imageAlt')">Quitar</button>
                <p class="img__hint">JPG, PNG o WebP de hasta 5 MB. Recomendado: 1200 × 750 px.</p>
                <p v-if="imageError" class="img__error" role="alert">{{ imageError }}</p>
              </div>
            </div>
            <FormField v-if="form.imageUrl" id="ev-imageAlt" label="Descripción de la imagen" hint="Para personas que usan lector de pantalla. Ej.: Banda tocando en un escenario con luces azules." :error="errors.imageAlt">
              <template #default="{ id: fid, describedBy, invalid }">
                <input :id="fid" v-model="form.imageAlt" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('imageAlt')">
              </template>
            </FormField>
          </section>

          <!-- 3. Fecha y hora -->
          <section class="card sec">
            <h2>Fecha y hora</h2>
            <div class="grid grid--4">
              <FormField id="ev-startDate" label="Fecha" :error="errors.startDate">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.startDate" type="date" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('startDate')">
                </template>
              </FormField>
              <FormField id="ev-startTime" label="Hora de inicio" :error="errors.startTime">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.startTime" type="time" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('startTime')">
                </template>
              </FormField>
              <FormField id="ev-endTime" label="Hora de fin" optional hint="Si es antes del inicio, se toma el día siguiente." :error="errors.endTime">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.endTime" type="time" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('endTime')">
                </template>
              </FormField>
              <FormField id="ev-doorsOpenMinutes" label="Apertura de puertas">
                <template #default="{ id: fid }">
                  <select :id="fid" v-model.number="form.doorsOpenMinutes">
                    <option v-for="m in doorsOptions" :key="m" :value="m">{{ m === 0 ? 'A la hora de inicio' : `${m} min antes` }}</option>
                  </select>
                </template>
              </FormField>
            </div>
          </section>

          <!-- 4. Lugar -->
          <section class="card sec">
            <h2>Lugar</h2>
            <div class="grid grid--2">
              <FormField id="ev-venueName" label="Nombre del lugar" hint="Ej.: Centro de Eventos Pedregal" :error="errors.venueName">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.venueName" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('venueName')">
                </template>
              </FormField>
              <FormField id="ev-address" label="Dirección" optional hint="Señas para llegar.">
                <template #default="{ id: fid, describedBy }">
                  <input :id="fid" v-model="form.address" :aria-describedby="describedBy">
                </template>
              </FormField>
              <FormField id="ev-city" label="Ciudad o cantón" :error="errors.city">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.city" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('city')">
                </template>
              </FormField>
              <FormField id="ev-province" label="Provincia" :error="errors.province">
                <template #default="{ id: fid, describedBy, invalid }">
                  <select :id="fid" v-model="form.province" :aria-describedby="describedBy" :aria-invalid="invalid" @change="clearError('province')">
                    <option value="">Elegí una provincia</option>
                    <option v-for="p in provinces" :key="p" :value="p">{{ p }}</option>
                  </select>
                </template>
              </FormField>
            </div>
          </section>

          <!-- 5. Entradas -->
          <section class="card sec">
            <h2>Entradas</h2>
            <div class="grid grid--3">
              <FormField id="ev-capacity" label="Capacidad" :hint="reserved ? `Ya hay ${reserved} reservados.` : 'Cantidad total de espacios.'" :error="errors.capacity">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model.number="form.capacity" type="number" min="1" step="1" inputmode="numeric" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('capacity')">
                </template>
              </FormField>
              <FormField id="ev-price" label="Precio por entrada (₡)" :error="errors.price">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model.number="form.price" type="number" min="0" step="500" inputmode="numeric" :disabled="form.isFree" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('price')">
                </template>
              </FormField>
              <FormField id="ev-maxPerPurchase" label="Máximo por compra">
                <template #default="{ id: fid }">
                  <select :id="fid" v-model.number="form.maxPerPurchase">
                    <option v-for="n in 10" :key="n" :value="n">{{ n }} {{ n === 1 ? 'entrada' : 'entradas' }}</option>
                  </select>
                </template>
              </FormField>
            </div>
            <label class="check">
              <input v-model="form.isFree" type="checkbox" @change="clearError('price')">
              <span>Evento gratuito (se reserva sin pagar)</span>
            </label>
          </section>

          <!-- 6. Información para asistentes -->
          <section class="card sec">
            <h2>Información para asistentes</h2>
            <fieldset class="group">
              <legend>Edad mínima</legend>
              <div class="chips">
                <label v-for="o in minAgeOptions" :key="o.value" class="chip" :class="{ 'is-on': form.minAge === o.value }">
                  <input v-model.number="form.minAge" type="radio" name="minAge" :value="o.value" class="sr-only">
                  {{ o.label }}
                </label>
              </div>
            </fieldset>
            <fieldset class="group">
              <legend>Accesibilidad y servicios</legend>
              <div class="checks">
                <label v-for="o in accessibilityOptions" :key="o.value" class="check">
                  <input v-model="form.accessibility" type="checkbox" :value="o.value">
                  <span>{{ o.label }}</span>
                </label>
              </div>
            </fieldset>
            <FormField id="ev-importantInfo" label="Información importante" optional hint="Lo que deben saber antes de ir: objetos prohibidos, código de vestimenta, qué incluye la entrada… Una indicación por línea.">
              <template #default="{ id: fid, describedBy }">
                <textarea :id="fid" v-model="form.importantInfo" rows="4" :aria-describedby="describedBy" />
              </template>
            </FormField>
          </section>
        </fieldset>
      </form>

      <!-- Panel lateral: estado y acciones -->
      <aside class="side">
        <div class="card side__box">
          <p class="side__label">Estado</p>
          <span class="badge" :class="statusInfo[status]?.badge">{{ statusInfo[status]?.label }}</span>
          <p class="side__text">{{ statusInfo[status]?.text }}</p>
          <p v-if="event?.updatedAt" class="side__meta">Última edición: {{ formatEventDate(event.updatedAt) }}</p>
          <p v-if="dirty && !readOnly" class="side__dirty"><Icon name="lucide:circle-dot" size="14" /> Cambios sin guardar</p>

          <template v-if="status === 'draft'">
            <p class="side__label side__label--mt">Para publicar {{ missing ? `(faltan ${missing})` : '' }}</p>
            <ul class="todo">
              <li v-for="c in checklist" :key="c.label" :class="{ 'is-ok': c.ok, 'is-opt': c.optional }">
                <Icon :name="c.ok ? 'lucide:circle-check' : 'lucide:circle'" size="16" /> {{ c.label }}
              </li>
            </ul>
          </template>

          <div v-if="!readOnly" class="side__actions">
            <template v-if="status === 'draft'">
              <button type="button" class="btn btn--primary" :disabled="Boolean(saving)" @click="save('publish')">
                <Icon :name="saving === 'publish' ? 'lucide:loader-circle' : 'lucide:send'" size="16" :class="{ spin: saving === 'publish' }" /> Publicar
              </button>
              <button type="button" class="btn btn--outline" :disabled="Boolean(saving)" @click="save('preview')">
                <Icon name="lucide:eye" size="16" /> Vista previa
              </button>
              <button type="button" class="btn btn--ghost" :disabled="Boolean(saving)" @click="save('save')">
                <Icon :name="saving === 'save' ? 'lucide:loader-circle' : 'lucide:save'" size="16" :class="{ spin: saving === 'save' }" /> Guardar borrador
              </button>
              <p class="side__help">La vista previa se abre en otra pestaña para que la empresa organizadora revise el evento antes de publicarlo.</p>
            </template>
            <template v-else>
              <button type="button" class="btn btn--primary" :disabled="Boolean(saving)" @click="save('save')">
                <Icon :name="saving ? 'lucide:loader-circle' : 'lucide:save'" size="16" :class="{ spin: saving }" /> Guardar cambios
              </button>
              <NuxtLink :to="`/eventos/${event?._id}`" target="_blank" class="btn btn--outline"><Icon name="lucide:external-link" size="16" /> Ver en el sitio</NuxtLink>
            </template>
          </div>
          <NuxtLink to="/organizador/eventos" class="side__back"><Icon name="lucide:arrow-left" size="16" /> Volver a Mis eventos</NuxtLink>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.ef { display: flex; flex-direction: column; gap: 16px; }
.notice { margin: 0; display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md); }
.notice--ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.notice--info { background: var(--tint-peach); color: var(--tint-peach-text); }

.errors { padding: 14px 16px; border-radius: var(--radius-md); background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.errors:focus { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.errors__title { margin: 0; display: flex; gap: 8px; align-items: center; font-weight: 600; }
.errors ul { margin: 8px 0 0; padding-left: 22px; }
.errors a { color: inherit; }

.ef__layout { display: grid; grid-template-columns: minmax(0, 1fr) 300px; gap: 20px; align-items: start; }
.ef__fields { border: 0; margin: 0; padding: 0; min-width: 0; display: flex; flex-direction: column; gap: 16px; }
.sec { padding: 20px; display: flex; flex-direction: column; gap: 16px; }
.sec h2 { font-size: 1.25rem; }
.grid { display: grid; gap: 14px; }
.grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.ef :deep(textarea) {
  width: 100%; padding: 12px 14px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: var(--color-white); color: var(--color-ink); font: 1rem/1.55 var(--font-body); resize: vertical;
}
.ef :deep(textarea:focus) { outline: none; border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.ef :deep(input:disabled), .ef :deep(select:disabled), .ef :deep(textarea:disabled) { opacity: 0.6; cursor: not-allowed; }

.img { display: flex; gap: 16px; align-items: flex-start; flex-wrap: wrap; }
.img__preview { width: 240px; aspect-ratio: 16 / 10; border-radius: var(--radius-md); overflow: hidden; background: var(--tint-neutral); }
.img__preview img { width: 100%; height: 100%; object-fit: cover; }
.img__preview.is-empty { display: flex; align-items: center; justify-content: center; padding: 14px; text-align: center; color: var(--text-secondary); font-size: 0.8125rem; border: 1.5px dashed var(--border); }
.img__preview.is-empty span { display: flex; flex-direction: column; align-items: center; gap: 6px; }
.img__actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; flex: 1; min-width: 220px; }
.img__upload { cursor: pointer; }
.img__upload:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.img__upload.is-busy { cursor: progress; }
.img__hint { width: 100%; margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.img__error { width: 100%; margin: 0; font-size: 0.8125rem; color: var(--color-raspberry-dark); }

.check { display: flex; gap: 10px; align-items: center; cursor: pointer; font-size: 0.9375rem; min-height: 36px; }
.check input { width: 20px; height: 20px; accent-color: var(--color-forest); flex-shrink: 0; }
.checks { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px 16px; }
.group { border: 0; margin: 0; padding: 0; }
.group legend { padding: 0; margin-bottom: 8px; font-weight: 600; font-size: 0.875rem; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  min-height: 40px; padding: 0 14px; border-radius: var(--radius-pill); cursor: pointer;
  display: inline-flex; align-items: center; border: 1.5px solid var(--border); background: var(--color-white); font-size: 0.875rem; font-weight: 500;
}
.chip.is-on { background: var(--color-forest); border-color: var(--color-forest); color: var(--color-white); }
.chip:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }

.side { position: sticky; top: 20px; }
.side__box { padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.side__label { margin: 0; font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); }
.side__label--mt { margin-top: 10px; }
.side__box .badge { align-self: flex-start; }
.side__text, .side__meta { margin: 0; font-size: 0.875rem; color: var(--text-secondary); }
.side__dirty { margin: 0; display: flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--tint-peach-text); font-weight: 600; }
.todo { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; font-size: 0.875rem; }
.todo li { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); }
.todo li.is-ok { color: var(--color-forest-dark); }
.todo li.is-opt:not(.is-ok) { opacity: 0.8; }
.side__actions { display: flex; flex-direction: column; gap: 8px; margin-top: 12px; }
.side__actions .btn { width: 100%; }
.side__actions .btn:disabled { opacity: 0.6; cursor: progress; }
.side__help { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.side__back { display: inline-flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 0.875rem; font-weight: 600; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

@media (max-width: 1100px) {
  .ef__layout { grid-template-columns: minmax(0, 1fr); }
  .side { position: static; order: -1; }
  .grid--4 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 640px) {
  .grid--2, .grid--3, .grid--4, .checks { grid-template-columns: minmax(0, 1fr); }
  .img__preview { width: 100%; }
}
</style>
