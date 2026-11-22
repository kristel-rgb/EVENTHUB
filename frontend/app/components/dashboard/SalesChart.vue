<script setup lang="ts">
// Gráfico de ventas: línea con área del periodo actual y línea punteada
// del periodo anterior. Se puede ver en entradas o en ingresos.
// Incluye una tabla oculta con los mismos datos para lectores de pantalla.
import type { SalesBucket } from '~/types/models'

const props = defineProps<{ current: SalesBucket[], previous: SalesBucket[] }>()
const metric = ref<'tickets' | 'revenue'>('tickets')

const W = 600, H = 220, LEFT = 52, RIGHT = 12, TOP = 16, BOTTOM = 30
const plotW = W - LEFT - RIGHT
const plotH = H - TOP - BOTTOM

const labelFmt = new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'short', timeZone: 'America/Costa_Rica' })
const fmtValue = (v: number) => (metric.value === 'revenue' ? formatPriceCompact(v) : formatNumber(v))

const max = computed(() => {
  const values = [...props.current, ...props.previous].map(b => b[metric.value])
  return Math.max(1, ...values)
})
const x = (i: number, n: number) => LEFT + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW)
const y = (v: number) => TOP + plotH - (v / max.value) * plotH

const currentPts = computed(() => props.current.map((b, i) => ({ x: x(i, props.current.length), y: y(b[metric.value]), b })))
const previousPts = computed(() => props.previous.map((b, i) => ({ x: x(i, props.previous.length), y: y(b[metric.value]) })))
const line = (pts: { x: number, y: number }[]) => pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
const area = computed(() => {
  const pts = currentPts.value
  if (!pts.length) return ''
  return `M${pts[0]!.x},${TOP + plotH} L${line(pts).replaceAll(' ', ' L')} L${pts[pts.length - 1]!.x},${TOP + plotH} Z`
})
const ticks = computed(() => [0, 0.5, 1].map(f => ({ y: y(max.value * f), label: fmtValue(Math.round(max.value * f)) })))
const xLabels = computed(() => {
  const n = props.current.length
  const idx = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1]
  return idx.map(i => ({ x: x(i, n), label: labelFmt.format(new Date(props.current[i]!.start)) }))
})
const last = computed(() => currentPts.value[currentPts.value.length - 1])
const total = computed(() => props.current.reduce((s, b) => s + b[metric.value], 0))
</script>

<template>
  <section class="chart card" aria-labelledby="sales-title">
    <div class="chart__head">
      <div>
        <h2 id="sales-title">Ventas</h2>
        <p class="chart__total">{{ fmtValue(total) }} {{ metric === 'tickets' ? 'entradas en el periodo' : 'en el periodo' }}</p>
      </div>
      <div class="toggle" role="group" aria-label="Ver ventas en">
        <button type="button" :aria-pressed="metric === 'tickets'" @click="metric = 'tickets'">Entradas</button>
        <button type="button" :aria-pressed="metric === 'revenue'" @click="metric = 'revenue'">Ingresos</button>
      </div>
    </div>

    <svg :viewBox="`0 0 ${W} ${H}`" class="chart__svg" role="img" :aria-label="`Ventas del periodo: ${fmtValue(total)}. Detalle en la tabla siguiente.`">
      <g v-for="t in ticks" :key="t.y">
        <line :x1="LEFT" :x2="W - RIGHT" :y1="t.y" :y2="t.y" class="grid" />
        <text :x="LEFT - 8" :y="t.y + 4" text-anchor="end" class="axis">{{ t.label }}</text>
      </g>
      <path :d="area" class="area" />
      <polyline :points="line(previousPts)" class="prev" />
      <polyline :points="line(currentPts)" class="curr" />
      <circle v-for="p in currentPts" :key="p.b.start" :cx="p.x" :cy="p.y" r="4" class="dot">
        <title>{{ labelFmt.format(new Date(p.b.start)) }}: {{ fmtValue(p.b[metric]) }}</title>
      </circle>
      <g v-if="last">
        <circle :cx="last.x" :cy="last.y" r="6" class="dot dot--last" />
      </g>
      <text v-for="l in xLabels" :key="l.x" :x="l.x" :y="H - 8" text-anchor="middle" class="axis">{{ l.label }}</text>
    </svg>

    <p class="chart__legend">
      <span><i class="sw sw--curr" /> Este periodo</span>
      <span><i class="sw sw--prev" /> Periodo anterior</span>
    </p>

    <table class="sr-only">
      <caption>Ventas por tramo del periodo</caption>
      <thead><tr><th>Desde</th><th>Entradas</th><th>Ingresos</th></tr></thead>
      <tbody>
        <tr v-for="b in current" :key="b.start">
          <td>{{ labelFmt.format(new Date(b.start)) }}</td><td>{{ b.tickets }}</td><td>{{ formatPrice(b.revenue) }}</td>
        </tr>
      </tbody>
    </table>
  </section>
</template>

<style scoped>
.chart { padding: 18px 20px; display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.chart__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; flex-wrap: wrap; }
.chart__head h2 { font-size: 1.25rem; }
.chart__total { margin: 4px 0 0; color: var(--text-secondary); font-size: 0.875rem; }

.toggle { display: inline-flex; padding: 3px; border-radius: var(--radius-pill); background: var(--tint-neutral); }
.toggle button {
  min-height: 36px; padding: 0 14px; border: 0; border-radius: var(--radius-pill); cursor: pointer;
  background: transparent; color: var(--text-secondary); font: 600 0.8125rem var(--font-body);
}
.toggle button[aria-pressed='true'] { background: var(--color-white); color: var(--color-ink); box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12); }

.chart__svg { width: 100%; height: auto; overflow: visible; }
.grid { stroke: var(--track); stroke-width: 1; }
.axis { fill: var(--text-secondary); font-size: 11px; font-family: var(--font-body); }
.area { fill: var(--tint-forest); }
.curr { fill: none; stroke: var(--color-forest); stroke-width: 2.5; stroke-linejoin: round; stroke-linecap: round; }
.prev { fill: none; stroke: var(--text-secondary); stroke-width: 1.5; stroke-dasharray: 5 5; opacity: 0.7; }
.dot { fill: var(--color-white); stroke: var(--color-forest); stroke-width: 2; }
.dot--last { fill: var(--color-forest); }

.chart__legend { margin: 0; display: flex; gap: 16px; font-size: 0.8125rem; color: var(--text-secondary); }
.chart__legend span { display: inline-flex; align-items: center; gap: 6px; }
.sw { display: inline-block; width: 16px; height: 0; }
.sw--curr { border-top: 3px solid var(--color-forest); }
.sw--prev { border-top: 2px dashed var(--text-secondary); }
</style>
