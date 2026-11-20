import type { TicketItem } from '~/types/models'

// Estado "visual" de una entrada. Se calcula con el estado que manda la API
// y la fecha del evento:
//   active    -> sin usar y el evento está lejos
//   soon      -> sin usar y faltan pocos días (soonDays)
//   used      -> ya se usó para ingresar
//   expired   -> el evento ya pasó y la entrada no se usó
//   cancelled -> la reservación o el evento se cancelaron
export type TicketState = 'active' | 'soon' | 'used' | 'expired' | 'cancelled'

const DAY = 24 * 60 * 60 * 1000

export function ticketState(t: TicketItem, soonDays: number, now = Date.now()): TicketState {
  if (t.status === 'cancelled' || t.event.status === 'cancelled') return 'cancelled'
  if (t.status === 'used') return 'used'
  const ms = new Date(t.event.date).getTime() - now
  if (ms < 0) return 'expired'
  if (ms <= soonDays * DAY) return 'soon'
  return 'active'
}

/** Texto, color de etiqueta y sello del boleto para cada estado */
export const ticketStateInfo: Record<TicketState, { label: string, badge: string, stamp: string | null }> = {
  active: { label: 'Activa', badge: 'badge--success', stamp: null },
  soon: { label: 'Pronto', badge: 'badge--urgent', stamp: null },
  used: { label: 'Usada', badge: 'badge--neutral', stamp: 'Usada' },
  expired: { label: 'Vencida', badge: 'badge--warm', stamp: 'Vencida' },
  cancelled: { label: 'Cancelada', badge: 'badge--neutral', stamp: 'Cancelada' },
}

const rtf = new Intl.RelativeTimeFormat('es-CR', { numeric: 'auto' })

/** "dentro de 5 horas", "mañana", "dentro de 3 días", "hace 2 días" */
export function timeUntil(iso: string, now = Date.now()) {
  const ms = new Date(iso).getTime() - now
  const hours = Math.round(ms / (60 * 60 * 1000))
  if (Math.abs(hours) < 24) return rtf.format(hours, 'hour')
  return rtf.format(Math.round(ms / DAY), 'day')
}
