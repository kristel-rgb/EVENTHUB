// Ingreso con Google y "Completar perfil": las cuentas de Google no traen identificación,
// teléfono, nacimiento ni dirección, así que no pueden comprar hasta completarlos.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mountSuspended, registerEndpoint } from '@nuxt/test-utils/runtime'
import { readBody } from 'h3'
import CallbackPage from '~/pages/auth/google/callback.vue'
import CompletePage from '~/pages/completar-perfil.vue'
import EventPage from '~/pages/eventos/[id].vue'

const API = '/api-test'
const googleUser = {
  _id: 'g1', username: 'laura.mendez', firstName: 'Laura', lastName1: 'Méndez', lastName2: 'Solís', name: 'Laura Méndez',
  organizationName: null, email: 'laura.mendez@gmail.test', phone: null, idType: null, idNumber: null, birthDate: null, address: null,
  role: 'attendee', permissions: [], status: 'active', emailVerified: true, profileComplete: false, hasPassword: false,
  lastLoginAt: null, createdAt: new Date().toISOString(),
}

describe('vuelta de Google (/auth/google/callback)', () => {
  afterEach(() => useSessionStore().clear())

  it('si la persona canceló en Google, lo explica y ofrece intentar de nuevo', async () => {
    const w = await mountSuspended(CallbackPage, { route: '/auth/google/callback?error=access_denied' })
    await vi.waitFor(() => expect(w.text()).toContain('Cancelaste el ingreso con Google'))
    expect(w.text()).toContain('Intentar de nuevo con Google')
  })

  it('cambia el código por la sesión y, con el perfil incompleto, lo manda a completarlo', async () => {
    let sent: unknown = null
    registerEndpoint(`${API}/auth/google/exchange`, {
      method: 'POST',
      handler: async (e) => {
        sent = await readBody(e)
        return { accessToken: 'tok', expiresAt: new Date(Date.now() + 3600_000).toISOString(), user: googleUser, isNew: true }
      },
    })
    await mountSuspended(CallbackPage, { route: '/auth/google/callback?code=abc123&redirect=/eventos/ev1' })
    await vi.waitFor(() => expect(useSessionStore().isLoggedIn).toBe(true))
    expect(sent).toEqual({ code: 'abc123' })
    await vi.waitFor(() => expect(useRouter().currentRoute.value.path).toBe('/completar-perfil'))
    expect(useRouter().currentRoute.value.query.redirect).toBe('/eventos/ev1')
  })

  it('un código vencido muestra el mensaje del backend', async () => {
    registerEndpoint(`${API}/auth/google/exchange`, {
      method: 'POST',
      handler: () => { throw createError({ statusCode: 400, data: { code: 'GOOGLE_CODE_INVALID', message: 'El ingreso con Google venció o ya se usó. Intentá de nuevo.' } }) },
    })
    const w = await mountSuspended(CallbackPage, { route: '/auth/google/callback?code=viejo' })
    await vi.waitFor(() => expect(w.text()).toContain('venció o ya se usó'))
  })
})

describe('Completar perfil', () => {
  afterEach(() => useSessionStore().clear())

  it('muestra el correo de Google sin poder cambiarlo y precarga el nombre', async () => {
    const s = useSessionStore()
    s.user = { ...googleUser } as never; s.accessToken = 'tok'
    const w = await mountSuspended(CompletePage, { route: '/completar-perfil' })
    expect(w.text()).toContain('laura.mendez@gmail.test')
    expect(w.text()).toContain('Confirmado por Google')
    expect(w.find('input[type="email"]').exists()).toBe(false)
    expect((w.get('#firstName').element as HTMLInputElement).value).toBe('Laura')
    expect((w.get('#lastName2').element as HTMLInputElement).value).toBe('Solís')
    expect((w.get('#username').element as HTMLInputElement).value).toBe('laura.mendez')
  })

  it('pide los datos que faltan y guarda', async () => {
    let body: Record<string, unknown> | null = null
    registerEndpoint(`${API}/me/complete-profile`, {
      method: 'POST',
      handler: async (e) => {
        body = await readBody(e)
        return { ...googleUser, ...body, profileComplete: true }
      },
    })
    const s = useSessionStore()
    s.user = { ...googleUser } as never; s.accessToken = 'tok'
    const w = await mountSuspended(CompletePage, { route: '/completar-perfil?redirect=/eventos/ev1' })
    await w.get('form').trigger('submit')
    expect(w.text()).toContain('Elegí un tipo de identificación.')
    expect(w.text()).toContain('Tenés que aceptar los términos')

    await w.get('#birthDate').setValue('1995-04-10')
    await w.get('#idType').setValue('cedula')
    await w.get('#idNumber').setValue('1-2345-6789')
    await w.get('#phone').setValue('8888-1234')
    await w.get('#province').setValue('Heredia')
    await w.get('#canton').setValue('Belén')
    await w.get('input[type="checkbox"]').setValue(true)
    await w.get('form').trigger('submit')
    await vi.waitFor(() => expect(useSessionStore().user?.profileComplete).toBe(true))
    expect(body).toMatchObject({ idType: 'cedula', idNumber: '123456789', phone: '88881234', birthDate: '1995-04-10', province: 'Heredia', canton: 'Belén', acceptTerms: true })
    expect(body).not.toHaveProperty('email')
  })
})

describe('Comprar con el perfil incompleto', () => {
  registerEndpoint(`${API}/events/ev9`, () => ({
    _id: 'ev9', name: 'Evento de prueba', description: 'Descripción de prueba del evento.', summary: 'Prueba',
    category: { _id: 'c1', name: 'Conciertos', slug: 'conciertos' }, imageUrl: null, location: 'Parque, San José',
    date: new Date(Date.now() + 10 * 86_400_000).toISOString(), endDate: null, capacity: 100, availableSpots: 60, price: 10000,
    status: 'published', organizer: { _id: 'o1', name: 'Org' }, ratingAvg: null, ratingCount: 0, maxPerPurchase: 4,
    cancellationPolicy: '48h', contactEmail: 'info@org.cr', ticketTypes: [{ _id: 'gen', name: 'General', price: 10000, capacity: 100, available: 60 }],
  }))
  registerEndpoint(`${API}/events/ev9/reviews`, () => ({ items: [], page: 1, limit: 5, total: 0, summary: { avg: null, count: 0, distribution: {} }, myReview: null, canReview: false, cannotReviewReason: null }))

  it('no muestra el formulario de compra: pide completar el perfil y vuelve al evento', async () => {
    const s = useSessionStore()
    s.user = { ...googleUser } as never; s.accessToken = 'tok'
    const w = await mountSuspended(EventPage, { route: '/eventos/ev9' })
    expect(w.find('form.buy__form').exists()).toBe(false)
    const link = w.get('a[href^="/completar-perfil"]')
    expect(link.text()).toContain('Completar mi perfil')
    expect(decodeURIComponent(link.attributes('href')!)).toContain('redirect=/eventos/ev9')
    s.clear()
  })
})
