<script setup lang="ts">
import { cookiePolicy } from '~/content/legal'

useHead({ title: cookiePolicy.title })
</script>

<template>
  <LegalPage :doc="cookiePolicy" />
</template>
