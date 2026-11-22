// Validaciones de los formularios de ingreso y registro.
// Son las mismas reglas que valida el backend: el frontend las revisa antes
// para avisar rápido, pero la validación que cuenta es la del servidor.
import { z } from 'zod'
import type { IdType } from '~/types/models'

export const provinces = ['San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste', 'Puntarenas', 'Limón']

export const idTypeOptions: { value: IdType, label: string, hint: string, placeholder: string, rule: RegExp }[] = [
  { value: 'cedula', label: 'Cédula física', hint: '9 dígitos, por ejemplo 1-0234-0567', placeholder: '1-0234-0567', rule: /^[1-9]\d{8}$/ },
  { value: 'dimex', label: 'DIMEX', hint: '11 o 12 dígitos', placeholder: '155812345678', rule: /^\d{11,12}$/ },
  { value: 'pasaporte', label: 'Pasaporte', hint: 'De 6 a 20 letras o números', placeholder: 'A12345678', rule: /^[A-Z0-9]{6,20}$/ },
]

export const passwordRules = [
  { label: 'Al menos 8 caracteres', test: (p: string) => p.length >= 8 },
  { label: 'Una letra mayúscula', test: (p: string) => /[A-Z]/.test(p) },
  { label: 'Una letra minúscula', test: (p: string) => /[a-z]/.test(p) },
  { label: 'Un número', test: (p: string) => /\d/.test(p) },
]

/** Quita guiones y espacios de la identificación y la pasa a mayúsculas */
export const cleanIdNumber = (v: string) => v.toUpperCase().replace(/[\s-]/g, '')
/** Deja solo los dígitos del teléfono */
export const cleanPhone = (v: string) => v.replace(/\D/g, '')

const firstIssues = (error: z.ZodError) => {
  const out: Record<string, string> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0])
    if (!out[key]) out[key] = issue.message
  }
  return out
}

// ---------- Ingresar ----------
const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Ingresá tu usuario o correo.'),
  password: z.string().min(1, 'Ingresá tu contraseña.'),
})

export function validateLogin(form: { identifier: string, password: string }) {
  const result = loginSchema.safeParse(form)
  return result.success ? {} : firstIssues(result.error)
}

// ---------- Crear cuenta ----------
export interface RegisterForm {
  firstName: string
  lastName1: string
  lastName2: string
  birthDate: string
  idType: IdType | ''
  idNumber: string
  email: string
  phone: string
  province: string
  canton: string
  addressLine: string
  username: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

const registerSchema = z.object({
  firstName: z.string().trim().min(2, 'Ingresá tu nombre.'),
  lastName1: z.string().trim().min(2, 'Ingresá tu primer apellido.'),
  birthDate: z.string().min(1, 'Ingresá tu fecha de nacimiento.'),
  idType: z.string().min(1, 'Elegí un tipo de identificación.'),
  idNumber: z.string().trim().min(1, 'Ingresá tu número de identificación.'),
  email: z.string().trim().regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Ingresá un correo válido.'),
  phone: z.string().trim().min(1, 'Ingresá tu teléfono.'),
  province: z.string().min(1, 'Elegí una provincia.'),
  canton: z.string().trim().min(2, 'Ingresá tu cantón.'),
  username: z.string().trim().regex(/^[a-zA-Z0-9._]{4,20}$/, 'Usá de 4 a 20 letras, números, puntos o guiones bajos.'),
  password: z.string().min(1, 'Creá una contraseña.'),
})

export function validateRegister(form: RegisterForm) {
  const result = registerSchema.safeParse(form)
  const errors: Record<string, string> = result.success ? {} : firstIssues(result.error)

  // Reglas que combinan campos o dependen de otros
  const idRule = idTypeOptions.find(o => o.value === form.idType)
  if (!errors.idNumber && idRule && !idRule.rule.test(cleanIdNumber(form.idNumber))) {
    errors.idNumber = `Formato incorrecto: ${idRule.hint}.`
  }
  if (!errors.phone && !/^[2-8]\d{7}$/.test(cleanPhone(form.phone))) {
    errors.phone = 'Ingresá un teléfono de Costa Rica de 8 dígitos.'
  }
  if (!errors.birthDate) {
    const birth = new Date(`${form.birthDate}T00:00:00Z`)
    const limit = new Date()
    limit.setUTCFullYear(limit.getUTCFullYear() - 18)
    if (Number.isNaN(birth.getTime())) errors.birthDate = 'Ingresá una fecha válida.'
    else if (birth > limit) errors.birthDate = 'Tenés que ser mayor de 18 años.'
  }
  if (!errors.password && !passwordRules.every(r => r.test(form.password))) {
    errors.password = 'La contraseña no cumple los requisitos.'
  }
  if (form.confirmPassword !== form.password) errors.confirmPassword = 'Las contraseñas no coinciden.'
  if (!form.acceptTerms) errors.acceptTerms = 'Tenés que aceptar los términos y la política de privacidad.'
  return errors
}

// ---------- Perfil ----------
export interface ProfileForm {
  firstName: string
  lastName1: string
  lastName2: string
  organizationName: string
  birthDate: string
  phone: string
  province: string
  canton: string
  addressLine: string
}

export function validateProfile(form: ProfileForm, isOrganization: boolean) {
  const errors: Record<string, string> = {}
  if (form.firstName.trim().length < 2) errors.firstName = 'Ingresá tu nombre.'
  if (form.lastName1.trim().length < 2) errors.lastName1 = 'Ingresá tu primer apellido.'
  if (isOrganization && form.organizationName.trim().length < 2) errors.organizationName = 'Ingresá el nombre de la organización.'
  if (!/^[2-8]\d{7}$/.test(cleanPhone(form.phone))) errors.phone = 'Ingresá un teléfono de Costa Rica de 8 dígitos.'
  const birth = new Date(`${form.birthDate}T00:00:00Z`)
  const limit = new Date()
  limit.setUTCFullYear(limit.getUTCFullYear() - 18)
  if (!form.birthDate || Number.isNaN(birth.getTime())) errors.birthDate = 'Ingresá una fecha válida.'
  else if (birth > limit) errors.birthDate = 'Tenés que ser mayor de 18 años.'
  if (!form.province) errors.province = 'Elegí una provincia.'
  if (form.canton.trim().length < 2) errors.canton = 'Ingresá tu cantón.'
  return errors
}

export function validatePasswordChange(form: { currentPassword: string, newPassword: string, confirmPassword: string }) {
  const errors: Record<string, string> = {}
  if (!form.currentPassword) errors.currentPassword = 'Ingresá tu contraseña actual.'
  if (!passwordRules.every(r => r.test(form.newPassword))) errors.newPassword = 'La contraseña no cumple los requisitos.'
  else if (form.newPassword === form.currentPassword) errors.newPassword = 'Tiene que ser distinta de la actual.'
  if (form.confirmPassword !== form.newPassword) errors.confirmPassword = 'Las contraseñas no coinciden.'
  return errors
}
