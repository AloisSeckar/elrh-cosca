import { beforeEach, describe, expect, test, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { hasYamlKey } from '../src/main'
import { checkPath } from '../src/_private/check-path'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test hasYamlKey checker', () => {

  let wd: string = ''

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
  })

  test('should be defined', () => {
    expect(hasYamlKey).toBeDefined()
  })

  test('should fail because of non-existent file', () => {
    expect(() => hasYamlKey({ targetFile: `${wd}/unknown`, yamlKey: 'string-key' })).toThrow(/cannot check its keys/)
  })

  test('should fail when path check fails', () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    expect(() => hasYamlKey({ targetFile: 'a', yamlKey: 'string-key' })).toThrow(/Invalid path/)
  })

  test('should fail because of invalid YAML', () => {
    writeFileSync(join(wd, 'has-yaml-key-invalid.yaml'), 'key: [unclosed\n')
    expect(() => hasYamlKey({ targetFile: `${wd}/has-yaml-key-invalid.yaml`, yamlKey: 'key' })).toThrow(/Could not parse/)
  })

  test('should find the existing key', () => {
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'string-key' })).toBe(true)
  })

  test('should not find the non-existent key', () => {
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'non-existent-key' })).toBe(false)
  })

  test('should find the nested key', () => {
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.nested-key' })).toBe(true)
  })

  test('should not find the non-existent nested key', () => {
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.non-existent-key' })).toBe(false)
  })

  test('should not find nested key under non-map value', () => {
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'string-key.nested-key' })).toBe(false)
    expect(hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'array-key.0' })).toBe(false)
  })

  test('should not find key in empty file', () => {
    writeFileSync(join(wd, 'has-yaml-key-empty.yaml'), '')
    expect(hasYamlKey({ targetFile: `${wd}/has-yaml-key-empty.yaml`, yamlKey: 'key' })).toBe(false)
  })

  test('should not find key when root is not a map', () => {
    writeFileSync(join(wd, 'has-yaml-key-list.yaml'), '- key\n')
    expect(hasYamlKey({ targetFile: `${wd}/has-yaml-key-list.yaml`, yamlKey: 'key' })).toBe(false)
  })

})
