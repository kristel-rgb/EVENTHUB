<script setup lang="ts">
// Detalle de un evento (se abre al hacer clic en una tarjeta del catálogo).
// Datos: GET /events/:id · Compra: POST /events/:id/reservations
// Con ?vista=previa se muestra un borrador tal como se verá al publicarlo (sin poder comprar).
const route = useRoute()
const id = String(route.params.id)
const preview = route.query.vista === 'previa'
const { event: text } = useAppConfig()
const session = useSessionStore()
// Para comprar hay que ingresar; después de ingresar se vuelve a este evento
const loginTo = computed(() => ({ path: '/login', query: { redirect: route.fullPath } }))
const registerTo = computed(() => ({ path: '/registro', query: { redirect: route.fullPath } }))

const { data: event, error, refresh } = await useEvent(id, preview)

// Si el evento no existe se muestra el 404; si falló la conexión con la API, un 503 (no es lo mismo)
if (error.value || !event.value) {
  const notFound = !error.value || error.value.statusCode === 404 || error.value.statusCode === 400
  throw createError({
    statusCode: notFound ? 404 : 503,
    statusMessage: notFound ? 'Evento no encontrado' : 'No pudimos cargar el evento. Intentá de nuevo en unos minutos.',
    fatal: true,
  })
}

useHead({
  title: () => (preview ? `Vista previa: ${event.value?.name}` : event.value?.name ?? 'Evento'),
  meta: [
    { name: 'description', content: () => event.value?.summary || event.value?.description.slice(0, 150) || '' },
    ...(preview ? [{ name: 'robots', content: 'noindex' }] : []),
  ],
})

const poster = computed(() => eventPoster(event.value!.category.slug))
const reserved = computed(() => event.value!.capacity - event.value!.availableSpots)
const occupancy = computed(() => Math.round((reserved.value / event.value!.capacity) * 100))
const isPast = computed(() => new Date(event.value!.date).getTime() < Date.now())
const isDraft = computed(() => event.value!.status === 'draft')
const canBuy = computed(() => !isDraft.value && event.value!.status === 'published' && !isPast.value && event.value!.availableSpots > 0)
const mapUrl = computed(() => {
  const e = event.value!
  const q = [e.venueName, e.address, e.city ?? e.location, e.province].filter(Boolean).join(', ') || e.location
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q + ', Costa Rica')}`
})
const paragraphs = computed(() => event.value!.description.split('\n').filter(Boolean))

// Información ampliada que llena el organizador
const timeRange = computed(() => {
  const e = event.value!
  return e.endDate ? `${formatTime(e.date)} a ${formatTime(e.endDate)}` : formatTime(e.date)
})
const doorsTime = computed(() => {
  const m = event.value!.doorsOpenMinutes
  return m ? formatTime(new Date(new Date(event.value!.date).getTime() - m * 60000).toISOString()) : null
})
const placeLine = computed(() => {
  const e = event.value!
  return [e.city, e.province].filter(Boolean).join(', ')
})
const ageLabel = computed(() => minAgeOptions.find(o => o.value === (event.value!.minAge ?? 0))?.label ?? 'Todo público')
const accessLabels = computed(() =>
  (event.value!.accessibility ?? []).map(a => accessibilityOptions.find(o => o.value === a)?.label).filter(Boolean) as string[],
)
const accessIcons: Record<string, string> = {
  wheelchair: 'lucide:accessibility', parking: 'lucide:square-parking', public_transport: 'lucide:bus', sign_language: 'lucide:hand',
}
const importantLines = computed(() => (event.value!.importantInfo ?? '').split('\n').map(l => l.trim()).filter(Boolean))

// Tipos de entrada (General, VIP…): se elige uno y la cantidad
const types = computed(() => event.value!.ticketTypes ?? [])
const manyTypes = computed(() => types.value.length > 1)
const selectedTypeId = ref<string | null>(types.value.find(t => t.available > 0)?._id ?? types.value[0]?._id ?? null)
const selectedType = computed(() => types.value.find(t => t._id === selectedTypeId.value) ?? null)
watch(types, (list) => {
  if (!list.some(t => t._id === selectedTypeId.value && t.available > 0)) selectedTypeId.value = list.find(t => t.available > 0)?._id ?? null
})
const minPrice = computed(() => (types.value.length ? Math.min(...types.value.map(t => t.price)) : event.value!.price))

// Política de cancelación y contacto
const policyText = computed(() => cancellationOptions.find(o => o.value === event.value!.cancellationPolicy)?.text ?? null)
const mapEmbed = computed(() => {
  const e = event.value!
  const q = [e.venueName, e.address, e.city ?? e.location, e.province].filter(Boolean).join(', ') || e.location
  return `https://www.google.com/maps?q=${encodeURIComponent(q + ', Costa Rica')}&output=embed`
})

