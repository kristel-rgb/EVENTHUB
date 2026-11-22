import type { AdminCategory, AdminStats, ModerationList } from '~/types/models'
import type { AccountDetail, AccountKind, AccountList, CreateAccountPayload, PermissionCatalog } from '~/types/models'

export interface AccountFilters {
  q?: string
  kind: '' | AccountKind
  status: '' | 'active' | 'disabled' | 'invited'
  page: number
  limit: number
}

/** Lista de cuentas: GET /admin/users */
export function useAccounts(filters: Ref<AccountFilters>) {
  const api = useApi()
  return useAsyncData('admin-accounts', () => api<AccountList>('/admin/users', { query: filters.value }), { watch: [filters] })
}

/** Catálogo de permisos agrupado: GET /admin/permissions */
export function usePermissionCatalog() {
  const api = useApi()
  return useAsyncData('admin-permissions', () => api<PermissionCatalog>('/admin/permissions'))
}

export function useAccountActions() {
  const api = useApi()
  const detail = (id: string) => api<AccountDetail>(`/admin/users/${id}`)
  const create = (body: CreateAccountPayload) =>
    api<{ user: AccountDetail, invitationSentTo: string }>('/admin/users', { method: 'POST', body })
  const update = (id: string, body: { kind?: AccountKind, organizationName?: string, status?: 'active' | 'disabled', permissions?: string[] }) =>
    api<{ user: AccountDetail, closedSessions: number }>(`/admin/users/${id}`, { method: 'PATCH', body })
  return { detail, create, update }
}

/** Nombre, ícono y estilo de cada tipo de cuenta */
export const accountKindInfo: Record<AccountKind, { label: string, short: string, icon: string, badge: string, hint: string }> = {
  organization: { label: 'Organización de eventos', short: 'Organización', icon: 'lucide:building-2', badge: 'badge--success', hint: 'Empresa o colectivo que crea y vende sus eventos.' },
  venue: { label: 'Lugar de eventos', short: 'Lugar', icon: 'lucide:landmark', badge: 'badge--warm', hint: 'Teatro, auditorio o centro de eventos que publica lo que pasa en su espacio.' },
  attendee: { label: 'Cliente', short: 'Cliente', icon: 'lucide:user-round', badge: 'badge--neutral', hint: 'Persona que compra entradas.' },
  admin: { label: 'Super Admin', short: 'Super Admin', icon: 'lucide:shield-check', badge: 'badge--urgent', hint: 'Acceso total al sistema. Darlo solo a personas de confianza.' },
}

// ---------- Estadísticas, categorías y moderación ----------

export function useAdminStats(period: Ref<number>) {
  const api = useApi()
  return useAsyncData('admin-stats', () => api<AdminStats>('/admin/stats', { query: { period: period.value } }), { watch: [period] })
}

export function useAdminCategories() {
  const api = useApi()
  return useAsyncData('admin-categories', () => api<AdminCategory[]>('/admin/categories'))
}

export function useCategoryActions() {
  const api = useApi()
  // Las categorías aparecen en Buscar, el formulario de eventos y el inicio
  const invalidate = () => clearNuxtData(key => key === 'categories' || key === 'admin-categories' || key === 'events-search')
  const create = async (name: string) => { const c = await api<AdminCategory>('/admin/categories', { method: 'POST', body: { name } }); invalidate(); return c }
  const rename = async (id: string, name: string) => { const c = await api<AdminCategory>(`/admin/categories/${id}`, { method: 'PATCH', body: { name } }); invalidate(); return c }
  const remove = async (id: string) => { await api(`/admin/categories/${id}`, { method: 'DELETE' }); invalidate() }
  return { create, rename, remove }
}

export interface ModerationFilters { status: 'flagged' | 'visible' | 'hidden', q?: string, page: number, limit: number }
export function useModeration(filters: Ref<ModerationFilters>) {
  const api = useApi()
  return useAsyncData('admin-moderation', () => api<ModerationList>('/admin/reviews', { query: filters.value }), { watch: [filters] })
}
export function useModerationActions() {
  const api = useApi()
  const setHidden = (id: string, hidden: boolean, reason?: string) =>
    api<{ _id: string, hidden: boolean }>(`/admin/reviews/${id}`, { method: 'PATCH', body: { hidden, reason } })
  return { setHidden }
}
export const moderationReasons = ['Lenguaje ofensivo', 'Spam o publicidad', 'Datos personales', 'No trata del evento', 'Otro']
