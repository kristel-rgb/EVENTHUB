<script setup lang="ts">
// Aplica los ajustes de accesibilidad guardados (tema, contraste, letra, animaciones)
useA11yRoot()
</script>

<template>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieNotice />
  <AccessibilityMenu />
</template>
