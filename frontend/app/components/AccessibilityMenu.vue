<script setup lang="ts">
// Botón flotante con el menú de accesibilidad:
// tema claro/oscuro/automático, alto contraste, tamaño del texto y animaciones.
// Los ajustes se recuerdan al cerrar y volver a abrir el sitio (ver useA11y).
import type { ThemeMode } from '~/composables/useA11y'

const { settings, setFontScale, reset } = useA11y()

const open = ref(false)
const button = ref<HTMLButtonElement | null>(null)
const panel = ref<HTMLElement | null>(null)

const themes: { value: ThemeMode, label: string, icon: string }[] = [
  { value: 'light', label: 'Claro', icon: 'lucide:sun' },
  { value: 'dark', label: 'Oscuro', icon: 'lucide:moon' },
  { value: 'system', label: 'Automático', icon: 'lucide:monitor' },
]

const percent = computed(() => `${Math.round(settings.value.fontScale * 100)} %`)
const isMin = computed(() => settings.value.fontScale <= FONT_SCALES[0]!)
const isMax = computed(() => settings.value.fontScale >= FONT_SCALES[FONT_SCALES.length - 1]!)
const changed = computed(() => JSON.stringify(settings.value) !== JSON.stringify(A11Y_DEFAULTS))

function setTheme(theme: ThemeMode) { settings.value = { ...settings.value, theme } }
function toggleContrast() { settings.value = { ...settings.value, contrast: settings.value.contrast === 'high' ? 'normal' : 'high' } }
function toggleMotion() { settings.value = { ...settings.value, motion: settings.value.motion === 'reduce' ? 'normal' : 'reduce' } }

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    panel.value?.querySelector<HTMLElement>('input, button')?.focus()
  }
}
function close(returnFocus = true) {
  open.value = false
  if (returnFocus) button.value?.focus()
}

// Cerrar con Esc o haciendo clic fuera del menú
function onKeydown(e: KeyboardEvent) {
  if (open.value && e.key === 'Escape') close()
}
function onPointerDown(e: PointerEvent) {
  const target = e.target as Node
  if (open.value && !panel.value?.contains(target) && !button.value?.contains(target)) close(false)
}
onMounted(() => {
  document.addEventListener('keydown', onKeydown)
  document.addEventListener('pointerdown', onPointerDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  document.removeEventListener('pointerdown', onPointerDown)
})
</script>

<template>
  <div class="a11y">
    <section
      v-show="open"
      id="a11y-panel"
      ref="panel"
      class="a11y__panel"
      role="dialog"
      aria-labelledby="a11y-title"
    >
      <div class="a11y__head">
        <h2 id="a11y-title">Accesibilidad</h2>
        <button type="button" class="a11y__close" aria-label="Cerrar menú de accesibilidad" @click="close()">
          <Icon name="lucide:x" size="20" />
        </button>
      </div>

      <!-- Tema -->
      <fieldset class="a11y__group">
        <legend>Tema</legend>
        <div class="seg">
          <label v-for="t in themes" :key="t.value" class="seg__opt" :class="{ 'is-on': settings.theme === t.value }">
            <input type="radio" name="a11y-theme" class="sr-only" :value="t.value" :checked="settings.theme === t.value" @change="setTheme(t.value)">
            <Icon :name="t.icon" size="18" />
            <span>{{ t.label }}</span>
          </label>
        </div>
      </fieldset>

      <!-- Alto contraste -->
      <div class="a11y__row">
        <div>
          <p id="a11y-contrast" class="a11y__label">Alto contraste</p>
          <p class="a11y__hint">Colores más fuertes y enlaces subrayados.</p>
        </div>
        <button
          type="button" role="switch" class="switch"
          :aria-checked="settings.contrast === 'high'" aria-labelledby="a11y-contrast"
          @click="toggleContrast"
        >
          <span class="switch__dot" />
        </button>
      </div>

      <!-- Tamaño del texto -->
      <div class="a11y__row">
        <div>
          <p id="a11y-size" class="a11y__label">Tamaño del texto</p>
          <p class="a11y__hint">Agranda todo el texto del sitio.</p>
        </div>
        <div class="stepper" role="group" aria-labelledby="a11y-size">
          <button type="button" class="stepper__btn" aria-label="Reducir el texto" :disabled="isMin" @click="setFontScale(-1)">A−</button>
          <output class="stepper__value" aria-live="polite">{{ percent }}</output>
          <button type="button" class="stepper__btn stepper__btn--big" aria-label="Agrandar el texto" :disabled="isMax" @click="setFontScale(1)">A+</button>
        </div>
      </div>

      <!-- Animaciones -->
      <div class="a11y__row">
        <div>
          <p id="a11y-motion" class="a11y__label">Reducir animaciones</p>
          <p class="a11y__hint">Quita movimientos y transiciones.</p>
        </div>
        <button
          type="button" role="switch" class="switch"
          :aria-checked="settings.motion === 'reduce'" aria-labelledby="a11y-motion"
          @click="toggleMotion"
        >
          <span class="switch__dot" />
        </button>
      </div>

      <div class="a11y__foot">
        <p class="a11y__saved"><Icon name="lucide:save" size="14" /> Se guardan en este navegador.</p>
        <button v-if="changed" type="button" class="btn btn--ghost a11y__reset" @click="reset">
          <Icon name="lucide:rotate-ccw" size="16" /> Restablecer
        </button>
      </div>
    </section>

    <button
      ref="button"
      type="button"
      class="a11y__fab"
      :aria-expanded="open"
      aria-controls="a11y-panel"
      aria-label="Opciones de accesibilidad"
      @click="toggle"
    >
      <Icon name="lucide:accessibility" size="26" />
    </button>
  </div>
</template>

<style scoped>
.a11y { position: fixed; right: 16px; bottom: 16px; z-index: 60; display: flex; flex-direction: column; align-items: flex-end; gap: 12px; }

.a11y__fab {
  width: 56px; height: 56px; border-radius: 50%; cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center;
  background: var(--color-forest); color: var(--color-white);
  border: 3px solid var(--color-sand);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
  transition: transform 0.15s;
}
.a11y__fab:hover { transform: scale(1.06); }
.a11y__fab[aria-expanded='true'] { background: var(--color-forest-dark); }

.a11y__panel {
  width: min(360px, calc(100vw - 32px)); max-height: calc(100vh - 100px); overflow-y: auto;
  padding: 18px; border-radius: var(--radius-lg);
  background: var(--color-white); color: var(--color-ink); border: 1px solid var(--border);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.22);
  display: flex; flex-direction: column; gap: 16px;
}
.a11y__head { display: flex; align-items: center; justify-content: space-between; }
.a11y__head h2 { font-size: 1.25rem; }
.a11y__close {
  width: 44px; height: 44px; border: 0; border-radius: var(--radius-sm); background: transparent; cursor: pointer;
  color: var(--color-ink); display: inline-flex; align-items: center; justify-content: center;
}
.a11y__close:hover { background: var(--tint-neutral); }