// Compra
const quantity = ref(1)
const unitPrice = computed(() => selectedType.value?.price ?? event.value!.price)
const maxQuantity = computed(() => Math.min(event.value!.maxPerPurchase ?? text.maxPerPurchase, selectedType.value?.available ?? event.value!.availableSpots))
watch(maxQuantity, (m) => { if (quantity.value > m) quantity.value = Math.max(1, m) })
const total = computed(() => unitPrice.value * quantity.value)
const { reserve, loading, errorMessage, result } = useReserve()

async function buy() {
  await reserve(id, quantity.value, selectedType.value?._id)
  if (result.value) {
    quantity.value = 1
    await refresh() // actualiza los espacios disponibles
  }
}

const unavailableReason = computed(() => {
  const e = event.value!
  if (e.status === 'draft') return 'Vista previa: la compra se habilita cuando el evento se publique.'
  if (e.status === 'cancelled') return 'Este evento fue cancelado.'
  if (e.status === 'finished' || isPast.value) return 'Este evento ya finalizó.'
  if (e.availableSpots === 0) return 'Ya no quedan espacios disponibles.'
  return 'Este evento no está disponible por ahora.'
})
</script>

<template>
  <article v-if="event" class="container detail">
    <!-- Barra de vista previa (solo borradores) -->
    <div v-if="isDraft" class="preview theme-fixed" role="status">
      <Icon name="lucide:eye" size="20" />
      <p><strong>Vista previa · no publicado.</strong> Así se verá el evento cuando se publique. Solo lo ven quienes tienen este enlace.</p>
      <NuxtLink :to="`/organizador/eventos/${event._id}/editar`" class="btn preview__btn">
        <Icon name="lucide:pencil" size="16" /> Volver a editar
      </NuxtLink>
    </div>

    <NuxtLink v-if="!isDraft" to="/buscar" class="detail__back">
      <Icon name="lucide:arrow-left" size="18" /> {{ text.backLabel }}
    </NuxtLink>

    <div class="detail__grid">
    <div class="detail__top">
      <!-- Imagen del evento (o cartel de color si no tiene) -->
      <div class="media" :style="{ background: poster.bg, color: poster.ink }">
        <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.imageAlt || event.name" class="media__img">
        <template v-else>
          <span class="media__big" aria-hidden="true">{{ event.name }}</span>
        </template>
      </div>

      <!-- Tarjeta de compra -->
      <div class="detail__side">
      <aside class="buy card" aria-labelledby="buy-title">
        <h2 id="buy-title" class="sr-only">Comprar entradas</h2>
        <p class="buy__price"><span v-if="manyTypes" class="buy__from">Desde</span> {{ formatPrice(minPrice) }}</p>
        <p class="buy__per">{{ minPrice > 0 ? 'por entrada' : 'entrada libre con reserva' }}</p>

        <div class="buy__spots">
          <div class="buy__spots-top">
            <span>{{ reserved }} de {{ event.capacity }} reservados</span>
            <strong :class="{ 'is-low': event.availableSpots <= 10 }">
              {{ event.availableSpots === 0 ? text.soldOutLabel : `Quedan ${event.availableSpots}` }}
            </strong>
          </div>
          <div class="track"><div class="track__fill" :class="{ 'is-high': occupancy >= 90 }" :style="{ width: `${occupancy}%` }" /></div>
        </div>

        <!-- Confirmación después de comprar -->
        <div v-if="result" class="buy__ok" role="status">
          <Icon name="lucide:circle-check" size="22" />
          <div>
            <p class="buy__ok-title">Tu reserva quedó confirmada</p>
            <p>{{ result.tickets.length }} {{ result.tickets.length === 1 ? 'entrada' : 'entradas' }}: {{ result.tickets.map(t => t.code).join(', ') }}</p>
            <NuxtLink to="/mis-entradas">Ver mis entradas</NuxtLink>
          </div>
        </div>

        <p v-if="canBuy && session.role === 'organizer'" class="buy__closed">
          Las cuentas de organización no compran entradas. Para comprar, usá una cuenta de cliente.
        </p>

        <div v-else-if="canBuy && !session.isLoggedIn" class="buy__guest">
          <p><Icon name="lucide:lock" size="16" /> Para comprar entradas necesitás una cuenta. Es gratis y toma un minuto.</p>
          <NuxtLink :to="loginTo" class="btn btn--primary buy__cta">Ingresar para comprar</NuxtLink>
          <NuxtLink :to="registerTo" class="btn btn--outline">Crear cuenta</NuxtLink>
        </div>

        <div v-else-if="canBuy && session.user?.profileComplete === false" class="buy__guest">
          <p><Icon name="lucide:id-card" size="16" /> Antes de tu primera compra necesitamos tu identificación, teléfono, fecha de nacimiento y dirección. Lo pide la pasarela de pagos.</p>
          <NuxtLink :to="{ path: '/completar-perfil', query: { redirect: route.fullPath } }" class="btn btn--primary buy__cta">Completar mi perfil</NuxtLink>
        </div>

        <form v-else-if="canBuy" class="buy__form" @submit.prevent="buy">
          <fieldset v-if="manyTypes" class="types">
            <legend>Tipo de entrada</legend>
            <label v-for="t in types" :key="t._id" class="type" :class="{ 'is-on': selectedTypeId === t._id, 'is-out': t.available === 0 }">
              <input v-model="selectedTypeId" type="radio" name="ticketType" :value="t._id" :disabled="t.available === 0" class="sr-only">
              <span class="type__name">{{ t.name }}</span>
              <span class="type__price">{{ t.price ? formatPrice(t.price) : 'Gratis' }}</span>
              <span class="type__left" :class="{ 'is-low': t.available > 0 && t.available <= 10 }">{{ t.available === 0 ? 'Agotado' : `Quedan ${t.available}` }}</span>
            </label>
          </fieldset>

          <div class="qty">
            <label for="qty" class="qty__label">Cantidad</label>
            <div class="qty__ctrl">
              <button type="button" class="qty__btn" aria-label="Quitar una" :disabled="quantity <= 1" @click="quantity--">
                <Icon name="lucide:minus" size="16" />
              </button>
              <input id="qty" v-model.number="quantity" type="number" min="1" :max="maxQuantity" class="qty__input">
              <button type="button" class="qty__btn" aria-label="Agregar una" :disabled="quantity >= maxQuantity" @click="quantity++">
                <Icon name="lucide:plus" size="16" />
              </button>
            </div>
          </div>

          <div v-if="unitPrice > 0" class="buy__total">
            <span>Total</span><strong>{{ formatPrice(total) }}</strong>
          </div>

          <p v-if="errorMessage" class="buy__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary buy__cta" :disabled="loading">
            <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
            {{ loading ? 'Procesando…' : unitPrice > 0 ? text.buyLabel : text.freeLabel }}
          </button>
        </form>

        <p v-else class="buy__closed">{{ unavailableReason }}</p>
      </aside>

      <dl class="facts card">
        <div class="fact">
          <dt><Icon name="lucide:calendar" size="18" /> Fecha</dt>
          <dd class="cap">{{ formatLongDate(event.date) }}</dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:clock" size="18" /> Hora</dt>
          <dd>
            {{ timeRange }}
            <span v-if="doorsTime" class="fact__sub">Apertura de puertas: {{ doorsTime }}</span>
          </dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:map-pin" size="18" /> Ubicación</dt>
          <dd>
            <template v-if="event.venueName">
              {{ event.venueName }}
              <span v-if="event.address" class="fact__sub">{{ event.address }}</span>
              <span v-if="placeLine" class="fact__sub">{{ placeLine }}</span>
            </template>
            <template v-else>{{ event.location }}</template>
            <a :href="mapUrl" target="_blank" rel="noopener">Ver en el mapa <Icon name="lucide:external-link" size="14" /></a>
          </dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:user-round" size="18" /> Organiza</dt>
          <dd>{{ event.organizer.name }}</dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:users" size="18" /> Capacidad</dt>
          <dd>
            {{ formatNumber(event.capacity) }} personas
            <span v-if="manyTypes" class="fact__sub">{{ types.map(t => t.name).join(' · ') }}</span>
          </dd>
        </div>
        <div v-if="event.contactEmail || event.contactPhone" class="fact">
          <dt><Icon name="lucide:mail" size="18" /> Consultas</dt>
          <dd>
            <a v-if="event.contactEmail" :href="`mailto:${event.contactEmail}`">{{ event.contactEmail }}</a>
            <a v-if="event.contactPhone" :href="`tel:${event.contactPhone}`" class="fact__sub">{{ event.contactPhone }}</a>
          </dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:id-card" size="18" /> Edad</dt>
          <dd>{{ ageLabel }}</dd>
        </div>
      </dl>
      </div>
    </div>

    <div class="detail__body">
      <div class="detail__main">
        <NuxtLink :to="{ path: '/buscar', query: { categoria: event.category.slug } }" class="detail__cat">
          {{ event.category.name }}
        </NuxtLink>
        <h1 class="detail__title">{{ event.name }}</h1>
        <p v-if="event.summary" class="detail__summary">{{ event.summary }}</p>

        <a v-if="event.ratingCount > 0" href="#resenas" class="detail__rating">
          <StarRating :value="event.ratingAvg ?? 0" /> {{ event.ratingAvg }} · {{ event.ratingCount }} {{ event.ratingCount === 1 ? 'reseña' : 'reseñas' }}
        </a>

        <section class="detail__about" aria-labelledby="about-title">
          <h2 id="about-title">Sobre el evento</h2>
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>

        <section v-if="importantLines.length" class="detail__info" aria-labelledby="info-title">
          <h2 id="info-title">Información importante</h2>
          <ul>
            <li v-for="(l, i) in importantLines" :key="i"><Icon name="lucide:info" size="16" /> {{ l }}</li>
          </ul>
        </section>

        <section v-if="accessLabels.length" class="detail__access" aria-labelledby="access-title">
          <h2 id="access-title">Accesibilidad y servicios</h2>
          <ul>
            <li v-for="(l, i) in accessLabels" :key="i">
              <Icon :name="accessIcons[event.accessibility![i]!] ?? 'lucide:check'" size="18" /> {{ l }}
            </li>
          </ul>
        </section>

        <section aria-labelledby="policy-title" class="detail__policy">
          <h2 id="policy-title">Antes de comprar</h2>
          <p v-if="policyText" class="detail__policy-main"><Icon name="lucide:calendar-x" size="16" /> {{ policyText }}</p>
          <p>{{ text.policy }}</p>
        </section>

        <section aria-labelledby="map-title" class="detail__map">
          <h2 id="map-title">Cómo llegar</h2>
          <iframe :src="mapEmbed" :title="`Mapa de ${event.venueName || event.location}`" loading="lazy" referrerpolicy="no-referrer-when-downgrade" />
          <a :href="mapUrl" target="_blank" rel="noopener">Abrir en Google Maps <Icon name="lucide:external-link" size="14" /></a>
        </section>

        <!-- Las reseñas dependen de la sesión: se cargan en el navegador -->
        <ClientOnly v-if="!isDraft">
          <EventReviews :event-id="event._id" />
          <template #fallback><p class="detail__loading">Cargando reseñas…</p></template>
        </ClientOnly>
      </div>


    </div>
    </div>
  </article>
