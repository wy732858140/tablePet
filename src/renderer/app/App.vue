<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import type { HatchPetState, LoadedPet, PetLibrary, PetLibraryEntry, Settings } from '@shared/types'
import { createBehaviorEngine } from '../pet/BehaviorEngine'
import PetCanvas from '../pet/PetCanvas.vue'
import { emptyPetView, type PetViewState } from '../pet/PetViewModel'
import { getDraggedWindowPosition } from '../window/windowDrag'
import PetLibraryView from './PetLibraryView.vue'
import { clampPetScale, MENU_WINDOW_SIZE, toPetWindowSize } from '@shared/petWindowScale'
import { HATCH_PET_V1_CELL } from '@shared/hatchPetV1'

const appIconUrl = new URL('../../../assets/icons/app-icon.png', import.meta.url).href

const pets = ref<PetLibraryEntry[]>([])
const currentPet = ref<LoadedPet | null>(null)
const errorMessage = ref<string | null>(null)
const animation = ref<HatchPetState>('idle')
const scale = ref(1.5)
const isMenuOpen = ref(true)
const engine = createBehaviorEngine()

let pointerActive = false
let didDrag = false
let pointerStart: { x: number; y: number } | null = null
let windowDragOffset: { x: number; y: number } | null = null
let resizeDragStart: { x: number; y: number; scale: number } | null = null
let unsubscribeImportRequest: (() => void) | null = null
let unsubscribeTypingActivity: (() => void) | null = null
let idleTimer: number | null = null
let reviewTimer: number | null = null
let typingTimer: number | null = null
let fastDragStunTimer: number | null = null
let lastDragSample: { x: number; y: number; time: number } | null = null
const dragThresholdPx = 4
const fastDragMinDistancePx = 120
const fastDragSpeedPxPerMs = 1.8
const fastDragStunMs = 1_600
const idleWaitingMs = 30_000
const reviewGlanceMs = 1_600
const typingActivityIdleMs = 800

const viewState = computed<PetViewState>(() => {
  if (currentPet.value) {
    return { kind: 'loaded', pet: currentPet.value }
  }
  if (errorMessage.value) {
    return { kind: 'error', message: errorMessage.value }
  }
  return emptyPetView()
})

const loadedPet = computed(() =>
  !isMenuOpen.value && viewState.value.kind === 'loaded' ? viewState.value.pet : null
)

const petFrameStyle = computed(() => ({
  '--pet-width': `${Math.round(HATCH_PET_V1_CELL.width * scale.value)}px`,
  '--pet-height': `${Math.round(HATCH_PET_V1_CELL.height * scale.value)}px`
}))

const syncAnimation = () => {
  animation.value = engine.currentAnimation()
}

const clearIdleTimer = () => {
  if (idleTimer !== null) {
    window.clearTimeout(idleTimer)
    idleTimer = null
  }
}

const clearReviewTimer = () => {
  if (reviewTimer !== null) {
    window.clearTimeout(reviewTimer)
    reviewTimer = null
  }
}

const clearTypingTimer = () => {
  if (typingTimer !== null) {
    window.clearTimeout(typingTimer)
    typingTimer = null
  }
}

const clearFastDragStunTimer = () => {
  if (fastDragStunTimer !== null) {
    window.clearTimeout(fastDragStunTimer)
    fastDragStunTimer = null
  }
}

const resetIdleTimer = () => {
  clearIdleTimer()
  if (!loadedPet.value) return
  idleTimer = window.setTimeout(() => {
    engine.wait()
    syncAnimation()
  }, idleWaitingMs)
}

const playReviewGlance = () => {
  clearReviewTimer()
  engine.reviewStart()
  syncAnimation()
  reviewTimer = window.setTimeout(() => {
    reviewTimer = null
    engine.reviewEnd()
    syncAnimation()
    resetIdleTimer()
  }, reviewGlanceMs)
}

const stopAmbientTimers = () => {
  clearIdleTimer()
  clearReviewTimer()
  clearTypingTimer()
  clearFastDragStunTimer()
}

const onTypingActivity = () => {
  if (!loadedPet.value) return
  clearTypingTimer()
  engine.typingStart()
  syncAnimation()
  typingTimer = window.setTimeout(() => {
    typingTimer = null
    engine.typingEnd()
    syncAnimation()
    resetIdleTimer()
  }, typingActivityIdleMs)
  resetIdleTimer()
}

