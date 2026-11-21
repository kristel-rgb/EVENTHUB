// =========================================================
// Modelos que el frontend recibe de la API.
// Reflejan los documentos de MongoDB/Mongoose del backend,
// con las referencias ya "populadas" donde la API lo hace.
// Si el backend cambia un campo, se actualiza aquí.
// =========================================================

export type Role = 'admin' | 'organizer' | 'attendee'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'
export type ReservationStatus = 'confirmed' | 'cancelled'
export type TicketStatus = 'active' | 'used' | 'cancelled'

/** Referencia mínima a otro documento (por ejemplo, el organizador) */
export interface DocRef {
  _id: string
  name: string
}

export type IdType = 'cedula' | 'dimex' | 'pasaporte'

export interface Address {
  province: string
  canton: string
  line: string
}

/**
 * Usuario con perfil completo. Los datos personales, de identificación,
 * contacto y dirección son los que la pasarela de pagos usa para precargar
 * la compra. EventHub NUNCA guarda datos de tarjetas de crédito o débito.
 */
export interface User {
  _id: string
  username: string
  firstName: string
  lastName1: string
  lastName2: string
  name: string                    // nombre para mostrar (persona u organización)
  organizationName: string | null
  email: string
  phone: string | null
  idType: IdType | null
  idNumber: string | null
  birthDate: string | null        // AAAA-MM-DD
  address: Address | null
  role: Role
  permissions: string[]           // permisos del rol, por ejemplo 'events:create'
  status: 'active' | 'disabled'
  emailVerified: boolean
  lastLoginAt: string | null
  createdAt: string
}

/** Respuesta de POST /auth/login */
export interface AuthResponse {
  accessToken: string
  expiresAt: string
  user: User
}

/** Cuerpo de POST /auth/register */
export interface RegisterPayload {
  firstName: string
  lastName1: string
  lastName2: string
  username: string
  email: string
  phone: string
  idType: IdType
  idNumber: string
  birthDate: string
  province: string
  canton: string
  addressLine: string
  password: string
  acceptTerms: boolean
}

export interface Category {
  _id: string
  name: string
  slug: string
}

export interface EventItem {
  _id: string
  name: string
  description: string
  category: Category
  imageUrl: string | null
  location: string
  date: string            // ISO 8601
  capacity: number
  availableSpots: number
  price: number           // 0 = gratis
  status: EventStatus
  organizer: DocRef
  ratingAvg: number | null
  ratingCount: number
}

export interface Reservation {
  _id: string
  event: DocRef
  user: DocRef
  quantity: number
  status: ReservationStatus
  createdAt: string
}

/** Entrada digital del usuario: GET /me/tickets */
export interface TicketItem {
  _id: string
  code: string            // código legible, por ejemplo EH-1042
  status: TicketStatus
  usedAt: string | null
  qrValue: string         // texto que va dentro del QR (el backend lo firma)
  createdAt: string
  event: {
    _id: string
    name: string
    date: string
    location: string
    imageUrl: string | null
    status: EventStatus
    category: Category
  }
  reservation: { _id: string, quantity: number, createdAt: string }
  holder: DocRef
}

/** Respuesta de POST /events/:id/reservations */
export interface ReservationCreated {
  reservation: Reservation
  tickets: { _id: string, code: string }[]
}

/** Formato estándar de listas paginadas acordado con el backend */
export interface Paginated<T> {
  items: T[]
  page: number
  limit: number
  total: number
}

/**
 * Respuesta de GET /events. Si la búsqueda no encontró nada y el backend
 * pudo corregirla (por ejemplo "jass" -> "jazz"), devuelve los resultados
 * de la búsqueda corregida y la indica en didYouMean.
 */
export interface EventSearchResult extends Paginated<EventItem> {
  didYouMean?: string | null
}

/** Lugar con eventos próximos: GET /locations */
export interface LocationOption {
  name: string
  count: number
}

/** Formato estándar de errores acordado con el backend */
export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export interface OrganizerUpcomingEvent {
  _id: string
  name: string
  date: string
  capacity: number
  reserved: number
  status: EventStatus
}

export interface OrganizerStats {
  eventsCreated: number
  activeEvents: number
  reservations: number
  availableSpots: number
  occupancyRate: number   // 0 a 100
  upcomingEvents: OrganizerUpcomingEvent[]
  reservationsByWeek: { week: string, count: number }[]
}
