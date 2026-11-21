<script setup lang="ts">
import { termsAndConditions } from '~/content/legal'

useHead({ title: termsAndConditions.title })
</script>

<template>
  <LegalPage :doc="termsAndConditions" />
</template>