const messageFromError = (error: unknown) => (error instanceof Error ? error.message : 'Unexpected renderer error.')

const applySettings = (settings: Settings) => {
  if (settings.petWindow.scale > 0) {
    scale.value = clampPetScale(settings.petWindow.scale)
  }
}

const applyLibrary = (library: PetLibrary) => {
  pets.value = library.pets
  currentPet.value = library.pets.find((pet) => pet.id === library.currentPetId) ?? null
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
    applyLibrary(library)
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
      if (currentPet.value) {
        openPet()
        playReviewGlance()
      }
    } else {
      errorMessage.value = result.message
      stopAmbientTimers()
      engine.fail()
    }
  } catch (error) {
    errorMessage.value = messageFromError(error)
    stopAmbientTimers()
    engine.fail()
  }
  syncAnimation()
}

const selectPet = async (id: string) => {
  try {
    applyLibrary(await window.desktopPet.setCurrentPet(id))
    if (!currentPet.value) {
      throw new Error(`Pet not found: ${id}`)
    }
    errorMessage.value = null
    openPet()
    engine.recover()
    playReviewGlance()
  } catch (error) {
    isMenuOpen.value = true
    errorMessage.value = messageFromError(error)
    stopAmbientTimers()
    engine.fail()
  }
  syncAnimation()
}

const capturePointer = (event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (
    typeof target?.hasPointerCapture === 'function' &&
    typeof target.setPointerCapture === 'function' &&
    !target.hasPointerCapture(event.pointerId)
  ) {
    target.setPointerCapture(event.pointerId)
  }
}

const releasePointer = (event: PointerEvent) => {
  const target = event.currentTarget as HTMLElement | null
  if (
    typeof target?.hasPointerCapture === 'function' &&
    typeof target.releasePointerCapture === 'function' &&
    target.hasPointerCapture(event.pointerId)
  ) {
    target.releasePointerCapture(event.pointerId)
  }
}

const closeWindow = () => {
  void window.desktopPet.closeWindow()
}

const setWindowSize = (size: { width: number; height: number }) => {
  void window.desktopPet.setWindowSize(size).catch((error) => {
    errorMessage.value = messageFromError(error)
    stopAmbientTimers()
    engine.fail()
    syncAnimation()
  })
}

const setMenuWindowSize = () => {
  setWindowSize(MENU_WINDOW_SIZE)
}

const setPetWindowSize = () => {
  setWindowSize(toPetWindowSize(scale.value))
}

const openPet = () => {
  isMenuOpen.value = false
  setPetWindowSize()
  resetIdleTimer()
}

const openMenu = () => {
  isMenuOpen.value = true
  pointerActive = false
  didDrag = false
  pointerStart = null
  lastDragSample = null
  windowDragOffset = null
  resizeDragStart = null
  stopAmbientTimers()
  errorMessage.value = null
  engine.recover()
  setMenuWindowSize()
  syncAnimation()
}

const onWindowDragStart = (event: PointerEvent) => {
  windowDragOffset = { x: event.clientX, y: event.clientY }
  capturePointer(event)
}

const onWindowDragMove = (event: PointerEvent) => {
  if (!windowDragOffset) return
  void window.desktopPet.setPetPosition(
    getDraggedWindowPosition({
      screenX: event.screenX,
      screenY: event.screenY,
      offsetX: windowDragOffset.x,
      offsetY: windowDragOffset.y
    })
  )
}

const onWindowDragEnd = (event: PointerEvent) => {
  windowDragOffset = null
  releasePointer(event)
}

const persistPetScale = (nextScale: number) => {
  const clampedScale = clampPetScale(nextScale)
  if (scale.value === clampedScale) return
  scale.value = clampedScale
  void window.desktopPet.setPetScale(clampedScale).catch((error) => {
    errorMessage.value = messageFromError(error)
    stopAmbientTimers()
    engine.fail()
    syncAnimation()
  })
  resetIdleTimer()
}

const onResizeStart = (event: PointerEvent) => {
  if (event.button !== 0) return
  resizeDragStart = { x: event.screenX, y: event.screenY, scale: scale.value }
  capturePointer(event)
}

