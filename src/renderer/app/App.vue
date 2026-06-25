<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { HatchPetState, LoadedPet, PetLibraryEntry, Settings } from '@shared/types'
import { createBehaviorEngine } from '../pet/BehaviorEngine'
import PetCanvas from '../pet/PetCanvas.vue'
import { emptyPetView, type PetViewState } from '../pet/PetViewModel'
import PetLibraryView from './PetLibraryView.vue'
import SettingsPanel from './SettingsPanel.vue'

const pets = ref<PetLibraryEntry[]>([])
const currentPet = ref<LoadedPet | null>(null)
const errorMessage = ref<string | null>(null)
const animation = ref<HatchPetState>('idle')
const scale = ref(1.5)
const engine = createBehaviorEngine()

let pointerActive = false
let didDrag = false
let pointerStart: { x: number; y: number } | null = null
let unsubscribeImportRequest: (() => void) | null = null
const dragThresholdPx = 4

const viewState = computed<PetViewState>(() => {
  if (currentPet.value) {
    return { kind: 'loaded', pet: currentPet.value }
  }
  if (errorMessage.value) {
    return { kind: 'error', message: errorMessage.value }
  }
  return emptyPetView()
})

const loadedPet = computed(() => (viewState.value.kind === 'loaded' ? viewState.value.pet : null))

const syncAnimation = () => {
  animation.value = engine.currentAnimation()
}

const messageFromError = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected renderer error.')

const applySettings = (settings: Settings) => {
  if (settings.petWindow.scale > 0) {
    scale.value = settings.petWindow.scale
  }
}

const refreshSettings = async () => {
  try {
    applySettings(await window.desktopPet.getSettings())
  } catch (error) {
    errorMessage.value = messageFromError(error)
    engine.fail()
    syncAnimation()
  }
}

const refreshLibrary = async () => {
  try {
    const library = await window.desktopPet.listPets()
    pets.value = library.pets
    currentPet.value = library.pets.find((pet) => pet.id === library.currentPetId) ?? null
    errorMessage.value = null
  } catch (error) {
    currentPet.value = null
    errorMessage.value = messageFromError(error)
    engine.fail()
    syncAnimation()
  }
}

const importPet = async () => {
  try {
    const result = await window.desktopPet.importPetPackage()
    if (result.ok) {
      engine.recover()
      await refreshLibrary()
    } else {
      errorMessage.value = result.message
      engine.fail()
    }
  } catch (error) {
    errorMessage.value = messageFromError(error)
    engine.fail()
  }
  syncAnimation()
}

const onPointerDown = (event: PointerEvent) => {
  pointerActive = true
  didDrag = false
  pointerStart = { x: event.screenX, y: event.screenY }
  const target = event.currentTarget as HTMLElement | null
  target?.setPointerCapture(event.pointerId)
  engine.dragStart({ x: event.screenX, y: event.screenY })
  syncAnimation()
}

const onPointerMove = (event: PointerEvent) => {
  if (!pointerActive) return
  const deltaX = event.screenX - (pointerStart?.x ?? event.screenX)
  const deltaY = event.screenY - (pointerStart?.y ?? event.screenY)
  if (!didDrag && Math.hypot(deltaX, deltaY) < dragThresholdPx) {
    return
  }
  didDrag = true
  engine.dragMove({ x: event.screenX, y: event.screenY })
  syncAnimation()
  void window.desktopPet.setPetPosition({ x: event.screenX - 144, y: event.screenY - 156 })
}

const onPointerUp = (event: PointerEvent) => {
  if (!pointerActive) return
  pointerActive = false
  pointerStart = null
  const target = event.currentTarget as HTMLElement | null
  if (target?.hasPointerCapture(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
  engine.dragEnd()
  syncAnimation()
}

const onClick = () => {
  if (didDrag) {
    didDrag = false
    return
  }
  engine.click()
  syncAnimation()
}

const onAnimationEnded = () => {
  engine.animationEnded()
  syncAnimation()
}

const onPetLoadError = (message: string) => {
  errorMessage.value = message
  engine.fail()
  syncAnimation()
}

const cleanup = () => {
  unsubscribeImportRequest?.()
  unsubscribeImportRequest = null
  window.removeEventListener('pet-animation-ended', onAnimationEnded)
  window.removeEventListener('beforeunload', cleanup)
}

onMounted(async () => {
  await refreshSettings()
  await refreshLibrary()
  unsubscribeImportRequest = window.desktopPet.onImportPetRequested(() => {
    void importPet()
  })
  window.addEventListener('pet-animation-ended', onAnimationEnded)
  window.addEventListener('beforeunload', cleanup)
})

onUnmounted(cleanup)
</script>

<template>
  <main class="app">
    <div
      v-if="loadedPet"
      class="pet-surface"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onClick"
    >
      <PetCanvas :pet="loadedPet" :state="animation" :scale="scale" @load-error="onPetLoadError" />
      <p v-if="errorMessage" class="pet-error">{{ errorMessage }}</p>
    </div>
    <section v-else class="welcome">
      <SettingsPanel />
      <p v-if="viewState.kind === 'error'" class="error-message">{{ viewState.message }}</p>
      <button type="button" class="import-button" @click="importPet">Import Pet Package</button>
      <PetLibraryView :pets="pets" />
    </section>
  </main>
</template>

<style scoped>
.app,
.pet-surface {
  width: 100%;
  height: 100%;
  background: transparent;
}

.pet-surface {
  position: relative;
  display: grid;
  place-items: center;
  touch-action: none;
}

.pet-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  margin: 0;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.88);
  color: #9a3412;
  font-family: system-ui, sans-serif;
  font-size: 11px;
  line-height: 1.3;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.welcome {
  box-sizing: border-box;
  width: calc(100vw - 24px);
  max-width: 280px;
  max-height: calc(100vh - 24px);
  margin: 12px;
  padding: 12px;
  overflow: auto;
  overflow-wrap: anywhere;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.94);
  color: #1f2328;
  font-family: system-ui, sans-serif;
  font-size: 13px;
  line-height: 1.4;
  box-shadow: 0 10px 30px rgba(31, 35, 40, 0.18);
}

.panel {
  margin-bottom: 12px;
}

.error-message {
  margin: 0 0 10px;
  color: #9a3412;
  overflow-wrap: anywhere;
}

.import-button {
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 10px;
  border: 1px solid #c9d1d9;
  border-radius: 6px;
  background: #1f6feb;
  color: #ffffff;
  cursor: pointer;
}

.import-button:active {
  transform: translateY(1px);
}
</style>
