// Formulario de eventos: estado, conversión a lo que espera la API y validaciones.
// Son las mismas reglas del backend; la validación que cuenta es la del servidor.
import type { AccessibilityFeature, CancellationPolicy, EventInput, OrganizerEvent } from '~/types/models'

export interface TicketTypeRow {
  _id?: string             // solo si el tipo ya existe en el evento
  name: string
  price: number | null
  capacity: number | null
  sold: number             // vendidas (no se puede bajar el cupo de ahí ni quitar el tipo)
}

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
  ticketTypes: TicketTypeRow[]
  maxPerPurchase: number
  minAge: number
  accessibility: AccessibilityFeature[]
  importantInfo: string
  cancellationPolicy: CancellationPolicy
  contactEmail: string
  contactPhone: string
}

export const MAX_TICKET_TYPES = 6

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

/** Política de cancelación: qué ve el organizador y qué lee el cliente */
export const cancellationOptions: { value: CancellationPolicy, label: string, text: string }[] = [
  { value: 'until_start', label: 'Hasta que empiece el evento', text: 'Podés cancelar tu reservación hasta que empiece el evento.' },
  { value: '24h', label: 'Hasta 24 horas antes', text: 'Podés cancelar tu reservación hasta 24 horas antes del evento.' },
  { value: '48h', label: 'Hasta 48 horas antes', text: 'Podés cancelar tu reservación hasta 48 horas antes del evento.' },
  { value: '7d', label: 'Hasta 7 días antes', text: 'Podés cancelar tu reservación hasta 7 días antes del evento.' },
  { value: 'none', label: 'No se permiten cancelaciones', text: 'Este evento no permite cancelar las entradas una vez pagadas.' },
]

export const newTicketRow = (name = ''): TicketTypeRow => ({ name, price: null, capacity: null, sold: 0 })

export function emptyEventForm(): EventFormState {
  return {
    name: '', summary: '', description: '', category: '', imageUrl: null, imageAlt: '',
    venueName: '', address: '', city: '', province: '',
    startDate: '', startTime: '', endTime: '', doorsOpenMinutes: 45,
    isFree: false, ticketTypes: [newTicketRow('General')], maxPerPurchase: 10, minAge: 0,
    accessibility: [], importantInfo: '',
    cancellationPolicy: '48h', contactEmail: '', contactPhone: '',
  }
}

/** Evento de la API -> estado del formulario */
export function formFromEvent(e: OrganizerEvent): EventFormState {
  const start = toCrParts(e.date)
  const end = toCrParts(e.endDate)
  const types = e.ticketTypes ?? []
  return {
    name: e.name, summary: e.summary ?? '', description: e.description ?? '', category: e.category?._id ?? '',
    imageUrl: e.imageUrl, imageAlt: e.imageAlt ?? '',
    venueName: e.venueName ?? '', address: e.address ?? '', city: e.city ?? '', province: e.province ?? '',
    startDate: start.date, startTime: start.time, endTime: end.time,
    doorsOpenMinutes: e.doorsOpenMinutes ?? 45,
    isFree: types.length > 0 && types.every(t => t.price === 0),
    ticketTypes: types.length
      ? types.map(t => ({ _id: t._id, name: t.name, price: t.price, capacity: t.capacity, sold: t.sold ?? 0 }))
      : [newTicketRow('General')],
    maxPerPurchase: e.maxPerPurchase ?? 10, minAge: e.minAge ?? 0,
    accessibility: [...(e.accessibility ?? [])], importantInfo: e.importantInfo ?? '',
    cancellationPolicy: e.cancellationPolicy ?? '48h', contactEmail: e.contactEmail ?? '', contactPhone: e.contactPhone ?? '',
  }
}

const empty = (v: unknown) => v === null || v === undefined || String(v).trim() === ''

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
    cancellationPolicy: f.cancellationPolicy, contactEmail: f.contactEmail.trim(), contactPhone: cleanPhone(f.contactPhone),
    endDate,
    // Las filas vacías de un borrador no se mandan
    ticketTypes: f.ticketTypes
      .filter(t => t._id || t.name.trim() || !empty(t.capacity) || !empty(t.price))
      .map(t => ({
        ...(t._id ? { _id: t._id } : {}),
        name: t.name.trim(),
        price: f.isFree ? 0 : Number(t.price ?? Number.NaN),
        capacity: Number(t.capacity ?? Number.NaN),
      })),
  }
  if (f.category) out.category = f.category
  if (f.province) out.province = f.province
  if (date) out.date = date
  return out
}

/** Clave de error de un campo de un tipo de entrada (igual a la de la API) */
export const ticketKey = (i: number, field: 'name' | 'price' | 'capacity') => `ticketTypes.${i}.${field}`

