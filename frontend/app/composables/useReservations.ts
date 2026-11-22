import type { OrganizerEventList, OrganizerReservationList, ReservationDetail, ReservationItem, ResendResult } from '~/types/models'

export interface ReservationFilters {
  event: string                    // '' = todos mis eventos
  status: '' | 'confirmed' | 'pending' | 'cancelled'
  q?: string
  sort: 'recent' | 'oldest' | 'total' | 'quantity'
  page: number
  limit: number
}

/** Reservaciones de los eventos del organizador: GET /organizer/reservations */
export function useOrganizerReservations(filters: Ref<ReservationFilters>) {
  const api = useApi()
  return useAsyncData(
    'organizer-reservations',
    () => api<OrganizerReservationList>('/organizer/reservations', { query: filters.value }),
    { watch: [filters] },
  )
}

/** Eventos para el selector (sin borradores, que no tienen reservaciones) */
export function useReservationEventOptions() {
  const api = useApi()
  return useAsyncData('organizer-event-options', async () => {
    const res = await api<OrganizerEventList>('/organizer/events', { query: { status: 'all', sort: 'date', limit: 50, page: 1 } })
    return res.items
      .filter(e => e.status !== 'draft')
      .map(e => ({ _id: e._id, name: e.name, date: e.date, displayStatus: e.displayStatus }))
  })
}

/** Reservaciones del cliente (por ahora, las que esperan pago): GET /me/reservations */
export function useMyReservations(status: '' | 'pending' = 'pending') {
  const api = useApi()
  return useAsyncData(`my-reservations-${status || 'all'}`, () => api<ReservationItem[]>('/me/reservations', { query: { status } }))
}

/** Acciones sobre reservaciones, desde el panel del organizador o desde la cuenta del cliente */
export function useReservationActions(side: 'organizer' | 'customer') {
  const api = useApi()
  const base = side === 'organizer' ? '/organizer/reservations' : '/me/reservations'

  // Cancelar devuelve espacios: se refrescan las listas, el detalle del evento y Buscar
  function invalidate() {
    clearNuxtData(key => key === 'organizer-reservations' || key === 'organizer-stats' || key === 'organizer-events'
      || key === 'my-tickets' || key.startsWith('my-reservations') || key === 'events-search' || key === 'home-upcoming'
      || key.startsWith('event-'))
  }

  const detail = (id: string) => api<ReservationDetail>(`${base}/${id}`)

  async function cancel(id: string) {
    const r = await api<ReservationItem>(`${base}/${id}/cancel`, { method: 'POST' })
    invalidate()
    return r
  }

  const resend = (id: string) => api<ResendResult>(`${base}/${id}/resend`, { method: 'POST' })

  return { detail, cancel, resend }
}

/** Texto y estilo del estado de una reservación (pago incluido) */
export function reservationStateInfo(r: Pick<ReservationItem, 'status' | 'paymentStatus' | 'cancelledBy'>) {
  if (r.status === 'pending') return { label: 'Pago pendiente', badge: 'badge--warm', icon: 'lucide:hourglass' }
  if (r.status === 'cancelled') {
    return r.cancelledBy === 'system'
      ? { label: 'Pago no confirmado', badge: 'badge--neutral', icon: 'lucide:circle-x' }
      : { label: 'Cancelada', badge: 'badge--urgent', icon: 'lucide:circle-x' }
  }
  return r.paymentStatus === 'free'
    ? { label: 'Confirmada · gratis', badge: 'badge--success', icon: 'lucide:circle-check' }
    : { label: 'Pagada', badge: 'badge--success', icon: 'lucide:circle-check' }
}

export const cancelledByLabel: Record<string, string> = {
  customer: 'por el cliente',
  organizer: 'por el organizador',
  system: 'automáticamente: el pago no se confirmó en 3 horas',
}