const onResizeMove = (event: PointerEvent) => {
  if (!resizeDragStart) return
  if ((event.buttons & 1) !== 1) {
    onResizeEnd(event)
    return
  }
  const widthScale = resizeDragStart.scale + (event.screenX - resizeDragStart.x) / HATCH_PET_V1_CELL.width
  const heightScale = resizeDragStart.scale + (event.screenY - resizeDragStart.y) / HATCH_PET_V1_CELL.height
  persistPetScale((widthScale + heightScale) / 2)
}

const onResizeEnd = (event: PointerEvent) => {
  resizeDragStart = null
  releasePointer(event)
}

const onPointerDown = (event: PointerEvent) => {
  pointerActive = true
  didDrag = false
  pointerStart = { x: event.screenX, y: event.screenY }
  lastDragSample = { x: event.screenX, y: event.screenY, time: event.timeStamp }
  capturePointer(event)
  resetIdleTimer()
}

const isFastDragMove = (event: PointerEvent) => {
  if (!lastDragSample) return false
  const distance = Math.hypot(event.screenX - lastDragSample.x, event.screenY - lastDragSample.y)
  const elapsedMs = Math.max(event.timeStamp - lastDragSample.time, 1)
  return distance >= fastDragMinDistancePx && distance / elapsedMs >= fastDragSpeedPxPerMs
}

const playFastDragStun = (event: PointerEvent) => {
  pointerActive = false
  didDrag = true
  pointerStart = null
  lastDragSample = null
  releasePointer(event)
  stopAmbientTimers()
  engine.fail()
  syncAnimation()
  fastDragStunTimer = window.setTimeout(() => {
    fastDragStunTimer = null
    engine.recover()
    syncAnimation()
    resetIdleTimer()
  }, fastDragStunMs)
}

const onPointerMove = (event: PointerEvent) => {
  if (!pointerActive) return
  const deltaX = event.screenX - (pointerStart?.x ?? event.screenX)
  const deltaY = event.screenY - (pointerStart?.y ?? event.screenY)
  if (isFastDragMove(event)) {
    playFastDragStun(event)
    return
  }
  lastDragSample = { x: event.screenX, y: event.screenY, time: event.timeStamp }
  if (!didDrag && Math.hypot(deltaX, deltaY) < dragThresholdPx) {
    return
  }
  if (!didDrag) {
    didDrag = true
    engine.dragStart(pointerStart ?? { x: event.screenX, y: event.screenY })
  }
  engine.dragMove({ x: event.screenX, y: event.screenY })
  syncAnimation()
  void window.desktopPet.setPetPosition({ x: event.screenX - 144, y: event.screenY - 156 })
}

const onPointerUp = (event: PointerEvent) => {
  if (!pointerActive) return
  pointerActive = false
  pointerStart = null
  lastDragSample = null
  releasePointer(event)
  if (didDrag) {
    engine.dragEnd()
    syncAnimation()
    resetIdleTimer()
  }
}

const onClick = () => {
  if (didDrag) {
    didDrag = false
    return
  }
  engine.click()
  syncAnimation()
  resetIdleTimer()
}

const onDoubleClick = () => {
  engine.doubleClick()
  syncAnimation()
  resetIdleTimer()
}

const onAnimationEnded = () => {
  engine.animationEnded()
  syncAnimation()
  resetIdleTimer()
}

const onPetLoadError = (message: string) => {
  errorMessage.value = message
  stopAmbientTimers()
  engine.fail()
  syncAnimation()
}

const cleanup = () => {
  unsubscribeImportRequest?.()
  unsubscribeImportRequest = null
  unsubscribeTypingActivity?.()
  unsubscribeTypingActivity = null
  stopAmbientTimers()
  window.removeEventListener('pet-animation-ended', onAnimationEnded)
  window.removeEventListener('beforeunload', cleanup)
}

onMounted(async () => {
  await refreshSettings()
  await refreshLibrary()
  setMenuWindowSize()
  unsubscribeImportRequest = window.desktopPet.onImportPetRequested(() => {
    void importPet()
  })
  unsubscribeTypingActivity = window.desktopPet.onTypingActivity(onTypingActivity)
  window.addEventListener('pet-animation-ended', onAnimationEnded)
  window.addEventListener('beforeunload', cleanup)
})

