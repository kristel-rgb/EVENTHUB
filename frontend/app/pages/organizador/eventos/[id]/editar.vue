<script setup lang="ts">
// Editar evento. Si está publicado, los cambios se ven en el sitio al guardar.
definePageMeta({ layout: 'panel', panel: 'organizer' })

const route = useRoute()
const id = String(route.params.id)
const { data: event, error } = await useOrganizerEvent(id)
if (error.value || !event.value) {
  throw createError({ statusCode: 404, statusMessage: 'Evento no encontrado', fatal: true })
}
useHead({ title: () => `Editar: ${event.value?.name ?? 'evento'}` })
</script>

<template>
  <div v-if="event" class="page">
    <header>
      <NuxtLink to="/organizador/eventos" class="back"><Icon name="lucide:arrow-left" size="16" /> Mis eventos</NuxtLink>
      <h1>Editar evento</h1>
      <p class="sub">{{ event.name }}</p>
    </header>
    <EventForm :key="event._id + event.updatedAt" :event="event" />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.back { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.875rem; text-decoration: none; }
h1 { font-size: clamp(2rem, 4vw, 2.5rem); margin-top: 8px; }
.sub { margin: 6px 0 0; color: var(--text-secondary); }
</style>
