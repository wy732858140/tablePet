import { createApp, h, nextTick } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'
import PetCanvas from '../../src/renderer/pet/PetCanvas.vue'
import type { LoadedPet } from '../../src/shared/types'

class RejectingImage {
  src = ''

  decode() {
    return Promise.reject(new Error('decode failed'))
  }
}

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('PetCanvas', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })

  it('emits load-error when spritesheet decoding fails', async () => {
    vi.stubGlobal('Image', RejectingImage)
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      setTransform: vi.fn()
    } as unknown as CanvasRenderingContext2D)

    const pet: LoadedPet = {
      id: 'broken-pet',
      displayName: 'Broken Pet',
      description: '',
      packageDir: '/pets/broken-pet',
      spritesheetPath: '/pets/broken-pet/missing.webp'
    }
    const errors: string[] = []
    const host = document.createElement('div')
    document.body.append(host)

    const app = createApp({
      render: () =>
        h(PetCanvas, {
          pet,
          state: 'idle',
          scale: 1,
          onLoadError: (message: string) => errors.push(message)
        })
    })

    app.mount(host)
    await nextTick()
    await flushPromises()

    expect(errors).toEqual(['Unable to load pet spritesheet.'])

    app.unmount()
    host.remove()
  })
})
