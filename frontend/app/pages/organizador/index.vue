<script setup lang="ts">
// Página temporal para verificar el layout de panel.
// Se reemplazará por el dashboard real del organizador (tarea F06).
definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Panel del organizador' })

const kpis = [
  { label: 'Eventos creados', hint: 'Total desde el inicio', tone: 'plain' },
  { label: 'Eventos activos', hint: 'Publicados y vigentes', tone: 'plain' },
  { label: 'Reservaciones', hint: 'Confirmadas', tone: 'forest' },
  { label: 'Ocupación promedio', hint: 'Reservados / capacidad', tone: 'peach' },
]
</script>

<template>
  <div class="head">
    <div>
      <p class="head__hello">Panel del organizador</p>
      <h1 class="head__title">Así van tus eventos</h1>
    </div>
    <div class="head__actions">
      <button class="btn btn--outline">
        <Icon name="lucide:download" size="16" /> Descargar reporte PDF
      </button>
      <button class="btn btn--primary">
        <Icon name="lucide:plus" size="16" /> Crear evento
      </button>
    </div>
  </div>

  <div class="kpis">
    <div v-for="k in kpis" :key="k.label" class="kpi" :class="`kpi--${k.tone}`">
      <p class="kpi__label">{{ k.label }}</p>
      <p class="kpi__value">—</p>
      <p class="kpi__hint">{{ k.hint }}</p>
    </div>
  </div>

  <p class="note">Los números se cargarán desde la API cuando esté listo el endpoint de estadísticas.</p>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
.head__hello { margin: 0 0 4px; color: var(--text-secondary); }
.head__title { font-size: 40px; }
.head__actions { display: flex; flex-wrap: wrap; gap: 10px; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.kpi { border-radius: var(--radius-lg); padding: 20px; }
.kpi p { margin: 0; }
.kpi__label { font-size: 13px; font-weight: 500; }
.kpi__value { font-family: var(--font-display); font-weight: 700; font-size: 44px; line-height: 1.1; margin-top: 8px !important; }
.kpi__hint { font-size: 12px; margin-top: 6px !important; }

.kpi--plain { background: var(--color-white); border: 1px solid var(--border); }
.kpi--plain .kpi__label, .kpi--plain .kpi__hint { color: var(--text-secondary); }
.kpi--forest { background: var(--color-forest); color: var(--color-white); }
.kpi--forest .kpi__label, .kpi--forest .kpi__hint { color: #CDE5DB; }
.kpi--peach { background: var(--color-peach); color: var(--color-ink); }
.kpi--peach .kpi__label, .kpi--peach .kpi__hint { color: var(--tint-peach-text); }

.note { margin-top: 20px; color: var(--text-secondary); font-size: 14px; }
</style>