.a11y__group { border: 0; margin: 0; padding: 0; }
.a11y__group legend { padding: 0; margin-bottom: 8px; font-weight: 600; font-size: 0.9375rem; }
.seg { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; }
.seg__opt {
  min-height: 60px; padding: 8px 4px; border-radius: var(--radius-md); cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  border: 1.5px solid var(--border); font-size: 0.8125rem; font-weight: 500; text-align: center;
}
.seg__opt:hover { border-color: var(--color-forest); }
.seg__opt.is-on { border-color: var(--color-forest); background: var(--tint-forest); color: var(--color-forest-dark); font-weight: 600; }
.seg__opt:focus-within { outline: 3px solid var(--color-raspberry); outline-offset: 2px; }

.a11y__row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 14px; border-top: 1px solid var(--border); }
.a11y__label { margin: 0; font-weight: 600; font-size: 0.9375rem; }
.a11y__hint { margin: 2px 0 0; font-size: 0.8125rem; color: var(--text-secondary); line-height: 1.4; }

.switch {
  position: relative; flex-shrink: 0; width: 52px; height: 32px; border-radius: 999px; cursor: pointer;
  background: var(--tint-neutral); border: 2px solid var(--text-secondary); padding: 0;
  transition: background-color 0.15s, border-color 0.15s;
}
.switch__dot {
  position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
  background: var(--text-secondary); transition: transform 0.15s, background-color 0.15s;
}
.switch[aria-checked='true'] { background: var(--color-forest); border-color: var(--color-forest); }
.switch[aria-checked='true'] .switch__dot { transform: translateX(20px); background: var(--color-white); }

.stepper { display: flex; align-items: center; gap: 4px; flex-shrink: 0; }
.stepper__btn {
  width: 44px; height: 44px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1.5px solid var(--border); background: transparent; color: var(--color-ink);
  font: 700 0.875rem var(--font-body);
}
.stepper__btn--big { font-size: 1.0625rem; }
.stepper__btn:hover:not(:disabled) { border-color: var(--color-forest); }
.stepper__btn:disabled { opacity: 0.4; cursor: default; }
.stepper__value { min-width: 56px; text-align: center; font-weight: 600; font-variant-numeric: tabular-nums; }

.a11y__foot { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 12px; border-top: 1px solid var(--border); }
.a11y__saved { margin: 0; display: inline-flex; align-items: center; gap: 6px; font-size: 0.8125rem; color: var(--text-secondary); }
.a11y__reset { min-height: 40px; padding: 0 12px; }
</style>
