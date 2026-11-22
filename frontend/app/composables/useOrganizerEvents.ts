import type { EventInput, OrganizerEvent, OrganizerEventList } from '~/types/models'

export interface OrganizerEventFilters {
  status: 'all' | 'published' | 'draft' | 'finished' | 'cancelled'
  q?: string
  sort: 'date' | 'recent' | 'occupancy' | 'revenue'
  page: number
  limit: number
}

/** Lista de eventos del organizador: GET /organizer/events */
export function useOrganizerEvents(filters: Ref<OrganizerEventFilters>) {
  const api = useApi()
  return useAsyncData(
    'organizer-events',
    () => api<OrganizerEventList>('/organizer/events', { query: filters.value }),
    { watch: [filters] },
  )
}

/** Un evento para el formulario de edición: GET /organizer/events/:id */
export function useOrganizerEvent(id: string) {
  const api = useApi()
  return useAsyncData(`organizer-event-${id}`, () => api<OrganizerEvent>(`/organizer/events/${id}`))
}

/** Acciones sobre eventos. Después de cada cambio se limpia la caché de las páginas públicas. */
export function useEventActions() {
  const api = useApi()

  // Para que el detalle, Buscar y el Inicio muestren los datos nuevos
  function invalidate(id?: string) {
    clearNuxtData(key => ['events-search', 'home-upcoming', 'organizer-stats', 'organizer-events', 'locations'].includes(key)
      || (id ? key.startsWith(`event-${id}`) || key === `organizer-event-${id}` : false))
  }

  async function create(input: Partial<EventInput>) {
    const e = await api<OrganizerEvent>('/events', { method: 'POST', body: input })
    invalidate(e._id)
    return e
  }
  async function update(id: string, input: Partial<EventInput>) {
    const e = await api<OrganizerEvent>(`/events/${id}`, { method: 'PATCH', body: input })
    invalidate(id)
    return e
  }
  async function publish(id: string) {
    const e = await api<OrganizerEvent>(`/events/${id}/publish`, { method: 'POST' })
    invalidate(id)
    return e
  }
  async function cancel(id: string) {
    const res = await api<{ event: OrganizerEvent, notified: number }>(`/events/${id}/cancel`, { method: 'POST' })
    invalidate(id)
    return res
  }
  async function duplicate(id: string) {
    const e = await api<OrganizerEvent>(`/events/${id}/duplicate`, { method: 'POST' })
    invalidate()
    return e
  }
  async function remove(id: string) {
    await api(`/events/${id}`, { method: 'DELETE' })
    invalidate(id)
  }

  /** Sube una imagen como a S3: pide una URL prefirmada y envía el archivo con PUT */
  async function uploadImage(file: File) {
    const intent = await api<{ uploadUrl: string, fileUrl: string }>('/files/upload-intent', {
      method: 'POST',
      body: { fileName: file.name, contentType: file.type, size: file.size },
    })
    await $fetch(intent.uploadUrl, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
    return intent.fileUrl
  }

  return { create, update, publish, cancel, duplicate, remove, uploadImage }
}
