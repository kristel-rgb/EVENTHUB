import type { FeedItem } from '~/types/models'

/** Novedades del cliente con sesión: GET /me/feed */
export function useMyFeed() {
  const api = useApi()
  return useAsyncData('my-feed', () => api<{ items: FeedItem[] }>('/me/feed'))
}

/** Ícono y estilo de cada tipo de novedad */
export const feedTypeInfo: Record<FeedItem['type'], { icon: string, tone: 'urgent' | 'warm' | 'info' | 'ok' }> = {
  cancelled: { icon: 'lucide:circle-x', tone: 'urgent' },
  changed: { icon: 'lucide:calendar-clock', tone: 'warm' },
  few_spots: { icon: 'lucide:flame', tone: 'info' },
  new: { icon: 'lucide:sparkles', tone: 'ok' },
}
