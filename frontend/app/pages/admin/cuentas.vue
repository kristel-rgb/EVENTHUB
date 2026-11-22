<script setup lang="ts">
// Cuentas y permisos (solo Super Admin): crear cuentas de organizaciones, lugares de eventos,
// clientes u otros Super Admin, y ajustar su tipo, estado y permisos.
// Datos: GET /admin/users · GET /admin/permissions
import type { AccountFilters } from '~/composables/useAdmin'
import type { AccountKind } from '~/types/models'

definePageMeta({ layout: 'panel', panel: 'admin' })
useHead({ title: 'Cuentas y permisos' })

const route = useRoute()
const router = useRouter()

const tabs: { value: '' | AccountKind, label: string, count: 'all' | AccountKind }[] = [
  { value: '', label: 'Todas', count: 'all' },
  { value: 'organization', label: 'Organizaciones', count: 'organization' },
  { value: 'venue', label: 'Lugares', count: 'venue' },
  { value: 'attendee', label: 'Clientes', count: 'attendee' },
  { value: 'admin', label: 'Super Admin', count: 'admin' },
]
const kindFromUrl: Record<string, AccountKind> = { organizaciones: 'organization', lugares: 'venue', clientes: 'attendee', admin: 'admin' }
const urlFromKind: Record<string, string> = { organization: 'organizaciones', venue: 'lugares', attendee: 'clientes', admin: 'admin' }
const statusFromUrl: Record<string, AccountFilters['status']> = { activas: 'active', desactivadas: 'disabled', invitadas: 'invited' }
const urlFromStatus: Record<string, string> = { active: 'activas', disabled: 'desactivadas', invited: 'invitadas' }

const filters = computed<AccountFilters>(() => ({
  q: typeof route.query.q === 'string' && route.query.q ? route.query.q : undefined,
  kind: kindFromUrl[String(route.query.tipo)] ?? '',
  status: statusFromUrl[String(route.query.estado)] ?? '',
  page: Number(route.query.pagina) > 0 ? Number(route.query.pagina) : 1,
  limit: 20,
}))
function setQuery(changes: Record<string, string | undefined>) {
  router.replace({ query: { ...route.query, pagina: undefined, ...changes } })
}

const { data, status, error, refresh } = await useAccounts(filters)
const { data: catalog } = await usePermissionCatalog()
const searchText = ref(filters.value.q ?? '')
watch(() => filters.value.q, (q) => { searchText.value = q ?? '' })
const totalPages = computed(() => (data.value ? Math.max(1, Math.ceil(data.value.total / data.value.limit)) : 1))

const openId = ref<string | null>(null)
const creating = ref(false)
const notice = ref<string | null>(null)
function onCreated(msg: string, id: string) {
  creating.value = false
  notice.value = msg
  refresh()
  openId.value = id
}
function onChanged(msg: string) { notice.value = msg; refresh() }
</script>

