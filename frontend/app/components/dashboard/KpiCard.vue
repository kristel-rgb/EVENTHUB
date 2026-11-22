<script setup lang="ts">
// Tarjeta de indicador del dashboard: valor, cambio frente al periodo anterior
// y una mini gráfica (sparkline) con la evolución dentro del periodo.
const props = withDefaults(defineProps<{
  label: string
  value: string
  current?: number
  previous?: number
  series?: number[]
  unit?: 'percent' | 'points'   // cómo se expresa el cambio: % o puntos
}>(), { series: () => [], unit: 'percent' })

const change = computed(() => {
  if (props.current === undefined || props.previous === undefined) return null
  if (props.unit === 'points') return { value: props.current - props.previous, text: `${Math.abs(props.current - props.previous)} pts` }
  if (props.previous === 0) return props.current > 0 ? { value: 1, text: 'Nuevo' } : { value: 0, text: 'Sin cambios' }
  const pct = Math.round(((props.current - props.previous) / props.previous) * 100)
  return { value: pct, text: `${Math.abs(pct)} %` }
})
const trend = computed(() => (!change.value || change.value.value === 0 ? 'flat' : change.value.value > 0 ? 'up' : 'down'))
const trendLabel = computed(() => ({ up: 'más que el periodo anterior', down: 'menos que el periodo anterior', flat: 'igual que el periodo anterior' })[trend.value])

// Puntos de la mini gráfica en un lienzo de 100 x 28
const points = computed(() => {
  const s = props.series
  if (s.length < 2) return ''
  const max = Math.max(...s), min = Math.min(...s)
  const range = max - min || 1
  return s.map((v, i) => `${((i / (s.length - 1)) * 100).toFixed(1)},${(26 - ((v - min) / range) * 24).toFixed(1)}`).join(' ')
})
</script>

<template>
  <article class="kpi card">
    <p class="kpi__label">{{ label }}</p>
    <p class="kpi__value">{{ value }}</p>
    <p v-if="change" class="kpi__change" :class="`is-${trend}`">
      <Icon :name="trend === 'up' ? 'lucide:trending-up' : trend === 'down' ? 'lucide:trending-down' : 'lucide:minus'" size="14" />
      {{ change.text }}
      <span class="sr-only">{{ trendLabel }}</span>
    </p>
    <slot />
    <svg v-if="points" class="kpi__spark" :class="`is-${trend}`" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">
      <polyline :points="points" fill="none" stroke-width="2" vector-effect="non-scaling-stroke" stroke-linejoin="round" stroke-linecap="round" />
    </svg>
  </article>
</template>

<style scoped>
.kpi { padding: 16px 18px; display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.kpi p { margin: 0; }
.kpi__label { font-size: 0.875rem; color: var(--text-secondary); font-weight: 500; }
.kpi__value { font-family: var(--font-display); font-weight: 700; font-size: 2rem; letter-spacing: -0.03em; line-height: 1.1; }
.kpi__change { align-self: flex-start; display: inline-flex; align-items: center; gap: 4px; padding: 2px 8px; border-radius: var(--radius-pill); font-size: 0.75rem; font-weight: 600; }
.kpi__change.is-up { background: var(--tint-forest); color: var(--color-forest-dark); }
.kpi__change.is-down { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.kpi__change.is-flat { background: var(--tint-neutral); color: var(--text-secondary); }
.kpi__spark { width: 100%; height: 30px; margin-top: auto; }
.kpi__spark polyline { stroke: var(--color-forest); }
.kpi__spark.is-down polyline { stroke: var(--color-raspberry); }
</style>
