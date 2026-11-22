<script setup lang="ts">
// Ventana que muestra una entrada como un boleto de concierto antiguo, pero digital.
// Horizontal en pantallas grandes y vertical en el celular.
// Usa <dialog> nativo: atrapa el foco, se cierra con Esc y oscurece el fondo.
import type { TicketItem } from '~/types/models'

const props = defineProps<{ ticket: TicketItem | null, position?: string }>()
const emit = defineEmits<{ close: [] }>()

const { tickets: text, site } = useAppConfig()
const dialog = ref<HTMLDialogElement | null>(null)

watch(() => props.ticket, (t) => {
  if (!dialog.value) return
  if (t && !dialog.value.open) dialog.value.showModal()
  if (!t && dialog.value.open) dialog.value.close()
}, { flush: 'post' })

function close() {
  dialog.value?.close()
}
// Clic en el fondo oscuro (fuera del boleto) cierra la ventana
function onDialogClick(e: MouseEvent) {
  if (e.target === dialog.value) close()
}

const state = computed(() => (props.ticket ? ticketState(props.ticket, text.soonDays) : 'active'))
const info = computed(() => ticketStateInfo[state.value])
const poster = computed(() => eventPoster(props.ticket?.event.category.slug ?? ''))
const serial = computed(() => (props.ticket?.code.replace(/\D/g, '') ?? '').padStart(6, '0'))
</script>

<template>
  <dialog ref="dialog" class="tm" aria-labelledby="tm-title" @close="emit('close')" @click="onDialogClick">
    <div v-if="ticket" class="tm__wrap">
      <button class="tm__close" aria-label="Cerrar boleto" @click="close">
        <Icon name="lucide:x" size="22" />
      </button>

      <div class="vt theme-fixed" :class="`is-${state}`">
        <!-- Cuerpo del boleto -->
        <div class="vt__main">
          <div class="vt__frame">
            <div class="vt__top">
              <span class="vt__admit">Admite uno</span>
              <span class="vt__brand">{{ site.name }}</span>
              <span class="vt__serial">N.º {{ serial }}</span>
            </div>

            <p class="vt__presents">{{ ticket.event.category.name }} · {{ site.name }} presenta</p>
            <h2 id="tm-title" class="vt__title">{{ ticket.event.name }}</h2>
            <p class="vt__ornament" aria-hidden="true">✦ ✦ ✦</p>

            <dl class="vt__info">
              <div>
                <dt>Fecha</dt>
                <dd class="cap">{{ formatShortDate(ticket.event.date) }}</dd>
              </div>
              <div>
                <dt>Hora</dt>
                <dd>{{ formatTime(ticket.event.date) }}</dd>
              </div>
              <div class="vt__wide">
                <dt>Lugar</dt>
                <dd>{{ ticket.event.location }}</dd>
              </div>
              <div class="vt__wide">
                <dt>Asistente</dt>
                <dd>{{ ticket.holder.name }}</dd>
              </div>
            </dl>

            <p class="vt__fine">{{ text.note }}</p>
          </div>

          <!-- Sello para entradas usadas, vencidas o canceladas -->
          <p v-if="info.stamp" class="vt__stamp">{{ info.stamp }}</p>
        </div>

        <!-- Talón con el QR -->
        <div class="vt__stub" :style="{ background: poster.bg, color: poster.ink }">
          <p class="vt__stub-label">Talón<template v-if="position"> · {{ position }}</template></p>
          <div class="vt__qr">
            <TicketQr :value="ticket.qrValue" :size="128" />
          </div>
          <div class="vt__stub-foot">
            <p class="vt__code">{{ ticket.code }}</p>
            <span class="badge" :class="info.badge">{{ info.label }}</span>
          </div>
        </div>
      </div>

      <!-- Acciones extra que pasa la página (reenviar, cancelar) -->
      <slot name="extra" />

      <div class="tm__actions">
        <NuxtLink :to="`/eventos/${ticket.event._id}`" class="btn btn--accent">
          Ver evento <Icon name="lucide:arrow-right" size="16" />
        </NuxtLink>
      </div>
    </div>
  </dialog>
</template>

<style scoped>
/* ---------- Ventana ---------- */
.tm {
  border: 0; padding: 0; background: transparent; overflow: visible;
  width: min(840px, 94vw); max-width: none; max-height: 94vh;
}
.tm::backdrop { background: rgba(31, 42, 36, 0.8); backdrop-filter: blur(3px); }
.tm[open] { animation: tm-in 0.22s ease-out; }
@keyframes tm-in { from { opacity: 0; transform: translateY(12px) rotate(-1deg); } to { opacity: 1; transform: none; } }

.tm__wrap { position: relative; max-height: 94vh; overflow-y: auto; padding: 52px 4px 8px; }
.tm__close {
  position: absolute; top: 0; right: 4px; width: 44px; height: 44px; border-radius: 50%;
  border: 0; cursor: pointer; background: var(--color-sand); color: var(--color-ink);
  display: inline-flex; align-items: center; justify-content: center;
}
.tm__actions { display: flex; justify-content: center; margin-top: 18px; }

