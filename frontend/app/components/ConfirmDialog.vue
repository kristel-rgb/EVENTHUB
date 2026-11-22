<script setup lang="ts">
// Ventana de confirmación con <dialog> nativo (atrapa el foco y se cierra con Esc).
// Si se pasa `confirmText`, hay que escribirlo exactamente para poder confirmar.
const props = defineProps<{
  open: boolean
  title: string
  confirmLabel: string
  danger?: boolean
  confirmText?: string
  loading?: boolean
  error?: string | null
}>()
const emit = defineEmits<{ confirm: [], close: [] }>()

const dialog = ref<HTMLDialogElement | null>(null)
const typed = ref('')
const canConfirm = computed(() => !props.confirmText || typed.value.trim() === props.confirmText.trim())

watch(() => props.open, (v) => {
  if (!dialog.value) return
  if (v && !dialog.value.open) { typed.value = ''; dialog.value.showModal() }
  if (!v && dialog.value.open) dialog.value.close()
}, { flush: 'post' })
</script>

<template>
  <dialog ref="dialog" class="cd" aria-labelledby="cd-title" @close="emit('close')">
    <form class="cd__box" method="dialog" @submit.prevent="canConfirm && !loading && emit('confirm')">
      <div class="cd__head">
        <span class="cd__icon" :class="{ 'is-danger': danger }">
          <Icon :name="danger ? 'lucide:triangle-alert' : 'lucide:circle-help'" size="20" />
        </span>
        <div>
          <h2 id="cd-title">{{ title }}</h2>
          <div class="cd__body"><slot /></div>
        </div>
      </div>

      <label v-if="confirmText" class="cd__confirm">
        <span>Escribí <strong>{{ confirmText }}</strong> para confirmar</span>
        <input v-model="typed" type="text" autocomplete="off" :placeholder="confirmText">
      </label>

      <p v-if="error" class="cd__error" role="alert">{{ error }}</p>

      <div class="cd__actions">
        <button type="button" class="btn btn--outline" @click="emit('close')">Volver</button>
        <button type="submit" class="btn" :class="danger ? 'cd__danger' : 'btn--primary'" :disabled="!canConfirm || loading">
          <Icon v-if="loading" name="lucide:loader-circle" size="16" class="spin" />
          {{ confirmLabel }}
        </button>
      </div>
    </form>
  </dialog>
</template>

<style scoped>
.cd { border: 0; padding: 0; background: transparent; width: min(460px, 92vw); max-width: none; }
.cd::backdrop { background: rgba(31, 42, 36, 0.65); }
.cd__box { background: var(--color-white); color: var(--color-ink); border-radius: var(--radius-lg); padding: 22px; display: flex; flex-direction: column; gap: 16px; }
.cd__head { display: flex; gap: 12px; align-items: flex-start; }
.cd__head h2 { font-size: 1.25rem; line-height: 1.2; }
.cd__icon { flex-shrink: 0; width: 40px; height: 40px; border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; background: var(--tint-forest); color: var(--color-forest-dark); }
.cd__icon.is-danger { background: var(--tint-raspberry); color: var(--color-raspberry-dark); }
.cd__body { margin-top: 6px; color: var(--text-secondary); font-size: 0.9375rem; line-height: 1.55; }
.cd__body :deep(strong) { color: var(--color-ink); }
.cd__confirm { display: flex; flex-direction: column; gap: 6px; font-size: 0.875rem; }
.cd__confirm input {
  min-height: 46px; padding: 0 12px; border-radius: var(--radius-md); border: 1.5px solid var(--border);
  background: var(--color-white); color: var(--color-ink); font: 1rem var(--font-body);
}
.cd__confirm input:focus { outline: none; border-color: var(--color-forest); box-shadow: 0 0 0 3px var(--tint-forest); }
.cd__error { margin: 0; color: var(--color-raspberry-dark); font-size: 0.875rem; }
.cd__actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.cd__danger { background: var(--color-raspberry); color: var(--color-white); }
.cd__danger:hover { background: var(--color-raspberry-dark); color: var(--color-white); }
.cd__actions button:disabled { opacity: 0.5; cursor: not-allowed; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
</style>