/**
 * Valida el formulario. full = reglas para publicar (o para guardar un evento publicado).
 * Un borrador solo necesita el nombre.
 */
export function validateEventForm(f: EventFormState, full: boolean) {
  const e: Record<string, string> = {}
  const name = f.name.trim()
  if (name.length < 3) e.name = 'El nombre debe tener al menos 3 caracteres.'
  else if (name.length > 120) e.name = 'El nombre puede tener hasta 120 caracteres.'
  if (f.summary.trim().length > 160) e.summary = 'El resumen puede tener hasta 160 caracteres.'
  if (f.imageUrl && !f.imageAlt.trim()) e.imageAlt = 'Describí la imagen para personas que usan lector de pantalla.'

  const start = fromCrParts(f.startDate, f.startTime)
  if ((f.startDate || f.startTime) && !start) e.startTime = 'Indicá la fecha y la hora de inicio.'

  // Tipos de entrada: se revisan las filas que tienen algo escrito (o todas si es para publicar)
  const seen = new Set<string>()
  f.ticketTypes.forEach((t, i) => {
    const touched = t._id || t.name.trim() || !empty(t.capacity) || !empty(t.price)
    if (!touched && !full) return
    const n = t.name.trim()
    if (n.length < 2 || n.length > 40) e[ticketKey(i, 'name')] = 'Entre 2 y 40 caracteres.'
    else if (seen.has(n.toLowerCase())) e[ticketKey(i, 'name')] = 'Ya hay un tipo con este nombre.'
    seen.add(n.toLowerCase())
    if (!f.isFree && (empty(t.price) || !Number.isInteger(Number(t.price)) || Number(t.price) < 0)) e[ticketKey(i, 'price')] = 'Número entero de 0 o más.'
    if (empty(t.capacity) || !Number.isInteger(Number(t.capacity)) || Number(t.capacity) < 1) e[ticketKey(i, 'capacity')] = 'Número entero mayor que 0.'
    else if (t.sold && Number(t.capacity) < t.sold) e[ticketKey(i, 'capacity')] = `Ya hay ${t.sold} vendidas.`
  })
  if (f.ticketTypes.length > MAX_TICKET_TYPES) e.ticketTypes = `Podés tener hasta ${MAX_TICKET_TYPES} tipos de entrada.`

  if (f.contactEmail.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim())) e.contactEmail = 'Ingresá un correo válido.'
  if (f.contactPhone.trim() && !/^[2-8]\d{7}$/.test(cleanPhone(f.contactPhone))) e.contactPhone = 'Teléfono de Costa Rica de 8 dígitos.'

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
    if (!f.ticketTypes.length) e.ticketTypes = 'Agregá al menos un tipo de entrada.'
    if (!f.contactEmail.trim()) e.contactEmail = 'Indicá un correo para consultas.'
  }
  return e
}

/** Totales de las entradas (capacidad total y precio "desde") */
export function ticketTotals(f: EventFormState) {
  const caps = f.ticketTypes.map(t => Number(t.capacity) || 0)
  const prices = f.ticketTypes.map(t => (f.isFree ? 0 : Number(t.price))).filter(p => Number.isFinite(p) && !Number.isNaN(p))
  return { capacity: caps.reduce((a, b) => a + b, 0), minPrice: prices.length ? Math.min(...prices) : null }
}

/** Lista de lo que falta para poder publicar, agrupada por paso */
export function publishChecklist(f: EventFormState) {
  const start = fromCrParts(f.startDate, f.startTime)
  const ticketsOk = f.ticketTypes.length > 0 && Object.keys(validateEventForm({ ...f }, true)).every(k => !k.startsWith('ticketTypes'))
  return [
    { step: 'info', label: 'Nombre y categoría', ok: f.name.trim().length >= 3 && Boolean(f.category) },
    { step: 'info', label: 'Resumen y descripción', ok: Boolean(f.summary.trim()) && f.description.trim().length >= 40 },
    { step: 'info', label: 'Imagen (opcional)', ok: Boolean(f.imageUrl), optional: true },
    { step: 'when', label: 'Fecha y hora futuras', ok: Boolean(start && new Date(start).getTime() > Date.now()) },
    { step: 'when', label: 'Lugar, ciudad y provincia', ok: Boolean(f.venueName.trim() && f.city.trim() && f.province) },
    { step: 'tickets', label: 'Tipos de entrada con precio y cupos', ok: ticketsOk },
    { step: 'details', label: 'Correo para consultas', ok: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.contactEmail.trim()) },
  ] as { step: string, label: string, ok: boolean, optional?: boolean }[]
}

/** Nombre del campo del formulario al que corresponde cada error de la API */
export const apiFieldToForm: Record<string, string> = {
  date: 'startDate', endDate: 'endTime',
}
