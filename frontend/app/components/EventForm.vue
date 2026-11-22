<script setup lang="ts">
// Formulario completo de evento (crear y editar), en 5 pasos dentro de una sola página:
// Información · Fecha y lugar · Entradas · Detalles · Revisar.
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
if (route.query.revisar === '1') errors.value = validateEventForm(form, true)

onMounted(() => {
  if (route.query.duplicado === '1') document.getElementById('ev-startDate')?.focus()
})

// ---------- Pasos ----------
const steps = [
  { id: 'info', label: 'Información', anchor: 'sec-info' },
  { id: 'when', label: 'Fecha y lugar', anchor: 'sec-when' },
  { id: 'tickets', label: 'Entradas', anchor: 'sec-tickets' },
  { id: 'details', label: 'Detalles', anchor: 'sec-details' },
  { id: 'review', label: 'Revisar', anchor: 'sec-review' },
]
const checklist = computed(() => publishChecklist(form))
const missing = computed(() => checklist.value.filter(c => !c.ok && !c.optional).length)
const stepDone = (stepId: string) => stepId === 'review'
  ? missing.value === 0
  : checklist.value.filter(c => c.step === stepId && !c.optional).every(c => c.ok)
const activeStep = ref('info')
let observer: IntersectionObserver | null = null
onMounted(() => {
  observer = new IntersectionObserver((entries) => {
    const visible = entries.filter(e => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
    const found = visible && steps.find(s => s.anchor === visible.target.id)
    if (found) activeStep.value = found.id
  }, { rootMargin: '-20% 0px -60% 0px' })
  steps.forEach(s => document.getElementById(s.anchor) && observer!.observe(document.getElementById(s.anchor)!))
})
onBeforeUnmount(() => observer?.disconnect())
function goTo(anchor: string) {
  const el = document.getElementById(anchor)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.motion === 'reduce'
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' })
  el.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true })
}

