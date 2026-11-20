import type { OrganizerStats } from '~/types/models'

/** Estadísticas del organizador que inició sesión: GET /organizer/stats */
export function useOrganizerStats() {
  const api = useApi()
  return useAsyncData('organizer-stats', () => api<OrganizerStats>('/organizer/stats'))
}