<template>
  <div class="page">
    <header class="head">
      <div>
        <h1>Cuentas y permisos</h1>
        <p class="sub">Creá cuentas para organizaciones y lugares de eventos, y ajustá lo que cada una puede hacer.</p>
      </div>
      <button type="button" class="btn btn--primary" @click="creating = true"><Icon name="lucide:user-plus" size="16" /> Crear cuenta</button>
    </header>

    <p v-if="notice" class="notice" role="status">
      <Icon name="lucide:circle-check" size="18" /> <span>{{ notice }}</span>
      <button type="button" class="notice__close" aria-label="Cerrar aviso" @click="notice = null"><Icon name="lucide:x" size="16" /></button>
    </p>

    <nav class="tabs" aria-label="Filtrar por tipo de cuenta">
      <NuxtLink
        v-for="t in tabs" :key="t.label"
        :to="{ query: { ...route.query, tipo: t.value ? urlFromKind[t.value] : undefined, pagina: undefined } }"
        class="tabs__item" :class="{ 'is-on': filters.kind === t.value }"
        :aria-current="filters.kind === t.value ? 'page' : undefined" replace
      >
        {{ t.label }} <span class="tabs__count">{{ data?.counts[t.count] ?? 0 }}</span>
      </NuxtLink>
    </nav>

    <div class="tools">
      <form class="search" role="search" @submit.prevent="setQuery({ q: searchText.trim() || undefined })">
        <Icon name="lucide:search" size="18" />
        <label for="acc-search" class="sr-only">Buscar cuentas</label>
        <input id="acc-search" v-model="searchText" type="search" placeholder="Nombre, usuario, correo u organización">
      </form>
      <label class="sort">
        <span>Estado</span>
        <select :value="filters.status" @change="setQuery({ estado: urlFromStatus[($event.target as HTMLSelectElement).value] })">
          <option value="">Todas</option>
          <option value="active">Activas</option>
          <option value="disabled">Desactivadas</option>
          <option value="invited">Invitación pendiente</option>
        </select>
      </label>
    </div>

    <p v-if="status === 'pending' && !data" class="state">Cargando cuentas…</p>
    <div v-else-if="error" class="state state--error">
      <p>No pudimos cargar las cuentas.</p>
      <button class="btn btn--outline" @click="refresh()">Reintentar</button>
    </div>
    <p v-else-if="data && data.items.length === 0" class="state">No hay cuentas con estos filtros.</p>

    <div v-else-if="data" class="card list" :class="{ 'is-loading': status === 'pending' }">
      <table class="tbl">
        <caption class="sr-only">Cuentas. Abrí una para ver y cambiar su tipo, estado y permisos.</caption>
        <thead>
          <tr><th scope="col">Cuenta</th><th scope="col">Tipo</th><th scope="col">Correo</th><th scope="col">Estado</th><th scope="col">Último ingreso</th></tr>
        </thead>
        <tbody>
          <tr v-for="a in data.items" :key="a._id" :class="{ 'is-open': openId === a._id, 'is-off': a.status === 'disabled' }" @click="openId = a._id">
            <td>
              <button type="button" class="who" @click.stop="openId = a._id">{{ a.name }}</button>
              <span class="muted">@{{ a.username }}</span>
            </td>
            <td>
              <span class="badge" :class="accountKindInfo[a.kind].badge"><Icon :name="accountKindInfo[a.kind].icon" size="14" /> {{ accountKindInfo[a.kind].short }}</span>
              <span v-if="a.customized" class="muted">Permisos ajustados</span>
            </td>
            <td class="mail">{{ a.email }}</td>
            <td>
              <span v-if="a.invited" class="badge badge--warm">Invitación pendiente</span>
              <span v-else-if="a.status === 'disabled'" class="badge badge--neutral">Desactivada</span>
              <span v-else class="badge badge--success">Activa</span>
            </td>
            <td class="muted">{{ a.lastLoginAt ? formatShortDate(a.lastLoginAt) : 'Nunca' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <nav v-if="data && totalPages > 1" class="pager" aria-label="Paginación">
      <button class="btn btn--outline" :disabled="filters.page <= 1" @click="setQuery({ pagina: String(filters.page - 1) })">Anterior</button>
      <span class="muted">Página {{ filters.page }} de {{ totalPages }} · {{ formatNumber(data.total) }} cuentas</span>
      <button class="btn btn--outline" :disabled="filters.page >= totalPages" @click="setQuery({ pagina: String(filters.page + 1) })">Siguiente</button>
    </nav>

    <ClientOnly>
      <AdminAccountDrawer :id="openId" :catalog="catalog ?? null" @close="openId = null" @changed="onChanged" />
      <AdminAccountCreateDialog :open="creating" :catalog="catalog ?? null" @close="creating = false" @created="onCreated" />
    </ClientOnly>
  </div>
</template>

<style scoped>
.page { display: flex; flex-direction: column; gap: 16px; }
.head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: flex-end; gap: 12px; }
.head h1 { font-size: clamp(2rem, 4vw, 2.5rem); }
.sub { margin: 4px 0 0; color: var(--text-secondary); max-width: 64ch; }
.notice { margin: 0; display: flex; align-items: flex-start; gap: 10px; padding: 12px 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); }
.notice > span { flex: 1; }
.notice__close { background: none; border: 0; cursor: pointer; color: inherit; width: 32px; height: 32px; margin: -6px -6px -6px 0; display: inline-flex; align-items: center; justify-content: center; }

