// Rangos de fecha para los filtros de búsqueda, calculados en hora de Costa Rica (UTC-6).
// El frontend calcula el rango y la API solo recibe "from" y "to" en formato ISO.

const DAY = 24 * 60 * 60 * 1000
const CR_OFFSET = -6 * 60 * 60 * 1000 // Costa Rica no usa horario de verano

export type DateRangeKey = 'hoy' | 'fin-de-semana' | 'semana' | 'mes'

export const dateRangeOptions: { value: DateRangeKey | '', label: string }[] = [
  { value: '', label: 'Cualquier fecha' },
  { value: 'hoy', label: 'Hoy' },
  { value: 'fin-de-semana', label: 'Este fin de semana' },
  { value: 'semana', label: 'Próximos 7 días' },
  { value: 'mes', label: 'Próximos 30 días' },
]

export function isDateRangeKey(v: unknown): v is DateRangeKey {
  return typeof v === 'string' && dateRangeOptions.some(o => o.value === v && v !== '')
}

/** Devuelve { from, to } en ISO para la clave elegida, o null si no hay filtro */
export function dateRange(key: DateRangeKey | undefined, nowMs = Date.now()) {
  if (!key) return null
  const now = Math.floor(nowMs / 60000) * 60000 // redondeado al minuto
  const cr = new Date(now + CR_OFFSET) // sus campos UTC son la hora local de Costa Rica
  const startOfToday = Date.UTC(cr.getUTCFullYear(), cr.getUTCMonth(), cr.getUTCDate()) - CR_OFFSET
  const weekday = cr.getUTCDay() // 0 domingo … 6 sábado

  let from = now
  let to: number
  switch (key) {
    case 'hoy':
      to = startOfToday + DAY
      break
    case 'fin-de-semana': {
      // De viernes 00:00 a domingo 23:59. Si ya es fin de semana, el actual.
      const offset = weekday === 0 ? -2 : weekday === 6 ? -1 : 5 - weekday
      const friday = startOfToday + offset * DAY
      from = Math.max(now, friday)
      to = friday + 3 * DAY
      break
    }
    case 'semana':
      to = startOfToday + 7 * DAY
      break
    case 'mes':
      to = startOfToday + 30 * DAY
      break
  }
  return { from: new Date(from).toISOString(), to: new Date(to - 1).toISOString() }
}
