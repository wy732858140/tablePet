import { describe, expect, it } from 'vitest'
import { toFileUrl } from '../../src/renderer/pet/fileUrl'

describe('toFileUrl', () => {
  it('encodes POSIX paths with spaces and unicode characters', () => {
    expect(toFileUrl('/Users/a b/宠物/spritesheet.webp')).toBe(
      'file:///Users/a%20b/%E5%AE%A0%E7%89%A9/spritesheet.webp'
    )
  })

  it('encodes Windows drive paths with forward slashes', () => {
    expect(toFileUrl('C:\\Users\\A B\\pet\\spritesheet.webp')).toBe(
      'file:///C:/Users/A%20B/pet/spritesheet.webp'
    )
  })

  it('returns existing file URLs unchanged', () => {
    expect(toFileUrl('file:///Users/a%20b/pet.webp')).toBe('file:///Users/a%20b/pet.webp')
  })

  it('encodes UNC paths as file URLs with a host', () => {
    expect(toFileUrl('\\\\server\\share\\pet folder\\spritesheet.webp')).toBe(
      'file://server/share/pet%20folder/spritesheet.webp'
    )
  })
})
