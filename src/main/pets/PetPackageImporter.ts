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

export const createPetPackageImporter = (
  appDataDir: string,
  inspectImage: ImageInspector = defaultImageInspector
) => {
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
