import { mkdtemp, readdir, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createPetLibraryStore } from '../../src/main/pets/PetLibraryStore'
import type { PetLibraryEntry } from '../../src/shared/types'

const createPet = (id: string, overrides: Partial<PetLibraryEntry> = {}): PetLibraryEntry => ({
  id,
  displayName: id,
  description: 'A test pet',
  packageDir: `pets/${id}`,
  spritesheetPath: `pets/${id}/spritesheet.webp`,
  sourcePath: `/source/${id}`,
  importedAt: '2026-06-24T08:00:00.000Z',
  status: 'ok',
  ...overrides
})

describe('PetLibraryStore', () => {
  it('starts with an empty library', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
  })

  it('upserts a pet and makes it current', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    const pet = createPet('momo', { displayName: 'Momo' })
    await store.upsert(pet)
    expect(await store.load()).toEqual({ currentPetId: 'momo', pets: [pet] })
  })

  it('backs up corrupt library JSON and starts empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    await writeFile(join(dir, 'library.json'), '{bad json')
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
    const backups = (await readdir(dir)).filter((file) => /^library\.corrupt\.\d+\.json$/.test(file))
    expect(backups).toHaveLength(1)
  })

  it('backs up structurally invalid library JSON and starts empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    await writeFile(join(dir, 'library.json'), JSON.stringify({ pets: null }))
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
    const backups = (await readdir(dir)).filter((file) => /^library\.corrupt\.\d+\.json$/.test(file))
    expect(backups).toHaveLength(1)
  })

  it('backs up library JSON with pet entries missing string ids and starts empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    await writeFile(
      join(dir, 'library.json'),
      JSON.stringify({ currentPetId: null, pets: [{ displayName: 'No ID' }] })
    )
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
    const backups = (await readdir(dir)).filter((file) => /^library\.corrupt\.\d+\.json$/.test(file))
    expect(backups).toHaveLength(1)
  })

  it('backs up library JSON with a missing current pet and starts empty', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    await writeFile(
      join(dir, 'library.json'),
      JSON.stringify({ currentPetId: 'ghost', pets: [createPet('momo')] })
    )
    const store = createPetLibraryStore(dir)
    await expect(store.load()).resolves.toEqual({ currentPetId: null, pets: [] })
    const backups = (await readdir(dir)).filter((file) => /^library\.corrupt\.\d+\.json$/.test(file))
    expect(backups).toHaveLength(1)
  })

  it('sets the current pet when it exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    const momo = createPet('momo')
    const nori = createPet('nori')
    await store.save({ currentPetId: 'momo', pets: [momo, nori] })
    await expect(store.setCurrentPet('nori')).resolves.toEqual({
      currentPetId: 'nori',
      pets: [momo, nori]
    })
  })

  it('rejects setting a missing current pet', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    await store.save({ currentPetId: null, pets: [createPet('momo')] })
    await expect(store.setCurrentPet('missing')).rejects.toThrow('Pet not found: missing')
  })

  it('replaces an existing pet in place and makes it current', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'pet-library-'))
    const store = createPetLibraryStore(dir)
    const momo = createPet('momo', { displayName: 'Momo' })
    const nori = createPet('nori', { displayName: 'Nori' })
    const updatedMomo = createPet('momo', { displayName: 'Momo v2' })
    await store.save({ currentPetId: 'nori', pets: [momo, nori] })
    await expect(store.upsert(updatedMomo)).resolves.toEqual({
      currentPetId: 'momo',
      pets: [updatedMomo, nori]
    })
  })
})
