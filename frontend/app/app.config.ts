// =========================================================
// Contenido base del sitio: textos, menú y datos generales.
// Las páginas y layouts leen de aquí con useAppConfig(),
// así un cambio de texto se hace en un solo lugar.
// (No poner secretos aquí: este archivo llega al navegador.)
// =========================================================
export default defineAppConfig({
  site: {
    name: 'EventHub',
    description: 'Plataforma para descubrir eventos, reservar espacios y llevar tu entrada digital con QR.',
    locale: 'es-CR',
    currency: 'CRC',
    footerNote: 'Proyecto Final · Programación II',
  },

  nav: [
    { to: '/', label: 'Inicio' },
    { to: '/buscar', label: 'Buscar' },
    { to: '/mis-entradas', label: 'Mis entradas' },
    { to: '/organizador', label: 'Organizar un evento' },
  ],

  home: {
    title: { before: 'Encontrá tu próximo', highlight: 'plan', middle: 'antes de que se', tag: 'agote.' },
    lead: 'Conciertos, talleres, ferias y conferencias. Reservá en segundos y llevá tu entrada con QR en el teléfono.',
    ctaSearch: 'Buscar eventos',
    ctaTickets: 'Mis entradas',
    categoriesTitle: 'Explorá por categoría',
    upcomingTitle: 'Próximos eventos',
    upcomingCount: 4,
    seeAllLabel: 'Ver todos los eventos',
  },

  searchPage: {
    title: 'Todos los eventos',
    searchPlaceholder: 'Buscá por nombre, lugar o categoría',
    perPage: 12,
    allCategoriesLabel: 'Todos',
    emptyText: 'No encontramos eventos con esa búsqueda.',
    resetLabel: 'Ver todos los eventos',
  },

  tickets: {
    title: 'Mis entradas',
    soonDays: 3, // con 3 días o menos para el evento, la entrada se marca como "Pronto"
    activeTab: 'Activas',
    historyTab: 'Historial',
    emptyActive: 'No tenés entradas activas por ahora.',
    emptyHistory: 'Todavía no hay entradas en tu historial.',
    findEvents: 'Buscar eventos',
    note: 'Válida para un solo ingreso. Presentá el código QR en la entrada del evento.',
  },

  event: {
    backLabel: 'Volver a buscar',
    buyLabel: 'Comprar entrada',
    freeLabel: 'Reservar gratis',
    soldOutLabel: 'Agotado',
    maxPerPurchase: 10,
    policy: 'Podés cancelar tu reserva desde "Mis entradas" según las condiciones del evento. Cada entrada tiene un código QR válido para un solo ingreso.',
  },
})
