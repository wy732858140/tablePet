<script setup lang="ts">
import type { PetLibraryEntry } from '@shared/types'

defineProps<{ pets: PetLibraryEntry[] }>()
defineEmits<{ select: [id: string] }>()
</script>

<template>
  <section class="panel" aria-labelledby="pet-library-heading">
    <div class="panel-heading">
      <div>
        <p class="panel-kicker">Companions</p>
        <h2 id="pet-library-heading">Library</h2>
      </div>
      <span class="panel-count">{{ pets.length }}</span>
    </div>
    <p v-if="pets.length === 0" class="empty-message">No pets imported yet.</p>
    <ul v-else class="pet-list">
      <li
        v-for="pet in pets"
        :key="pet.id"
        class="pet-list-item"
      >
        <span class="pet-avatar" aria-hidden="true">{{ pet.displayName.slice(0, 1).toUpperCase() }}</span>
        <span class="pet-copy">
          <span class="pet-name">{{ pet.displayName }}</span>
        </span>
        <button
          type="button"
          class="select-button"
          :aria-label="`Select ${pet.displayName}`"
          @click="$emit('select', pet.id)"
        >
          Use
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding-top: 1px;
  overflow-wrap: anywhere;
  color: #2f4f5a;
}

.panel-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding-top: 12px;
  border-top: 1px dashed rgba(76, 182, 162, 0.3);
}

.panel-kicker {
  margin: 0 0 4px;
  color: #6f8891;
  font-size: 10px;
  font-weight: 720;
  letter-spacing: 0;
  line-height: 1;
  text-transform: uppercase;
}

.panel h2 {
  margin: 0;
  color: #2f4f5a;
  font-size: 15px;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1;
}

.panel-count {
  display: grid;
  place-items: center;
  min-width: 22px;
  height: 24px;
  padding: 0 6px;
  border: 1px solid rgba(76, 182, 162, 0.22);
  border-radius: 6px;
  background: rgba(232, 252, 246, 0.78);
  color: #476875;
  font-size: 11px;
  font-weight: 720;
}

.empty-message {
  margin: 0;
  padding: 16px 12px;
  border: 1px dashed rgba(76, 182, 162, 0.24);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.56);
  color: #6f8891;
  font-size: 12px;
  line-height: 1.35;
}

.pet-list {
  min-height: 0;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
  overflow-wrap: anywhere;
}

.pet-list-item {
  display: grid;
  grid-template-columns: 38px minmax(0, 1fr) auto;
  gap: 10px;
  align-items: center;
  min-height: 58px;
  margin-bottom: 8px;
  padding: 9px 10px;
  border: 1px solid rgba(76, 182, 162, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.72);
  box-shadow:
    0 8px 18px rgba(47, 100, 106, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.pet-avatar {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(76, 182, 162, 0.24);
  border-radius: 8px;
  background: linear-gradient(135deg, #e8fcf6 0%, #e8fbff 100%);
  color: #2c927f;
  font-size: 14px;
  font-weight: 760;
  line-height: 1;
}

.pet-copy {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.pet-name {
  min-width: 0;
  color: #2f4f5a;
  font-size: 13px;
  font-weight: 720;
  line-height: 1.15;
  overflow-wrap: anywhere;
}

.select-button {
  min-width: 54px;
  height: 32px;
  padding: 0 10px;
  border: 1px solid rgba(44, 146, 127, 0.28);
  border-radius: 8px;
  background: #fbfffd;
  color: #2c927f;
  font-size: 12px;
  font-weight: 700;
  line-height: 1;
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.select-button:hover {
  border-color: rgba(44, 146, 127, 0.46);
  background: #4cb6a2;
  color: #ffffff;
}

.select-button:focus-visible {
  outline: 2px solid #4cb6a2;
  outline-offset: 2px;
}
</style>
