<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { HatchPetState, LoadedPet } from '@shared/types'
import { getAnimationDefinition, getFrameSourceRect, HATCH_PET_V1 } from './AnimationCatalog'
import { toFileUrl } from './fileUrl'

const props = defineProps<{
  pet: LoadedPet
  state: HatchPetState
  scale: number
}>()

const emit = defineEmits<{
  'load-error': [message: string]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const loadError = ref<string | null>(null)

let image: HTMLImageElement | null = null
let raf = 0
let frameIndex = 0
let elapsedInFrame = 0
let lastTime = 0
let loadToken = 0
let animationEndedDispatched = false

const resetAnimation = () => {
  frameIndex = 0
  elapsedInFrame = 0
  lastTime = 0
  animationEndedDispatched = false
}

const cancelDraw = () => {
  if (raf !== 0) {
    cancelAnimationFrame(raf)
    raf = 0
  }
}

const resizeCanvas = () => {
  const element = canvas.value
  if (!element) return null

  const ratio = window.devicePixelRatio || 1
  const targetWidth = HATCH_PET_V1.cell.width * props.scale
  const targetHeight = HATCH_PET_V1.cell.height * props.scale
  const backingWidth = Math.round(targetWidth * ratio)
  const backingHeight = Math.round(targetHeight * ratio)

  if (element.width !== backingWidth) {
    element.width = backingWidth
  }
  if (element.height !== backingHeight) {
    element.height = backingHeight
  }
  element.style.width = `${targetWidth}px`
  element.style.height = `${targetHeight}px`

  return { ratio, targetWidth, targetHeight }
}

const dispatchAnimationEnded = () => {
  if (animationEndedDispatched) return
  animationEndedDispatched = true
  window.dispatchEvent(new CustomEvent('pet-animation-ended'))
}

const advanceFrame = (delta: number) => {
  const definition = getAnimationDefinition(props.state)
  if (!definition || definition.frames.length === 0) return null

  frameIndex = Math.min(frameIndex, definition.frames.length - 1)
  elapsedInFrame += delta

  let duration = definition.durationsMs[frameIndex] ?? 120
  while (elapsedInFrame >= duration) {
    elapsedInFrame -= duration

    if (frameIndex + 1 >= definition.frames.length) {
      if (!definition.loop) {
        frameIndex = definition.frames.length - 1
        elapsedInFrame = 0
        dispatchAnimationEnded()
        break
      }
      frameIndex = 0
    } else {
      frameIndex += 1
    }

    duration = definition.durationsMs[frameIndex] ?? 120
  }

  return definition
}

const draw = (time: number) => {
  const element = canvas.value
  const context = element?.getContext('2d')
  const size = resizeCanvas()

  if (!element || !context || !size || !image || loadError.value) {
    return
  }

  const delta = lastTime === 0 ? 0 : time - lastTime
  lastTime = time

  const definition = advanceFrame(delta)
  if (!definition) return

  const source = getFrameSourceRect(definition, frameIndex)
  context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0)
  context.clearRect(0, 0, size.targetWidth, size.targetHeight)
  context.drawImage(
    image,
    source.x,
    source.y,
    source.width,
    source.height,
    0,
    0,
    size.targetWidth,
    size.targetHeight
  )

  raf = requestAnimationFrame(draw)
}

const startDraw = () => {
  cancelDraw()
  raf = requestAnimationFrame(draw)
}

const clearCanvas = () => {
  const element = canvas.value
  const context = element?.getContext('2d')
  const size = resizeCanvas()
  if (!context || !size) return
  context.setTransform(size.ratio, 0, 0, size.ratio, 0, 0)
  context.clearRect(0, 0, size.targetWidth, size.targetHeight)
}

const loadImage = async () => {
  const token = ++loadToken
  cancelDraw()
  resetAnimation()
  image = null
  loadError.value = null
  clearCanvas()

  const nextImage = new Image()
  nextImage.src = toFileUrl(props.pet.spritesheetPath)

  try {
    await nextImage.decode()
  } catch {
    if (token !== loadToken) return
    const message = 'Unable to load pet spritesheet.'
    loadError.value = message
    emit('load-error', message)
    clearCanvas()
    return
  }

  if (token !== loadToken) return
  image = nextImage
  startDraw()
}

watch(
  () => props.state,
  () => {
    resetAnimation()
  }
)

watch(
  () => [props.pet.id, props.pet.spritesheetPath],
  () => {
    void loadImage()
  }
)

watch(
  () => props.scale,
  () => {
    clearCanvas()
  }
)

onMounted(() => {
  void loadImage()
})

onUnmounted(() => {
  loadToken += 1
  cancelDraw()
})
</script>

<template>
  <canvas ref="canvas" aria-hidden="true" />
</template>

<style scoped>
canvas {
  display: block;
}
</style>
