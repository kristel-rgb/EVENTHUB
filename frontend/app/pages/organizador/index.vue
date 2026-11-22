<script setup lang="ts">
// Dashboard del organizador (tarea F06).
// Todo viene de GET /organizer/stats?period= (agregaciones de MongoDB en el backend):
// indicadores con tendencia, próximo evento, ventas, avisos, actividad y rendimiento.
import type { OrganizerAlertType, OrganizerStats } from '~/types/models'

definePageMeta({ layout: 'panel', panel: 'organizer' })
useHead({ title: 'Panel del organizador' })

const route = useRoute()
const router = useRouter()

// Periodo en la URL (?periodo=7) para poder compartirlo y volver con "atrás"
const periods = [
  { value: 7, label: '7 días' },
  { value: 30, label: '30 días' },
  { value: 90, label: '90 días' },
]
const period = computed(() => {
  const p = Number(route.query.periodo)
  return periods.some(o => o.value === p) ? p : 30
})
function setPeriod(value: number) {
  router.replace({ query: { ...route.query, periodo: value === 30 ? undefined : String(value) } })
}

const { data: stats, status, error, refresh } = await useOrganizerStats(period)
const reportOpen = ref(false)

// ---------- Próximo evento ----------
const next = computed(() => stats.value?.nextEvent ?? null)
const nextPct = computed(() => (next.value ? Math.round((next.value.reserved / next.value.capacity) * 100) : 0))
const RING = 2 * Math.PI * 26
const ringDash = computed(() => `${(nextPct.value / 100) * RING} ${RING}`)

// ---------- Avisos ----------
const alertIcon: Record<OrganizerAlertType, { icon: string, tone: string }> = {
  almost_full: { icon: 'lucide:flame', tone: 'urgent' },
  sold_out: { icon: 'lucide:badge-check', tone: 'ok' },
  low_sales: { icon: 'lucide:trending-down', tone: 'neutral' },
  drafts: { icon: 'lucide:file-pen-line', tone: 'warm' },
}

// ---------- Rendimiento por evento ----------
type Row = OrganizerStats['events'][number]
const sortBy = ref<'fecha' | 'ocupacion' | 'ingresos'>('fecha')
const occupancy = (r: Pick<Row, 'reserved' | 'capacity'>) => Math.round((r.reserved / r.capacity) * 100)
const rows = computed(() => {
  const list = [...(stats.value?.events ?? [])]
  if (sortBy.value === 'ocupacion') return list.sort((a, b) => occupancy(b) - occupancy(a))
  if (sortBy.value === 'ingresos') return list.sort((a, b) => b.revenue - a.revenue)
  return list.sort((a, b) => a.date.localeCompare(b.date))
})
const statusInfo: Record<string, { label: string, badge: string }> = {
  published: { label: 'Publicado', badge: 'badge--success' },
  draft: { label: 'Borrador', badge: 'badge--warm' },
  cancelled: { label: 'Cancelado', badge: 'badge--neutral' },
  finished: { label: 'Finalizado', badge: 'badge--neutral' },
}
</script>

