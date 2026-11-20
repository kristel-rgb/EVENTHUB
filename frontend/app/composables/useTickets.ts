import type { TicketItem } from '~/types/models'

/** Entradas del usuario con sesión: GET /me/tickets */
export function useMyTickets() {
  const api = useApi()
  return useAsyncData('my-tickets', () => api<TicketItem[]>('/me/tickets'))
}
