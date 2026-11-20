// Formatos de fecha y dinero para Costa Rica.
// La zona horaria es fija para que servidor y navegador muestren lo mismo.
const TZ = 'America/Costa_Rica'

const eventDateFmt = new Intl.DateTimeFormat('es-CR', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
})
const shortDateFmt = new Intl.DateTimeFormat('es-CR', {
  timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short',
})
const longDateFmt = new Intl.DateTimeFormat('es-CR', {
  timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
})
const timeFmt = new Intl.DateTimeFormat('es-CR', {
  timeZone: TZ, hour: 'numeric', minute: '2-digit',
})
const priceFmt = new Intl.NumberFormat('es-CR', {
  style: 'currency', currency: 'CRC', maximumFractionDigits: 0,
})

export function formatEventDate(iso: string) {
  return eventDateFmt.format(new Date(iso))
}

export function formatShortDate(iso: string) {
  return shortDateFmt.format(new Date(iso))
}

export function formatPrice(amount: number) {
  return amount === 0 ? 'Gratis' : priceFmt.format(amount)
}

export function formatLongDate(iso: string) {
  return longDateFmt.format(new Date(iso))
}

export function formatTime(iso: string) {
  return timeFmt.format(new Date(iso))
}