<template>
  <div class="dash">
    <!-- Encabezado -->
    <header class="head">
      <div>
        <p class="head__hello">Hola, {{ stats?.organizerName ?? 'organizador' }}</p>
        <h1 class="head__title">Así van tus eventos</h1>
      </div>
      <div class="head__actions">
        <div class="seg" role="radiogroup" aria-label="Periodo">
          <button
            v-for="p in periods" :key="p.value" type="button" role="radio"
            :aria-checked="period === p.value" class="seg__btn" @click="setPeriod(p.value)"
          >
            {{ p.label }}
          </button>
        </div>
        <button type="button" class="btn btn--outline" @click="reportOpen = true">
          <Icon name="lucide:file-down" size="16" /> Descargar reporte
        </button>
        <NuxtLink to="/organizador/eventos/nuevo" class="btn btn--primary">
          <Icon name="lucide:plus" size="16" /> Crear evento
        </NuxtLink>
      </div>
    </header>
    <ClientOnly><ReportDialog :open="reportOpen" :period="period" @close="reportOpen = false" /></ClientOnly>

    <p v-if="status === 'pending' && !stats" class="state">Cargando estadísticas…</p>

    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar tus estadísticas.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>

    <template v-else-if="stats">
      <div class="content" :class="{ 'is-loading': status === 'pending' }">
        <!-- 1. Indicadores -->
        <section class="kpis" aria-label="Indicadores del periodo">
          <DashboardKpiCard
            label="Ingresos"
            :value="formatPriceCompact(stats.kpis.revenue.value)"
            :current="stats.kpis.revenue.value" :previous="stats.kpis.revenue.previous" :series="stats.kpis.revenue.series"
          />
          <DashboardKpiCard
            label="Entradas vendidas"
            :value="formatNumber(stats.kpis.ticketsSold.value)"
            :current="stats.kpis.ticketsSold.value" :previous="stats.kpis.ticketsSold.previous" :series="stats.kpis.ticketsSold.series"
          />
          <DashboardKpiCard
            label="Ocupación"
            :value="`${stats.kpis.occupancyRate.value} %`"
            :current="stats.kpis.occupancyRate.value" :previous="stats.kpis.occupancyRate.previous" :series="stats.kpis.occupancyRate.series"
            unit="points"
          />
          <DashboardKpiCard label="Eventos activos" :value="String(stats.kpis.events.active)">
            <p class="mix__text">{{ stats.kpis.events.draft }} en borrador · {{ stats.kpis.events.cancelled }} cancelados</p>
            <div class="mix" aria-hidden="true">
              <span class="mix__part mix__part--active" :style="{ flex: stats.kpis.events.active }" />
              <span class="mix__part mix__part--draft" :style="{ flex: stats.kpis.events.draft }" />
              <span class="mix__part mix__part--cancelled" :style="{ flex: stats.kpis.events.cancelled }" />
            </div>
          </DashboardKpiCard>
        </section>

        <!-- 2. Próximo evento + ventas -->
        <div class="row row--main">
          <section class="next theme-fixed" aria-labelledby="next-title">
            <template v-if="next">
              <p class="next__kicker">Próximo evento · {{ timeUntil(next.date) }}</p>
              <h2 id="next-title" class="next__name">{{ next.name }}</h2>
              <p class="next__meta cap">{{ formatEventDate(next.date) }} · {{ next.location }}</p>
              <div class="next__ring">
                <svg viewBox="0 0 64 64" width="84" height="84" role="img" :aria-label="`Ocupación ${nextPct} %`">
                  <circle cx="32" cy="32" r="26" class="ring__track" />
                  <circle cx="32" cy="32" r="26" class="ring__fill" :stroke-dasharray="ringDash" transform="rotate(-90 32 32)" />
                  <text x="32" y="37" text-anchor="middle" class="ring__text">{{ nextPct }}%</text>
                </svg>
                <div>
                  <p class="next__big">{{ formatNumber(next.reserved) }} de {{ formatNumber(next.capacity) }}</p>
                  <p class="next__sub">quedan {{ formatNumber(next.capacity - next.reserved) }} espacios</p>
                </div>
              </div>
              <div class="next__actions">
                <NuxtLink to="/organizador/validar" class="btn btn--accent"><Icon name="lucide:scan-line" size="16" /> Validar entradas</NuxtLink>
                <NuxtLink :to="`/organizador/reservaciones?evento=${next._id}`" class="btn next__ghost">Ver reservas</NuxtLink>
              </div>
            </template>
            <template v-else>
              <h2 id="next-title" class="next__name">No tenés eventos próximos</h2>
              <p class="next__sub">Publicá un evento para empezar a vender entradas.</p>
              <NuxtLink to="/organizador/eventos/nuevo" class="btn btn--accent">Crear evento</NuxtLink>
            </template>
          </section>

          <DashboardSalesChart :current="stats.sales.current" :previous="stats.sales.previous" />
        </div>

        <!-- 3. Avisos + actividad -->
        <div class="row">
          <section class="card box" aria-labelledby="alerts-title">
            <h2 id="alerts-title">Necesita atención</h2>
            <p v-if="!stats.alerts.length" class="empty"><Icon name="lucide:circle-check" size="18" /> Todo en orden por ahora.</p>
            <ul v-else class="list">
              <li v-for="a in stats.alerts" :key="a.title">
                <NuxtLink :to="a.eventId ? `/eventos/${a.eventId}` : '/organizador/eventos?estado=borrador'" class="alert">
                  <span class="alert__icon" :class="`is-${alertIcon[a.type].tone}`"><Icon :name="alertIcon[a.type].icon" size="18" /></span>
                  <span class="alert__text">
                    <span class="alert__title">{{ a.title }}</span>
                    <span class="alert__msg">{{ a.message }}</span>
                  </span>
                  <Icon name="lucide:chevron-right" size="18" class="alert__chev" />
                </NuxtLink>
              </li>
            </ul>
          </section>

          <section class="card box" aria-labelledby="activity-title">
            <h2 id="activity-title">Últimas reservas</h2>
            <p v-if="!stats.recentActivity.length" class="empty">Todavía no hay reservas.</p>
            <ul v-else class="list">
              <li v-for="r in stats.recentActivity" :key="r._id" class="act">
                <span class="act__icon" :class="r.type === 'cancellation' ? 'is-cancel' : 'is-res'">
                  <Icon :name="r.type === 'cancellation' ? 'lucide:x' : 'lucide:ticket'" size="16" />
                </span>
                <span class="act__text">
                  <strong>{{ r.userName }}</strong>
                  {{ r.type === 'cancellation' ? 'canceló' : 'reservó' }} {{ r.quantity }} {{ r.quantity === 1 ? 'entrada' : 'entradas' }}
                  <span class="act__event">{{ r.eventName }}</span>
                </span>
                <span class="act__time">{{ timeUntil(r.createdAt) }}</span>
              </li>
            </ul>
          </section>
        </div>

        <!-- 4. Rendimiento por evento -->
        <section class="card box" aria-labelledby="perf-title">
          <div class="box__head">
            <h2 id="perf-title">Rendimiento por evento</h2>
            <label class="sort">
              <span>Ordenar por</span>
              <select v-model="sortBy">
                <option value="fecha">Más próximo</option>
                <option value="ocupacion">Mayor ocupación</option>
                <option value="ingresos">Más ingresos</option>
              </select>
            </label>
          </div>
          <div class="table-wrap">
            <table>
              <thead>
                <tr><th>Evento</th><th>Fecha</th><th>Estado</th><th>Ocupación</th><th class="num">Ingresos</th></tr>
              </thead>
              <tbody>
                <tr v-for="r in rows" :key="r._id">
                  <td class="strong"><NuxtLink :to="`/eventos/${r._id}`">{{ r.name }}</NuxtLink></td>
                  <td class="cap">{{ formatShortDate(r.date) }}</td>
                  <td><span class="badge" :class="statusInfo[r.status]?.badge">{{ statusInfo[r.status]?.label }}</span></td>
                  <td>
                    <template v-if="r.status === 'published'">
                      <div class="occ">
                        <div class="occ__track"><div class="occ__fill" :class="{ 'is-high': occupancy(r) >= 90 }" :style="{ width: `${occupancy(r)}%` }" /></div>
                        <span>{{ occupancy(r) }} %</span>
                      </div>
                    </template>
                    <span v-else class="muted">—</span>
                  </td>
                  <td class="num">{{ r.revenue ? formatPriceCompact(r.revenue) : '—' }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 20px; }

