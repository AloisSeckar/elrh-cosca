import { beforeEach, describe, expect, test, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { hasJsonKey } from '../src/main'
import { checkPath } from '../src/_private/check-path'

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
    expect(() => hasJsonKey({ targetPath: `${wd}/unknown`, jsonKey: 'string-key' })).toThrow(/cannot check its keys/)
  })

  test('should fail when path check fails', () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    expect(() => hasJsonKey({ targetPath: 'a', jsonKey: 'string-key' })).toThrow(/Invalid path/)
  })

  test('should fail because of invalid JSON', () => {
    expect(() => hasJsonKey({ targetPath: `${wd}/text-file.txt`, jsonKey: 'string-key' })).toThrow(/Could not parse/)
  })

  test('should find the existing key', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'string-key' })).toBe(true)
  })

  test('should not find the non-existent key', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'non-existent-key' })).toBe(false)
  })

  test('should find the nested key', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'object-key.nested-key' })).toBe(true)
  })

  test('should not find the non-existent nested key', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'object-key.non-existent-key' })).toBe(false)
  })

  test('should not find nested key under non-existent parent key', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'non-existent-key.nested-key' })).toBe(false)
  })

  test('should handle keys shadowing Object.prototype methods and non-object roots', () => {
    const file = `${wd}/has-json-shadow.json`
    writeFileSync(file, JSON.stringify({ hasOwnProperty: 'x', a: { hasOwnProperty: 1 } }))
    expect(hasJsonKey({ targetPath: file, jsonKey: 'hasOwnProperty' })).toBe(true)
    expect(hasJsonKey({ targetPath: file, jsonKey: 'a.hasOwnProperty' })).toBe(true)
    expect(hasJsonKey({ targetPath: file, jsonKey: 'toString' })).toBe(false)

    for (const content of ['null', '[1]', '"x"']) {
      writeFileSync(file, content)
      expect(hasJsonKey({ targetPath: file, jsonKey: 'a' })).toBe(false)
    }
  })

  test('should not find nested key under non-object value', async () => {
    expect(hasJsonKey({ targetPath: `${wd}/json-file.json`, jsonKey: 'string-key.nested-key' })).toBe(false)
  })

})
