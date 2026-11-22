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

  // Enlaces del pie de página y datos para las páginas legales
  footerLinks: [
    { to: '/privacidad', label: 'Política de privacidad' },
    { to: '/terminos', label: 'Términos y condiciones' },
    { to: '/cookies', label: 'Política de cookies' },
  ],
  legal: {
    contactEmail: 'soporte@eventhub.test', // reemplazar por el correo real del proyecto
    cookieNotice: 'Usamos cookies esenciales para mantener tu sesión segura y recordar tus preferencias. No usamos cookies de publicidad.',
    disclaimer: 'EventHub es un proyecto académico. Este documento es un modelo de referencia y no constituye asesoría legal.',
  },

  // Menú principal. show: 'all' (todos) · 'user' (ingresó) · 'organizer' (Organización y Super Admin)
  nav: [
    { to: '/', label: 'Inicio', show: 'all' },
    { to: '/buscar', label: 'Buscar', show: 'all' },
    { to: '/mis-entradas', label: 'Mis entradas', show: 'user' },
    { to: '/organizador', label: 'Organizar eventos', show: 'organizer' },
  ],

  home: {
    title: { before: 'Encontrá tu próximo', highlight: 'plan', middle: 'antes de que se', tag: 'agote.' },
    lead: 'Conciertos, talleres, ferias y conferencias. Reservá en segundos y llevá tu entrada con QR en el teléfono.',
    ctaSearch: 'Buscar eventos',
    ctaTickets: 'Mis entradas',
    scrollHint: 'Ver próximos eventos',
    // Imagen de fondo del hero. Para no depender de internet, se puede descargar
    // y guardar en public/images/hero.jpg, y aquí poner: '/images/hero.jpg'
    heroImage: 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?auto=format&fit=crop&w=2400&q=75',
    heroCredit: { name: 'Yvette de Wit', url: 'https://unsplash.com/photos/stage-light-front-of-audience-NYrVisodQ2M' },
    upcomingTitle: 'Próximos eventos',
    upcomingCount: 4,
    // Inicio del cliente con sesión (en vez del hero)
    personal: {
      greeting: 'Hola',
      searchPlaceholder: 'Buscar eventos, lugares o artistas',
      nextTicketTitle: 'Tu próxima entrada',
      feedTitle: 'Novedades',
      feedEmpty: 'No hay novedades por ahora. Aquí te avisamos si cambia algo de tus eventos o si aparece algo que te puede gustar.',
      popularTitle: 'Lo más esperado',
      popularCount: 4,
    },
    seeAllLabel: 'Ver todos los eventos',

    // Accesos rápidos "¿Qué hacer?": cada uno abre /buscar con esos filtros
    quickTitle: '¿Qué hacer?',
    quickLinks: [
      { label: 'Hoy', hint: 'Planes para hoy mismo', icon: 'lucide:sun', query: { fecha: 'hoy' } },
      { label: 'Este fin de semana', hint: 'De viernes a domingo', icon: 'lucide:party-popper', query: { fecha: 'fin-de-semana' } },
      { label: 'Próximos 7 días', hint: 'Lo que viene esta semana', icon: 'lucide:calendar-days', query: { fecha: 'semana' } },
      { label: 'Gratis', hint: 'Sin gastar un colón', icon: 'lucide:gift', query: { precio: 'gratis' } },
      { label: 'En familia', hint: 'Para todas las edades', icon: 'lucide:users', query: { categoria: 'familia' } },
    ],

    // Colecciones: grupos de eventos con un tema. Por ahora son búsquedas guardadas;
    // más adelante el backend podría administrarlas desde el panel del administrador.
    collectionsTitle: 'Colecciones',
    collections: [
      { label: 'Noches de jazz', hint: 'Música en vivo para una noche tranquila', icon: 'lucide:music', query: { q: 'jazz' } },
      { label: 'Para reír', hint: 'Stand-up e improvisación', icon: 'lucide:laugh', query: { categoria: 'comedia' } },
      { label: 'Grandes shows en Pedregal', hint: 'Los escenarios más grandes del país', icon: 'lucide:speaker', query: { lugar: 'Centro de Eventos Pedregal, Belén' } },
      { label: 'Sabores de Costa Rica', hint: 'Café, cacao y comida local', icon: 'lucide:utensils', query: { categoria: 'gastronomia' } },
    ],
  },

  searchPage: {
    title: 'Todos los eventos',
    searchPlaceholder: 'Buscá por nombre, lugar o categoría',
    perPage: 12,
    allCategoriesLabel: 'Todos',
    emptyText: 'No encontramos eventos con esa búsqueda.',
    resetLabel: 'Ver todos los eventos',
  },

  auth: {
    asideTitle: 'Tus planes y tus entradas, en un solo lugar.',
    benefits: [
      'Reservá en segundos',
      'Entradas digitales con QR en tu teléfono',
      'Recordatorios antes de cada evento',
      'Publicá tus propios eventos como organizador',
    ],
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
