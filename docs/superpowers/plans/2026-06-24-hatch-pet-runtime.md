# Hatch Pet Runtime Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the M0/M1 independent desktop runtime that imports and runs Codex Hatch Pet v1 packages on macOS and Windows.

**Architecture:** Use Electron main/preload/renderer separation. Main owns windows, tray/menu, file import, local library, and settings; renderer owns Vue UI, Canvas 2D atlas playback, pointer hit bounds, and behavior state. Hatch Pet v1 compatibility lives in shared TypeScript modules so rendering, import validation, and tests all use the same contract.

**NodeNext import rule:** TypeScript compiled by `tsc` for Node/Electron execution must use runtime-valid module formats. Main-process `.ts` files and shared modules consumed by them use `.js` relative import specifiers. Electron preload uses CommonJS (`src/preload/desktopPetApi.cts` -> `dist/preload/desktopPetApi.cjs`) so the sandboxed preload path stays compatible with Electron.

**Tech Stack:** Electron, Vue 3, Vite, TypeScript, Canvas 2D, Vitest, electron-builder.

---

## File Structure

Create this structure:

```text
package.json
tsconfig.json
tsconfig.node.json
tsconfig.test.json
vite.config.ts
electron-builder.json
index.html
src/
  main/
    main.ts
    window/WindowController.ts
    tray/TrayController.ts
    pets/PetPackageImporter.ts
    pets/PetLibraryStore.ts
    settings/SettingsStore.ts
    ipc/IpcHandlers.ts
  preload/
    desktopPetApi.cts
  renderer/
    app/App.vue
    app/SettingsPanel.vue
    app/PetLibraryView.vue
    main.ts
    pet/AnimationCatalog.ts
    pet/BehaviorEngine.ts
    pet/PetCanvas.vue
    pet/PetViewModel.ts
    pet/PointerHitArea.ts
    styles.css
  shared/
    hatchPetV1.ts
    types.ts
tests/
  unit/
    AnimationCatalog.test.ts
    BehaviorEngine.test.ts
    PetPackageImporter.test.ts
    PetLibraryStore.test.ts
    PointerHitArea.test.ts
    SettingsStore.test.ts
```

Responsibility map:

- `src/shared/hatchPetV1.ts`: Hatch Pet v1 constants, default animation table, manifest validation helpers.
- `src/shared/types.ts`: shared manifest, library, settings, animation, geometry, IPC result types.
- `src/main/window/WindowController.ts`: transparent always-on-top pet window, click-through, position and scale.
- `src/main/pets/PetPackageImporter.ts`: folder import, manifest validation, atlas size validation, copy into app data.
- `src/main/pets/PetLibraryStore.ts`: `library.json` load/save/current pet/switch/delete.
- `src/main/settings/SettingsStore.ts`: `settings.json` defaults, load/save/corrupt backup.
- `src/main/tray/TrayController.ts`: macOS menu bar / Windows tray menu.
- `src/main/ipc/IpcHandlers.ts`: all main-side IPC handlers.
- `src/preload/desktopPetApi.cts`: minimal safe renderer API compiled to CommonJS preload.
- `src/renderer/pet/AnimationCatalog.ts`: renderer-facing animation lookup.
- `src/renderer/pet/BehaviorEngine.ts`: deterministic state transitions.
- `src/renderer/pet/PointerHitArea.ts`: per-frame alpha bounds scanner and bounds hit testing.
- `src/renderer/pet/PetCanvas.vue`: Canvas 2D playback component.
- `src/renderer/app/*.vue`: shell UI, settings, pet library.

---

### Task 1: Project Scaffold and Tooling

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tsconfig.test.json`
- Create: `vite.config.ts`
- Create: `electron-builder.json`
- Create: `index.html`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git if needed**

Run:

```bash
git rev-parse --is-inside-work-tree || git init
```

Expected: either prints `true` or initializes a new repository.

- [ ] **Step 2: Create `package.json`**

Create `package.json`:

```json
{
  "name": "table-pet",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "packageManager": "npm@11.6.1",
  "main": "dist/main/main.js",
  "scripts": {
    "dev:renderer": "vite --host 127.0.0.1",
    "dev:main": "tsc -p tsconfig.node.json --watch --preserveWatchOutput",
    "dev:electron": "concurrently -k \"npm:dev:main\" \"npm:dev:renderer\" \"wait-on dist/main/main.js dist/preload/desktopPetApi.cjs http://127.0.0.1:5173 && electron .\"",
    "build": "vue-tsc --noEmit && vite build && tsc -p tsconfig.node.json",
    "test": "vitest run --passWithNoTests",
    "typecheck:test": "tsc -p tsconfig.test.json --noEmit",
    "typecheck:node": "tsc -p tsconfig.node.json --noEmit",
    "test:watch": "vitest",
    "package": "npm run build && electron-builder --dir",
    "dist": "npm run build && electron-builder"
  },
  "engines": {
    "node": ">=20.19.0",
    "npm": ">=10.0.0"
  },
  "dependencies": {
    "electron-store": "^10.0.1",
    "image-size": "^1.1.1",
    "vue": "^3.5.13"
  },
  "devDependencies": {
    "@types/node": "^22.10.7",
    "@vitejs/plugin-vue": "^5.2.1",
    "@vue/tsconfig": "^0.7.0",
    "concurrently": "^9.1.2",
    "electron": "^34.0.0",
    "electron-builder": "^25.1.8",
    "jsdom": "^25.0.1",
    "typescript": "^5.7.3",
    "vite": "^6.0.7",
    "vitest": "^2.1.8",
    "vue-tsc": "^2.2.0",
    "wait-on": "^8.0.1"
  }
}
```

- [ ] **Step 3: Create TypeScript and Vite config files**

Create `tsconfig.json`:

```json
{
  "extends": "@vue/tsconfig/tsconfig.dom.json",
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "Bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "baseUrl": ".",
    "paths": {
      "@shared/*": ["src/shared/*"],
      "@renderer/*": ["src/renderer/*"]
    },
    "types": []
  },
  "include": ["src/renderer/**/*.ts", "src/renderer/**/*.vue", "src/shared/**/*.ts"]
}
```

Create `tsconfig.test.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "types": ["vitest/globals", "node"]
  },
  "include": ["src/**/*.ts", "src/**/*.vue", "tests/**/*.ts", "vite.config.ts"]
}
```

Create `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["node", "electron"]
  },
  "include": ["src/main/**/*.ts", "src/preload/**/*.cts", "src/shared/**/*.ts"]
}
```

Create `vite.config.ts`:

```ts
import vue from '@vitejs/plugin-vue'
import { defineConfig, type UserConfig } from 'vite'
import type { InlineConfig } from 'vitest'