.head { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; }
.head__hello { margin: 0 0 4px; color: var(--text-secondary); }
.head__title { font-size: 2.5rem; }
.head__actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }

.seg { display: inline-flex; padding: 3px; border-radius: var(--radius-md); background: var(--color-white); border: 1px solid var(--border); }
.seg__btn {
  min-height: 38px; padding: 0 14px; border: 0; border-radius: 11px; cursor: pointer;
  background: transparent; color: var(--text-secondary); font: 600 0.875rem var(--font-body);
}
.seg__btn[aria-checked='true'] { background: var(--color-ink); color: var(--color-sand); }

.state { padding: 40px 0; color: var(--text-secondary); display: flex; flex-direction: column; align-items: flex-start; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.content { display: flex; flex-direction: column; gap: 16px; transition: opacity .15s; }
.content.is-loading { opacity: 0.55; }

.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.mix__text { margin: 0; font-size: 0.8125rem; color: var(--text-secondary); }
.mix { display: flex; gap: 3px; margin-top: auto; padding-top: 8px; }
.mix__part { height: 8px; border-radius: var(--radius-pill); min-width: 0; }
.mix__part--active { background: var(--color-forest); }
.mix__part--draft { background: var(--color-peach); }
.mix__part--cancelled { background: var(--track); }

.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 16px; }
.row--main { grid-template-columns: minmax(min(100%, 300px), 0.9fr) minmax(min(100%, 380px), 1.4fr); }

