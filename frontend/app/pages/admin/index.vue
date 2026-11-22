<script setup lang="ts">
// Resumen general (Super Admin): usuarios, eventos, reservaciones, ingresos, categorías y moderación.
// Datos: GET /admin/stats?period=
definePageMeta({ layout: 'panel', panel: 'admin' })
useHead({ title: 'Resumen general' })

const route = useRoute()
const router = useRouter()
const periods = [{ value: 7, label: '7 días' }, { value: 30, label: '30 días' }, { value: 90, label: '90 días' }]
const period = computed(() => (periods.some(p => p.value === Number(route.query.periodo)) ? Number(route.query.periodo) : 30))
function setPeriod(v: number) { router.replace({ query: { ...route.query, periodo: v === 30 ? undefined : String(v) } }) }

const { data: s, status, error, refresh } = await useAdminStats(period)
const maxCat = computed(() => Math.max(1, ...(s.value?.categories.map(c => c.events) ?? [1])))
const eventStatus = [
  { key: 'published', label: 'Publicados', cls: 'is-pub' },
  { key: 'draft', label: 'Borradores', cls: 'is-draft' },
  { key: 'finished', label: 'Finalizados', cls: 'is-fin' },
  { key: 'cancelled', label: 'Cancelados', cls: 'is-can' },
] as const
const kinds = ['attendee', 'organization', 'venue', 'admin'] as const
</script>

<template>
  <div class="dash">
    <header class="head">
      <div>
        <p class="head__hello">Super Admin</p>
        <h1 class="head__title">Resumen general</h1>
      </div>
      <div class="seg" role="radiogroup" aria-label="Periodo">
        <button v-for="p in periods" :key="p.value" type="button" role="radio" :aria-checked="period === p.value" class="seg__btn" @click="setPeriod(p.value)">{{ p.label }}</button>
      </div>
    </header>

    <p v-if="status === 'pending' && !s" class="state">Cargando estadísticas…</p>
    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar las estadísticas.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>

    <template v-else-if="s">
      <section class="kpis" aria-label="Indicadores">
        <DashboardKpiCard label="Ingresos" :value="formatPriceCompact(s.kpis.revenue.value)" :current="s.kpis.revenue.value" :previous="s.kpis.revenue.previous" :series="s.kpis.revenue.series" />
        <DashboardKpiCard label="Entradas vendidas" :value="formatNumber(s.kpis.tickets.value)" :current="s.kpis.tickets.value" :previous="s.kpis.tickets.previous" :series="s.kpis.tickets.series" />
        <DashboardKpiCard label="Cuentas" :value="formatNumber(s.kpis.users.value)" :current="s.kpis.users.new" :previous="s.kpis.users.newPrevious">
          <p class="kpi-note">+{{ formatNumber(s.kpis.users.new) }} nuevas en el periodo</p>
        </DashboardKpiCard>
        <DashboardKpiCard label="Ocupación de eventos activos" :value="`${s.kpis.occupancy.value} %`">
          <p class="kpi-note">{{ s.kpis.occupancy.activeEvents }} eventos activos · {{ formatNumber(s.kpis.checkedIn) }} ingresos validados</p>
        </DashboardKpiCard>
      </section>

      <div class="row row--main">
        <DashboardSalesChart :current="s.sales.current" :previous="s.sales.previous" />
        <section class="card box" aria-labelledby="ev-title">
          <h2 id="ev-title">Eventos</h2>
          <div class="mix" aria-hidden="true">
            <span v-for="st in eventStatus" :key="st.key" class="mix__part" :class="st.cls" :style="{ flex: s.events[st.key] }" />
          </div>
          <ul class="legend">
            <li v-for="st in eventStatus" :key="st.key"><span class="dot" :class="st.cls" aria-hidden="true" /> {{ st.label }} <strong>{{ s.events[st.key] }}</strong></li>
          </ul>
          <h3>Cuentas</h3>
          <ul class="legend">
            <li v-for="k in kinds" :key="k"><Icon :name="accountKindInfo[k].icon" size="14" /> {{ accountKindInfo[k].short }} <strong>{{ formatNumber(s.accounts[k]) }}</strong></li>
          </ul>
          <NuxtLink to="/admin/cuentas" class="more">Ver cuentas <Icon name="lucide:arrow-right" size="14" /></NuxtLink>
        </section>
      </div>

      <div class="row">
        <section class="card box" aria-labelledby="top-title">
          <h2 id="top-title">Eventos que más vendieron</h2>
          <ol v-if="s.topEvents.length" class="rank">
            <li v-for="e in s.topEvents" :key="e._id">
              <NuxtLink :to="`/eventos/${e._id}`">{{ e.name }}</NuxtLink>
              <span class="muted">{{ formatNumber(e.tickets) }} entradas · {{ formatPriceCompact(e.revenue) }}</span>
            </li>
          </ol>
          <p v-else class="muted">Sin ventas en este periodo.</p>
        </section>
        <section class="card box" aria-labelledby="org-title">
          <h2 id="org-title">Organizaciones y lugares</h2>
          <ol class="rank">
            <li v-for="o in s.topOrganizations" :key="o._id">
              <span>{{ o.name }} <span class="badge" :class="accountKindInfo[o.kind].badge">{{ accountKindInfo[o.kind].short }}</span></span>
              <span class="muted">{{ o.events }} eventos · {{ formatPriceCompact(o.revenue) }}</span>
            </li>
          </ol>
        </section>
      </div>

      <div class="row">
        <section class="card box" aria-labelledby="cat-title">
          <div class="box__head">
            <h2 id="cat-title">Eventos activos por categoría</h2>
            <NuxtLink to="/admin/categorias" class="more">Administrar <Icon name="lucide:arrow-right" size="14" /></NuxtLink>
          </div>
          <ul class="bars">
            <li v-for="c in s.categories" :key="c._id">
              <span class="bars__label">{{ c.name }}</span>
              <span class="bars__track" aria-hidden="true"><span :style="{ width: `${(c.events / maxCat) * 100}%` }" /></span>
              <span class="bars__n">{{ c.events }}</span>
            </li>
          </ul>
        </section>
        <section class="card box" aria-labelledby="mod-title">
          <h2 id="mod-title">Moderación</h2>
          <p class="mod">
            <strong>{{ s.moderation.flagged }}</strong> {{ s.moderation.flagged === 1 ? 'comentario para revisar' : 'comentarios para revisar' }}
            <span class="muted">· {{ s.moderation.hidden }} ocultos de {{ s.moderation.total }}</span>
          </p>
          <NuxtLink to="/admin/moderacion" class="btn" :class="s.moderation.flagged ? 'btn--primary' : 'btn--outline'">Ir a moderación</NuxtLink>
          <h3>Cuentas nuevas</h3>
          <ul class="rank">
            <li v-for="a in s.recentAccounts" :key="a._id"><span>{{ a.name }}</span><span class="muted">{{ accountKindInfo[a.kind].short }} · {{ formatShortDate(a.createdAt) }}</span></li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dash { display: flex; flex-direction: column; gap: 20px; }
