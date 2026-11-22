<script setup lang="ts">
// Menú de acciones "⋯" accesible: se abre con clic o Enter, se navega con flechas,
// se cierra con Esc o al hacer clic fuera, y devuelve el foco al botón.
import type { MenuAction } from '~/types/ui'

const props = defineProps<{ actions: MenuAction[], label: string }>()
const emit = defineEmits<{ select: [key: string] }>()

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const id = useId()

const items = () => Array.from(root.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])

async function show(focusLast = false) {
  open.value = true
  await nextTick()
  const list = items()
  ;(focusLast ? list[list.length - 1] : list[0])?.focus()
}
function hide(returnFocus = true) {
  open.value = false
  if (returnFocus) trigger.value?.focus()
}
function onTriggerKey(e: KeyboardEvent) {
  if (e.key === 'ArrowDown') { e.preventDefault(); show() }
  if (e.key === 'ArrowUp') { e.preventDefault(); show(true) }
}
function onMenuKey(e: KeyboardEvent) {
  const list = items()
  const i = list.indexOf(document.activeElement as HTMLElement)
  if (e.key === 'Escape') { e.preventDefault(); hide() }
  else if (e.key === 'ArrowDown') { e.preventDefault(); list[(i + 1) % list.length]?.focus() }
  else if (e.key === 'ArrowUp') { e.preventDefault(); list[(i - 1 + list.length) % list.length]?.focus() }
  else if (e.key === 'Home') { e.preventDefault(); list[0]?.focus() }
  else if (e.key === 'End') { e.preventDefault(); list[list.length - 1]?.focus() }
  else if (e.key === 'Tab') hide(false)
}
function choose(a: MenuAction) {
  hide()
  if (!a.to) emit('select', a.key)
}
function onDocPointer(e: PointerEvent) {
  if (open.value && !root.value?.contains(e.target as Node)) hide(false)
}
onMounted(() => document.addEventListener('pointerdown', onDocPointer))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocPointer))
</script>

<template>
  <div ref="root" class="am">
    <button
      ref="trigger" type="button" class="am__trigger"
      :aria-label="label" aria-haspopup="menu" :aria-expanded="open" :aria-controls="id"
      @click="open ? hide() : show()" @keydown="onTriggerKey"
    >
      <Icon name="lucide:ellipsis" size="20" />
    </button>
    <ul v-show="open" :id="id" class="am__menu" role="menu" :aria-label="label" @keydown="onMenuKey">
      <li v-for="a in props.actions" :key="a.key" role="none" :class="{ 'am__sep': a.danger }">
        <NuxtLink
          v-if="a.to" :to="a.to" role="menuitem" tabindex="-1" class="am__item"
          :target="a.external ? '_blank' : undefined" @click="choose(a)"
        >
          <Icon :name="a.icon" size="16" /> {{ a.label }}
        </NuxtLink>
        <button v-else type="button" role="menuitem" tabindex="-1" class="am__item" :class="{ 'is-danger': a.danger }" @click="choose(a)">
          <Icon :name="a.icon" size="16" /> {{ a.label }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.am { position: relative; display: inline-flex; }
.am__trigger {
  width: 40px; height: 40px; border-radius: var(--radius-sm); cursor: pointer;
  border: 1px solid var(--border); background: var(--color-white); color: var(--color-ink);
  display: inline-flex; align-items: center; justify-content: center;
}
.am__trigger:hover, .am__trigger[aria-expanded='true'] { border-color: var(--color-forest); }
.am__menu {
  position: absolute; right: 0; top: calc(100% + 6px); z-index: 20; min-width: 210px;
  list-style: none; margin: 0; padding: 6px; border-radius: var(--radius-md);
  background: var(--color-white); border: 1px solid var(--border); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.16);
}
.am__sep { margin-top: 4px; padding-top: 4px; border-top: 1px solid var(--track); }
.am__item {
  width: 100%; min-height: 40px; padding: 0 10px; border: 0; border-radius: 8px; cursor: pointer;
  display: flex; align-items: center; gap: 10px; background: transparent; color: var(--color-ink);
  font: 500 0.875rem var(--font-body); text-decoration: none; text-align: left;
}
.am__item:hover, .am__item:focus-visible { background: var(--tint-neutral); color: var(--color-ink); outline: none; }
.am__item.is-danger { color: var(--color-raspberry-dark); }
.am__item.is-danger:hover, .am__item.is-danger:focus-visible { background: var(--tint-raspberry); }
</style>
