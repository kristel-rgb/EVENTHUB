// Fechas en hora de Costa Rica (UTC-6), formatos de dinero y rangos de búsqueda.
import { describe, expect, it } from 'vitest'
import { fromCrParts, toCrParts } from '~/utils/crDate'
import { formatNumber, formatPrice, formatPriceCompact, formatTime } from '~/utils/format'
import { dateRange, isDateRangeKey } from '~/utils/dateRanges'

describe('hora de Costa Rica', () => {
  it('ISO → fecha y hora local', () => {
    expect(toCrParts('2026-12-07T02:00:00.000Z')).toEqual({ date: '2026-12-06', time: '20:00' })
    expect(toCrParts(null)).toEqual({ date: '', time: '' })
  })
  it('fecha y hora local → ISO, ida y vuelta', () => {
    const iso = fromCrParts('2026-12-06', '20:00')!
    expect(iso).toBe('2026-12-07T02:00:00.000Z')
    expect(toCrParts(iso)).toEqual({ date: '2026-12-06', time: '20:00' })
    expect(fromCrParts('', '20:00')).toBeNull()
  })
  it('muestra la hora en Costa Rica sin importar dónde corre', () => {
    expect(formatTime('2026-12-07T02:00:00.000Z')).toMatch(/8:00/)
  })
})

describe('dinero', () => {
  it('0 se muestra como Gratis', () => {
    expect(formatPrice(0)).toBe('Gratis')
  })
  it('colones sin decimales', () => {
    expect(formatPrice(12000)).toMatch(/₡\s?12\s?000/)
    expect(formatNumber(1286)).toMatch(/1\s?286/)
  })
  it('formato corto para indicadores', () => {
    expect(formatPriceCompact(4_800_000)).toMatch(/4,8\s?M/)
    expect(formatPriceCompact(1_000_000)).not.toMatch(/,0/)
  })
})

describe('rangos de fecha de Buscar', () => {
  // Miércoles 25 nov 2026, 10:00 a. m. en Costa Rica
  const now = Date.parse('2026-11-25T16:00:00.000Z')
  it('reconoce solo las claves válidas', () => {
    expect(isDateRangeKey('fin-de-semana')).toBe(true)
    expect(isDateRangeKey('mañana')).toBe(false)
    expect(isDateRangeKey('')).toBe(false)
  })
  it('"hoy" va de ahora hasta la medianoche de Costa Rica', () => {
    expect(dateRange('hoy', now)).toEqual({ from: '2026-11-25T16:00:00.000Z', to: '2026-11-26T05:59:59.999Z' })
  })
  it('"fin de semana" va de viernes a domingo', () => {
    expect(dateRange('fin-de-semana', now)).toEqual({ from: '2026-11-27T06:00:00.000Z', to: '2026-11-30T05:59:59.999Z' })
  })
  it('sin filtro devuelve null', () => {
    expect(dateRange(undefined, now)).toBeNull()
  })
})
