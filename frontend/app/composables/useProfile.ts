import type { User } from '~/types/models'

/** Perfil del usuario con sesión: PATCH /me y POST /me/password */
export function useProfile() {
  const api = useApi()
  const session = useSessionStore()

  async function update(body: Partial<Pick<User, 'firstName' | 'lastName1' | 'lastName2' | 'organizationName' | 'phone' | 'birthDate' | 'address'>>) {
    const user = await api<User>('/me', { method: 'PATCH', body })
    session.user = user // el nombre del menú se actualiza al instante
    return user
  }

  const changePassword = (currentPassword: string, newPassword: string) =>
    api<{ closedSessions: number }>('/me/password', { method: 'POST', body: { currentPassword, newPassword } })

  return { update, changePassword }
}