type ViteConfigWithVitest = UserConfig & {
  test?: InlineConfig
}

const config = {
  plugins: [vue()],
  root: '.',
  base: './',
  build: {
    outDir: 'dist/renderer',
    emptyOutDir: true
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@shared': '/src/shared',
      '@renderer': '/src/renderer'
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['tests/**/*.test.ts']
  }
} satisfies ViteConfigWithVitest

export default defineConfig(config)
```

Create `electron-builder.json`:

```json
{
  "appId": "com.tablepet.runtime",
  "productName": "TablePet",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "mac": {
    "target": ["dmg"],
    "category": "public.app-category.utilities"
  },
  "win": {
    "target": ["nsis"]
  }
}
```

Create `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>TablePet</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/renderer/main.ts"></script>
  </body>
</html>
```

Create `.gitignore`:

```gitignore
node_modules/
dist/
release/
coverage/
.codex/
.comet/
.DS_Store
*.log
.env*
```

- [ ] **Step 4: Install dependencies**

Run:

```bash
npm install
```

Expected: dependencies install and `package-lock.json` is created.

- [ ] **Step 5: Verify tooling baseline**

Run:

```bash
npm run test
```

Expected: Vitest starts and reports no tests found or passes once tests exist.

- [ ] **Step 6: Commit scaffold**

Run:

```bash
git add package.json package-lock.json tsconfig.json tsconfig.node.json tsconfig.test.json vite.config.ts electron-builder.json index.html .gitignore
git commit -m "chore: scaffold electron vue runtime"
```

Expected: commit succeeds.

---

### Task 2: Shared Hatch Pet Contract and Animation Catalog

**Files:**
- Create: `src/shared/types.ts`
- Create: `src/shared/hatchPetV1.ts`
- Create: `src/renderer/pet/AnimationCatalog.ts`
- Create: `tests/unit/AnimationCatalog.test.ts`

- [ ] **Step 1: Write the failing animation catalog test**

Create `tests/unit/AnimationCatalog.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { HATCH_PET_V1, getAnimationDefinition } from '../../src/renderer/pet/AnimationCatalog'

describe('AnimationCatalog', () => {
  it('exposes the Hatch Pet v1 atlas geometry', () => {
    expect(HATCH_PET_V1.cell).toEqual({ width: 192, height: 208 })
    expect(HATCH_PET_V1.atlas).toEqual({ width: 1536, height: 1872, columns: 8, rows: 9 })
  })

  it('returns the default idle animation', () => {
    expect(getAnimationDefinition('idle')).toEqual({
      state: 'idle',
      row: 0,
      frames: [0, 1, 2, 3, 4, 5],
      durationsMs: [280, 110, 110, 140, 140, 320],
      loop: true
    })
  })

  it('returns failed as an 8-frame looping animation', () => {
    expect(getAnimationDefinition('failed')?.frames).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(getAnimationDefinition('failed')?.durationsMs).toEqual([140, 140, 140, 140, 140, 140, 140, 240])
  })
})
```

- [ ] **Step 2: Run the test and verify it fails**

Run:

```bash
npm run test -- tests/unit/AnimationCatalog.test.ts
```

Expected: FAIL because `AnimationCatalog` does not exist.

- [ ] **Step 3: Create shared types**

Create `src/shared/types.ts`:

```ts
export type HatchPetState =
  | 'idle'
  | 'running-right'
  | 'running-left'
  | 'waving'
  | 'jumping'
  | 'failed'
  | 'waiting'
  | 'running'
  | 'review'

export type Point = { x: number; y: number }
export type Size = { width: number; height: number }
export type Rect = Point & Size

export type HatchPetManifest = {
  id: string
  displayName?: string
  description?: string
  spritesheetPath: string
  schemaVersion?: string
  cell?: Size
  atlas?: { columns: number; rows: number }
  animations?: Record<string, unknown>
  interactions?: Record<string, unknown>
}

export type AnimationDefinition = {
  state: HatchPetState
  row: number
  frames: number[]
  durationsMs: number[]
  loop: boolean
}

export type LoadedPet = {
  id: string
  displayName: string
  description: string
  packageDir: string
  spritesheetPath: string
}

export type PetLibraryEntry = LoadedPet & {
  sourcePath: string
  importedAt: string
  status: 'ok' | 'error'
}

export type PetLibrary = {
  currentPetId: string | null
  pets: PetLibraryEntry[]
}

export type Settings = {
  petWindow: {
    position: Point | null
    scale: number
    alwaysOnTop: boolean
    visibleOnLaunch: boolean
  }
  behavior: {
    quietMode: boolean
  }
}

export type ImportResult =
  | { ok: true; pet: LoadedPet }
  | { ok: false; code: ImportErrorCode; message: string }

export type ImportErrorCode =
  | 'missing_manifest'
  | 'invalid_manifest_json'
  | 'missing_id'
  | 'missing_spritesheet_path'
  | 'missing_spritesheet'
  | 'invalid_image'
  | 'invalid_atlas_size'
  | 'copy_failed'