// ---------- Ayudas de presentación ----------
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
  ticketTypes: 'Tipos de entrada', maxPerPurchase: 'Máximo por compra', minAge: 'Edad mínima', doorsOpenMinutes: 'Apertura de puertas',
  cancellationPolicy: 'Política de cancelación', contactEmail: 'Correo para consultas', contactPhone: 'Teléfono para consultas',
}
function labelOf(key: string) {
  const m = key.match(/^ticketTypes\.(\d+)\.(\w+)$/)
  if (m) {
    const row = form.ticketTypes[Number(m[1])]
    const field = { name: 'nombre', price: 'precio', capacity: 'cupos' }[m[2]!] ?? m[2]
    return `Entrada «${row?.name || `tipo ${Number(m[1]) + 1}`}», ${field}`
  }
  return fieldLabel[key] ?? key
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

// ---------- Mapa (se actualiza un momento después de dejar de escribir) ----------
const mapQuery = ref('')
const placeText = computed(() => [form.venueName, form.address, form.city, form.province].map(s => s.trim()).filter(Boolean).join(', '))
let mapTimer = 0
watch(placeText, (q) => {
  clearTimeout(mapTimer)
  mapTimer = window.setTimeout(() => { mapQuery.value = form.venueName.trim() && form.city.trim() ? `${q}, Costa Rica` : '' }, 800)
}, { immediate: import.meta.client })
const mapEmbed = computed(() => (mapQuery.value ? `https://www.google.com/maps?q=${encodeURIComponent(mapQuery.value)}&output=embed` : ''))
const mapLink = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery.value)}`)

// ---------- Tipos de entrada ----------
const totals = computed(() => ticketTotals(form))
function addType() {
  if (form.ticketTypes.length >= MAX_TICKET_TYPES) return
  form.ticketTypes.push(newTicketRow())
  nextTick(() => document.getElementById(`ev-${ticketKey(form.ticketTypes.length - 1, 'name')}`)?.focus())
}
function removeType(i: number) {
  const row = form.ticketTypes[i]
  if (!row || row.sold > 0 || form.ticketTypes.length === 1) return
  form.ticketTypes.splice(i, 1)
  // Los errores de las filas cambian de posición: se vuelven a calcular al guardar
  errors.value = Object.fromEntries(Object.entries(errors.value).filter(([k]) => !k.startsWith('ticketTypes')))
}

// ---------- Revisar ----------
const categoryName = computed(() => categories.value?.find(c => c._id === form.category)?.name ?? '—')
const startIso = computed(() => fromCrParts(form.startDate, form.startTime))
const policyLabel = computed(() => cancellationOptions.find(o => o.value === form.cancellationPolicy)?.label ?? '—')

// ---------- Guardar, vista previa y publicar ----------
async function showErrors() {
  await nextTick()
  summaryBox.value?.focus()
}

async function save(mode: 'save' | 'publish' | 'preview') {
  serverError.value = null
  const full = mode === 'publish' || isPublished.value
  errors.value = validateEventForm(form, full)
  if (errorList.value.length) return showErrors()

  // La pestaña de la vista previa se abre ya (los navegadores bloquean las que se abren después)
  const previewTab = mode === 'preview' ? window.open('about:blank', '_blank') : null
  saving.value = mode
  try {
    const body = inputFromForm(form)
    const saved = id.value ? await actions.update(id.value, body) : await actions.create(body)
    // Los tipos nuevos ya tienen _id: se guardan para que la próxima edición los reconozca
    form.ticketTypes = saved.ticketTypes.length
      ? saved.ticketTypes.map(t => ({ _id: t._id, name: t.name, price: t.price, capacity: t.capacity, sold: t.sold ?? 0 }))
      : form.ticketTypes
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
onBeforeUnmount(() => { window.removeEventListener('beforeunload', beforeUnload); clearTimeout(mapTimer) })
</script>

<template>
  <div class="ef">
    <!-- Pasos (atajos dentro de la misma página) -->
    <nav class="steps card" aria-label="Pasos del formulario">
      <ol>
        <li v-for="(s, i) in steps" :key="s.id">
          <button
            type="button" class="steps__btn"
            :class="{ 'is-done': stepDone(s.id), 'is-active': activeStep === s.id }"
            :aria-current="activeStep === s.id ? 'step' : undefined"
            @click="goTo(s.anchor)"
          >
            <span class="steps__num" aria-hidden="true">
              <Icon v-if="stepDone(s.id)" name="lucide:check" size="14" /><template v-else>{{ i + 1 }}</template>
            </span>
            <span>{{ s.label }}</span>
            <span v-if="stepDone(s.id)" class="sr-only">(completo)</span>
          </button>
        </li>
      </ol>
    </nav>

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
        <li v-for="[k, m] in errorList" :key="k"><a :href="`#ev-${k}`">{{ labelOf(k) }}: {{ m }}</a></li>
      </ul>
    </div>

    <div class="ef__layout">
      <form class="ef__form" novalidate @submit.prevent="save('save')">
        <fieldset :disabled="readOnly" class="ef__fields">
          <!-- ===== 1. Información ===== -->
          <section id="sec-info" class="card sec" aria-labelledby="h-info">
            <h2 id="h-info" tabindex="-1"><span class="sec__n">1</span> Información básica</h2>
            <FormField id="ev-name" label="Nombre del evento" :error="errors.name">
              <template #default="{ id: fid, describedBy, invalid }">
                <input :id="fid" v-model="form.name" maxlength="120" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('name')">
              </template>
            </FormField>
            <div class="grid grid--2">
              <FormField id="ev-category" label="Categoría" :error="errors.category">
                <template #default="{ id: fid, describedBy, invalid }">
                  <select :id="fid" v-model="form.category" :aria-describedby="describedBy" :aria-invalid="invalid" @change="clearError('category')">
                    <option value="">Elegí una categoría</option>
                    <option v-for="c in categories" :key="c._id" :value="c._id">{{ c.name }}</option>
                  </select>
                </template>
              </FormField>
              <FormField id="ev-summary" label="Resumen" :hint="`Una frase debajo del título. ${form.summary.length}/160`" :error="errors.summary">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.summary" maxlength="160" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('summary')">
                </template>
              </FormField>
            </div>
            <FormField id="ev-description" label="Descripción completa" :hint="`Contá qué van a vivir los asistentes, el programa, artistas o invitados. Separá los párrafos con Enter. ${form.description.trim().length} caracteres (mínimo 40).`" :error="errors.description">
              <template #default="{ id: fid, describedBy, invalid }">
                <textarea :id="fid" v-model="form.description" rows="7" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('description')" />
              </template>
            </FormField>

            <h3 class="sub">Imagen</h3>
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

          <!-- ===== 2. Fecha y lugar ===== -->
          <section id="sec-when" class="card sec" aria-labelledby="h-when">
            <h2 id="h-when" tabindex="-1"><span class="sec__n">2</span> Fecha y lugar</h2>
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

            <h3 class="sub">Lugar</h3>
            <div class="grid grid--2">
              <FormField id="ev-venueName" label="Nombre del lugar" hint="Ej.: Teatro Nacional" :error="errors.venueName">
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
            <div class="map">
              <iframe
                v-if="mapEmbed" :src="mapEmbed" :title="`Mapa de ${form.venueName}`" class="map__frame"
                loading="lazy" referrerpolicy="no-referrer-when-downgrade"
              />
              <div v-else class="map__empty"><Icon name="lucide:map-pin" size="22" /> Escribí el lugar y la ciudad para ver el mapa y confirmar que la dirección es la correcta.</div>
              <a v-if="mapEmbed" :href="mapLink" target="_blank" rel="noopener" class="map__link">Abrir en Google Maps <Icon name="lucide:external-link" size="14" /></a>
            </div>
          </section>

          <!-- ===== 3. Entradas ===== -->
          <section id="sec-tickets" class="card sec" aria-labelledby="h-tickets">
            <h2 id="h-tickets" tabindex="-1"><span class="sec__n">3</span> Tipos de entrada</h2>
            <p class="sec__help">Por ejemplo General, VIP o Preventa. Cada tipo tiene su precio y sus cupos; la capacidad del evento es la suma.</p>
            <p v-if="errors.ticketTypes" id="ev-ticketTypes" class="field-error" role="alert"><Icon name="lucide:circle-alert" size="14" /> {{ errors.ticketTypes }}</p>

            <div class="tt" role="group" aria-label="Tipos de entrada">
              <div class="tt__head" aria-hidden="true"><span>Tipo</span><span>Precio (₡)</span><span>Cupos</span><span /></div>
              <div v-for="(t, i) in form.ticketTypes" :key="t._id ?? `new-${i}`" class="tt__row">
                <div class="tt__cell">
                  <label :for="`ev-${ticketKey(i, 'name')}`" class="sr-only">Nombre del tipo {{ i + 1 }}</label>
                  <input
                    :id="`ev-${ticketKey(i, 'name')}`" v-model="t.name" maxlength="40" placeholder="General"
                    :aria-invalid="Boolean(errors[ticketKey(i, 'name')])" :aria-describedby="errors[ticketKey(i, 'name')] ? `err-${i}-name` : undefined"
                    @input="clearError(ticketKey(i, 'name'))"
                  >
                  <span v-if="errors[ticketKey(i, 'name')]" :id="`err-${i}-name`" class="tt__err">{{ errors[ticketKey(i, 'name')] }}</span>
                </div>
                <div class="tt__cell">
                  <label :for="`ev-${ticketKey(i, 'price')}`" class="sr-only">Precio de {{ t.name || `tipo ${i + 1}` }}</label>
                  <input
                    :id="`ev-${ticketKey(i, 'price')}`" v-model.number="t.price" type="number" min="0" step="500" inputmode="numeric"
                    :disabled="form.isFree" :placeholder="form.isFree ? 'Gratis' : '12000'"
                    :aria-invalid="Boolean(errors[ticketKey(i, 'price')])" :aria-describedby="errors[ticketKey(i, 'price')] ? `err-${i}-price` : undefined"
                    @input="clearError(ticketKey(i, 'price'))"
                  >
                  <span v-if="errors[ticketKey(i, 'price')]" :id="`err-${i}-price`" class="tt__err">{{ errors[ticketKey(i, 'price')] }}</span>
                </div>
                <div class="tt__cell">
                  <label :for="`ev-${ticketKey(i, 'capacity')}`" class="sr-only">Cupos de {{ t.name || `tipo ${i + 1}` }}</label>
                  <input
                    :id="`ev-${ticketKey(i, 'capacity')}`" v-model.number="t.capacity" type="number" :min="Math.max(1, t.sold)" step="1" inputmode="numeric" placeholder="100"
                    :aria-invalid="Boolean(errors[ticketKey(i, 'capacity')])" :aria-describedby="`sold-${i} ${errors[ticketKey(i, 'capacity')] ? `err-${i}-capacity` : ''}`"
                    @input="clearError(ticketKey(i, 'capacity'))"
                  >
                  <span :id="`sold-${i}`" class="tt__sold">{{ t.sold ? `${t.sold} vendidas` : '' }}</span>
                  <span v-if="errors[ticketKey(i, 'capacity')]" :id="`err-${i}-capacity`" class="tt__err">{{ errors[ticketKey(i, 'capacity')] }}</span>
                </div>
                <button
                  type="button" class="tt__remove" :disabled="t.sold > 0 || form.ticketTypes.length === 1"
                  :title="t.sold > 0 ? 'Tiene entradas vendidas: no se puede quitar' : 'Quitar este tipo'"
                  :aria-label="`Quitar ${t.name || `tipo ${i + 1}`}`" @click="removeType(i)"
                >
                  <Icon name="lucide:trash-2" size="16" />
                </button>
              </div>
            </div>

            <div class="tt__foot">
              <button v-if="form.ticketTypes.length < MAX_TICKET_TYPES" type="button" class="btn btn--outline" @click="addType">
                <Icon name="lucide:plus" size="16" /> Agregar tipo
              </button>
              <p class="tt__total" aria-live="polite">
                Capacidad total: <strong>{{ formatNumber(totals.capacity) }}</strong>
                <template v-if="totals.minPrice !== null"> · {{ totals.minPrice === 0 ? 'Gratis' : `Desde ${formatPrice(totals.minPrice)}` }}</template>
              </p>
            </div>

            <div class="grid grid--2">
              <label class="check">
                <input v-model="form.isFree" type="checkbox" @change="Object.keys(errors).filter(k => k.endsWith('.price')).forEach(clearError)">
                <span>Evento gratuito (se reserva sin pagar)</span>
              </label>
              <FormField id="ev-maxPerPurchase" label="Máximo por compra">
                <template #default="{ id: fid }">
                  <select :id="fid" v-model.number="form.maxPerPurchase">
                    <option v-for="n in 10" :key="n" :value="n">{{ n }} {{ n === 1 ? 'entrada' : 'entradas' }}</option>
                  </select>
                </template>
              </FormField>
            </div>
          </section>

          <!-- ===== 4. Detalles ===== -->
          <section id="sec-details" class="card sec" aria-labelledby="h-details">
            <h2 id="h-details" tabindex="-1"><span class="sec__n">4</span> Información para asistentes</h2>
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
                <textarea :id="fid" v-model="form.importantInfo" rows="3" :aria-describedby="describedBy" />
              </template>
            </FormField>

            <h3 class="sub">Política y contacto</h3>
            <div class="grid grid--3">
              <FormField id="ev-cancellationPolicy" label="Cancelaciones del cliente" :hint="cancellationOptions.find(o => o.value === form.cancellationPolicy)?.text" :error="errors.cancellationPolicy">
                <template #default="{ id: fid, describedBy, invalid }">
                  <select :id="fid" v-model="form.cancellationPolicy" :aria-describedby="describedBy" :aria-invalid="invalid">
                    <option v-for="o in cancellationOptions" :key="o.value" :value="o.value">{{ o.label }}</option>
                  </select>
                </template>
              </FormField>
              <FormField id="ev-contactEmail" label="Correo para consultas" hint="Aparece en el detalle del evento." :error="errors.contactEmail">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.contactEmail" type="email" autocomplete="email" placeholder="info@tuorganizacion.cr" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('contactEmail')">
                </template>
              </FormField>
              <FormField id="ev-contactPhone" label="Teléfono para consultas" optional :error="errors.contactPhone">
                <template #default="{ id: fid, describedBy, invalid }">
                  <input :id="fid" v-model="form.contactPhone" type="tel" inputmode="numeric" placeholder="2222-3333" :aria-describedby="describedBy" :aria-invalid="invalid" @input="clearError('contactPhone')">
                </template>
              </FormField>
            </div>
          </section>

          <!-- ===== 5. Revisar ===== -->
          <section id="sec-review" class="card sec" aria-labelledby="h-review">
            <h2 id="h-review" tabindex="-1"><span class="sec__n">5</span> Revisar</h2>
            <dl class="review">
              <div><dt>Evento</dt><dd>{{ form.name || '—' }}<span class="muted">{{ categoryName }}</span></dd></div>
              <div><dt>Fecha</dt><dd class="cap">{{ startIso ? formatEventDate(startIso) : '—' }}</dd></div>
              <div><dt>Lugar</dt><dd>{{ placeText || '—' }}</dd></div>
              <div>
                <dt>Entradas</dt>
                <dd>
                  <span v-for="t in form.ticketTypes.filter(x => x.name.trim())" :key="t._id ?? t.name" class="review__type">
                    {{ t.name }} · {{ form.isFree || Number(t.price) === 0 ? 'Gratis' : formatPrice(Number(t.price) || 0) }} · {{ t.capacity || 0 }} cupos
                  </span>
                  <span class="muted">Capacidad total {{ formatNumber(totals.capacity) }} · máx. {{ form.maxPerPurchase }} por compra</span>
                </dd>
              </div>
              <div><dt>Cancelaciones</dt><dd>{{ policyLabel }}</dd></div>
              <div><dt>Contacto</dt><dd>{{ form.contactEmail || '—' }}<span v-if="form.contactPhone" class="muted">{{ form.contactPhone }}</span></dd></div>
            </dl>
            <p v-if="status === 'draft'" class="review__note" :class="{ 'is-ok': missing === 0 }">
              <Icon :name="missing === 0 ? 'lucide:circle-check' : 'lucide:info'" size="18" />
              {{ missing === 0 ? 'Todo listo. Abrí la vista previa para que la empresa organizadora lo apruebe y después publicalo.' : `Faltan ${missing} ${missing === 1 ? 'dato' : 'datos'} para poder publicar (ver la lista de la derecha).` }}
            </p>
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

