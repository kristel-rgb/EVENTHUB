// Sesión y roles, estado de las entradas y lectura de errores de la API.
import { describe, expect, it } from 'vitest'
import { canOrganize, homeForRole, roleLabel, safeRedirect } from '~/utils/session'
import { ticketState, timeUntil } from '~/utils/tickets'
import { readApiError } from '~/utils/apiError'
import type { TicketItem } from '~/types/models'

describe('roles', () => {
  it('cada rol abre en su página', () => {
    expect(homeForRole('attendee')).toBe('/')
    expect(homeForRole('organizer')).toBe('/organizador')
    expect(homeForRole('admin')).toBe('/admin')
    expect(homeForRole(null)).toBe('/')
  })
  it('solo la Organización y el Super Admin organizan eventos', () => {
    expect(canOrganize('organizer')).toBe(true)
    expect(canOrganize('admin')).toBe(true)
    expect(canOrganize('attendee')).toBe(false)
    expect(roleLabel.admin).toBe('Super Admin')
  })
  it('solo acepta redirecciones internas (evita mandar a otro sitio)', () => {
    expect(safeRedirect('/eventos/1')).toBe('/eventos/1')
    expect(safeRedirect('//malo.com')).toBeNull()
    expect(safeRedirect('https://malo.com')).toBeNull()
    expect(safeRedirect(undefined)).toBeNull()
  })
})

describe('estado de una entrada', () => {
  const now = Date.parse('2026-11-23T12:00:00.000Z')
  const t = (status: TicketItem['status'], date: string, eventStatus: TicketItem['event']['status'] = 'published') =>
    ({ status, event: { date, status: eventStatus } }) as unknown as TicketItem
  it.each([
    ['active', '2026-12-20T02:00:00Z', 'published', 'active'],
    ['active', '2026-11-24T02:00:00Z', 'published', 'soon'],
    ['active', '2026-11-20T02:00:00Z', 'published', 'expired'],
    ['used', '2026-11-20T02:00:00Z', 'published', 'used'],
    ['active', '2026-12-20T02:00:00Z', 'cancelled', 'cancelled'],
    ['cancelled', '2026-12-20T02:00:00Z', 'published', 'cancelled'],
  ] as const)('%s, evento %s (%s) → %s', (status, date, ev, expected) => {
    expect(ticketState(t(status, date, ev), 3, now)).toBe(expected)
  })
  it('dice cuánto falta en palabras', () => {
    expect(timeUntil('2026-11-25T12:00:00.000Z', now)).toBe('pasado mañana')
  })
})

describe('readApiError', () => {
  it('lee el formato estándar { code, message, details }', () => {
    const err = { data: { code: 'NOT_ENOUGH_SPOTS', message: 'Solo quedan 2', details: null } }
    expect(readApiError(err)).toEqual({ code: 'NOT_ENOUGH_SPOTS', message: 'Solo quedan 2', details: null })
  })
  it('también cuando viene envuelto por el servidor de Nuxt', () => {
    expect(readApiError({ data: { data: { code: 'X', message: 'Y', details: { a: 'b' } } } }).details).toEqual({ a: 'b' })
  })
  it('sin respuesta, da un mensaje de conexión', () => {
    expect(readApiError(new Error('fetch failed')).code).toBe('NETWORK_ERROR')
  })
})
