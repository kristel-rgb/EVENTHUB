// Flujos críticos con la API simulada: ingresar y comprar entradas por tipo.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import LoginPage from '~/pages/login.vue'
import EventPage from '~/pages/eventos/[id].vue'

const API = '/api-test'

describe('Ingresar', () => {
  afterEach(() => useSessionStore().clear())

  it('muestra los errores si faltan datos', async () => {
    const w = await mountSuspended(LoginPage, { route: '/login' })
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('Ingresá tu usuario o correo.')
    expect(w.text()).toContain('Ingresá tu contraseña.')
  })

  it('con datos correctos guarda la sesión', async () => {
    registerEndpoint(`${API}/auth/login`, {
      method: 'POST',
      handler: async (e) => {
        const b = await readBody<{ identifier: string, password: string }>(e)
        if (b.password !== 'Clave2026x') throw createError({ statusCode: 401, data: { code: 'INVALID_CREDENTIALS', message: 'El usuario o la contraseña no son correctos.' } })
        return { accessToken: 'tok', expiresAt: new Date(Date.now() + 3600_000).toISOString(), user: { _id: 'u1', username: b.identifier, role: 'attendee', permissions: [], firstName: 'Ana', name: 'Ana Mora', emailVerified: true } }
      },
    })
    const w = await mountSuspended(LoginPage, { route: '/login' })
    await w.get('#identifier').setValue('ana.mora')
    await w.get('#password').setValue('incorrecta')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('El usuario o la contraseña no son correctos.'))

    await w.get('#password').setValue('Clave2026x')
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(useSessionStore().isLoggedIn).toBe(true))
    expect(useSessionStore().user?.username).toBe('ana.mora')
  })
})

describe('Comprar entradas', () => {
  const event = {
    _id: 'ev1', name: 'Festival de prueba', description: 'Un festival de prueba con mucha música.', summary: 'Prueba',
    category: { _id: 'c1', name: 'Conciertos', slug: 'conciertos' }, imageUrl: null, location: 'Parque, San José',
    date: new Date(Date.now() + 10 * 86_400_000).toISOString(), endDate: null, capacity: 100, availableSpots: 60, price: 10000,
    status: 'published', organizer: { _id: 'o1', name: 'Org' }, ratingAvg: null, ratingCount: 0, maxPerPurchase: 4,
    cancellationPolicy: '48h', contactEmail: 'info@org.cr',
    ticketTypes: [
      { _id: 'pre', name: 'Preventa', price: 8000, capacity: 20, available: 0 },
      { _id: 'gen', name: 'General', price: 10000, capacity: 60, available: 50 },
      { _id: 'vip', name: 'VIP', price: 25000, capacity: 20, available: 10 },
    ],
  }
  let lastBody: Record<string, unknown> | null = null
  registerEndpoint(`${API}/events/ev1`, () => event)
  registerEndpoint(`${API}/events/ev1/reviews`, () => ({ items: [], page: 1, limit: 5, total: 0, summary: { avg: null, count: 0, distribution: {} }, myReview: null, canReview: false, cannotReviewReason: null }))
  registerEndpoint(`${API}/events/ev1/reservations`, {
    method: 'POST',
    handler: async (e) => {
      lastBody = await readBody(e)
      return { reservation: { _id: 'r1', quantity: lastBody!.quantity, total: 50000, status: 'confirmed', paymentStatus: 'paid' }, tickets: [{ _id: 't1', code: 'EH-1' }, { _id: 't2', code: 'EH-2' }] }
    },
  })

  it('sin cuenta pide ingresar para comprar', async () => {
    useSessionStore().clear()
    const w = await mountSuspended(EventPage, { route: '/eventos/ev1' })
    expect(w.text()).toContain('Ingresar para comprar')
    expect(w.find('form.buy__form').exists()).toBe(false)
  })

  it('con cuenta elige el tipo, la cantidad y compra', async () => {
    const s = useSessionStore()
    s.user = { _id: 'u1', role: 'attendee', permissions: [] } as never
    s.accessToken = 'tok'
    const w = await mountSuspended(EventPage, { route: '/eventos/ev1' })
    expect(w.text()).toContain('Desde')
    // La preventa agotada no se puede elegir
    expect(w.get('input[value="pre"]').attributes('disabled')).toBeDefined()
    await w.get('input[value="vip"]').setValue(true)
    await w.get('button[aria-label="Agregar una"]').trigger('click')
    expect(w.text()).toContain('₡50')
    await w.get('form.buy__form').trigger('submit')
    await vi.waitFor(() => expect(w.text()).toContain('Tu reserva quedó confirmada'))
    expect(lastBody).toEqual({ quantity: 2, ticketType: 'vip' })
    expect(w.text()).toContain('EH-1, EH-2')
    s.clear()
  })
})
