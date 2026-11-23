// Reglas de los formularios de cuenta: son las mismas que valida el backend.
import { describe, expect, it } from 'vitest'
import { cleanIdNumber, cleanPhone, passwordRules, validateLogin, validatePasswordChange, validateProfile, validateRegister } from '~/utils/authValidation'
import type { RegisterForm } from '~/utils/authValidation'

const validRegister = (): RegisterForm => ({
  firstName: 'Ana', lastName1: 'Mora', lastName2: '', birthDate: '1995-04-10', idType: 'cedula', idNumber: '1-0234-0567',
  email: 'ana@correo.cr', phone: '8888-1234', province: 'San José', canton: 'Escazú', addressLine: '',
  username: 'ana.mora', password: 'Clave2026x', confirmPassword: 'Clave2026x', acceptTerms: true,
})

describe('limpieza de datos', () => {
  it('quita guiones y espacios de la identificación y la pone en mayúsculas', () => {
    expect(cleanIdNumber('1-0234-0567')).toBe('102340567')
    expect(cleanIdNumber('a12 345 678')).toBe('A12345678')
  })
  it('deja solo los dígitos del teléfono', () => {
    expect(cleanPhone('8888-1234')).toBe('88881234')
    expect(cleanPhone('(506) 2222 3333')).toBe('50622223333')
  })
})

describe('validateLogin', () => {
  it('pide usuario y contraseña', () => {
    expect(validateLogin({ identifier: ' ', password: '' })).toEqual({
      identifier: 'Ingresá tu usuario o correo.',
      password: 'Ingresá tu contraseña.',
    })
  })
  it('acepta datos completos', () => {
    expect(validateLogin({ identifier: 'UserTest', password: 'x' })).toEqual({})
  })
})

describe('validateRegister', () => {
  it('acepta un registro correcto', () => {
    expect(validateRegister(validRegister())).toEqual({})
  })
  it('rechaza menores de 18 años', () => {
    const f = validRegister()
    const y = new Date().getUTCFullYear() - 17
    f.birthDate = `${y}-01-01`
    expect(validateRegister(f).birthDate).toBe('Tenés que ser mayor de 18 años.')
  })
  it('revisa el formato de la cédula, el teléfono y que las contraseñas coincidan', () => {
    const f = { ...validRegister(), idNumber: '123', phone: '1234', confirmPassword: 'otra', acceptTerms: false }
    const e = validateRegister(f)
    expect(e.idNumber).toMatch(/Formato incorrecto/)
    expect(e.phone).toBe('Ingresá un teléfono de Costa Rica de 8 dígitos.')
    expect(e.confirmPassword).toBe('Las contraseñas no coinciden.')
    expect(e.acceptTerms).toBeDefined()
  })
  it('exige una contraseña segura', () => {
    const f = { ...validRegister(), password: 'clave', confirmPassword: 'clave' }
    expect(validateRegister(f).password).toBe('La contraseña no cumple los requisitos.')
  })
})

describe('reglas de contraseña', () => {
  it.each([
    ['Clave2026x', true],
    ['clave2026x', false],
    ['CLAVE2026X', false],
    ['Clavesinnum', false],
    ['Cl4ve', false],
  ])('%s → %s', (pass, ok) => {
    expect(passwordRules.every(r => r.test(pass))).toBe(ok)
  })
})

describe('validateProfile', () => {
  const profile = { firstName: 'Ana', lastName1: 'Mora', lastName2: '', organizationName: '', birthDate: '1990-01-01', phone: '88881234', province: 'Heredia', canton: 'Belén', addressLine: '' }
  it('acepta un perfil completo', () => {
    expect(validateProfile(profile, false)).toEqual({})
  })
  it('a una organización le pide el nombre de la organización', () => {
    expect(validateProfile(profile, true).organizationName).toBeDefined()
  })
})

describe('validatePasswordChange', () => {
  it('la nueva tiene que ser distinta y coincidir', () => {
    expect(validatePasswordChange({ currentPassword: 'Clave2026x', newPassword: 'Clave2026x', confirmPassword: 'Clave2026x' }).newPassword).toBe('Tiene que ser distinta de la actual.')
    expect(validatePasswordChange({ currentPassword: 'a', newPassword: 'Nueva2026x', confirmPassword: 'Nueva2026' }).confirmPassword).toBe('Las contraseñas no coinciden.')
    expect(validatePasswordChange({ currentPassword: 'a', newPassword: 'Nueva2026x', confirmPassword: 'Nueva2026x' })).toEqual({})
  })
})