.tabs { display: flex; gap: 4px; border-bottom: 1px solid var(--border); overflow-x: auto; }
.tabs__item {
  display: inline-flex; align-items: center; gap: 8px; min-height: 46px; padding: 0 14px; white-space: nowrap;
  color: var(--text-secondary); text-decoration: none; font-weight: 600; font-size: 0.9375rem; border-bottom: 3px solid transparent; margin-bottom: -1px;
}
.tabs__item:hover { color: var(--color-ink); }
.tabs__item.is-on { color: var(--color-ink); border-bottom-color: var(--color-forest); }
.tabs__count { background: var(--tint-neutral); color: var(--text-secondary); font-size: 0.75rem; padding: 1px 8px; border-radius: var(--radius-pill); }
.tabs__item.is-on .tabs__count { background: var(--tint-forest); color: var(--color-forest-dark); }

.tools { display: flex; flex-wrap: wrap; gap: 10px; }
.search { flex: 1 1 280px; display: flex; align-items: center; gap: 8px; padding: 0 14px; min-height: 46px; background: var(--color-white); border: 1.5px solid var(--border); border-radius: var(--radius-md); color: var(--text-secondary); }
.search:focus-within { border-color: var(--color-forest); }
.search input { flex: 1; min-width: 0; border: 0; outline: none; background: transparent; font: 1rem var(--font-body); color: var(--color-ink); }
.sort { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 0.875rem; }
.sort select { min-height: 46px; padding: 0 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border); background: var(--color-white); color: var(--color-ink); font: 500 0.9375rem var(--font-body); }

.state { padding: 48px 0; text-align: center; color: var(--text-secondary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.state p { margin: 0; }
.state--error { color: var(--color-raspberry-dark); }

.list { overflow: hidden; transition: opacity .15s; }
.list.is-loading { opacity: 0.55; }
.tbl { width: 100%; border-collapse: collapse; }
.tbl th { text-align: left; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary); padding: 12px 14px 8px; }
.tbl td { padding: 12px 14px; border-top: 1px solid var(--track); vertical-align: middle; font-size: 0.9375rem; }
.tbl tbody tr { cursor: pointer; }
.tbl tbody tr:hover td, .tbl tbody tr.is-open td { background: var(--tint-peach); color: var(--color-ink); }
.tbl td .badge { display: inline-flex; align-items: center; gap: 6px; }
.who { all: unset; cursor: pointer; font-weight: 600; display: block; }
.who:hover { text-decoration: underline; }
.who:focus-visible { outline: 3px solid var(--color-raspberry); outline-offset: 2px; border-radius: 4px; }
.muted { display: block; color: var(--text-secondary); font-size: 0.8125rem; }
.mail { font-size: 0.875rem; word-break: break-all; }
.is-off .who { color: var(--text-secondary); }

.pager { display: flex; justify-content: center; align-items: center; gap: 14px; flex-wrap: wrap; }
.pager button:disabled { opacity: 0.4; cursor: default; }

@media (max-width: 760px) {
  .tbl thead { display: none; }
  .tbl, .tbl tbody, .tbl tr, .tbl td { display: block; }
  .tbl tr { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 6px 12px; padding: 14px; border-top: 1px solid var(--track); }
  .tbl td { padding: 0; border: 0; }
  .tbl td.mail { grid-column: 1 / -1; }
}
</style>
