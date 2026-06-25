import { createApp } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from '../../src/renderer/app/App.vue'
import type { PetLibraryEntry, Settings } from '../../src/shared/types'

class RejectingImage {
  src = ''

  decode() {
    return Promise.reject(new Error('decode failed'))
  }
}

const settle = async () => {
  for (let index = 0; index < 4; index += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0))
  }
}

describe('App', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    document.body.replaceChildren()
  })

  it('keeps the pet canvas mounted when a loaded pet reports a load error', async () => {
    vi.stubGlobal('Image', RejectingImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      setTransform: vi.fn()
    } as unknown as CanvasRenderingContext2D)

    const pet: PetLibraryEntry = {
      id: 'loaded-pet',
      displayName: 'Loaded Pet',
      description: '',
      packageDir: '/pets/loaded-pet',
      spritesheetPath: '/pets/loaded-pet/missing.webp',
      sourcePath: '/source/loaded-pet',
      importedAt: '2026-06-25T00:00:00.000Z',
      status: 'ok'
    }
    const settings: Settings = {
      petWindow: {
        position: null,
        scale: 1,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: {
        quietMode: false
      }
    }

    window.desktopPet = {
      listPets: vi.fn().mockResolvedValue({ currentPetId: pet.id, pets: [pet] }),
      importPetPackage: vi.fn(),
      getSettings: vi.fn().mockResolvedValue(settings),
      setClickThrough: vi.fn(),
      setPetPosition: vi.fn(),
      closeWindow: vi.fn(),
      onImportPetRequested: vi.fn(() => vi.fn())
    }

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(App)

    app.mount(host)
    await settle()

    expect(host.querySelector('canvas')).not.toBeNull()
    expect(host.textContent).toContain('Unable to load pet spritesheet.')
    expect(host.textContent).not.toContain('Import Pet Package')

    app.unmount()
  })

  it('calls the desktop API when the close button is clicked', async () => {
    const settings: Settings = {
      petWindow: {
        position: null,
        scale: 1,
        alwaysOnTop: true,
        visibleOnLaunch: true
      },
      behavior: {
        quietMode: false
      }
    }
    window.desktopPet = {
      listPets: vi.fn().mockResolvedValue({ currentPetId: null, pets: [] }),
      importPetPackage: vi.fn(),
      getSettings: vi.fn().mockResolvedValue(settings),
      setClickThrough: vi.fn(),
      setPetPosition: vi.fn(),
      closeWindow: vi.fn(),
      onImportPetRequested: vi.fn(() => vi.fn())
    }

    const host = document.createElement('div')
    document.body.append(host)
    const app = createApp(App)

    app.mount(host)
    await settle()
    host.querySelector<HTMLButtonElement>('[aria-label="Close window"]')?.click()

    expect(window.desktopPet.closeWindow).toHaveBeenCalled()

    app.unmount()
  })
})
