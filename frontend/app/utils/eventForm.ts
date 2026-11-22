// Formulario de eventos: estado, conversión a lo que espera la API y validaciones.
// Son las mismas reglas del backend; la validación que cuenta es la del servidor.
import type { AccessibilityFeature, EventInput, OrganizerEvent } from '~/types/models'

export interface EventFormState {
  name: string
  summary: string
  description: string
  category: string
  imageUrl: string | null
  imageAlt: string
  venueName: string
  address: string
  city: string
  province: string
  startDate: string        // AAAA-MM-DD (hora de Costa Rica)
  startTime: string        // HH:mm
  endTime: string          // HH:mm (si es menor que el inicio, termina al día siguiente)
  doorsOpenMinutes: number
  isFree: boolean
  price: number | null
  capacity: number | null
  maxPerPurchase: number
  minAge: number
  accessibility: AccessibilityFeature[]
  importantInfo: string
}

export const accessibilityOptions: { value: AccessibilityFeature, label: string }[] = [
  { value: 'wheelchair', label: 'Acceso para silla de ruedas' },
  { value: 'parking', label: 'Parqueo disponible' },
  { value: 'public_transport', label: 'Transporte público cerca' },
  { value: 'sign_language', label: 'Interpretación en LESCO' },
]

export const minAgeOptions = [
  { value: 0, label: 'Todo público' },
  { value: 12, label: 'Mayores de 12 años' },
  { value: 15, label: 'Mayores de 15 años' },
  { value: 18, label: 'Solo mayores de 18 años' },
]

export const doorsOptions = [0, 15, 30, 45, 60, 90, 120]

export function emptyEventForm(): EventFormState {
  return {
    name: '', summary: '', description: '', category: '', imageUrl: null, imageAlt: '',
    venueName: '', address: '', city: '', province: '',
    startDate: '', startTime: '', endTime: '', doorsOpenMinutes: 45,
    isFree: false, price: null, capacity: null, maxPerPurchase: 10, minAge: 0,
    accessibility: [], importantInfo: '',
  }
}

/** Evento de la API -> estado del formulario */
export function formFromEvent(e: OrganizerEvent): EventFormState {
  const start = toCrParts(e.date)
  const end = toCrParts(e.endDate)
  return {
    name: e.name, summary: e.summary ?? '', description: e.description ?? '', category: e.category?._id ?? '',
    imageUrl: e.imageUrl, imageAlt: e.imageAlt ?? '',
    venueName: e.venueName ?? '', address: e.address ?? '', city: e.city ?? '', province: e.province ?? '',
    startDate: start.date, startTime: start.time, endTime: end.time,
    doorsOpenMinutes: e.doorsOpenMinutes ?? 45,
    isFree: e.price === 0 && e.capacity > 0, price: e.price, capacity: e.capacity || null,
    maxPerPurchase: e.maxPerPurchase ?? 10, minAge: e.minAge ?? 0,
    accessibility: [...(e.accessibility ?? [])], importantInfo: e.importantInfo ?? '',
  }
}

/** Estado del formulario -> cuerpo para POST /events o PATCH /events/:id */
export function inputFromForm(f: EventFormState): Partial<EventInput> {
  const date = fromCrParts(f.startDate, f.startTime)
  let endDate: string | null = null
  if (date && f.endTime) {
    endDate = fromCrParts(f.startDate, f.endTime)
    if (endDate && endDate <= date) endDate = new Date(new Date(endDate).getTime() + 24 * 3600_000).toISOString()
  }
  const out: Partial<EventInput> = {
    name: f.name.trim(), summary: f.summary.trim(), description: f.description.trim(),
    imageUrl: f.imageUrl, imageAlt: f.imageAlt.trim(),
    venueName: f.venueName.trim(), address: f.address.trim(), city: f.city.trim(),
    doorsOpenMinutes: f.doorsOpenMinutes, maxPerPurchase: f.maxPerPurchase, minAge: f.minAge,
    accessibility: f.accessibility, importantInfo: f.importantInfo.trim(),
    endDate,
  }
  if (f.category) out.category = f.category
  if (f.province) out.province = f.province
  if (date) out.date = date
  if (f.capacity !== null && f.capacity !== undefined && String(f.capacity) !== '') out.capacity = Number(f.capacity)
  if (f.isFree) out.price = 0
  else if (f.price !== null && f.price !== undefined && String(f.price) !== '') out.price = Number(f.price)
  return out
}

