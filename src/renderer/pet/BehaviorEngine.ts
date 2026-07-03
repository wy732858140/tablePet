import type { HatchPetState, Point } from '@shared/types'

type Mode = 'idle' | 'waiting' | 'gesture' | 'dragging' | 'typing' | 'review' | 'failed'

export type BehaviorEngine = {
  currentAnimation(): HatchPetState
  click(): void
  doubleClick(): void
  wait(): void
  typingStart(): void
  typingEnd(): void
  reviewStart(): void
  reviewEnd(): void
  dragStart(point: Point): void
  dragMove(point: Point): void
  dragEnd(): void
  fail(): void
  recover(): void
  animationEnded(): void
}

export const createBehaviorEngine = (): BehaviorEngine => {
  let mode: Mode = 'idle'
  let animation: HatchPetState = 'idle'
  let lastDragPoint: Point | null = null

  const setGesture = (next: HatchPetState) => {
    if (mode === 'failed' || mode === 'dragging') return
    mode = 'gesture'
    animation = next
  }

  return {
    currentAnimation: () => animation,
    click: () => setGesture('waving'),
    doubleClick: () => setGesture('jumping'),
    wait: () => {
      if (mode !== 'idle') return
      mode = 'waiting'
      animation = 'waiting'
    },
    typingStart: () => {
      if (mode !== 'idle' && mode !== 'waiting' && mode !== 'typing') return
      mode = 'typing'
      animation = 'running'
    },
    typingEnd: () => {
      if (mode !== 'typing') return
      mode = 'idle'
      animation = 'idle'
    },
    reviewStart: () => {
      if (mode !== 'idle' && mode !== 'waiting') return
      mode = 'review'
      animation = 'review'
    },
    reviewEnd: () => {
      if (mode !== 'review') return
      mode = 'idle'
      animation = 'idle'
    },
    dragStart: (point) => {
      if (mode === 'failed') return
      mode = 'dragging'
      lastDragPoint = point
      animation = 'running-right'
    },
    dragMove: (point) => {
      if (mode !== 'dragging' || !lastDragPoint) return
      animation = point.x < lastDragPoint.x ? 'running-left' : 'running-right'
      lastDragPoint = point
    },
    dragEnd: () => {
      if (mode === 'failed') return
      mode = 'idle'
      animation = 'idle'
      lastDragPoint = null
    },
    fail: () => {
      mode = 'failed'
      animation = 'failed'
    },
    recover: () => {
      mode = 'idle'
      animation = 'idle'
      lastDragPoint = null
    },
    animationEnded: () => {
      if (mode !== 'gesture') return
      mode = 'idle'
      animation = 'idle'
    }
  }
}
