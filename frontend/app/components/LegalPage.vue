<script setup lang="ts">
// Plantilla compartida de las páginas legales: título, índice con enlaces
// a cada sección, contenido y contacto. El texto viene de ~/content/legal.ts
import type { LegalDocument } from '~/content/legal'

const props = defineProps<{ doc: LegalDocument }>()
const { legal } = useAppConfig()

const updated = computed(() =>
  new Intl.DateTimeFormat('es-CR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(props.doc.updated)),
)
</script>

<template>
  <article class="container legal">
    <header class="legal__head">
      <p class="legal__kicker">Información legal</p>
      <h1>{{ doc.title }}</h1>
      <p class="legal__updated">Última actualización: {{ updated }}</p>
      <p class="legal__note" role="note">
        <Icon name="lucide:info" size="18" />
        {{ legal.disclaimer }}
      </p>
    </header>

    <div class="legal__layout">
      <nav class="legal__toc" aria-label="Contenido">
        <p class="legal__toc-title">Contenido</p>
        <ol>
          <li v-for="(s, i) in doc.sections" :key="s.id">
            <a :href="`#${s.id}`">{{ i + 1 }}. {{ s.title }}</a>
          </li>
        </ol>
      </nav>

      <div class="legal__body">
        <p v-for="(p, i) in doc.intro" :key="`intro-${i}`" class="legal__intro">{{ p }}</p>

        <section v-for="(s, i) in doc.sections" :id="s.id" :key="s.id" class="legal__section">
          <h2>{{ i + 1 }}. {{ s.title }}</h2>
          <p v-for="(p, j) in s.paragraphs" :key="`p-${j}`">{{ p }}</p>
          <ul v-if="s.list">
            <li v-for="(item, j) in s.list" :key="`l-${j}`">{{ item }}</li>
          </ul>
          <p v-for="(p, j) in s.after" :key="`a-${j}`">{{ p }}</p>
        </section>

        <section id="contacto" class="legal__section legal__contact">
          <h2>Contacto</h2>
          <p>
            Si tenés dudas sobre este documento o querés ejercer tus derechos, escribinos a
            <a :href="`mailto:${legal.contactEmail}`">{{ legal.contactEmail }}</a>.
          </p>
        </section>
      </div>
    </div>
  </article>
</template>

<style scoped>
.legal { padding-top: 40px; }
.legal__head { max-width: 760px; }
.legal__kicker { margin: 0 0 8px; color: var(--color-forest); font-weight: 600; font-size: 14px; letter-spacing: 0.04em; text-transform: uppercase; }
.legal__head h1 { font-size: clamp(36px, 5vw, 56px); letter-spacing: -0.04em; }
.legal__updated { color: var(--text-secondary); margin: 10px 0 0; }
.legal__note {
  display: flex; gap: 10px; align-items: flex-start; margin: 20px 0 0; padding: 12px 16px;
  background: var(--tint-peach); color: var(--tint-peach-text); border-radius: var(--radius-md); font-size: 14px;
}

.legal__layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); gap: 48px; margin-top: 40px; align-items: start; }

.legal__toc { position: sticky; top: 24px; font-size: 14px; }
.legal__toc-title { margin: 0 0 10px; font-weight: 600; }
.legal__toc ol { list-style: none; margin: 0; padding: 0; border-left: 2px solid var(--border); }
.legal__toc a { display: block; padding: 6px 0 6px 14px; color: var(--text-secondary); text-decoration: none; line-height: 1.35; }
.legal__toc a:hover { color: var(--color-forest); }

.legal__body { max-width: 720px; }
.legal__intro { font-size: 18px; line-height: 1.7; margin: 0 0 16px; }
.legal__section { padding-top: 28px; scroll-margin-top: 16px; }
.legal__section h2 { font-size: 24px; margin-bottom: 12px; }
.legal__section p, .legal__section li { font-size: 16px; line-height: 1.75; }
.legal__section p { margin: 0 0 12px; }
.legal__section ul { margin: 0 0 12px; padding-left: 22px; }
.legal__section li { margin-bottom: 8px; }
.legal__section li::marker { color: var(--color-forest); }
.legal__contact { margin-top: 12px; border-top: 1px solid var(--border); }

@media (max-width: 860px) {
  .legal__layout { grid-template-columns: 1fr; gap: 24px; }
  .legal__toc { position: static; background: var(--color-white); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 16px 18px; }
}
</style>
