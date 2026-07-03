import type { AnimationDefinition, HatchPetState } from './types.js'

export const HATCH_PET_V1_ATLAS = {
  width: 1536,
  height: 1872,
  columns: 8,
  rows: 9
} as const

export const HATCH_PET_V1_CELL = {
  width: 192,
  height: 208
} as const

const toCalmTempoMs = (duration: number): number => Math.round((duration * 1.3) / 10) * 10
const toAmbientTempoMs = (duration: number): number => Math.round((duration * 1.5) / 10) * 10

const calmTempo = (durations: number[]): number[] => durations.map(toCalmTempoMs)
const ambientTempo = (durations: number[]): number[] => durations.map(toAmbientTempoMs)

const repeated = (duration: number, count: number, last: number): number[] => {
  return calmTempo(Array.from({ length: count }, (_, index) => (index === count - 1 ? last : duration)))
}

const ambientRepeated = (duration: number, count: number, last: number): number[] => {
  return ambientTempo(Array.from({ length: count }, (_, index) => (index === count - 1 ? last : duration)))
}

const idleLastFrameHoldMs = 220

export const HATCH_PET_V1_ANIMATIONS: Record<HatchPetState, AnimationDefinition> = {
  idle: {
    state: 'idle',
    row: 0,
    frames: [0, 1, 2, 3, 4, 5, 5, 5],
    durationsMs: [
      ...ambientTempo([280, 110, 110, 140, 140]),
      idleLastFrameHoldMs,
      idleLastFrameHoldMs,
      idleLastFrameHoldMs
    ],
    loop: true
  },
  'running-right': {
    state: 'running-right',
    row: 1,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durationsMs: repeated(120, 8, 220),
    loop: true
  },
  'running-left': {
    state: 'running-left',
    row: 2,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durationsMs: repeated(120, 8, 220),
    loop: true
  },
  waving: {
    state: 'waving',
    row: 3,
    frames: [0, 1, 2, 3],
    durationsMs: calmTempo([140, 140, 140, 280]),
    loop: false
  },
  jumping: {
    state: 'jumping',
    row: 4,
    frames: [0, 1, 2, 3, 4],
    durationsMs: calmTempo([140, 140, 140, 140, 280]),
    loop: false
  },
  failed: {
    state: 'failed',
    row: 5,
    frames: [0, 1, 2, 3, 4, 5, 6, 7],
    durationsMs: repeated(140, 8, 240),
    loop: true
  },
  waiting: {
    state: 'waiting',
    row: 6,
    frames: [0, 1, 2, 3, 4, 5],
    durationsMs: ambientRepeated(150, 6, 260),
    loop: true
  },
  running: {
    state: 'running',
    row: 7,
    frames: [0, 1, 2, 3, 4, 5],
    durationsMs: repeated(120, 6, 220),
    loop: true
  },
  review: {
    state: 'review',
    row: 8,
    frames: [0, 1, 2, 3, 4, 5],
    durationsMs: repeated(150, 6, 280),
    loop: true
  }
}
