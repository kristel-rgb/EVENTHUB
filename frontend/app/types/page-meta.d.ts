// Opciones propias que usan las páginas en definePageMeta (las revisa middleware/auth.global.ts)
import type { Role } from './models'

declare module '#app' {
  interface PageMeta {
    /** Pide haber ingresado (cualquier tipo de usuario) */
    auth?: boolean
    /** Solo para quien NO ha ingresado (Ingresar, Crear cuenta) */
    guestOnly?: boolean
    /** Panel: organizer = Organización y Super Admin · admin = solo Super Admin */
    panel?: 'organizer' | 'admin'
    /** Roles permitidos, si la página necesita algo más específico */
    roles?: Role[]
  }
}

export {}
