// Separación de accesos: qué puede abrir cada tipo de cuenta (middleware/auth.global.ts).
// Recordatorio: esto ordena la navegación; la seguridad real la aplica el backend.
import { beforeEach, describe, expect, it } from 'vitest'
import type { User } from '~/types/models'

const user = (role: User['role']) => ({ _id: role, username: role, role, permissions: [], firstName: 'Test', name: 'Test' }) as unknown as User

async function go(path: string) {
  const router = useRouter()
  try { await router.push(path) }
  catch (e) { return { error: e } }
  return { path: router.currentRoute.value.path }
}

describe('accesos por tipo de cuenta', () => {
  beforeEach(async () => {
    useSessionStore().clear()
    await useRouter().push('/privacidad')
  })

  it('sin cuenta: lo protegido manda a Ingresar y recuerda a dónde iba', async () => {
    await go('/mis-entradas')
    const r = useRouter().currentRoute.value
    expect(r.path).toBe('/login')
    expect(r.query.redirect).toBe('/mis-entradas')
  })

  it('cliente: entra a Mis entradas y Perfil, pero no al panel', async () => {
    const s = useSessionStore()
    s.user = user('attendee'); s.accessToken = 'x'
    expect((await go('/perfil')).path).toBe('/perfil')
    const r = await go('/organizador')
    expect(String(r.error)).toContain('no tiene acceso')
    expect(useRouter().currentRoute.value.path).not.toBe('/organizador')
  })

  it('organización: no tiene Inicio ni Mis entradas (va a su Resumen)', async () => {
    const s = useSessionStore()
    s.user = user('organizer'); s.accessToken = 'x'
    expect((await go('/')).path).toBe('/organizador')
    expect((await go('/mis-entradas')).path).toBe('/organizador')
    const r = await go('/admin')
    expect(String(r.error)).toContain('no tiene acceso')
    expect(useRouter().currentRoute.value.path).not.toBe('/admin')
  })

  it('Super Admin: entra a todo, y Ingresar lo manda a su resumen', async () => {
    const s = useSessionStore()
    s.user = user('admin'); s.accessToken = 'x'
    expect((await go('/admin/cuentas')).path).toBe('/admin/cuentas')
    expect((await go('/organizador')).path).toBe('/organizador')
    expect((await go('/login')).path).toBe('/admin')
  })
})
