// Colores del cartel que se muestra cuando un evento no tiene imagen.
// Se elige según la categoría para que cada tipo de evento se reconozca.
const posterColors: Record<string, { bg: string, ink: string }> = {
  musica: { bg: '#A3174F', ink: '#FFFFFF' },
  tecnologia: { bg: '#1F2A24', ink: '#F7F1E8' },
  talleres: { bg: '#FDB98A', ink: '#1F2A24' },
  deportes: { bg: '#FBE3EC', ink: '#7A0F3A' },
  ferias: { bg: '#DCEDE6', ink: '#0B4438' },
  arte: { bg: '#0F5C4D', ink: '#FFFFFF' },
}

export function eventPoster(categorySlug: string) {
  return posterColors[categorySlug] ?? { bg: '#EDE6DA', ink: '#1F2A24' }
}
