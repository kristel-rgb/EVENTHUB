// =========================================================
// Modelos que el frontend recibe de la API.
// Reflejan los documentos de MongoDB/Mongoose del backend,
// con las referencias ya "populadas" donde la API lo hace.
// Si el backend cambia un campo, se actualiza aquí.
// =========================================================

export type Role = 'admin' | 'organizer' | 'attendee'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'
export type ReservationStatus = 'confirmed' | 'cancelled'

/** Referencia mínima a otro documento (por ejemplo, el organizador) */
export interface DocRef {
  _id: string
  name: string
}

export interface User {
  _id: string
  name: string
  email: string
  role: Role
  emailVerified: boolean
  createdAt: string
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
