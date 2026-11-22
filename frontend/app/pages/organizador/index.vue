<script setup lang="ts">
// Dashboard del organizador (tarea F06).
// Todos los números vienen de GET /organizer/stats (agregaciones de MongoDB en el backend).
definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Panel del organizador' })

const { data: stats, status, error, refresh } = await useOrganizerStats()

const kpis = computed(() => {
  if (!stats.value) return []
  const s = stats.value
  return [
    { label: 'Eventos creados', value: s.eventsCreated, hint: 'Total desde el inicio', tone: 'plain' },
    { label: 'Eventos activos', value: s.activeEvents, hint: 'Publicados y vigentes', tone: 'plain' },
    { label: 'Reservaciones', value: s.reservations, hint: 'Confirmadas', tone: 'forest' },
    { label: 'Ocupación promedio', value: `${s.occupancyRate}%`, hint: `${s.availableSpots} espacios libres`, tone: 'peach' },
  ]
})

// Altura de cada barra relativa a la semana con más reservaciones
const weeks = computed(() => {
  const list = stats.value?.reservationsByWeek ?? []
  const max = Math.max(1, ...list.map(w => w.count))
  return list.map(w => ({ ...w, height: Math.round((w.count / max) * 100) }))
})

const statusLabel: Record<string, string> = {
  published: 'Publicado', draft: 'Borrador', cancelled: 'Cancelado', finished: 'Finalizado',
}
const occupancy = (reserved: number, capacity: number) => Math.round((reserved / capacity) * 100)
</script>

<template>
  <div class="head">
    <div>
      <p class="head__hello">Panel del organizador</p>
      <h1 class="head__title">Así van tus eventos</h1>
    </div>
    <NuxtLink to="/organizador/eventos/nuevo" class="btn btn--primary">
      <Icon name="lucide:plus" size="16" /> Crear evento
    </NuxtLink>
  </div>

  <p v-if="status === 'pending' && !stats" class="state">Cargando estadísticas…</p>

  <div v-else-if="error" class="state state--error">
    <p>No pudimos cargar tus estadísticas.</p>
    <button class="btn btn--outline" @click="refresh()">Reintentar</button>
  </div>

  <template v-else-if="stats">
    <div class="kpis">
      <div v-for="k in kpis" :key="k.label" class="kpi" :class="`kpi--${k.tone}`">
        <p class="kpi__label">{{ k.label }}</p>
        <p class="kpi__value">{{ k.value }}</p>
        <p class="kpi__hint">{{ k.hint }}</p>
      </div>
    </div>

    <div class="row">
      <section class="card box" aria-labelledby="weeks-title">
        <div class="box__head">
          <h2 id="weeks-title">Reservaciones por semana</h2>
          <span>Últimas 8 semanas</span>
        </div>
        <div class="bars" role="img" :aria-label="`Reservaciones por semana: ${weeks.map(w => w.count).join(', ')}`">
          <div v-for="w in weeks" :key="w.week" class="bars__col">
            <span class="bars__num">{{ w.count }}</span>
            <div class="bars__bar" :style="{ height: `${w.height}%` }" />
            <span class="bars__label">{{ w.week }}</span>
          </div>
        </div>
      </section>

      <section class="card box" aria-labelledby="occ-title">
        <h2 id="occ-title">Ocupación por evento</h2>
        <p v-if="stats.upcomingEvents.length === 0" class="empty">Todavía no tenés eventos próximos.</p>
        <div v-for="e in stats.upcomingEvents" :key="e._id" class="occ">
          <div class="occ__top">
            <span>{{ e.name }}</span>
            <span class="occ__pct">{{ occupancy(e.reserved, e.capacity) }}%</span>
          </div>
          <div class="occ__track">
            <div
              class="occ__fill"
              :class="{ 'is-high': occupancy(e.reserved, e.capacity) >= 90 }"
              :style="{ width: `${occupancy(e.reserved, e.capacity)}%` }"
            />
          </div>
        </div>
      </section>
    </div>

    <section class="card box">
      <div class="table-wrap">
        <table>
          <caption>Próximos eventos</caption>
          <thead>
            <tr><th>Evento</th><th>Fecha</th><th>Reservas</th><th>Estado</th></tr>
          </thead>
          <tbody>
            <tr v-for="e in stats.upcomingEvents" :key="e._id">
              <td class="strong">{{ e.name }}</td>
              <td class="cap">{{ formatShortDate(e.date) }}</td>
              <td>{{ e.reserved }} / {{ e.capacity }}</td>
              <td>{{ statusLabel[e.status] }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </template>
</template>

<style scoped>
.head { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; margin-bottom: 24px; }
.head__hello { margin: 0 0 4px; color: var(--text-secondary); }
.head__title { font-size: 2.5rem; }

.state { padding: 40px 0; color: var(--text-secondary); display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 14px; }
.kpi { border-radius: var(--radius-lg); padding: 20px; }
.kpi p { margin: 0; }
.kpi__label { font-size: 0.8125rem; font-weight: 500; }
.kpi__value { font-family: var(--font-display); font-weight: 700; font-size: 2.75rem; line-height: 1.1; margin-top: 8px !important; }
.kpi__hint { font-size: 0.75rem; margin-top: 6px !important; }
.kpi--plain { background: var(--color-white); border: 1px solid var(--border); }
.kpi--plain .kpi__label, .kpi--plain .kpi__hint { color: var(--text-secondary); }
.kpi--forest { background: var(--color-forest); color: var(--color-white); }
.kpi--forest .kpi__label, .kpi--forest .kpi__hint { color: var(--on-forest-muted); }
.kpi--peach { background: var(--color-peach); color: var(--on-peach); }
.kpi--peach .kpi__label, .kpi--peach .kpi__hint { color: #7A3A12; }

.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 14px; margin-top: 14px; }
.box { padding: 22px; margin-top: 14px; }
.row .box { margin-top: 0; }
.box h2, caption { font-size: 1.25rem; font-family: var(--font-display); font-weight: 600; letter-spacing: -0.02em; }
.box__head { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.box__head span { font-size: 0.8125rem; color: var(--text-secondary); }

.bars { display: flex; align-items: flex-end; gap: 10px; height: 220px; margin-top: 18px; }
.bars__col { flex: 1; height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 6px; }
.bars__bar { width: 100%; min-height: 4px; background: var(--color-forest); border-radius: 8px 8px 3px 3px; }
.bars__col:last-child .bars__bar { background: var(--color-raspberry); }
.bars__num { font-size: 0.75rem; font-weight: 600; }
.bars__label { font-size: 0.75rem; color: var(--text-secondary); }

.empty { color: var(--text-secondary); }
.occ { margin-top: 16px; }
.occ__top { display: flex; justify-content: space-between; gap: 12px; font-size: 0.875rem; font-weight: 500; margin-bottom: 6px; }
.occ__pct { color: var(--text-secondary); font-weight: 400; }
.occ__track { height: 10px; border-radius: var(--radius-pill); background: var(--track); }
.occ__fill { height: 10px; border-radius: var(--radius-pill); background: var(--color-forest); }
.occ__fill.is-high { background: var(--color-raspberry); }

.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 560px; border-collapse: collapse; font-size: 0.875rem; }
caption { text-align: left; padding-bottom: 12px; }
th { text-align: left; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); padding: 10px 0; }
td { padding: 14px 0; border-top: 1px solid var(--track); }
.strong { font-weight: 500; }
.cap { text-transform: capitalize; }
</style>
