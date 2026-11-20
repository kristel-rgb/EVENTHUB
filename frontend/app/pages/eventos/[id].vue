<script setup lang="ts">
// Detalle de un evento (se abre al hacer clic en una tarjeta del catálogo).
// Datos: GET /events/:id · Compra: POST /events/:id/reservations
const route = useRoute()
const id = String(route.params.id)
const { event: text } = useAppConfig()

const { data: event, error, refresh } = await useEvent(id)

// Si el evento no existe, se muestra la página de error 404
if (error.value || !event.value) {
  throw createError({
    statusCode: error.value?.statusCode ?? 404,
    statusMessage: 'Evento no encontrado',
    fatal: true,
  })
}

useHead({
  title: event.value.name,
  meta: [{ name: 'description', content: event.value.description.slice(0, 150) }],
})

const poster = computed(() => eventPoster(event.value!.category.slug))
const reserved = computed(() => event.value!.capacity - event.value!.availableSpots)
const occupancy = computed(() => Math.round((reserved.value / event.value!.capacity) * 100))
const isPast = computed(() => new Date(event.value!.date).getTime() < Date.now())
const canBuy = computed(() => event.value!.status === 'published' && !isPast.value && event.value!.availableSpots > 0)
const mapUrl = computed(() => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.value!.location + ', Costa Rica')}`)
const paragraphs = computed(() => event.value!.description.split('\n').filter(Boolean))

// Compra
const quantity = ref(1)
const maxQuantity = computed(() => Math.min(text.maxPerPurchase, event.value!.availableSpots))
const total = computed(() => event.value!.price * quantity.value)
const { reserve, loading, errorMessage, result } = useReserve()

async function buy() {
  await reserve(id, quantity.value)
  if (result.value) {
    quantity.value = 1
    await refresh() // actualiza los espacios disponibles
  }
}

const unavailableReason = computed(() => {
  const e = event.value!
  if (e.status === 'cancelled') return 'Este evento fue cancelado.'
  if (e.status === 'finished' || isPast.value) return 'Este evento ya finalizó.'
  if (e.availableSpots === 0) return 'Ya no quedan espacios disponibles.'
  return 'Este evento no está disponible por ahora.'
})
</script>

<template>
  <article v-if="event" class="container detail">
    <NuxtLink to="/eventos" class="detail__back">
      <Icon name="lucide:arrow-left" size="18" /> {{ text.backLabel }}
    </NuxtLink>

    <div class="detail__top">
      <!-- Imagen del evento (o cartel de color si no tiene) -->
      <div class="media" :style="{ background: poster.bg, color: poster.ink }">
        <img v-if="event.imageUrl" :src="event.imageUrl" :alt="event.name" class="media__img">
        <template v-else>
          <span class="media__big" aria-hidden="true">{{ event.name }}</span>
        </template>
      </div>

      <!-- Tarjeta de compra -->
      <aside class="buy card" aria-labelledby="buy-title">
        <h2 id="buy-title" class="sr-only">Comprar entradas</h2>
        <p class="buy__price">{{ formatPrice(event.price) }}</p>
        <p class="buy__per">{{ event.price > 0 ? 'por entrada' : 'entrada libre con reserva' }}</p>

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

        <form v-if="canBuy" class="buy__form" @submit.prevent="buy">
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

          <div v-if="event.price > 0" class="buy__total">
            <span>Total</span><strong>{{ formatPrice(total) }}</strong>
          </div>

          <p v-if="errorMessage" class="buy__error" role="alert">{{ errorMessage }}</p>

          <button type="submit" class="btn btn--primary buy__cta" :disabled="loading">
            <Icon v-if="loading" name="lucide:loader-circle" size="18" class="spin" />
            {{ loading ? 'Procesando…' : event.price > 0 ? text.buyLabel : text.freeLabel }}
          </button>
        </form>

        <p v-else class="buy__closed">{{ unavailableReason }}</p>
      </aside>
    </div>

    <div class="detail__body">
      <div class="detail__main">
        <NuxtLink :to="{ path: '/eventos', query: { categoria: event.category.slug } }" class="detail__cat">
          {{ event.category.name }}
        </NuxtLink>
        <h1 class="detail__title">{{ event.name }}</h1>

        <p v-if="event.ratingCount > 0" class="detail__rating">
          <Icon name="lucide:star" size="16" /> {{ event.ratingAvg }} · {{ event.ratingCount }} reseñas
        </p>

        <section class="detail__about" aria-labelledby="about-title">
          <h2 id="about-title">Sobre el evento</h2>
          <p v-for="(p, i) in paragraphs" :key="i">{{ p }}</p>
        </section>

        <section aria-labelledby="policy-title" class="detail__policy">
          <h2 id="policy-title">Antes de comprar</h2>
          <p>{{ text.policy }}</p>
        </section>
      </div>

      <dl class="facts card">
        <div class="fact">
          <dt><Icon name="lucide:calendar" size="18" /> Fecha</dt>
          <dd class="cap">{{ formatLongDate(event.date) }}</dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:clock" size="18" /> Hora</dt>
          <dd>{{ formatTime(event.date) }}</dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:map-pin" size="18" /> Ubicación</dt>
          <dd>
            {{ event.location }}<br>
            <a :href="mapUrl" target="_blank" rel="noopener">Ver en el mapa <Icon name="lucide:external-link" size="14" /></a>
          </dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:user-round" size="18" /> Organiza</dt>
          <dd>{{ event.organizer.name }}</dd>
        </div>
        <div class="fact">
          <dt><Icon name="lucide:users" size="18" /> Capacidad</dt>
          <dd>{{ event.capacity }} personas</dd>
        </div>
      </dl>
    </div>
  </article>
</template>

<style scoped>
.detail { padding-top: 24px; }
.detail__back { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; font-weight: 500; text-decoration: none; color: var(--color-ink); }
.detail__back:hover { color: var(--color-forest); }

.detail__top { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); gap: 24px; margin-top: 8px; align-items: start; }

.media { position: relative; border-radius: 28px; overflow: hidden; aspect-ratio: 16 / 10; display: flex; align-items: flex-end; padding: 32px; }
.media__img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; }
.media__big { font-family: var(--font-display); font-weight: 700; font-size: clamp(36px, 5vw, 64px); line-height: 0.92; letter-spacing: -0.045em; text-transform: uppercase; max-width: 12ch; }

.buy { padding: 24px; display: flex; flex-direction: column; gap: 16px; position: sticky; top: 16px; }
.buy p { margin: 0; }
.buy__price { font-family: var(--font-display); font-size: 40px; font-weight: 700; letter-spacing: -0.04em; line-height: 1; }
.buy__per { color: var(--text-secondary); font-size: 14px; margin-top: -10px !important; }
.buy__spots-top { display: flex; justify-content: space-between; gap: 12px; font-size: 14px; margin-bottom: 8px; }
.buy__spots-top strong { color: var(--color-forest); }
.buy__spots-top strong.is-low { color: var(--color-raspberry); }
.track { height: 10px; border-radius: var(--radius-pill); background: #EFE6D8; }
.track__fill { height: 10px; border-radius: var(--radius-pill); background: var(--color-forest); }
.track__fill.is-high { background: var(--color-raspberry); }

.buy__form { display: flex; flex-direction: column; gap: 14px; }
.qty { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.qty__label { font-weight: 500; }
.qty__ctrl { display: flex; align-items: center; border: 1.5px solid var(--border); border-radius: var(--radius-md); }
.qty__btn { width: 44px; height: 44px; border: 0; background: transparent; cursor: pointer; color: var(--color-ink); display: inline-flex; align-items: center; justify-content: center; }
.qty__btn:disabled { opacity: 0.35; cursor: default; }
.qty__input { width: 48px; height: 44px; border: 0; text-align: center; font: 600 16px var(--font-body); color: var(--color-ink); background: transparent; -moz-appearance: textfield; }
.qty__input::-webkit-outer-spin-button, .qty__input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
.buy__total { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid var(--border); }
.buy__cta { width: 100%; min-height: 52px; font-size: 16px; }
.buy__cta:disabled { opacity: 0.7; cursor: progress; }
.buy__error { color: var(--color-raspberry-dark); font-size: 14px; }
.buy__closed { padding: 14px; border-radius: var(--radius-md); background: var(--tint-neutral); color: var(--text-secondary); font-weight: 500; }
.buy__ok { display: flex; gap: 10px; padding: 14px; border-radius: var(--radius-md); background: var(--tint-forest); color: var(--color-forest-dark); font-size: 14px; }
.buy__ok p { margin: 0; }
.buy__ok-title { font-weight: 600; }
.buy__ok a { color: var(--color-forest-dark); font-weight: 600; }

.detail__body { display: grid; grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr); gap: 24px; margin-top: 32px; align-items: start; }
.detail__cat { display: inline-block; background: var(--color-white); border: 1px solid var(--border); color: var(--color-ink); text-decoration: none; font-size: 13px; font-weight: 600; padding: 6px 12px; border-radius: var(--radius-pill); }
.detail__title { font-size: clamp(36px, 5vw, 56px); letter-spacing: -0.04em; margin: 14px 0 8px; }
.detail__rating { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); margin: 0; }
.detail__about, .detail__policy { margin-top: 28px; }
.detail__about h2, .detail__policy h2 { font-size: 22px; margin-bottom: 10px; }
.detail__about p { font-size: 17px; line-height: 1.7; margin: 0 0 12px; }
.detail__policy p { color: var(--text-secondary); margin: 0; }

.facts { margin: 0; padding: 8px 22px; }
.fact { display: grid; gap: 4px; padding: 14px 0; border-bottom: 1px solid #EFE6D8; }
.fact:last-child { border-bottom: 0; }
.fact dt { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.fact dd { margin: 0; font-weight: 500; }
.fact a { display: inline-flex; align-items: center; gap: 4px; font-size: 14px; }
.cap::first-letter { text-transform: uppercase; }

.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Tablet y móvil: una sola columna, la compra va debajo de la imagen */
@media (max-width: 900px) {
  .detail__top, .detail__body { grid-template-columns: 1fr; }
  .buy { position: static; }
  .media { aspect-ratio: 4 / 3; padding: 20px; }
}
</style>
