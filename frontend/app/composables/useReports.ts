import type { ReportItem, ReportType } from '~/types/models'

/** Reportes del organizador: se piden al backend, que los genera con una Lambda y los deja en S3 */
export function useReportActions() {
  const api = useApi()
  const config = useRuntimeConfig()
  const request = (body: { type: ReportType, format: 'csv' | 'pdf', eventId?: string, period?: number }) =>
    api<ReportItem>('/reports', { method: 'POST', body })
  const get = (id: string) => api<ReportItem>(`/reports/${id}`)
  const recent = () => api<ReportItem[]>('/reports')

  /** Espera a que el reporte esté listo (consulta cada 1,5 s, máximo 2 minutos) */
  async function waitReady(id: string, signal?: { cancelled: boolean }) {
    const until = Date.now() + 120_000
    while (Date.now() < until) {
      if (signal?.cancelled) throw new Error('cancelled')
      const r = await get(id)
      if (r.status !== 'processing') return r
      await new Promise(res => setTimeout(res, 1500))
    }
    throw Object.assign(new Error('timeout'), { data: { code: 'REPORT_TIMEOUT', message: 'El reporte está tardando más de lo normal. Probá de nuevo en unos minutos.' } })
  }

  /** La API de prueba devuelve rutas relativas; S3 devuelve URLs completas */
  const absolute = (url: string) => (url.startsWith('http') ? url : url.startsWith('/mock-api') ? url : `${config.public.apiBase}${url}`)

  return { request, get, recent, waitReady, absolute }
}
