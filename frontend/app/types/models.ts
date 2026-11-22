// =========================================================
// Modelos que el frontend recibe de la API.
// Reflejan los documentos de MongoDB/Mongoose del backend,
// con las referencias ya "populadas" donde la API lo hace.
// Si el backend cambia un campo, se actualiza aquí.
// =========================================================

export type Role = 'admin' | 'organizer' | 'attendee'
export type EventStatus = 'draft' | 'published' | 'cancelled' | 'finished'
export type ReservationStatus = 'pending' | 'confirmed' | 'cancelled'   // pending = esperando pago (máx. 3 h)
export type PaymentStatus = 'pending' | 'paid' | 'free'
export type CancelledBy = 'customer' | 'organizer' | 'system'               // system = el pago no se confirmó en 3 h
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
  // Información ampliada (la llena el organizador en el formulario)
  summary?: string
  imageAlt?: string
  venueName?: string
  address?: string
  city?: string
  province?: string
  endDate?: string | null
  doorsOpenMinutes?: number
  maxPerPurchase?: number
  minAge?: number                  // 0 = todo público
  accessibility?: AccessibilityFeature[]
  importantInfo?: string
  ticketTypes?: TicketType[]
  cancellationPolicy?: CancellationPolicy
  contactEmail?: string
  contactPhone?: string
  updatedAt?: string
}

export type AccessibilityFeature = 'wheelchair' | 'parking' | 'public_transport' | 'sign_language'

/** Tipo de entrada de un evento (General, VIP, Preventa…) */
export interface TicketType {
  _id: string
  name: string
  price: number          // colones, 0 = gratis
  capacity: number       // cupos de este tipo
  available: number      // espacios libres de este tipo
  sold?: number          // solo en la vista del organizador
}
/** Lo que manda el formulario: _id solo si el tipo ya existía */
export interface TicketTypeInput { _id?: string, name: string, price: number, capacity: number }

/** Hasta cuándo puede cancelar el cliente */
export type CancellationPolicy = 'until_start' | '24h' | '48h' | '7d' | 'none'

/** Campos que se envían al crear o editar un evento (POST /events, PATCH /events/:id) */
export interface EventInput {
  name: string
  summary: string
  description: string
  category: string                 // _id de la categoría
  imageUrl: string | null
  imageAlt: string
  venueName: string
  address: string
  city: string
  province: string
  date: string                     // inicio, ISO
  endDate: string | null
  doorsOpenMinutes: number
  ticketTypes: TicketTypeInput[]
  maxPerPurchase: number
  minAge: number
  accessibility: AccessibilityFeature[]
  importantInfo: string
  cancellationPolicy: CancellationPolicy
  contactEmail: string
  contactPhone: string
}

/** Evento visto por su organizador: GET /organizer/events y /organizer/events/:id */
export interface OrganizerEvent extends Omit<EventInput, 'category' | 'ticketTypes'> {
  _id: string
  category: Category | null
  location: string
  ticketTypes: TicketType[]        // con `sold`
  capacity: number                 // suma de los cupos de los tipos
  price: number                    // precio más bajo
  availableSpots: number
  status: EventStatus
  displayStatus: EventStatus       // 'finished' si ya pasó aunque siga 'published'
  reserved: number
  revenue: number
  attendees: number                // reservaciones confirmadas (personas a notificar)
  createdAt: string
  updatedAt: string
}

export interface OrganizerEventList extends Paginated<OrganizerEvent> {
  counts: { all: number, published: number, draft: number, finished: number, cancelled: number }
}

export interface Reservation {
  _id: string
  event: DocRef
  user: DocRef
  quantity: number
  ticketTypeName?: string
  total: number
  status: ReservationStatus
  paymentStatus: PaymentStatus
  createdAt: string
}

/** Reservación como la ven el organizador (GET /organizer/reservations) y el cliente (GET /me/reservations) */
export interface ReservationItem {
  _id: string
  code: string                     // R-1A2B
  quantity: number
  ticketTypeName: string           // General, VIP…
  unitPrice: number
  total: number
  status: ReservationStatus
  paymentStatus: PaymentStatus
  paymentRef: string | null        // referencia de la pasarela (nunca datos de tarjeta)
  paidAt: string | null
  expiresAt: string | null         // solo si está esperando pago
  cancelledAt: string | null
  cancelledBy: CancelledBy | null
  ticketsSentAt: string | null
  createdAt: string
  ticketsUsed: number
  canCancel: boolean
  canResend: boolean
  event: { _id: string, name: string, date: string, location: string, status: EventStatus, category: Category }
  customer: { _id: string, name: string, email: string, phone?: string | null }   // en la lista el correo viene parcialmente oculto
}

