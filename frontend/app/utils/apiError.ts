import type { ApiError } from '~/types/models'

/** Extrae el error estándar { code, message, details } de una respuesta fallida */
export function readApiError(err: unknown): ApiError {
  const data = (err as { data?: ApiError & { data?: ApiError } })?.data
  const e = data?.data ?? data
  return {
    code: e?.code ?? 'NETWORK_ERROR',
    message: e?.message ?? 'No pudimos conectar con el servidor. Revisá tu conexión e intentá de nuevo.',
    details: e?.details ?? null,
  }
}