onUnmounted(cleanup)
</script>

<template>
  <main class="app" :data-mode="isMenuOpen ? 'menu' : 'pet'">
    <div
      v-if="loadedPet"
      class="pet-frame"
      data-pet-frame="true"
      :data-animation-state="animation"
      :style="petFrameStyle"
    >
      <section class="window-bar" data-window-shell="pet" aria-label="Window controls">
        <div
          class="window-drag-handle"
          @pointerdown="onWindowDragStart"
          @pointermove="onWindowDragMove"
          @pointerup="onWindowDragEnd"
          @pointercancel="onWindowDragEnd"
        >
          <span class="nav-mark" aria-hidden="true"></span>
          <span class="nav-title">TablePet</span>
          <span class="nav-status">{{ loadedPet.displayName }}</span>
        </div>
        <button
          class="nav-icon-button nav-icon-button--secondary"
          type="button"
          aria-label="Open pet library"
          title="Open pet library"
          @click="openMenu"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 7h16" />
            <path d="M4 12h16" />
            <path d="M4 17h16" />
          </svg>
        </button>
        <button
          class="nav-icon-button nav-icon-button--danger"
          type="button"
          aria-label="Quit TablePet"
          title="Quit TablePet"
          @click="closeWindow"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </section>
      <div
        class="pet-surface"
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @click="onClick"
        @dblclick="onDoubleClick"
      >
        <PetCanvas :pet="loadedPet" :state="animation" :scale="scale" @load-error="onPetLoadError" />
        <p v-if="errorMessage" class="pet-error">{{ errorMessage }}</p>
        <button
          class="resize-handle"
          data-control="resize"
          type="button"
          aria-label="Resize pet"
          title="Resize pet"
          @pointerdown.stop.prevent="onResizeStart"
          @pointermove.stop.prevent="onResizeMove"
          @pointerup.stop.prevent="onResizeEnd"
          @pointercancel.stop.prevent="onResizeEnd"
          @click.stop.prevent
        >
          <svg class="resize-icon" viewBox="0 0 32 32" aria-hidden="true">
            <path class="resize-arrow" d="M13 13 5 5M5 5h7M5 5v7" />
            <path class="resize-arrow" d="M19 13 27 5M27 5h-7M27 5v7" />
            <path class="resize-arrow" d="M13 19 5 27M5 27h7M5 27v-7" />
            <path class="resize-arrow" d="M19 19 27 27M27 27h-7M27 27v-7" />
          </svg>
        </button>
      </div>
    </div>
    <template v-else>
      <section class="window-bar" data-window-shell="menu" aria-label="Window controls">
        <div
          class="window-drag-handle"
          @pointerdown="onWindowDragStart"
          @pointermove="onWindowDragMove"
          @pointerup="onWindowDragEnd"
          @pointercancel="onWindowDragEnd"
        >
          <span class="nav-mark" aria-hidden="true"></span>
          <span class="nav-title">TablePet</span>
          <span class="nav-status">Menu</span>
        </div>
        <button
          class="nav-icon-button nav-icon-button--danger"
          type="button"
          aria-label="Quit TablePet"
          title="Quit TablePet"
          @click="closeWindow"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </section>
      <section class="welcome" aria-label="Pet menu">
      <div class="menu-shell" data-menu-shell="cute-library">
        <header class="menu-header">
          <div class="menu-copy">
            <div class="menu-heading-row">
              <p class="menu-kicker">TablePet shelf</p>
            </div>
            <h1>Choose your buddy</h1>
            <p class="menu-subtitle">Pick a little friend for your desktop.</p>
          </div>
          <img class="menu-mascot" :src="appIconUrl" alt="" aria-hidden="true" />
        </header>
        <div class="menu-toolbar">
          <button type="button" class="import-button" aria-label="Import Hatch Pet package" @click="importPet">
            <svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>
            Import Pet Package
          </button>
        </div>
        <p v-if="viewState.kind === 'error'" class="error-message">{{ viewState.message }}</p>
        <PetLibraryView :pets="pets" @select="selectPet" />
      </div>
      </section>
    </template>
  </main>
</template>

