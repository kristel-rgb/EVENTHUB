<script setup lang="ts">
// Crear evento: se guarda como borrador y después se puede previsualizar y publicar.
definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Crear evento' })
</script>

<template>
  <div class="page">
    <header>
      <NuxtLink to="/organizador/eventos" class="back"><Icon name="lucide:arrow-left" size="16" /> Mis eventos</NuxtLink>
      <h1>Crear evento</h1>
      <p class="sub">Se guarda como borrador. Podés completarlo por partes, revisar la vista previa y publicarlo cuando esté aprobado.</p>
    </header>
    <EventForm />
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 18px; }
.back { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; font-size: 0.875rem; text-decoration: none; }
h1 { font-size: clamp(2rem, 4vw, 2.5rem); margin-top: 8px; }
.sub { margin: 6px 0 0; color: var(--text-secondary); max-width: 70ch; }
</style>
