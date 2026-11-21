<script setup lang="ts">
import { privacyPolicy } from '~/content/legal'

useHead({ title: privacyPolicy.title })
</script>

<template>
  <LegalPage :doc="privacyPolicy" />
</template>
