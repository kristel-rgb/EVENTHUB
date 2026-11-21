<script setup lang="ts">
// Marco de las páginas de ingreso y registro: panel de bienvenida + formulario.
defineProps<{ title: string, subtitle: string, wide?: boolean }>()
const { auth } = useAppConfig()
</script>

<template>
  <section class="container shell" :class="{ 'shell--wide': wide }">
    <aside class="shell__aside" aria-hidden="true">
      <p class="shell__kicker">EventHub</p>
      <p class="shell__headline">{{ auth.asideTitle }}</p>
      <ul class="shell__list">
        <li v-for="b in auth.benefits" :key="b"><Icon name="lucide:check" size="18" /> {{ b }}</li>
      </ul>
    </aside>

    <div class="shell__main">
      <header class="shell__head">
        <h1>{{ title }}</h1>
        <p>{{ subtitle }}</p>
      </header>
      <slot />
    </div>
  </section>
</template>

<style scoped>
.shell {
  display: grid; grid-template-columns: minmax(260px, 380px) minmax(0, 520px);
  justify-content: center; gap: 48px; padding-top: 48px; align-items: start;
}
.shell--wide { grid-template-columns: minmax(260px, 340px) minmax(0, 760px); }

.shell__aside {
  position: sticky; top: 24px; padding: 32px; border-radius: 28px;
  background: var(--color-ink); color: var(--color-sand); overflow: hidden; isolation: isolate;
}
.shell__aside::after {
  content: ''; position: absolute; right: -70px; bottom: -70px; z-index: -1;
  width: 220px; height: 220px; border-radius: 50%; border: 36px solid var(--color-raspberry);
}
.shell__kicker { margin: 0 0 14px; color: var(--color-peach); font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; font-size: 13px; }
.shell__headline { margin: 0 0 22px; font-family: var(--font-display); font-weight: 700; font-size: 34px; line-height: 1.02; letter-spacing: -0.03em; }
.shell__list { list-style: none; margin: 0 0 60px; padding: 0; display: grid; gap: 12px; color: var(--text-on-dark-muted); }
.shell__list li { display: flex; gap: 10px; align-items: flex-start; }
.shell__list :deep(svg), .shell__list :deep(.iconify) { color: var(--color-peach); flex-shrink: 0; margin-top: 3px; }

.shell__head h1 { font-size: clamp(32px, 4vw, 44px); letter-spacing: -0.035em; }
.shell__head p { margin: 8px 0 24px; color: var(--text-secondary); }

@media (max-width: 860px) {
  .shell, .shell--wide { grid-template-columns: minmax(0, 1fr); gap: 0; padding-top: 32px; }
  .shell__aside { display: none; }
}
</style>
