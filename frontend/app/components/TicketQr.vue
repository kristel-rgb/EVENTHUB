<script setup lang="ts">
// Dibuja el código QR de una entrada a partir del texto que manda la API (qrValue).
import QRCode from 'qrcode'

const props = withDefaults(defineProps<{ value: string, size?: number }>(), { size: 160 })
const src = ref('')

watchEffect(async () => {
  src.value = await QRCode.toDataURL(props.value, {
    margin: 1,
    width: props.size * 2, // doble resolución para pantallas nítidas
    errorCorrectionLevel: 'M',
    color: { dark: '#1F2A24', light: '#FFFFFF' },
  })
})
</script>

<template>
  <img v-if="src" :src="src" :width="size" :height="size" alt="Código QR de la entrada" class="qr">
  <span v-else class="qr qr--loading" :style="{ width: `${size}px`, height: `${size}px` }" />
</template>

<style scoped>
.qr { display: block; border-radius: 6px; }
.qr--loading { display: block; background: var(--track); }
</style>