.steps { position: sticky; top: 8px; z-index: 4; padding: 8px 10px; }
.steps ol { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
.steps__btn {
  width: 100%; min-height: 44px; display: flex; align-items: center; gap: 8px; padding: 6px 10px; cursor: pointer;
  background: transparent; border: 0; border-top: 3px solid var(--track); border-radius: 0; color: var(--text-secondary);
  font: 600 0.875rem var(--font-body); text-align: left;
}
.steps__btn:hover { color: var(--color-ink); }
.steps__btn.is-done { border-top-color: var(--color-forest); color: var(--color-forest-dark); }
.steps__btn.is-active { border-top-color: var(--color-raspberry); color: var(--color-ink); }
.steps__num {
  width: 24px; height: 24px; border-radius: 50%; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;
  background: var(--tint-neutral); font-size: 0.75rem;
}
.steps__btn.is-done .steps__num { background: var(--color-forest); color: var(--color-white); }
.steps__btn.is-active .steps__num { background: var(--color-raspberry); color: var(--color-white); }

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
.sec { padding: 20px; display: flex; flex-direction: column; gap: 16px; scroll-margin-top: 80px; }
.sec h2 { font-size: 1.25rem; display: flex; align-items: center; gap: 10px; outline: none; }
.sec__n { width: 28px; height: 28px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: var(--color-ink); color: var(--color-sand); font-size: 0.875rem; }
.sec__help { margin: -8px 0 0; color: var(--text-secondary); font-size: 0.9375rem; }
.sub { font-size: 1rem; font-family: var(--font-body); font-weight: 700; margin-top: 6px; padding-top: 14px; border-top: 1px solid var(--track); }
.grid { display: grid; gap: 14px; }
.grid--2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
.grid--3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.grid--4 { grid-template-columns: repeat(4, minmax(0, 1fr)); }

.ef :deep(textarea), .tt input {
  width: 100%; padding: 10px 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: var(--color-white); color: var(--color-ink); font: 1rem/1.5 var(--font-body);
}
.ef :deep(textarea) { resize: vertical; }
.ef :deep(textarea:focus), .tt input:focus { outline: none; border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.tt input[aria-invalid='true'] { border-color: var(--color-raspberry); }
.ef :deep(input:disabled), .ef :deep(select:disabled), .ef :deep(textarea:disabled) { opacity: 0.6; cursor: not-allowed; }
.field-error { margin: 0; display: flex; gap: 6px; align-items: center; font-size: 0.875rem; color: var(--color-raspberry-dark); }

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

.map { position: relative; }
.map__frame { width: 100%; height: 240px; border: 0; border-radius: var(--radius-md); display: block; background: var(--tint-neutral); }
.map__empty { display: flex; gap: 10px; align-items: center; padding: 18px; border-radius: var(--radius-md); border: 1.5px dashed var(--border); color: var(--text-secondary); font-size: 0.9375rem; }
.map__link { display: inline-flex; align-items: center; gap: 4px; margin-top: 6px; font-size: 0.875rem; font-weight: 600; }

.tt { display: flex; flex-direction: column; gap: 8px; }
.tt__head, .tt__row { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr) 44px; gap: 10px; align-items: start; }
.tt__head { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); }
.tt__cell { display: flex; flex-direction: column; gap: 3px; min-width: 0; }
.tt__err { font-size: 0.75rem; color: var(--color-raspberry-dark); }
.tt__sold { font-size: 0.75rem; color: var(--text-secondary); min-height: 0; }
.tt__sold:empty { display: none; }
.tt__remove { width: 44px; height: 46px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-raspberry-dark); cursor: pointer; display: inline-flex; align-items: center; justify-content: center; }
.tt__remove:hover:not(:disabled) { background: var(--tint-raspberry); }
.tt__remove:disabled { opacity: 0.35; cursor: not-allowed; color: var(--text-secondary); }
.tt__foot { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; }
.tt__total { margin: 0; color: var(--text-secondary); }
.tt__total strong { color: var(--color-ink); }

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

.review { margin: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px 20px; }
.review dt { font-size: 0.8125rem; color: var(--text-secondary); }
.review dd { margin: 2px 0 0; font-weight: 500; display: flex; flex-direction: column; gap: 2px; }
.review__type { display: block; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; font-weight: 400; }
.cap::first-letter { text-transform: uppercase; }
.review__note { margin: 0; display: flex; gap: 8px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-peach); color: var(--tint-peach-text); font-size: 0.9375rem; }
.review__note.is-ok { background: var(--tint-forest); color: var(--color-forest-dark); }

.side { position: sticky; top: 80px; }
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
  .grid--3 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .steps ol { grid-template-columns: repeat(5, minmax(44px, 1fr)); }
  .steps__btn span:not(.steps__num):not(.sr-only) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
  .steps__btn { justify-content: center; }
}
@media (max-width: 640px) {
  .grid--2, .grid--3, .grid--4, .checks, .review { grid-template-columns: minmax(0, 1fr); }
  .img__preview { width: 100%; }
  .tt__head { display: none; }
  .tt__row { grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) 44px; }
  .tt__row .tt__cell:first-child { grid-column: 1 / -1; }
}
</style>
