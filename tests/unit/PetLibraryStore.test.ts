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
