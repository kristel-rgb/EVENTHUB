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
