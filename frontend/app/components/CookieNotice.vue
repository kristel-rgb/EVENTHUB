<script setup lang="ts">
// Aviso de cookies. Se muestra hasta que la persona lo cierra y lo recuerda 12 meses
// en una cookie propia. Como EventHub solo usa cookies esenciales, el aviso informa
// y enlaza a la política; no hace falta pedir permiso para activar otras.
const { legal } = useAppConfig()

const seen = useCookie<boolean>('eh_cookie_notice', {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: 'lax',
  default: () => false,
})
</script>

<template>
  <aside v-if="!seen" class="cookie" role="region" aria-label="Aviso de cookies">
    <span class="cookie__icon" aria-hidden="true"><Icon name="lucide:cookie" size="22" /></span>
    <p class="cookie__text">
      {{ legal.cookieNotice }}
      <NuxtLink to="/cookies">Política de cookies</NuxtLink>
    </p>
    <button class="btn btn--primary cookie__btn" @click="seen = true">Entendido</button>
  </aside>
</template>

<style scoped>
.cookie {
  position: fixed; left: 16px; right: 16px; bottom: 16px; z-index: 50;
  max-width: 560px; margin: 0 auto 0 0;
  display: flex; align-items: center; gap: 14px; padding: 14px 16px;
  background: var(--color-ink); color: var(--color-sand);
  border-radius: var(--radius-lg); box-shadow: 0 10px 30px rgba(31, 42, 36, 0.25);
}
.cookie__icon { color: var(--color-peach); flex-shrink: 0; display: inline-flex; }
.cookie__text { margin: 0; font-size: 14px; line-height: 1.5; flex: 1; }
.cookie__text a { color: var(--color-peach); font-weight: 600; }
.cookie__btn { flex-shrink: 0; background: var(--color-peach); color: var(--color-ink); }
.cookie__btn:hover { background: var(--color-sand); color: var(--color-ink); }

@media (max-width: 560px) {
  .cookie { flex-wrap: wrap; }
  .cookie__btn { width: 100%; }
}
</style>