/**
 * Valida el formulario. full = reglas para publicar (o para guardar un evento publicado).
 * Un borrador solo necesita el nombre.
 */
export function validateEventForm(f: EventFormState, full: boolean, reserved = 0) {
  const e: Record<string, string> = {}
  const empty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''
  const name = f.name.trim()
  if (name.length < 3) e.name = 'El nombre debe tener al menos 3 caracteres.'
  else if (name.length > 120) e.name = 'El nombre puede tener hasta 120 caracteres.'
  if (f.summary.trim().length > 160) e.summary = 'El resumen puede tener hasta 160 caracteres.'
  if (f.imageUrl && !f.imageAlt.trim()) e.imageAlt = 'Describí la imagen para personas que usan lector de pantalla.'

  const start = fromCrParts(f.startDate, f.startTime)
  if ((f.startDate || f.startTime) && !start) e.startTime = 'Indicá la fecha y la hora de inicio.'
  if (!empty(f.capacity) && (!Number.isInteger(Number(f.capacity)) || Number(f.capacity) < 1)) e.capacity = 'La capacidad debe ser un número entero mayor que 0.'
  if (!empty(f.capacity) && reserved && Number(f.capacity) < reserved) e.capacity = `Ya hay ${reserved} espacios reservados: la capacidad no puede ser menor.`
  if (!f.isFree && !empty(f.price) && (!Number.isInteger(Number(f.price)) || Number(f.price) < 0)) e.price = 'El precio debe ser un número entero de 0 o más.'

  if (full) {
    if (!f.category) e.category = 'Elegí una categoría.'
    if (!f.summary.trim()) e.summary = 'Escribí un resumen corto.'
    if (f.description.trim().length < 40) e.description = 'La descripción debe tener al menos 40 caracteres.'
    if (!f.startDate) e.startDate = 'Indicá la fecha.'
    if (!f.startTime) e.startTime = 'Indicá la hora de inicio.'
    else if (start && new Date(start).getTime() <= Date.now()) e.startDate = 'La fecha tiene que ser futura.'
    if (!f.venueName.trim()) e.venueName = 'Indicá el nombre del lugar.'
    if (!f.city.trim()) e.city = 'Indicá la ciudad o el cantón.'
    if (!f.province) e.province = 'Elegí la provincia.'
    if (empty(f.capacity) && !e.capacity) e.capacity = 'Indicá la capacidad.'
    if (!f.isFree && empty(f.price)) e.price = 'Indicá el precio o marcá que es gratis.'
  }
  return e
}

/** Lista de lo que falta para poder publicar (para el panel lateral) */
export function publishChecklist(f: EventFormState) {
  const start = fromCrParts(f.startDate, f.startTime)
  return [
    { label: 'Nombre', ok: f.name.trim().length >= 3 },
    { label: 'Categoría', ok: Boolean(f.category) },
    { label: 'Resumen y descripción', ok: Boolean(f.summary.trim()) && f.description.trim().length >= 40 },
    { label: 'Fecha y hora futuras', ok: Boolean(start && new Date(start).getTime() > Date.now()) },
    { label: 'Lugar, ciudad y provincia', ok: Boolean(f.venueName.trim() && f.city.trim() && f.province) },
    { label: 'Capacidad', ok: Number(f.capacity) >= 1 },
    { label: 'Precio', ok: f.isFree || (f.price !== null && String(f.price) !== '' && Number(f.price) >= 0) },
    { label: 'Imagen (opcional)', ok: Boolean(f.imageUrl), optional: true },
  ]
}

/** Nombre del campo del formulario al que corresponde cada error de la API */
export const apiFieldToForm: Record<string, keyof EventFormState> = {
  date: 'startDate', endDate: 'endTime',
}