</template>

<style scoped>
.detail { padding-top: 24px; }
.detail__back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-weight: 500; text-decoration: none; color: var(--color-ink); }
.detail__back:hover { color: var(--color-forest); }

/* Dos columnas: izquierda = imagen y contenido; derecha = compra y datos del evento.
   Así el contenido sigue justo debajo de la imagen aunque el recuadro de compra sea alto. */
.detail__top, .detail__body { display: contents; }
.detail__grid {
  display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); gap: 24px; margin-top: 8px;
  grid-template-areas: 'media side' 'main side'; grid-template-rows: auto 1fr; align-items: start;
}
.media { grid-area: media; }
.detail__side { grid-area: side; display: flex; flex-direction: column; gap: 24px; min-width: 0; }
.detail__main { grid-area: main; }

.media { position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 16 / 10; display: flex; align-items: flex-end; padding: 32px; }
.media__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.media__big { font-family: var(--font-display); font-weight: 700; font-size: clamp(2.25rem, 5vw, 4rem); line-height: 0.92; letter-spacing: -0.045em; text-transform: uppercase; max-width: 12ch; }

.buy { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
.buy p { margin: 0; }
.buy__price { font-family: var(--font-display); font-size: 2.5rem; font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
.buy__per { color: var(--text-secondary); font-size: 0.875rem; margin-top: -10px !important; }
.buy__spots-top { display: flex; justify-content: space-between; gap: 12px; font-size: 0.875rem; margin-bottom: 8px; }
.buy__spots-top strong { color: var(--color-forest); }
.buy__spots-top strong.is-low { color: var(--color-raspberry); }
.track { height: 10px; border-radius: var(--radius-pill); background: var(--track); }
.track__fill { height: 10px; border-radius: var(--radius-pill); background: var(--color-forest); }
.track__fill.is-high { background: var(--color-raspberry); }

.buy__form { display: flex; flex-direction: column; gap: 14px; }
.qty { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.qty__label { font-weight: 500; }
.qty__ctrl { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: var(--radius-md); }
.qty__btn { width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: var(--color-ink); display: inline-flex; align-items: center; justify-content: center; }
.qty__btn:disabled { opacity: 0.35; cursor: default; }
.qty__input { width: 48px; height: 44px; border: 0; text-align: center; font: 600 1rem var(--font-body); color: var(--color-ink); background: transparent; -moz-appearance: textfield; }
.qty__input::-webkit-outer-spin-button, .qty__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.buy__total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.buy__cta { width: 100%; min-height: 52px; font-size: 1rem; }
.buy__cta:disabled { opacity: 0.7; cursor: progress; }
.buy__error { color: var(--color-raspberry-dark); font-size: 0.875rem; }
.buy__guest { display: flex; flex-direction: column; gap: 10px; }
.buy__guest p { display: flex; gap: 8px; align-items: flex-start; color: var(--text-secondary); font-size: 0.9375rem; }
.buy__guest p > :first-child { flex-shrink: 0; margin-top: 3px; }
.buy__guest .btn { width: 100%; justify-content: center; }
.buy__closed { padding: 14px; border-radius: var(--radius-md); background: var(--tint-neutral); color: var(--text-secondary); font-weight: 500; }
.buy__ok { display: flex; gap: 10px; padding: 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); font-size: 0.875rem; }
.buy__ok p { margin: 0; }
.buy__ok-title { font-weight: 600; }
.buy__ok a { color: var(--color-forest-dark); font-weight: 600; }

.detail__cat { display: inline-block; background: var(--color-white); border: 1px solid var(--border); color: var(--color-ink); text-decoration: none; font-size: 0.8125rem; font-weight: 600; padding: 6px 12px; border-radius: var(--radius-pill); }
.detail__title { font-size: clamp(2.25rem, 5vw, 3.5rem); letter-spacing: -0.04em; margin: 14px 0 8px; }
.detail__rating { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); margin: 0; text-decoration: none; }
.detail__rating:hover { color: var(--color-ink); }
.detail__about, .detail__policy { margin-top: 28px; }
.detail__about h2, .detail__policy h2 { font-size: 1.375rem; margin-bottom: 10px; }
.detail__about p { font-size: 1.0625rem; line-height: 1.7; margin: 0 0 12px; }
.detail__policy p { color: var(--text-secondary); margin: 0; }
.detail__policy .detail__policy-main { display: flex; gap: 8px; align-items: flex-start; color: var(--color-ink); font-weight: 600; margin-bottom: 8px; }
.detail__policy-main :deep(svg) { flex-shrink: 0; margin-top: 3px; color: var(--color-raspberry); }
.detail__map { margin-top: 28px; }
.detail__loading { margin-top: 32px; color: var(--text-secondary); }
.detail__map h2 { font-size: 1.375rem; margin-bottom: 10px; }
.detail__map iframe { width: 100%; height: 280px; border: 0; border-radius: var(--radius-md); display: block; background: var(--tint-neutral); }
.detail__map a { display: inline-flex; align-items: center; gap: 4px; margin-top: 8px; font-weight: 600; font-size: 0.875rem; }
.buy__from { font-family: var(--font-body); font-size: 1rem; font-weight: 600; color: var(--text-secondary); letter-spacing: 0; }
.types { border: 0; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.types legend { padding: 0; margin-bottom: 8px; font-weight: 500; }
.type {
  display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 2px 10px; padding: 10px 12px; cursor: pointer;
  border: 1.5px solid var(--border); border-radius: var(--radius-md); background: var(--color-white);
}
.type.is-on { border-color: var(--color-forest); box-shadow: 0 0 0 2px var(--tint-forest); }
.type:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }
.type.is-out { opacity: 0.55; cursor: not-allowed; }
.type__name { font-weight: 600; }
.type__price { font-weight: 700; text-align: right; }
.type__left { grid-column: 1 / -1; font-size: 0.8125rem; color: var(--text-secondary); }
.type__left.is-low { color: var(--color-raspberry-dark); font-weight: 600; }
.detail__summary { font-size: 1.1875rem; line-height: 1.5; color: var(--text-secondary); margin: 0 0 8px; max-width: 60ch; }
.detail__info, .detail__access { margin-top: 28px; }
.detail__info h2, .detail__access h2 { font-size: 1.375rem; margin-bottom: 10px; }
.detail__info ul, .detail__access ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
.detail__info li, .detail__access li { display: flex; gap: 10px; align-items: flex-start; line-height: 1.5; }
.detail__info li :deep(svg), .detail__access li :deep(svg) { flex-shrink: 0; margin-top: 3px; color: var(--color-forest); }
.detail__access ul { grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); }
.fact__sub { display: block; font-weight: 400; font-size: 0.875rem; color: var(--text-secondary); }
.fact dd a { margin-top: 4px; }

.preview {
  display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin-bottom: 12px;
  padding: 14px 18px; border-radius: var(--radius-md); background: var(--color-ink); color: var(--color-sand);
}
.preview p { margin: 0; flex: 1; min-width: 220px; }
.preview :deep(svg) { color: var(--color-peach); flex-shrink: 0; }
.preview__btn { min-height: 40px; background: var(--color-peach); color: var(--color-ink); }
.preview__btn:hover { background: var(--color-sand); }

.facts { margin: 0; padding: 8px 22px; }
.fact { display: grid; gap: 4px; padding: 14px 0; border-bottom: 1px solid var(--track); }
.fact:last-child { border-bottom: 0; }
.fact dt { display: flex; align-items: center; gap: 8px; font-size: 0.8125rem; color: var(--text-secondary); }
.fact dd { margin: 0; font-weight: 500; }
.fact a { display: inline-flex; align-items: center; gap: 4px; font-size: 0.875rem; }
.cap::first-letter { text-transform: uppercase; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Tablet y móvil: una sola columna, la compra va debajo de la imagen */
@media (max-width: 900px) {
  .detail__grid { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'media' 'side' 'main'; grid-template-rows: auto; }
  .media { aspect-ratio: 4 / 3; padding: 20px; }
}
</style>