```

- [ ] **Step 4: Create Hatch Pet v1 constants**

Create `src/shared/hatchPetV1.ts`:

```ts
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

const repeated = (duration: number, count: number, last: number): number[] => {
  return Array.from({ length: count }, (_, index) => (index === count - 1 ? last : duration))
}

export const HATCH_PET_V1_ANIMATIONS: Record<HatchPetState, AnimationDefinition> = {
  idle: {
    state: 'idle',
    row: 0,
    frames: [0, 1, 2, 3, 4, 5],
    durationsMs: [280, 110, 110, 140, 140, 320],
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
    durationsMs: [140, 140, 140, 280],
    loop: false
  },
  jumping: {
    state: 'jumping',
    row: 4,
    frames: [0, 1, 2, 3, 4],
    durationsMs: [140, 140, 140, 140, 280],
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
    durationsMs: repeated(150, 6, 260),
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
```

- [ ] **Step 5: Create renderer animation catalog**

Create `src/renderer/pet/AnimationCatalog.ts`:

```ts
import { HATCH_PET_V1_ANIMATIONS, HATCH_PET_V1_ATLAS, HATCH_PET_V1_CELL } from '@shared/hatchPetV1'
import type { AnimationDefinition, HatchPetState } from '@shared/types'

export const HATCH_PET_V1 = {
  atlas: HATCH_PET_V1_ATLAS,
  cell: HATCH_PET_V1_CELL
} as const

export const getAnimationDefinition = (state: HatchPetState): AnimationDefinition | undefined => {
  return HATCH_PET_V1_ANIMATIONS[state]
}

export const getFrameSourceRect = (definition: AnimationDefinition, frameIndex: number) => {
  const column = definition.frames[frameIndex]
  if (column === undefined) {
    throw new RangeError(`Frame index ${frameIndex} is out of bounds for ${definition.state}`)
  }
  return {
    x: column * HATCH_PET_V1_CELL.width,
    y: definition.row * HATCH_PET_V1_CELL.height,
    width: HATCH_PET_V1_CELL.width,
    height: HATCH_PET_V1_CELL.height
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

Run:

```bash
npm run test -- tests/unit/AnimationCatalog.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit shared contract**

Run:

```bash
git add src/shared/types.ts src/shared/hatchPetV1.ts src/renderer/pet/AnimationCatalog.ts tests/unit/AnimationCatalog.test.ts
git commit -m "feat: add hatch pet animation contract"
```

Expected: commit succeeds.

---

### Task 3: Behavior Engine

**Files:**
- Create: `src/renderer/pet/BehaviorEngine.ts`
- Create: `tests/unit/BehaviorEngine.test.ts`

- [ ] **Step 1: Write failing behavior tests**

Create `tests/unit/BehaviorEngine.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { createBehaviorEngine } from '../../src/renderer/pet/BehaviorEngine'

describe('BehaviorEngine', () => {
  it('starts idle', () => {
    const engine = createBehaviorEngine()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('plays waving after click and returns to idle after animation end', () => {
    const engine = createBehaviorEngine()
    engine.click()
    expect(engine.currentAnimation()).toBe('waving')
    engine.animationEnded()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('uses directional running while dragging', () => {
    const engine = createBehaviorEngine()
    engine.dragStart({ x: 10, y: 10 })
    engine.dragMove({ x: 30, y: 10 })
    expect(engine.currentAnimation()).toBe('running-right')
    engine.dragMove({ x: 12, y: 10 })
    expect(engine.currentAnimation()).toBe('running-left')
    engine.dragEnd()
    expect(engine.currentAnimation()).toBe('idle')
  })

  it('failed state has priority until recovery', () => {
    const engine = createBehaviorEngine()
    engine.fail()
    engine.click()
    expect(engine.currentAnimation()).toBe('failed')
    engine.recover()
    expect(engine.currentAnimation()).toBe('idle')
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test -- tests/unit/BehaviorEngine.test.ts
```

Expected: FAIL because `BehaviorEngine` does not exist.

- [ ] **Step 3: Implement `BehaviorEngine`**

Create `src/renderer/pet/BehaviorEngine.ts`:

```ts
import type { HatchPetState, Point } from '@shared/types'

type Mode = 'idle' | 'gesture' | 'dragging' | 'failed'

export type BehaviorEngine = {
  currentAnimation(): HatchPetState
  click(): void
  doubleClick(): void
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
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npm run test -- tests/unit/BehaviorEngine.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit behavior engine**

Run:

```bash
git add src/renderer/pet/BehaviorEngine.ts tests/unit/BehaviorEngine.test.ts
git commit -m "feat: add pet behavior engine"
```

Expected: commit succeeds.

---

### Task 4: Settings and Library Stores

**Files:**
- Create: `src/main/settings/SettingsStore.ts`
- Create: `src/main/pets/PetLibraryStore.ts`
- Create: `tests/unit/SettingsStore.test.ts`
- Create: `tests/unit/PetLibraryStore.test.ts`

- [ ] **Step 1: Write store tests**

Create `tests/unit/SettingsStore.test.ts`:

```ts
import { mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createSettingsStore } from '../../src/main/settings/SettingsStore'

describe('SettingsStore', () => {
  it('returns defaults when no settings exist', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    const store = createSettingsStore(dir)
    await expect(store.load()).resolves.toEqual({
      petWindow: {
        position: null,
        scale: 1.5,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: { quietMode: false }
    })
  })

  it('backs up corrupt settings and returns defaults', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'settings-store-'))
    await writeFile(join(dir, 'settings.json'), '{bad json')
    const store = createSettingsStore(dir)
    const settings = await store.load()
    expect(settings.petWindow.scale).toBe(1.5)
    const files = await readFile(join(dir, 'settings.json'), 'utf8')
    expect(JSON.parse(files).petWindow.scale).toBe(1.5)
  })
})
```

Create `tests/unit/PetLibraryStore.test.ts`:

```ts
import { mkdtemp } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPetLibraryStore } from '../../src/main/pets/PetLibraryStore'

describe('PetLibraryStore', () => {
  it('starts with an empty library', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
  })

  it('upserts a pet and makes it current', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    const pet = {
      id: 'momo',
      displayName: 'Momo',
      description: 'A test pet',
      packageDir: 'pets/momo',
      spritesheetPath: 'pets/momo/spritesheet.webp',
      sourcePath: '/source/momo',
      importedAt: '2026-06-24T08:00:00.000Z',
      status: 'ok' as const
    }
    await store.upsert(pet)
    expect(await store.load()).toEqual({ currentPetId: 'momo', pets: [pet] })
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm run test -- tests/unit/SettingsStore.test.ts tests/unit/PetLibraryStore.test.ts
```

Expected: FAIL because stores do not exist.

- [ ] **Step 3: Implement `SettingsStore`**

Create `src/main/settings/SettingsStore.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Settings } from '../../shared/types.js'

const defaultSettings = (): Settings => ({
  petWindow: {
    position: null,
    scale: 1.5,
    alwaysOnTop: true,
    visibleOnLaunch: true
  },
  behavior: {
    quietMode: false
  }
})

export const createSettingsStore = (appDataDir: string) => {
  const settingsPath = join(appDataDir, 'settings.json')

  const save = async (settings: Settings): Promise<Settings> => {
    await mkdir(appDataDir, { recursive: true })
    await writeFile(settingsPath, JSON.stringify(settings, null, 2))
    return settings
  }

  const load = async (): Promise<Settings> => {
    try {
      const raw = await readFile(settingsPath, 'utf8')
      return { ...defaultSettings(), ...JSON.parse(raw) }
    } catch (error) {
      const settings = defaultSettings()
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        await mkdir(appDataDir, { recursive: true })
        await rename(settingsPath, join(appDataDir, `settings.corrupt.${Date.now()}.json`)).catch(() => undefined)
      }
      return save(settings)
    }
  }

  return { load, save }
}
```

- [ ] **Step 4: Implement `PetLibraryStore`**

Create `src/main/pets/PetLibraryStore.ts`:

```ts
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { PetLibrary, PetLibraryEntry } from '../../shared/types.js'

const emptyLibrary = (): PetLibrary => ({ currentPetId: null, pets: [] })

export const createPetLibraryStore = (appDataDir: string) => {
  const libraryPath = join(appDataDir, 'library.json')

  const save = async (library: PetLibrary): Promise<PetLibrary> => {
    await mkdir(appDataDir, { recursive: true })
    await writeFile(libraryPath, JSON.stringify(library, null, 2))
    return library
  }

  const load = async (): Promise<PetLibrary> => {
    try {
      return JSON.parse(await readFile(libraryPath, 'utf8')) as PetLibrary
    } catch (error) {
      const library = emptyLibrary()
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        await mkdir(appDataDir, { recursive: true })
        await rename(libraryPath, join(appDataDir, `library.corrupt.${Date.now()}.json`)).catch(() => undefined)
      }
      return save(library)
    }
  }

  const upsert = async (entry: PetLibraryEntry): Promise<PetLibrary> => {
    const library = await load()
    const pets = library.pets.filter((pet) => pet.id !== entry.id)
    const next = { currentPetId: entry.id, pets: [...pets, entry] }
    return save(next)
  }

  const setCurrentPet = async (id: string): Promise<PetLibrary> => {
    const library = await load()
    if (!library.pets.some((pet) => pet.id === id)) {
      throw new Error(`Pet not found: ${id}`)
    }
    return save({ ...library, currentPetId: id })
  }

  return { load, save, upsert, setCurrentPet }
}
```

- [ ] **Step 5: Run tests and verify they pass**

Run:

```bash
npm run test -- tests/unit/SettingsStore.test.ts tests/unit/PetLibraryStore.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit stores**

Run:

```bash
git add src/main/settings/SettingsStore.ts src/main/pets/PetLibraryStore.ts tests/unit/SettingsStore.test.ts tests/unit/PetLibraryStore.test.ts
git commit -m "feat: add settings and pet library stores"
```

Expected: commit succeeds.

---

### Task 5: Pet Package Importer

**Files:**
- Create: `src/main/pets/PetPackageImporter.ts`
- Create: `tests/unit/PetPackageImporter.test.ts`

- [ ] **Step 1: Write importer tests**

Create `tests/unit/PetPackageImporter.test.ts`:

```ts
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPetPackageImporter } from '../../src/main/pets/PetPackageImporter'

const makeDirs = async () => {
  const source = await mkdtemp(join(tmpdir(), 'pet-source-'))
  const appData = await mkdtemp(join(tmpdir(), 'pet-appdata-'))
  return { source, appData }
}

describe('PetPackageImporter', () => {
  it('imports a valid Hatch Pet package', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify({
      id: 'momo',
      displayName: 'Momo',
      description: 'A test pet',
      spritesheetPath: 'spritesheet.webp'
    }))
    await writeFile(join(source, 'spritesheet.webp'), 'fake-image')
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))

    const result = await importer.importFolder(source)

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.pet.id).toBe('momo')
      expect(await readFile(join(appData, 'pets/momo/pet.json'), 'utf8')).toContain('"id"')
    }
  })

  it('rejects invalid atlas dimensions', async () => {
    const { source, appData } = await makeDirs()
    await writeFile(join(source, 'pet.json'), JSON.stringify({
      id: 'momo',
      spritesheetPath: 'spritesheet.webp'
    }))
    await writeFile(join(source, 'spritesheet.webp'), 'fake-image')
    const importer = createPetPackageImporter(appData, async () => ({ width: 100, height: 100 }))

    const result = await importer.importFolder(source)

    expect(result).toEqual({
      ok: false,
      code: 'invalid_atlas_size',
      message: 'Expected atlas size 1536x1872, received 100x100.'
    })
  })

  it('rejects a missing manifest', async () => {
    const { source, appData } = await makeDirs()
    await mkdir(source, { recursive: true })
    const importer = createPetPackageImporter(appData, async () => ({ width: 1536, height: 1872 }))
    expect(await importer.importFolder(source)).toEqual({
      ok: false,
      code: 'missing_manifest',
      message: 'pet.json was not found in the selected folder.'
    })
  })
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm run test -- tests/unit/PetPackageImporter.test.ts
```

Expected: FAIL because importer does not exist.

- [ ] **Step 3: Implement importer**

Create `src/main/pets/PetPackageImporter.ts`:

```ts
import { copyFile, mkdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { imageSize } from 'image-size'
import { HATCH_PET_V1_ATLAS } from '../../shared/hatchPetV1.js'
import type { HatchPetManifest, ImportResult, Size } from '../../shared/types.js'

type ImageInspector = (path: string) => Promise<Size>

const defaultImageInspector: ImageInspector = async (path) => {
  const size = imageSize(path)
  if (!size.width || !size.height) {
    throw new Error('Image dimensions could not be read.')
  }
  return { width: size.width, height: size.height }
}

export const createPetPackageImporter = (appDataDir: string, inspectImage: ImageInspector = defaultImageInspector) => {
  const importFolder = async (sourceDir: string): Promise<ImportResult> => {
    const manifestPath = join(sourceDir, 'pet.json')
    let manifest: HatchPetManifest

    try {
      manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as HatchPetManifest
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return { ok: false, code: 'missing_manifest', message: 'pet.json was not found in the selected folder.' }
      }
      return { ok: false, code: 'invalid_manifest_json', message: 'pet.json is not valid JSON.' }
    }

    if (!manifest.id) {
      return { ok: false, code: 'missing_id', message: 'pet.json must include an id.' }
    }
    if (!manifest.spritesheetPath) {
      return { ok: false, code: 'missing_spritesheet_path', message: 'pet.json must include spritesheetPath.' }
    }

    const sourceSpritesheet = join(sourceDir, manifest.spritesheetPath)
    let size: Size
    try {
      size = await inspectImage(sourceSpritesheet)
    } catch {
      return { ok: false, code: 'invalid_image', message: 'spritesheet could not be read as an image.' }
    }

    if (size.width !== HATCH_PET_V1_ATLAS.width || size.height !== HATCH_PET_V1_ATLAS.height) {
      return {
        ok: false,
        code: 'invalid_atlas_size',
        message: `Expected atlas size 1536x1872, received ${size.width}x${size.height}.`
      }
    }

    try {
      const targetDir = join(appDataDir, 'pets', manifest.id)
      await mkdir(targetDir, { recursive: true })
      await copyFile(manifestPath, join(targetDir, 'pet.json'))
      await copyFile(sourceSpritesheet, join(targetDir, 'spritesheet.webp'))
      return {
        ok: true,
        pet: {
          id: manifest.id,
          displayName: manifest.displayName ?? manifest.id,
          description: manifest.description ?? 'A Hatch Pet desktop pet.',
          packageDir: targetDir,
          spritesheetPath: join(targetDir, 'spritesheet.webp')
        }
      }
    } catch {
      return { ok: false, code: 'copy_failed', message: 'Pet package could not be copied into the local library.' }
    }
  }

  return { importFolder }
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
npm run test -- tests/unit/PetPackageImporter.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit importer**

Run:

```bash
git add src/main/pets/PetPackageImporter.ts tests/unit/PetPackageImporter.test.ts
git commit -m "feat: import hatch pet packages"
```

Expected: commit succeeds.

---

### Task 6: Pointer Hit Bounds

**Files:**
- Create: `src/renderer/pet/PointerHitArea.ts`
- Create: `tests/unit/PointerHitArea.test.ts`

- [ ] **Step 1: Write hit area tests**

Create `tests/unit/PointerHitArea.test.ts`:

```ts
import { describe, expect, it } from 'vitest'
import { containsPoint, scaleRect } from '../../src/renderer/pet/PointerHitArea'

describe('PointerHitArea', () => {
  it('scales frame bounds', () => {
    expect(scaleRect({ x: 10, y: 20, width: 30, height: 40 }, 2)).toEqual({
      x: 20,
      y: 40,
      width: 60,
      height: 80
    })
  })

  it('detects points inside and outside a rect', () => {
    const rect = { x: 20, y: 40, width: 60, height: 80 }
    expect(containsPoint(rect, { x: 21, y: 41 })).toBe(true)
    expect(containsPoint(rect, { x: 100, y: 41 })).toBe(false)
  })
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm run test -- tests/unit/PointerHitArea.test.ts
```

Expected: FAIL because `PointerHitArea` does not exist.

- [ ] **Step 3: Implement basic bounds helpers**

Create `src/renderer/pet/PointerHitArea.ts`:

```ts
import type { Point, Rect } from '@shared/types'

export const scaleRect = (rect: Rect, scale: number): Rect => ({
  x: rect.x * scale,
  y: rect.y * scale,
  width: rect.width * scale,
  height: rect.height * scale
})

export const containsPoint = (rect: Rect, point: Point): boolean => {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  )
}

export const fallbackFrameBounds = (): Rect => ({
  x: 0,
  y: 0,
  width: 192,
  height: 208
})
```

- [ ] **Step 4: Run test and verify it passes**

Run:

```bash
npm run test -- tests/unit/PointerHitArea.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit hit area helpers**

Run:

```bash
git add src/renderer/pet/PointerHitArea.ts tests/unit/PointerHitArea.test.ts
git commit -m "feat: add pet pointer hit bounds"
```

Expected: commit succeeds.

---

### Task 7: Electron Main, Preload, and IPC Skeleton

**Files:**
- Create: `src/main/main.ts`
- Create: `src/main/window/WindowController.ts`
- Create: `src/main/tray/TrayController.ts`
- Create: `src/main/ipc/IpcHandlers.ts`
- Create: `src/preload/desktopPetApi.cts`

- [ ] **Step 1: Create `WindowController`**

Create `src/main/window/WindowController.ts`:

```ts
import { BrowserWindow, screen } from 'electron'
import type { Point } from '../../shared/types.js'

export type WindowController = ReturnType<typeof createWindowController>

export const createWindowController = (preloadPath: string, rendererUrl: string) => {
  let petWindow: BrowserWindow | null = null

  const createPetWindow = () => {
    petWindow = new BrowserWindow({
      width: 288,
      height: 312,
      frame: false,
      transparent: true,
      resizable: false,
      hasShadow: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      webPreferences: {
        preload: preloadPath,
        contextIsolation: true,
        nodeIntegration: false
      }
    })
    petWindow.setAlwaysOnTop(true, 'floating')
    void petWindow.loadURL(rendererUrl)
    return petWindow
  }

  const setClickThrough = (enabled: boolean, forward = true) => {
    petWindow?.setIgnoreMouseEvents(enabled, { forward })
  }

  const setPosition = (point: Point) => {
    petWindow?.setPosition(Math.round(point.x), Math.round(point.y))
  }

  const ensureVisible = () => {
    if (!petWindow) return
    const bounds = petWindow.getBounds()
    const display = screen.getDisplayMatching(bounds)
    const area = display.workArea
    const x = Math.min(Math.max(bounds.x, area.x), area.x + area.width - bounds.width)
    const y = Math.min(Math.max(bounds.y, area.y), area.y + area.height - bounds.height)
    petWindow.setPosition(x, y)
  }

  return {
    createPetWindow,
    getPetWindow: () => petWindow,
    show: () => petWindow?.show(),
    hide: () => petWindow?.hide(),
    setPosition,
    setClickThrough,
    ensureVisible
  }
}
```

- [ ] **Step 2: Create IPC handlers**

Create `src/main/ipc/IpcHandlers.ts`:

```ts
import { dialog, ipcMain } from 'electron'
import type { WindowController } from '../window/WindowController.js'
import type { createPetPackageImporter } from '../pets/PetPackageImporter.js'
import type { createPetLibraryStore } from '../pets/PetLibraryStore.js'
import type { createSettingsStore } from '../settings/SettingsStore.js'

export const registerIpcHandlers = (
  windowController: WindowController,
  importer: ReturnType<typeof createPetPackageImporter>,
  libraryStore: ReturnType<typeof createPetLibraryStore>,
  settingsStore: ReturnType<typeof createSettingsStore>
) => {
  ipcMain.handle('pet:list', () => libraryStore.load())
  ipcMain.handle('settings:get', () => settingsStore.load())
  ipcMain.handle('window:set-click-through', (_event, enabled: boolean, forward?: boolean) => {
    windowController.setClickThrough(enabled, forward)
  })
  ipcMain.handle('window:set-position', (_event, point) => {
    windowController.setPosition(point)
  })
  ipcMain.handle('pet:import-folder', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (result.canceled || !result.filePaths[0]) {
      return { ok: false, code: 'copy_failed', message: 'No folder was selected.' }
    }
    const imported = await importer.importFolder(result.filePaths[0])
    if (imported.ok) {
      const libraryEntry = {
        ...imported.pet,
        sourcePath: result.filePaths[0],
        importedAt: new Date().toISOString(),
        status: 'ok' as const
      }
      await libraryStore.upsert(libraryEntry)
    }
    return imported
  })
}
```

- [ ] **Step 3: Create preload API**

Create `src/preload/desktopPetApi.cts`:

```ts
import { contextBridge, ipcRenderer } from 'electron'
import type { ImportResult, PetLibrary, Point, Settings } from '../shared/types.js'

const api = {
  listPets: (): Promise<PetLibrary> => ipcRenderer.invoke('pet:list'),
  importPetPackage: (): Promise<ImportResult> => ipcRenderer.invoke('pet:import-folder'),
  getSettings: (): Promise<Settings> => ipcRenderer.invoke('settings:get'),
  setClickThrough: (enabled: boolean, forward = true): Promise<void> =>
    ipcRenderer.invoke('window:set-click-through', enabled, forward),
  setPetPosition: (point: Point): Promise<void> => ipcRenderer.invoke('window:set-position', point),
  onImportPetRequested: (callback: () => void): (() => void) => {
    const listener = () => callback()
    ipcRenderer.on('ui:import-pet', listener)
    return () => ipcRenderer.off('ui:import-pet', listener)
  }
}

contextBridge.exposeInMainWorld('desktopPet', api)

export type DesktopPetApi = typeof api
```

- [ ] **Step 4: Create tray controller**

Create `src/main/tray/TrayController.ts`:

```ts
import { Menu, Tray, nativeImage } from 'electron'

export const createTrayController = (actions: {
  importPet: () => void
  showPet: () => void
  hidePet: () => void
  quit: () => void
}) => {
  const tray = new Tray(nativeImage.createEmpty())
  const menu = Menu.buildFromTemplate([
    { label: 'Show Pet', click: actions.showPet },
    { label: 'Hide Pet', click: actions.hidePet },
    { type: 'separator' },
    { label: 'Import Pet Package', click: actions.importPet },
    { type: 'separator' },
    { label: 'Quit', click: actions.quit }
  ])
  tray.setToolTip('TablePet')
  tray.setContextMenu(menu)
  return tray
}
```

- [ ] **Step 5: Create main entry**

Create `src/main/main.ts`:

```ts
import { app } from 'electron'
import { join } from 'node:path'
import { createPetPackageImporter } from './pets/PetPackageImporter.js'
import { createPetLibraryStore } from './pets/PetLibraryStore.js'
import { createSettingsStore } from './settings/SettingsStore.js'
import { registerIpcHandlers } from './ipc/IpcHandlers.js'
import { createTrayController } from './tray/TrayController.js'
import { createWindowController } from './window/WindowController.js'

const isDev = !app.isPackaged

void app.whenReady().then(() => {
  const appDataDir = join(app.getPath('userData'), 'runtime')
  const preloadPath = join(app.getAppPath(), 'dist/preload/desktopPetApi.cjs')
  const rendererUrl = isDev ? 'http://127.0.0.1:5173' : `file://${join(app.getAppPath(), 'dist/renderer/index.html')}`

  const windowController = createWindowController(preloadPath, rendererUrl)
  const importer = createPetPackageImporter(appDataDir)
  const libraryStore = createPetLibraryStore(appDataDir)
  const settingsStore = createSettingsStore(appDataDir)

  windowController.createPetWindow()
  registerIpcHandlers(windowController, importer, libraryStore, settingsStore)
  createTrayController({
    importPet: () => windowController.getPetWindow()?.webContents.send('ui:import-pet'),
    showPet: () => windowController.show(),
    hidePet: () => windowController.hide(),
    quit: () => app.quit()
  })
})

app.on('window-all-closed', (event) => {
  event.preventDefault()
})
```

- [ ] **Step 6: Run Node typecheck**

Run:

```bash
npm run typecheck:node
```

Expected: main, preload, and shared TypeScript checks pass. Full renderer/Vite build is deferred until Task 8 creates the renderer entry point.

- [ ] **Step 7: Commit Electron skeleton**

Run:

```bash
git add src/main src/preload
git commit -m "feat: add electron runtime skeleton"
```

Expected: commit succeeds.

---

### Task 8: Vue Renderer and Canvas Playback

**Files:**
- Create: `src/renderer/main.ts`
- Create: `src/renderer/styles.css`
- Create: `src/renderer/app/App.vue`
- Create: `src/renderer/app/SettingsPanel.vue`
- Create: `src/renderer/app/PetLibraryView.vue`
- Create: `src/renderer/pet/PetCanvas.vue`
- Create: `src/renderer/pet/PetViewModel.ts`

- [ ] **Step 1: Create renderer bootstrap**

Create `src/renderer/main.ts`:

```ts
import { createApp } from 'vue'
import App from './app/App.vue'
import './styles.css'

createApp(App).mount('#app')
```

Create `src/renderer/styles.css`:

```css
html,
body,
#app {
  width: 100%;
  height: 100%;
  margin: 0;
  overflow: hidden;
  background: transparent;
}

body {
  user-select: none;
}

button {
  font: inherit;
}
```

- [ ] **Step 2: Create pet view model**

Create `src/renderer/pet/PetViewModel.ts`:

```ts
import type { LoadedPet } from '@shared/types'

export type PetViewState =
  | { kind: 'empty' }
  | { kind: 'loaded'; pet: LoadedPet }
  | { kind: 'error'; message: string }

export const emptyPetView = (): PetViewState => ({ kind: 'empty' })
```

- [ ] **Step 3: Create Canvas component**

Create `src/renderer/pet/PetCanvas.vue`:

```vue
<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import type { HatchPetState, LoadedPet } from '@shared/types'
import { getAnimationDefinition, getFrameSourceRect, HATCH_PET_V1 } from './AnimationCatalog'

const props = defineProps<{
  pet: LoadedPet
  state: HatchPetState
  scale: number
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
let image: HTMLImageElement | null = null
let raf = 0
let frameIndex = 0
let elapsedInFrame = 0
let lastTime = 0

const draw = (time: number) => {
  const element = canvas.value
  const context = element?.getContext('2d')
  const definition = getAnimationDefinition(props.state)
  if (!element || !context || !image || !definition) {
    raf = requestAnimationFrame(draw)
    return
  }

  const delta = lastTime === 0 ? 0 : time - lastTime
  lastTime = time
  elapsedInFrame += delta
  const duration = definition.durationsMs[frameIndex] ?? 120
  if (elapsedInFrame >= duration) {
    elapsedInFrame = 0
    frameIndex += 1
    if (frameIndex >= definition.frames.length) {
      frameIndex = definition.loop ? 0 : definition.frames.length - 1
      if (!definition.loop) {
        window.dispatchEvent(new CustomEvent('pet-animation-ended'))
      }
    }
  }

  const source = getFrameSourceRect(definition, frameIndex)
  const targetWidth = HATCH_PET_V1.cell.width * props.scale
  const targetHeight = HATCH_PET_V1.cell.height * props.scale
  element.width = targetWidth * window.devicePixelRatio
  element.height = targetHeight * window.devicePixelRatio
  element.style.width = `${targetWidth}px`
  element.style.height = `${targetHeight}px`
  context.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0)
  context.clearRect(0, 0, targetWidth, targetHeight)
  context.drawImage(image, source.x, source.y, source.width, source.height, 0, 0, targetWidth, targetHeight)
  raf = requestAnimationFrame(draw)
}

const loadImage = async () => {
  image = new Image()
  image.src = `file://${props.pet.spritesheetPath}`
  await image.decode()
}

watch(() => props.state, () => {
  frameIndex = 0
  elapsedInFrame = 0
})

onMounted(async () => {
  await loadImage()
  raf = requestAnimationFrame(draw)
})

onUnmounted(() => cancelAnimationFrame(raf))
</script>

<template>
  <canvas ref="canvas" />
</template>
```

- [ ] **Step 4: Create minimal shell components**

Create `src/renderer/app/SettingsPanel.vue`:

```vue
<template>
  <section class="panel">
    <h1>TablePet</h1>
    <p>Import a Hatch Pet package to start.</p>
  </section>
</template>
```

Create `src/renderer/app/PetLibraryView.vue`:

```vue
<script setup lang="ts">
import type { PetLibraryEntry } from '@shared/types'

defineProps<{ pets: PetLibraryEntry[] }>()
</script>

<template>
  <section class="panel">
    <h2>Pets</h2>
    <p v-if="pets.length === 0">No pets imported yet.</p>
    <ul v-else>
      <li v-for="pet in pets" :key="pet.id">{{ pet.displayName }}</li>
    </ul>
  </section>
</template>
```

Create `src/renderer/app/App.vue`:

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import type { HatchPetState, LoadedPet, PetLibraryEntry } from '@shared/types'
import { createBehaviorEngine } from '../pet/BehaviorEngine'
import PetCanvas from '../pet/PetCanvas.vue'
import PetLibraryView from './PetLibraryView.vue'
import SettingsPanel from './SettingsPanel.vue'

declare global {
  interface Window {
    desktopPet: {
      listPets(): Promise<{ currentPetId: string | null; pets: PetLibraryEntry[] }>
      importPetPackage(): Promise<{ ok: boolean; pet?: LoadedPet; message?: string }>
      setClickThrough(enabled: boolean, forward?: boolean): Promise<void>
      setPetPosition(point: { x: number; y: number }): Promise<void>
      onImportPetRequested(callback: () => void): () => void
    }
  }
}

const pets = ref<PetLibraryEntry[]>([])
const currentPet = ref<LoadedPet | null>(null)
const animation = ref<HatchPetState>('idle')
const scale = ref(1.5)
const engine = createBehaviorEngine()
let dragging = false

const hasPet = computed(() => currentPet.value !== null)

const refreshLibrary = async () => {
  const library = await window.desktopPet.listPets()
  pets.value = library.pets
  currentPet.value = library.pets.find((pet) => pet.id === library.currentPetId) ?? null
}

const importPet = async () => {
  const result = await window.desktopPet.importPetPackage()
  if (result.ok) await refreshLibrary()
  else engine.fail()
  animation.value = engine.currentAnimation()
}

const onPointerDown = (event: PointerEvent) => {
  dragging = true
  engine.dragStart({ x: event.screenX, y: event.screenY })
  animation.value = engine.currentAnimation()
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging) return
  engine.dragMove({ x: event.screenX, y: event.screenY })
  animation.value = engine.currentAnimation()
  void window.desktopPet.setPetPosition({ x: event.screenX - 144, y: event.screenY - 156 })
}

const onPointerUp = () => {
  dragging = false
  engine.dragEnd()
  animation.value = engine.currentAnimation()
}

const onClick = () => {
  if (dragging) return
  engine.click()
  animation.value = engine.currentAnimation()
}

onMounted(async () => {
  await refreshLibrary()
  const unsubscribe = window.desktopPet.onImportPetRequested(() => {
    void importPet()
  })
  window.addEventListener('pet-animation-ended', () => {
    engine.animationEnded()
    animation.value = engine.currentAnimation()
  })
  window.addEventListener('beforeunload', unsubscribe)
})
</script>

<template>
  <main class="app">
    <div
      v-if="hasPet && currentPet"
      class="pet-surface"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @click="onClick"
    >
      <PetCanvas :pet="currentPet" :state="animation" :scale="scale" />
    </div>
    <section v-else class="welcome">
      <SettingsPanel />
      <button type="button" @click="importPet">Import Pet Package</button>
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

.welcome {
  width: 280px;
  padding: 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.92);
  color: #1c1c1c;
  font-family: system-ui, sans-serif;
}

.panel {
  margin-bottom: 12px;
}
</style>
```

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: build passes.

- [ ] **Step 6: Commit renderer**

Run:

```bash
git add src/renderer index.html
git commit -m "feat: add vue pet renderer"
```

Expected: commit succeeds.

---

### Task 9: M0/M1 Runtime Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Create run instructions**

Create `README.md`:

```md
# TablePet

Independent desktop runtime for Codex Hatch Pet v1 packages.

## Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev:electron
```

Run tests:

```bash
npm run test
```

Build:

```bash
npm run build
```

Package:

```bash
npm run package
```

## Supported Pet Package

The MVP imports a folder with:

```text
pet.json
spritesheet.webp
```

The atlas must be `1536x1872`, using 8 columns x 9 rows of `192x208` cells.
```

- [ ] **Step 2: Run all unit tests**

Run:

```bash
npm run test
```

Expected: all unit tests PASS.

- [ ] **Step 3: Run production build**

Run:

```bash
npm run build
```

Expected: TypeScript, Vite, and main process builds PASS.

- [ ] **Step 4: Run desktop dev smoke test**

Run:

```bash
npm run dev:electron
```

Expected:

- Electron app starts.
- Transparent pet window appears.
- If no pet is imported, welcome panel appears.
- Importing a valid Hatch Pet v1 folder shows the pet.
- Clicking the pet triggers `waving`.
- Dragging left/right switches between `running-left` and `running-right`.
- Tray/menu can hide, show, and quit.

- [ ] **Step 5: Package app**

Run:

```bash
npm run package
```

Expected: unpacked app output appears under `release/`.

- [ ] **Step 6: Commit verification docs**

Run:

```bash
git add README.md
git commit -m "docs: add runtime development guide"
```

Expected: commit succeeds.

---

## Self-Review Checklist

- Spec coverage:
  - Electron runtime scaffold: Tasks 1 and 7.
  - Hatch Pet v1 atlas contract: Task 2.
  - Behavior state machine: Task 3.
  - Local library and settings: Task 4.
  - Folder import and validation: Task 5.
  - Basic click-through hit bounds: Task 6.
  - Vue renderer and Canvas playback: Task 8.
  - M0/M1 verification: Task 9.
- Placeholder scan: no placeholder tokens or unspecified "add tests" steps.
- Type consistency: shared `types.ts` is introduced before modules consume it; animation state names match Hatch Pet v1.
- Scope check: plan covers only M0/M1. Zip import, pixel-level alpha mask, generation service, multi-pet runtime, and window-edge behaviors remain out of scope.
