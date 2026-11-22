<script setup lang="ts">
import type { EventItem } from '~/types/models'

const props = defineProps<{ event: EventItem }>()

// Si el evento no tiene imagen, se muestra un cartel de color según la categoría
const poster = computed(() => eventPoster(props.event.category.slug))

// Disponibilidad calculada a partir de los datos de la API
const availability = computed(() => {
  const spots = props.event.availableSpots
  if (spots === 0) return { text: 'Agotado', tone: 'out' }
  if (spots <= 10) return { text: `Quedan ${spots}`, tone: 'low' }
  return { text: `${spots} disponibles`, tone: 'ok' }
})
</script>

<template>
  <NuxtLink :to="`/eventos/${event._id}`" class="event-card">
    <div
      class="event-card__poster"
      :style="{ background: poster.bg, color: poster.ink }"
    >
      <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.name" class="event-card__img">
      <template v-else>
        <span class="event-card__cat">{{ event.category.name }}</span>
        <span class="event-card__big" aria-hidden="true">{{ event.name }}</span>
      </template>
    </div>

    <div class="event-card__body">
      <p class="event-card__date">{{ formatEventDate(event.date) }}</p>
      <h3 class="event-card__name">{{ event.name }}</h3>
      <p class="event-card__place">
        <Icon name="lucide:map-pin" size="14" /> {{ event.location }}
      </p>
      <div class="event-card__foot">
        <span class="event-card__price"><template v-if="(event.ticketTypes?.length ?? 0) > 1">Desde </template>{{ formatPrice(event.price) }}</span>
        <span class="event-card__spots" :class="`is-${availability.tone}`">{{ availability.text }}</span>
      </div>
    </div>
  </NuxtLink>
</template>

<style scoped>
.event-card {
  display: flex; flex-direction: column; overflow: hidden;
  background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-lg);
  color: var(--color-ink); text-decoration: none;
  transition: transform .15s, border-color .15s;
}
.event-card:hover { transform: translateY(-2px); border-color: var(--color-forest); color: var(--color-ink); }

.event-card__poster {
  height: 160px; padding: 16px; position: relative;
  display: flex; flex-direction: column; justify-content: space-between;
}
.event-card__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.event-card__cat {
  align-self: flex-start; background: var(--color-sand); color: var(--color-ink);
  font-size: 0.75rem; font-weight: 600; padding: 4px 10px; border-radius: var(--radius-pill);
}
.event-card__big {
  font-family: var(--font-display); font-weight: 700; font-size: 1.625rem; line-height: 0.95;
  letter-spacing: -0.04em; text-transform: uppercase;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}

.event-card__body { padding: 16px 18px 18px; display: flex; flex-direction: column; gap: 4px; flex: 1; }
.event-card__body p { margin: 0; }
.event-card__date { font-size: 0.8125rem; font-weight: 600; color: var(--color-forest); text-transform: capitalize; }
.event-card__name { font-size: 1.1875rem; font-weight: 600; letter-spacing: -0.01em; line-height: 1.2; }
.event-card__place { font-size: 0.875rem; color: var(--text-secondary); display: flex; align-items: center; gap: 4px; }
.event-card__foot { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 10px; }
.event-card__price { font-weight: 600; }
.event-card__spots { font-size: 0.8125rem; font-weight: 600; }
.event-card__spots.is-ok { color: var(--color-forest); }
.event-card__spots.is-low { color: var(--color-raspberry); }
.event-card__spots.is-out { color: var(--text-secondary); }
</style>
