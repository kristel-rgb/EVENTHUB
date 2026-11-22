import type { CheckinEvent, CheckinStatus, ValidateResult } from '~/types/models'

/** Eventos que se pueden validar ahora: GET /organizer/checkin/events */
export function useCheckinEvents() {
  const api = useApi()
  return useAsyncData('checkin-events', () => api<CheckinEvent[]>('/organizer/checkin/events'))
}

/** Contador y últimas validaciones de un evento: GET /organizer/checkin?event= */
export function useCheckinStatus(eventId: Ref<string>) {
  const api = useApi()
  return useAsyncData(
    'checkin-status',
    () => (eventId.value ? api<CheckinStatus>('/organizer/checkin', { query: { event: eventId.value } }) : Promise.resolve(null)),
    { watch: [eventId] },
  )
}

export function useCheckinActions() {
  const api = useApi()

  // El panel de reservaciones y el resumen muestran "ingresaron": se refrescan al volver a ellos
  function invalidate() {
    clearNuxtData(key => key === 'organizer-reservations' || key === 'organizer-stats' || key === 'my-tickets')
  }

  async function validate(body: { event: string, qrValue?: string, code?: string, gate?: string }) {
    const r = await api<ValidateResult>('/tickets/validate', { method: 'POST', body })
    invalidate()
    return r
  }

  async function undo(ticketId: string) {
    const r = await api<{ ticketId: string, sold: number, checkedIn: number }>(`/tickets/${ticketId}/undo-validation`, { method: 'POST' })
    invalidate()
    return r
  }

  return { validate, undo }
}

/** Texto de cada rechazo para la pantalla de la puerta */
export const scanRejectInfo: Record<string, { title: string, action: string, icon: string }> = {
  TICKET_ALREADY_USED: { title: 'Ya fue usada', action: 'No dejar ingresar', icon: 'lucide:triangle-alert' },
  TICKET_CANCELLED: { title: 'Entrada cancelada', action: 'No dejar ingresar', icon: 'lucide:ban' },
  TICKET_WRONG_EVENT: { title: 'Es de otro evento', action: 'No dejar ingresar', icon: 'lucide:calendar-x' },
  TICKET_PAYMENT_PENDING: { title: 'Pago pendiente', action: 'No dejar ingresar todavía', icon: 'lucide:hourglass' },
  TICKET_INVALID: { title: 'Código no válido', action: 'Revisar la entrada o escribir el código', icon: 'lucide:qr-code' },
  EVENT_CANCELLED: { title: 'Evento cancelado', action: 'No se pueden validar entradas', icon: 'lucide:ban' },
}