/* ---------- Boleto (horizontal) ---------- */
.vt {
  --notch: 16px;
  --stub: 220px;
  display: grid;
  grid-template-columns: minmax(0, 1fr) var(--stub);
  border-radius: 14px;
  overflow: hidden;
  /* Muescas semicirculares en la línea de corte (arriba y abajo) */
  -webkit-mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
  mask:
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 0, #0000 98%, #000) top / 100% 51% no-repeat,
    radial-gradient(circle var(--notch) at calc(100% - var(--stub)) 100%, #0000 98%, #000) bottom / 100% 51% no-repeat;
}

.vt__main {
  position: relative; padding: 14px;
  background:
    repeating-linear-gradient(135deg, rgba(31, 42, 36, 0.035) 0 2px, transparent 2px 9px),
    #FFF6E8;
  color: var(--color-ink);
}
.vt__frame {
  height: 100%; border: 3px double var(--color-ink); border-radius: 8px;
  padding: 16px 22px 14px; display: flex; flex-direction: column;
}

.vt__top {
  display: flex; justify-content: space-between; align-items: center; gap: 8px;
  padding-bottom: 10px; border-bottom: 1px solid rgba(31, 42, 36, 0.35);
  font-size: 0.6875rem; letter-spacing: 0.18em; text-transform: uppercase;
}
.vt__admit { font-family: Georgia, 'Times New Roman', serif; font-style: italic; letter-spacing: 0.08em; font-size: 0.875rem; text-transform: none; }
.vt__brand { font-weight: 700; }
.vt__serial { font-family: ui-monospace, 'Courier New', monospace; color: var(--color-raspberry); font-weight: 700; }

.vt__presents {
  margin: 16px 0 6px; text-align: center; font-family: Georgia, serif; font-style: italic; font-size: 0.875rem; color: var(--text-secondary);
}
.vt__title {
  text-align: center; text-transform: uppercase; font-size: clamp(1.625rem, 4.2vw, 2.5rem);
  line-height: 0.95; letter-spacing: -0.02em; color: var(--color-raspberry-dark);
}
.vt__ornament { text-align: center; margin: 8px 0 12px; color: var(--color-forest); letter-spacing: 0.4em; font-size: 0.75rem; }

.vt__info { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 18px; margin: 0; }
.vt__info div { border-top: 1px dashed rgba(31, 42, 36, 0.3); padding-top: 6px; }
.vt__info dt { font-size: 0.625rem; letter-spacing: 0.16em; text-transform: uppercase; color: var(--text-secondary); }
.vt__info dd { margin: 2px 0 0; font-weight: 600; font-size: 0.9375rem; }
.vt__wide { grid-column: span 2; }
@media (min-width: 641px) { .vt__wide { grid-column: auto; } }

.vt__fine { margin: auto 0 0; padding-top: 12px; font-size: 0.6875rem; color: var(--text-secondary); text-align: center; }

.vt__stamp {
  position: absolute; top: 50%; left: 50%; margin: 0;
  transform: translate(-50%, -50%) rotate(-14deg);
  padding: 6px 22px; border: 4px solid var(--color-raspberry); border-radius: 10px;
  color: var(--color-raspberry); font-family: var(--font-display); font-weight: 700;
  font-size: clamp(2rem, 6vw, 3.25rem); letter-spacing: 0.08em; text-transform: uppercase;
  opacity: 0.85; mix-blend-mode: multiply; pointer-events: none;
}

/* Talón */
.vt__stub {
  border-left: 3px dotted rgba(31, 42, 36, 0.35);
  padding: 18px 16px; display: flex; flex-direction: column; align-items: center; justify-content: space-between; gap: 12px;
}
.vt__stub-label { margin: 0; font-size: 0.6875rem; letter-spacing: 0.16em; text-transform: uppercase; font-weight: 600; }
.vt__qr { background: #FFFFFF; padding: 8px; border-radius: 10px; }
.vt__stub-foot { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.vt__code { margin: 0; font-family: ui-monospace, 'Courier New', monospace; font-weight: 700; font-size: 1.125rem; letter-spacing: 0.08em; }

/* Entradas que ya no sirven: QR apagado */
.vt.is-used .vt__qr, .vt.is-expired .vt__qr, .vt.is-cancelled .vt__qr { opacity: 0.35; }

.cap::first-letter { text-transform: uppercase; }

/* ---------- Boleto vertical (celular) ---------- */
@media (max-width: 640px) {
  .vt {
    --stub: 190px;
    grid-template-columns: 1fr;
    grid-template-rows: auto var(--stub);
    -webkit-mask:
      radial-gradient(circle var(--notch) at 0 calc(100% - var(--stub)), #0000 98%, #000) left / 51% 100% no-repeat,
      radial-gradient(circle var(--notch) at 100% calc(100% - var(--stub)), #0000 98%, #000) right / 51% 100% no-repeat;
    mask:
      radial-gradient(circle var(--notch) at 0 calc(100% - var(--stub)), #0000 98%, #000) left / 51% 100% no-repeat,
      radial-gradient(circle var(--notch) at 100% calc(100% - var(--stub)), #0000 98%, #000) right / 51% 100% no-repeat;
  }
  .vt__frame { padding: 14px 16px 12px; }
  .vt__brand { display: none; }
  .vt__stub {
    border-left: 0; border-top: 3px dotted rgba(31, 42, 36, 0.35);
    flex-direction: row; flex-wrap: wrap; justify-content: center; align-content: center; gap: 10px 18px;
  }
  .vt__stub-label { width: 100%; text-align: center; }
}
</style>
