<script setup lang="ts">
// Página temporal para verificar la base visual (colores, tipografías, botones y etiquetas).
// Se reemplazará por el catálogo real (tarea F03) cuando exista el endpoint de eventos.
useHead({ title: 'Explorar eventos' })
</script>

<template>
  <section class="container hero">
    <p class="badge badge--urgent">Esta semana en Costa Rica</p>
    <h1 class="hero__title">
      Encontrá tu próximo <span class="hero__green">plan</span>
      antes de que se <span class="hero__tag">agote.</span>
    </h1>
    <p class="hero__lead">
      Conciertos, talleres, ferias y conferencias. Reservá en segundos y llevá tu entrada con QR en el teléfono.
    </p>
  </section>

  <section class="container demo" aria-labelledby="demo-title">
    <h2 id="demo-title" class="demo__title">Base visual</h2>

    <div class="card demo__block">
      <h3>Botones</h3>
      <div class="demo__row">
        <button class="btn btn--primary">Reservar</button>
        <button class="btn btn--accent">Generar reporte</button>
        <button class="btn btn--outline">Descargar PDF</button>
        <button class="btn btn--ghost">Cancelar</button>
      </div>
    </div>

    <div class="card demo__block">
      <h3>Etiquetas</h3>
      <div class="demo__row">
        <span class="badge badge--success">Publicado</span>
        <span class="badge badge--urgent">Quedan 4</span>
        <span class="badge badge--warm">Borrador</span>
        <span class="badge badge--neutral">Agotado</span>
      </div>
    </div>

    <div class="card demo__block">
      <h3>Íconos</h3>
      <div class="demo__row demo__icons">
        <Icon name="lucide:calendar" size="22" />
        <Icon name="lucide:map-pin" size="22" />
        <Icon name="lucide:ticket" size="22" />
        <Icon name="lucide:download" size="22" />
        <Icon name="lucide:star" size="22" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero { padding-top: 48px; padding-bottom: 32px; }
.hero__title {
  font-size: clamp(44px, 7vw, 88px); line-height: 0.95; letter-spacing: -0.045em;
  margin: 18px 0 20px; max-width: 14ch;
}
.hero__green { color: var(--color-forest); }
.hero__tag {
  display: inline-block; background: var(--color-peach);
  padding: 0 12px; border-radius: 14px; transform: rotate(-2deg);
}
.hero__lead { font-size: 18px; color: var(--text-secondary); max-width: 52ch; margin: 0; }

.demo { display: grid; gap: 16px; }
.demo__title { font-size: 28px; margin-top: 16px; }
.demo__block { padding: 20px 24px; }
.demo__block h3 { font-size: 18px; margin-bottom: 14px; }
.demo__row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.demo__icons { gap: 18px; color: var(--color-forest); }
</style>
