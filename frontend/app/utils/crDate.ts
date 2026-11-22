// Conversión entre fecha ISO (UTC, como la guarda la API) y fecha/hora local
// de Costa Rica (UTC-6, sin horario de verano), para los campos del formulario.
const TZ = 'America/Costa_Rica'

/** ISO -> { date: 'AAAA-MM-DD', time: 'HH:mm' } en hora de Costa Rica */
export function toCrParts(iso: string | null | undefined) {
  if (!iso) return { date: '', time: '' }
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).formatToParts(new Date(iso))
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const hour = get('hour') === '24' ? '00' : get('hour')
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${hour}:${get('minute')}` }
}

/** Fecha y hora de Costa Rica -> ISO. Devuelve null si falta algo */
export function fromCrParts(date: string, time: string) {
  if (!date || !time) return null
  const d = new Date(`${date}T${time}:00-06:00`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
