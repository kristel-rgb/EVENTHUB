import type { Category, EventSearchResult } from '~/types/models'

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

/**
 * Lista paginada de eventos publicados: GET /events?q=&category=&page=&limit=
 * `key` distingue cada uso (la portada y la página de búsqueda piden cosas distintas).
 */
export function useEvents(filters: Ref<EventFilters>, key = 'events') {
  const api = useApi()
  return useAsyncData(
    key,
    () => api<EventSearchResult>('/events', { query: filters.value }),
    { watch: [filters] },
  )
}