/** GET /organizer/reservations/:id */
export interface ReservationDetail extends ReservationItem {
  tickets: { _id: string, code: string, status: TicketStatus, usedAt: string | null }[]
}

export interface OrganizerReservationList extends Paginated<ReservationItem> {
  counts: { all: number, confirmed: number, pending: number, cancelled: number }
  summary: {
    reservations: number
    newThisWeek: number
    ticketsSold: number
    ticketsPending: number
    capacity: number
    revenue: number
    checkedIn: number
    unitPrice: number | null       // solo si se eligió un evento
  }
}

/** POST .../reservations/:id/resend */
export interface ResendResult { sentTo: string, sentAt: string }

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
  reservation: {
    _id: string
    quantity: number
    createdAt: string
    ticketTypeName?: string
    canCancel?: boolean               // la política del evento todavía permite cancelar
    cancelBlockedReason?: string | null
  }
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

/** Indicador con su valor del periodo, el del periodo anterior y la serie para la mini gráfica */
export interface KpiValue {
  value: number
  previous: number
  series: number[]
}

export interface SalesBucket {
  start: string       // inicio del tramo (ISO)
  tickets: number
  revenue: number     // colones
}

export type OrganizerAlertType = 'almost_full' | 'sold_out' | 'low_sales' | 'drafts'

export interface OrganizerStats {
  period: 7 | 30 | 90
  organizerName: string
  kpis: {
    revenue: KpiValue
    ticketsSold: KpiValue
    occupancyRate: KpiValue        // 0 a 100
    events: { active: number, draft: number, cancelled: number }
  }
  nextEvent: { _id: string, name: string, date: string, location: string, capacity: number, reserved: number } | null
  sales: { current: SalesBucket[], previous: SalesBucket[] }
  alerts: { type: OrganizerAlertType, eventId: string | null, title: string, message: string }[]
  recentActivity: {
    _id: string
    type: 'reservation' | 'cancellation'
    userName: string               // nombre abreviado, por ejemplo "Ana M."
    quantity: number
    eventId: string
    eventName: string
    createdAt: string
  }[]
  events: { _id: string, name: string, date: string, status: EventStatus, capacity: number, reserved: number, revenue: number }[]
}

/** Evento que se puede validar en la puerta: GET /organizer/checkin/events */
export interface CheckinEvent {
  _id: string
  name: string
  date: string
  doorsOpenMinutes?: number
  location: string
  sold: number          // entradas vigentes (sin canceladas)
  checkedIn: number     // entradas ya usadas
}

/** Resultado de escanear una entrada (también viene en `details` cuando se rechaza) */
export interface ScanInfo {
  ticket: { _id: string, code: string, position: { n: number, of: number }, typeName?: string }
  holder: { name: string }
  reservation: { code: string, paymentStatus: PaymentStatus }
  usedAt: string | null
  gate: string | null
  canUndo: boolean
  eventName?: string | null
}

/** POST /tickets/validate (200) */
export interface ValidateResult extends ScanInfo {
  result: 'valid'
  sold: number
  checkedIn: number
}

/** GET /organizer/checkin?event= */
export interface CheckinStatus {
  event: { _id: string, name: string, date: string, location: string }
  sold: number
  checkedIn: number
  recent: ScanInfo[]
}

export type ScanRejectCode =
  | 'TICKET_INVALID' | 'TICKET_ALREADY_USED' | 'TICKET_CANCELLED' | 'TICKET_WRONG_EVENT'
  | 'TICKET_PAYMENT_PENDING' | 'EVENT_CANCELLED'

/** Novedades del inicio del cliente: GET /me/feed */
export interface FeedItem {
  _id: string
  type: 'cancelled' | 'changed' | 'few_spots' | 'new'
  title: string
  text: string
  createdAt: string
  event: {
    _id: string
    name: string
    date: string
    location: string
    imageUrl: string | null
    capacity: number
    availableSpots: number
    status: EventStatus
    category: Category
  }
}