.head { display: flex; flex-wrap: wrap; gap: 16px; align-items: flex-end; justify-content: space-between; }
.head__hello { margin: 0 0 4px; color: var(--text-secondary); }
.head__title { font-size: clamp(2rem, 4vw, 2.5rem); }
.seg { display: inline-flex; padding: 3px; border-radius: var(--radius-md); background: var(--color-white); border: 1px solid var(--border); }
.seg__btn { min-height: 40px; padding: 0 14px; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); font: 600 0.875rem var(--font-body); cursor: pointer; }
.seg__btn[aria-checked='true'] { background: var(--color-ink); color: var(--color-sand); }
.state { padding: 48px 0; text-align: center; color: var(--text-secondary); }
.state--error { color: var(--color-raspberry-dark); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 14px; }
.kpi-note { margin: 4px 0 0; font-size: 0.8125rem; color: var(--text-secondary); }
.row { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 360px), 1fr)); gap: 16px; }
.row--main { grid-template-columns: minmax(min(100%, 380px), 1.5fr) minmax(min(100%, 280px), 1fr); }
.box { padding: 18px 20px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
.box h2 { font-size: 1.25rem; }
.box h3 { font-size: 0.75rem; text-transform: uppercase; letter-spacing: 0.06em; color: var(--text-secondary); font-family: var(--font-body); margin-top: 8px; }
.box__head { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; }
.mix { display: flex; height: 12px; border-radius: var(--radius-pill); overflow: hidden; background: var(--track); gap: 2px; }
.mix__part { display: block; }
.is-pub { background: var(--color-forest); }
.is-draft { background: var(--color-peach); }
.is-fin { background: var(--text-secondary); }
.is-can { background: var(--color-raspberry); }
.legend { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 12px; font-size: 0.875rem; }
.legend li { display: flex; align-items: center; gap: 6px; }
.legend strong { margin-left: auto; }
.dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.rank { margin: 0; padding-left: 20px; display: grid; gap: 8px; }
.rank li { padding-left: 4px; }
.rank li > * { display: block; }
.rank a { font-weight: 600; color: var(--color-ink); }
.rank .badge { display: inline-block; margin-left: 6px; font-size: 0.6875rem; }
.muted { color: var(--text-secondary); font-size: 0.8125rem; }
.more { display: inline-flex; align-items: center; gap: 4px; font-weight: 600; font-size: 0.875rem; }
.bars { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.bars li { display: grid; grid-template-columns: 110px minmax(0, 1fr) 28px; gap: 10px; align-items: center; font-size: 0.875rem; }
.bars__track { height: 10px; border-radius: var(--radius-pill); background: var(--track); overflow: hidden; }
.bars__track span { display: block; height: 100%; background: var(--color-forest); }
.bars__n { text-align: right; color: var(--text-secondary); }
.mod { margin: 0; }
.mod strong { font: 700 1.75rem var(--font-display); }
.box .btn { align-self: flex-start; }
</style>