<style scoped>
.app,
.pet-surface {
  background: transparent;
}

.app {
  position: relative;
  width: 100%;
  height: 100%;
  --tp-background: #f4fffb;
  --tp-card: #fbfffd;
  --tp-card-elevated: #ffffff;
  --tp-border: rgba(76, 182, 162, 0.28);
  --tp-border-strong: rgba(76, 182, 162, 0.46);
  --tp-foreground: #2f4f5a;
  --tp-muted: #6f8891;
  --tp-muted-strong: #476875;
  --tp-primary: #4cb6a2;
  --tp-secondary: #8fd8ff;
  --tp-warning: #f4c95d;
  --tp-danger: #e36d5d;
  --tp-shadow: rgba(47, 100, 106, 0.16);
  color: var(--tp-foreground);
  font-family:
    "Avenir Next", Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.pet-frame {
  position: absolute;
  top: 50%;
  left: 50%;
  width: var(--pet-width);
  height: var(--pet-height);
  transform: translate(-50%, -50%);
}

.window-bar {
  position: absolute;
  top: 10px;
  left: 16px;
  right: 16px;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  color: var(--tp-foreground);
  font-size: 12px;
  line-height: 1;
  opacity: 0;
  pointer-events: none;
  transform: translateY(-2px);
  transition:
    opacity 120ms ease,
    transform 120ms ease;
}

.app[data-mode="menu"]:hover .window-bar,
.pet-frame:hover .window-bar,
.window-bar:focus-within {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0);
}

.window-bar[data-window-shell="pet"] {
  top: 6px;
  right: 6px;
  left: 6px;
  gap: 6px;
  height: 30px;
}

