<script setup lang="ts">
import type { PetLibraryEntry } from '@shared/types'

defineProps<{ pets: PetLibraryEntry[] }>()
</script>

<template>
  <section class="panel">
    <h2>Pets</h2>
    <p v-if="pets.length === 0">No pets imported yet.</p>
    <ul v-else class="pet-list">
      <li v-for="pet in pets" :key="pet.id">{{ pet.displayName }}</li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  overflow-wrap: anywhere;
}

.pet-list {
  margin: 0;
  padding-left: 18px;
  overflow-wrap: anywhere;
}
</style>
