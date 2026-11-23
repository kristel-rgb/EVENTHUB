<script setup lang="ts">
// Aplica los ajustes de accesibilidad guardados (tema, contraste, letra, animaciones)
useA11yRoot()
</script>

<template>
  <a href="#contenido" class="skip-link">Saltar al contenido</a>
  <NuxtRouteAnnouncer />
  <NuxtLayout>
    <NuxtPage />
  </NuxtLayout>
  <CookieNotice />
  <AccessibilityMenu />
</template>