.window-drag-handle {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  height: 100%;
  padding: 0 10px;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 8px;
  background: rgba(251, 255, 253, 0.86);
  box-shadow:
    0 10px 24px var(--tp-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  cursor: move;
  user-select: none;
}

.window-bar[data-window-shell="pet"] .window-drag-handle {
  padding: 0 8px;
}

.nav-mark {
  flex: 0 0 auto;
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: var(--tp-primary);
  box-shadow: 0 0 0 3px rgba(76, 182, 162, 0.18);
}

.nav-title {
  min-width: 0;
  overflow: hidden;
  color: var(--tp-foreground);
  font-weight: 720;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-bar[data-window-shell="pet"] .nav-title {
  display: none;
}

.nav-status {
  flex: 0 0 auto;
  max-width: 112px;
  padding: 4px 6px;
  overflow: hidden;
  border: 1px solid var(--tp-border);
  border-radius: 6px;
  color: var(--tp-muted-strong);
  font-size: 11px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.window-bar[data-window-shell="pet"] .nav-status {
  max-width: 58px;
}

.nav-icon-button {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.72);
  border-radius: 8px;
  background: rgba(251, 255, 253, 0.9);
  color: var(--tp-foreground);
  box-shadow:
    0 10px 24px var(--tp-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  cursor: pointer;
  transition:
    background-color 120ms ease,
    border-color 120ms ease,
    color 120ms ease;
}

.nav-icon-button svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.1;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.window-bar[data-window-shell="pet"] .nav-icon-button {
  width: 30px;
  height: 30px;
}

.nav-icon-button:hover {
  border-color: var(--tp-border-strong);
  background: rgba(232, 252, 246, 0.96);
}

.nav-icon-button--secondary:hover {
  color: #2c927f;
}

.nav-icon-button--danger:hover {
  border-color: rgba(227, 109, 93, 0.36);
  background: rgba(255, 242, 229, 0.96);
  color: #b85042;
}

.nav-icon-button:focus-visible {
  outline: 2px solid var(--tp-primary);
  outline-offset: 2px;
}

.pet-surface {
  position: relative;
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  touch-action: none;
}

.resize-handle {
  position: absolute;
  right: 8px;
  bottom: 8px;
  z-index: 10;
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.78);
  border-radius: 8px;
  background: rgba(251, 255, 253, 0.92);
  box-shadow:
    0 10px 24px var(--tp-shadow),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  color: var(--tp-foreground);
  backdrop-filter: blur(12px);
  cursor: nwse-resize;
  opacity: 0;
  pointer-events: none;
  transition:
    opacity 120ms ease,
    background-color 120ms ease,
    border-color 120ms ease;
}

.pet-frame:hover .resize-handle,
.resize-handle:focus-visible {
  opacity: 1;
  pointer-events: auto;
}

.resize-handle:hover {
  border-color: var(--tp-border-strong);
  background: rgba(232, 252, 246, 0.96);
}

.resize-handle:focus-visible {
  outline: 2px solid var(--tp-primary);
  outline-offset: 2px;
}

.resize-icon {
  width: 23px;
  height: 23px;
}

.resize-arrow {
  fill: none;
  stroke: currentColor;
  stroke-width: 3.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.pet-error {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  margin: 0;
  padding: 4px 6px;
  border-radius: 6px;
  background: rgba(255, 250, 238, 0.92);
  color: #a34e35;
  font-family: inherit;
  font-size: 11px;
  line-height: 1.3;
  overflow-wrap: anywhere;
  pointer-events: none;
}

.welcome {
  position: relative;
  box-sizing: border-box;
  display: flex;
  width: 100%;
  height: 100%;
  padding: 48px 16px 16px;
  overflow: hidden;
  color: var(--tp-foreground);
  background:
    linear-gradient(135deg, rgba(143, 216, 255, 0.22) 0%, transparent 42%),
    linear-gradient(160deg, #f4fffb 0%, #e8fbff 55%, #fff8df 100%);
}

.menu-shell {
  position: relative;
  box-sizing: border-box;
  display: grid;
  grid-template-rows: auto auto minmax(0, 1fr);
  gap: 16px;
  width: 100%;
  min-height: 0;
  padding: 18px 16px 16px;
  overflow: hidden;
  border: 1px solid var(--tp-border);
  border-radius: 8px;
  background: rgba(251, 255, 253, 0.92);
  box-shadow:
    0 20px 42px rgba(47, 100, 106, 0.14),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
}

.menu-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 86px;
  gap: 12px;
  align-items: center;
  min-width: 0;
}

.menu-copy {
  min-width: 0;
}

.menu-heading-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.menu-kicker {
  margin: 0;
  color: var(--tp-muted);
  font-size: 11px;
  font-weight: 760;
  letter-spacing: 0;
  line-height: 1.1;
  text-transform: uppercase;
}

.menu-header h1 {
  margin: 8px 0 0;
  color: var(--tp-foreground);
  font-family:
    "Avenir Next", Geist, Inter, ui-sans-serif, system-ui, sans-serif;
  font-size: 31px;
  font-weight: 840;
  letter-spacing: 0;
  line-height: 1;
}

.menu-subtitle {
  max-width: 230px;
  margin: 8px 0 0;
  color: var(--tp-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.35;
}

.menu-mascot {
  display: block;
  width: 82px;
  height: 82px;
  padding: 4px;
  border: 1px solid rgba(76, 182, 162, 0.22);
  border-radius: 8px;
  background: #ffffff;
  box-shadow:
    0 10px 20px rgba(47, 100, 106, 0.12),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  object-fit: contain;
}

.menu-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-width: 0;
}

.error-message {
  margin: 0;
  padding: 9px 10px;
  border: 1px solid rgba(227, 109, 93, 0.3);
  border-radius: 7px;
  background: rgba(255, 242, 229, 0.76);
  color: #a34e35;
  font-size: 12px;
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.import-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  min-width: 0;
  min-height: 36px;
  padding: 0 13px;
  border: 1px solid rgba(44, 146, 127, 0.32);
  border-radius: 8px;
  background: #4cb6a2;
  color: #ffffff;
  font-size: 12px;
  font-weight: 740;
  line-height: 1;
  cursor: pointer;
  box-shadow:
    0 12px 22px rgba(76, 182, 162, 0.24),
    inset 0 1px 0 rgba(255, 255, 255, 0.34);
  white-space: nowrap;
  transition:
    background-color 120ms ease,
    border-color 120ms ease;
}

.button-icon {
  flex: 0 0 auto;
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.4;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.import-button:hover {
  border-color: rgba(44, 146, 127, 0.48);
  background: #3aa890;
}

.import-button:active {
  transform: translateY(1px);
}

.import-button:focus-visible {
  outline: 2px solid var(--tp-primary);
  outline-offset: 3px;
}
</style>
