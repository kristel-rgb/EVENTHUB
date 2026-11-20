// Colores del cartel que se muestra cuando un evento no tiene imagen.
// Se elige según la categoría para que cada tipo de evento se reconozca.
const posterColors: Record<string, { bg: string, ink: string }> = {
  conciertos: { bg: '#A3174F', ink: '#FFFFFF' },
  comedia: { bg: '#FDB98A', ink: '#1F2A24' },
  teatro: { bg: '#1F2A24', ink: '#F7F1E8' },
  gastronomia: { bg: '#FFE9D9', ink: '#7A3A12' },
  tecnologia: { bg: '#0F5C4D', ink: '#FFFFFF' },
  talleres: { bg: '#DCEDE6', ink: '#0B4438' },
  deportes: { bg: '#FBE3EC', ink: '#7A0F3A' },
  ferias: { bg: '#FDB98A', ink: '#1F2A24' },
  arte: { bg: '#7A0F3A', ink: '#FFFFFF' },
  familia: { bg: '#DCEDE6', ink: '#0B4438' },
  bienestar: { bg: '#0B4438', ink: '#F7F1E8' },
  cine: { bg: '#1F2A24', ink: '#FDB98A' },
}

export function eventPoster(categorySlug: string) {
  return posterColors[categorySlug] ?? { bg: '#EDE6DA', ink: '#1F2A24' }
}
