// Formulario de eventos: conversión a lo que espera la API y validaciones para publicar.
import { describe, expect, it } from 'vitest'
import { emptyEventForm, inputFromForm, newTicketRow, publishChecklist, ticketKey, ticketTotals, validateEventForm } from '~/utils/eventForm'
import type { EventFormState } from '~/utils/eventForm'

const future = (days: number) => {
  const d = new Date(Date.now() + days * 86_400_000)
  return d.toISOString().slice(0, 10)
}
const complete = (): EventFormState => ({
  ...emptyEventForm(),
  name: 'Noche de bolero', category: 'cat1', summary: 'Clásicos del bolero en vivo',
  description: 'Una noche con los mejores boleros, con banda en vivo y artistas invitados.',
  startDate: future(10), startTime: '20:00', endTime: '22:30',
  venueName: 'Teatro Nacional', city: 'San José', province: 'San José',
  ticketTypes: [{ name: 'General', price: 12000, capacity: 400, sold: 0 }, { name: 'VIP', price: 25000, capacity: 80, sold: 0 }],
  contactEmail: 'info@organizacion.cr',
})

describe('validateEventForm', () => {
  it('un borrador solo necesita el nombre', () => {
    expect(validateEventForm({ ...emptyEventForm(), name: 'Mi evento' }, false)).toEqual({})
    expect(validateEventForm(emptyEventForm(), false).name).toBeDefined()
  })
  it('para publicar pide todo lo importante', () => {
    const e = validateEventForm({ ...emptyEventForm(), name: 'Mi evento' }, true)
    for (const k of ['category', 'summary', 'description', 'startDate', 'startTime', 'venueName', 'city', 'province', 'contactEmail']) {
      expect(e[k], k).toBeDefined()
    }
  })
  it('acepta un evento completo', () => {
    expect(validateEventForm(complete(), true)).toEqual({})
  })
  it('no deja publicar con fecha pasada', () => {
    const f = { ...complete(), startDate: '2020-01-01' }
    expect(validateEventForm(f, true).startDate).toBe('La fecha tiene que ser futura.')
  })
  it('revisa cada tipo de entrada: nombre único, precio y cupos', () => {
    const f = complete()
    f.ticketTypes = [{ name: 'General', price: 1000, capacity: 10, sold: 0 }, { name: 'general', price: -5, capacity: 0, sold: 0 }]
    const e = validateEventForm(f, true)
    expect(e[ticketKey(1, 'name')]).toBe('Ya hay un tipo con este nombre.')
    expect(e[ticketKey(1, 'price')]).toBeDefined()
    expect(e[ticketKey(1, 'capacity')]).toBeDefined()
  })
  it('no deja bajar los cupos de un tipo por debajo de lo vendido', () => {
    const f = complete()
    f.ticketTypes[0] = { _id: 't1', name: 'General', price: 12000, capacity: 50, sold: 120 }
    expect(validateEventForm(f, true)[ticketKey(0, 'capacity')]).toBe('Ya hay 120 vendidas.')
  })
  it('en un evento gratuito no pide precios', () => {
    const f = { ...complete(), isFree: true, ticketTypes: [{ name: 'Entrada libre', price: null, capacity: 100, sold: 0 }] }
    expect(validateEventForm(f, true)).toEqual({})
  })
  it('revisa el correo y el teléfono de contacto', () => {
    const e = validateEventForm({ ...complete(), contactEmail: 'no-es-correo', contactPhone: '123' }, true)
    expect(e.contactEmail).toBeDefined()
    expect(e.contactPhone).toBeDefined()
  })
})

describe('inputFromForm', () => {
  it('convierte fecha y hora de Costa Rica a ISO', () => {
    const body = inputFromForm({ ...complete(), startDate: '2026-12-06', startTime: '20:00', endTime: '22:30' })
    expect(body.date).toBe('2026-12-07T02:00:00.000Z')
    expect(body.endDate).toBe('2026-12-07T04:30:00.000Z')
  })
  it('si la hora de fin es antes del inicio, termina al día siguiente', () => {
    const body = inputFromForm({ ...complete(), startDate: '2026-12-06', startTime: '22:00', endTime: '01:00' })
    expect(body.endDate).toBe('2026-12-07T07:00:00.000Z')
  })
  it('no manda las filas de entradas vacías y pone precio 0 si es gratis', () => {
    const f = { ...complete(), isFree: true }
    f.ticketTypes.push(newTicketRow())
    const body = inputFromForm(f)
    expect(body.ticketTypes).toHaveLength(2) // la fila nueva vacía no se manda
    expect(body.ticketTypes!.every(t => t.price === 0)).toBe(true)
  })
  it('limpia el teléfono y conserva el _id de los tipos existentes', () => {
    const f = complete()
    f.contactPhone = '2222-3333'
    f.ticketTypes[0]!._id = 'abc'
    const body = inputFromForm(f)
    expect(body.contactPhone).toBe('22223333')
    expect(body.ticketTypes![0]).toEqual({ _id: 'abc', name: 'General', price: 12000, capacity: 400 })
    expect(body.ticketTypes![1]).not.toHaveProperty('_id')
  })
})

describe('ticketTotals y publishChecklist', () => {
  it('suma la capacidad y calcula el precio "desde"', () => {
    expect(ticketTotals(complete())).toEqual({ capacity: 480, minPrice: 12000 })
  })
  it('la lista para publicar queda completa con un evento correcto', () => {
    const list = publishChecklist(complete())
    expect(list.filter(c => !c.ok && !c.optional)).toEqual([])
    expect(publishChecklist(emptyEventForm()).filter(c => !c.ok && !c.optional).length).toBeGreaterThan(3)
  })
})

describe('borradores', () => {
  it('la fila "General" que viene escrita no se manda si no tiene precio ni cupos', () => {
    const body = inputFromForm({ ...emptyEventForm(), name: 'Mi evento' })
    expect(body.ticketTypes).toEqual([])
  })
})
