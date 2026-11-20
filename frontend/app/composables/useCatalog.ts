import type { Category, EventItem, Paginated } from '~/types/models'

export interface EventFilters {
  q?: string
  category?: string
  page: number
  limit: number
}

/** Categorías para los filtros del catálogo: GET /categories */
export function useCategories() {
  const api = useApi()
  return useAsyncData('categories', () => api<Category[]>('/categories'))
}

/** Lista paginada de eventos publicados: GET /events?q=&category=&page=&limit= */
export function useEvents(filters: Ref<EventFilters>) {
  const api = useApi()
  return useAsyncData(
    'events',
    () => api<Paginated<EventItem>>('/events', { query: filters.value }),
    { watch: [filters] },
  )
}
