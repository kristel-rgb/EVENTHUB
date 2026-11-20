import type { ApiError, EventItem, ReservationCreated } from '~/types/models'

/** Detalle de un evento: GET /events/:id */
export function useEvent(id: string) {
  const api = useApi()
  return useAsyncData(`event-${id}`, () => api<EventItem>(`/events/${id}`))
}

/**
 * Compra / reserva de entradas: POST /events/:id/reservations
 * El backend valida el cupo de forma atómica (evita sobreventa);
 * el frontend solo envía la cantidad y muestra el resultado.
 */
export function useReserve() {
  const api = useApi()
  const loading = ref(false)
  const errorMessage = ref<string | null>(null)
  const result = ref<ReservationCreated | null>(null)

  async function reserve(eventId: string, quantity: number) {
    loading.value = true
    errorMessage.value = null
    result.value = null
    try {
      result.value = await api<ReservationCreated>(`/events/${eventId}/reservations`, {
        method: 'POST',
        body: { quantity },
      })
    }
    catch (err: unknown) {
      const data = (err as { data?: { data?: ApiError } & ApiError }).data
      errorMessage.value = data?.data?.message ?? data?.message ?? 'No pudimos completar la compra. Intentá de nuevo.'
    }
    finally {
      loading.value = false
    }
  }

  return { reserve, loading, errorMessage, result }
}
