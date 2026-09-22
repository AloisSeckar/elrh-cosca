import { beforeEach, describe, expect, test, vi } from 'vitest'
import { hasJsonKey } from '../src/main'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test hasJsonKey checker', () => {

  let wd: string = ''

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
  })

  test('should be defined', () => {
    expect(hasJsonKey).toBeDefined()
  })
  
  test('should fail because of non-existent file', async () => {
    expect(() => hasJsonKey({ targetFile: `${wd}/unknown`, jsonKey: 'string-key' })).toThrow(/cannot check its keys/)
  })

  test('should find the existing key', async () => {
    expect(hasJsonKey({ targetFile: `${wd}/json-file.json`, jsonKey: 'string-key' })).toBe(true)
  })

  test('should not find the non-existent key', async () => {
    expect(hasJsonKey({ targetFile: `${wd}/json-file.json`, jsonKey: 'non-existent-key' })).toBe(false)
  })

  test('should find the nested key', async () => {
    expect(hasJsonKey({ targetFile: `${wd}/json-file.json`, jsonKey: 'object-key.nested-key' })).toBe(true)
  })

  test('should not find the non-existent nested key', async () => {
    expect(hasJsonKey({ targetFile: `${wd}/json-file.json`, jsonKey: 'object-key.non-existent-key' })).toBe(false)
  })

})
