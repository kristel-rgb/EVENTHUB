import type { OrganizerStats } from '~/types/models'

/**
 * Estadísticas del organizador que inició sesión: GET /organizer/stats?period=7|30|90
 * Se vuelven a pedir cuando cambia el periodo.
 */
export function useOrganizerStats(period: Ref<number>) {
  const api = useApi()
  return useAsyncData(
    'organizer-stats',
    () => api<OrganizerStats>('/organizer/stats', { query: { period: period.value } }),
    { watch: [period] },
  )
}
