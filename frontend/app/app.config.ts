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
    { to: '/', label: 'Explorar' },
    { to: '/mis-entradas', label: 'Mis entradas' },
    { to: '/organizador', label: 'Organizar un evento' },
  ],

  home: {
    title: { before: 'Encontrá tu próximo', highlight: 'plan', middle: 'antes de que se', tag: 'agote.' },
    lead: 'Conciertos, talleres, ferias y conferencias. Reservá en segundos y llevá tu entrada con QR en el teléfono.',
    searchPlaceholder: 'Jazz, taller de Vue, feria…',
    eventsTitle: 'Próximos eventos',
  },

  event: {
    backLabel: 'Volver a eventos',
    buyLabel: 'Comprar entrada',
    freeLabel: 'Reservar gratis',
    soldOutLabel: 'Agotado',
    maxPerPurchase: 10,
    policy: 'Podés cancelar tu reserva desde "Mis entradas" según las condiciones del evento. Cada entrada tiene un código QR válido para un solo ingreso.',
  },
})
