import type { Category, EventSearchResult, LocationOption } from '~/types/models'

export interface EventFilters {
  q?: string
  category?: string
  from?: string           // fecha ISO: desde
  to?: string             // fecha ISO: hasta
  price?: 'free' | 'paid'
  location?: string
  sort?: 'date' | 'popular'   // popular = los más esperados (mayor % vendido)
  page: number
  limit: number
}

/** Categorías para los filtros del catálogo: GET /categories */
export function useCategories() {
  const api = useApi()
  return useAsyncData('categories', () => api<Category[]>('/categories'))
}

/** Lugares con eventos próximos (para el filtro "Lugar"): GET /locations */
export function useLocations() {
  const api = useApi()
  return useAsyncData('locations', () => api<LocationOption[]>('/locations'))
}

/**
 * Lista paginada de eventos publicados:
 * GET /events?q=&category=&from=&to=&price=&location=&page=&limit=
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