/* Próximo evento */
.next {
  position: relative; overflow: hidden; isolation: isolate;
  background: var(--color-ink); color: var(--color-sand); border-radius: var(--radius-lg); padding: 22px;
  display: flex; flex-direction: column; gap: 6px;
}
.next::after {
  content: ''; position: absolute; right: -50px; top: -50px; z-index: -1;
  width: 170px; height: 170px; border-radius: 50%; border: 28px solid var(--color-raspberry);
}
.next p { margin: 0; }
.next__kicker { color: var(--color-peach); font-weight: 600; font-size: 0.875rem; }
.next__name { font-size: 1.5rem; color: var(--color-sand); max-width: 16ch; }
.next__meta { color: var(--text-on-dark-muted); font-size: 0.875rem; }
.next__ring { display: flex; align-items: center; gap: 14px; margin: 12px 0; }
.ring__track { fill: none; stroke: var(--surface-dark-2); stroke-width: 8; }
.ring__fill { fill: none; stroke: var(--color-peach); stroke-width: 8; stroke-linecap: round; }
.ring__text { fill: var(--color-sand); font: 700 13px var(--font-body); }
.next__big { font-weight: 600; font-size: 1.125rem; }
.next__sub { color: var(--text-on-dark-muted); font-size: 0.875rem; }
.next__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: auto; }
.next__ghost { background: transparent; color: var(--color-sand); border-color: rgba(247, 241, 232, 0.5); }
.next__ghost:hover { background: var(--color-sand); color: var(--color-ink); }
.cap::first-letter { text-transform: uppercase; }

/* Cajas */
.box { padding: 18px 20px; min-width: 0; }
.box h2 { font-size: 1.25rem; margin-bottom: 8px; }
.box__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; }
.box__head h2 { margin: 0; }
.empty { display: flex; gap: 8px; align-items: center; color: var(--text-secondary); margin: 8px 0 0; }
.list { list-style: none; margin: 0; padding: 0; }
.list > li + li { border-top: 1px solid var(--track); }

.alert { display: flex; align-items: center; gap: 12px; padding: 10px 0; text-decoration: none; color: var(--color-ink); }
.alert:hover .alert__title { color: var(--color-forest); }
.alert__icon { flex-shrink: 0; width: 36px; height: 36px; border-radius: 10px; display: inline-flex; align-items: center; justify-content: center; }
.alert__icon.is-urgent { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.alert__icon.is-ok { background: var(--tint-forest); color: var(--color-forest-dark); }
.alert__icon.is-warm { background: var(--tint-peach); color: var(--tint-peach-text); }
.alert__icon.is-neutral { background: var(--tint-neutral); color: var(--text-secondary); }
.alert__text { display: flex; flex-direction: column; flex: 1; min-width: 0; }
.alert__title { font-weight: 600; font-size: 0.9375rem; }
.alert__msg { font-size: 0.8125rem; color: var(--text-secondary); }
.alert__chev { color: var(--text-secondary); flex-shrink: 0; }

.act { display: flex; align-items: center; gap: 12px; padding: 10px 0; font-size: 0.875rem; }
.act__icon { flex-shrink: 0; width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; }
.act__icon.is-res { background: var(--tint-forest); color: var(--color-forest-dark); }
.act__icon.is-cancel { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.act__text { flex: 1; min-width: 0; }
.act__event { display: block; color: var(--text-secondary); font-size: 0.8125rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.act__time { flex-shrink: 0; color: var(--text-secondary); font-size: 0.75rem; }

.sort { display: inline-flex; align-items: center; gap: 8px; font-size: 0.875rem; color: var(--text-secondary); }
.sort select {
  min-height: 40px; padding: 0 12px; border-radius: var(--radius-sm); border: 1.5px solid var(--border);
  background: var(--color-white); color: var(--color-ink); font: 500 0.875rem var(--font-body);
}

.table-wrap { overflow-x: auto; }
table { width: 100%; min-width: 620px; border-collapse: collapse; font-size: 0.875rem; }
th { text-align: left; font-size: 0.75rem; font-weight: 500; color: var(--text-secondary); padding: 8px 0; }
td { padding: 12px 8px 12px 0; border-top: 1px solid var(--track); vertical-align: middle; }
.num { text-align: right; padding-right: 0; }
.strong a { color: var(--color-ink); font-weight: 600; text-decoration: none; }
.strong a:hover { color: var(--color-forest); text-decoration: underline; }
.muted { color: var(--text-secondary); }
.occ { display: flex; align-items: center; gap: 8px; }
.occ span { font-variant-numeric: tabular-nums; min-width: 40px; }
.occ__track { flex: 1; height: 8px; border-radius: var(--radius-pill); background: var(--track); }
.occ__fill { height: 8px; border-radius: var(--radius-pill); background: var(--color-forest); }
.occ__fill.is-high { background: var(--color-raspberry); }

@media (max-width: 860px) {
  .head__title { font-size: 2rem; }
  .row--main { grid-template-columns: 1fr; }
}
</style>
