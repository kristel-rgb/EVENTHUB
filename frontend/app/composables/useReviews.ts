import type { ReviewItem, ReviewList, ReviewSummary } from '~/types/models'

/** Reseñas de un evento: GET /events/:id/reviews (se leen sin sesión) */
export function useReviewActions(eventId: string) {
  const api = useApi()
  const list = (q: { sort: string, page: number, limit: number }) => api<ReviewList>(`/events/${eventId}/reviews`, { query: q })
  const create = (rating: number, comment: string) =>
    api<{ review: ReviewItem, summary: ReviewSummary }>(`/events/${eventId}/reviews`, { method: 'POST', body: { rating, comment } })
  const update = (id: string, rating: number, comment: string) =>
    api<{ review: ReviewItem, summary: ReviewSummary }>(`/reviews/${id}`, { method: 'PATCH', body: { rating, comment } })
  const remove = (id: string) => api<{ summary: ReviewSummary }>(`/reviews/${id}`, { method: 'DELETE' })
  // El promedio del evento cambia: el detalle y las tarjetas se actualizan
  const invalidate = () => clearNuxtData(key => key.startsWith(`event-${eventId}`) || key === 'events-search' || key === 'home-upcoming')
  return { list, create, update, remove, invalidate }
}

export const ratingWords = ['', 'Malo', 'Regular', 'Bueno', 'Muy bueno', 'Excelente']
