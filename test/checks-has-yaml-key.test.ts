import { beforeEach, describe, expect, test, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { hasYamlKey } from '../src/main'
import { checkPath } from '../src/_private/check-path'

// required to avoid CWD containment in tests
vi.mock('../src/_private/check-path', async () => (await import('./cosca-test-mocks')).mockCheckPath())

describe('Test hasYamlKey checker', () => {

  let wd: string = ''

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
  })

  test('should be defined', () => {
    expect(hasYamlKey).toBeDefined()
  })

  test('should treat escaped dot as a part of the key', () => {
    const file = join(wd, 'has-yaml-escaped.yaml')
    writeFileSync(file, 'a.b: 1\nc:\n  d.e: 2\n')
    expect(hasYamlKey({ targetPath: file, yamlKey: 'a\\.b' })).toBe(true)
    expect(hasYamlKey({ targetPath: file, yamlKey: 'c.d\\.e' })).toBe(true)
    expect(hasYamlKey({ targetPath: file, yamlKey: 'a.b' })).toBe(false)
    expect(hasYamlKey({ targetPath: file, yamlKey: 'c.d.e' })).toBe(false)
  })

  test('should fail because of non-existent file', () => {
    expect(() => hasYamlKey({ targetPath: `${wd}/unknown`, yamlKey: 'string-key' })).toThrow(/cannot check its keys/)
  })

  test('should fail when path check fails', () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    expect(() => hasYamlKey({ targetPath: 'a', yamlKey: 'string-key' })).toThrow(/Invalid path/)
  })

  test('should fail because of invalid YAML', () => {
    writeFileSync(join(wd, 'has-yaml-key-invalid.yaml'), 'key: [unclosed\n')
    expect(() => hasYamlKey({ targetPath: `${wd}/has-yaml-key-invalid.yaml`, yamlKey: 'key' })).toThrow(/Could not parse/)
  })

  test('should find the existing key', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'string-key' })).toBe(true)
  })

  test('should not find the non-existent key', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'non-existent-key' })).toBe(false)
  })

  test('should find the nested key', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.nested-key' })).toBe(true)
  })

  test('should not find the non-existent nested key', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.non-existent-key' })).toBe(false)
  })

  test('should not find nested key under non-map value', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'string-key.nested-key' })).toBe(false)
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'array-key.0' })).toBe(false)
  })

  test('should not find deeply nested key under non-map value', () => {
    expect(hasYamlKey({ targetPath: `${wd}/yaml-file.yaml`, yamlKey: 'string-key.nested-key.deeper-key' })).toBe(false)
  })

  test('should not find key in empty file', () => {
    writeFileSync(join(wd, 'has-yaml-key-empty.yaml'), '')
    expect(hasYamlKey({ targetPath: `${wd}/has-yaml-key-empty.yaml`, yamlKey: 'key' })).toBe(false)
  })

  test('should not find key when root is not a map', () => {
    writeFileSync(join(wd, 'has-yaml-key-list.yaml'), '- key\n')
    expect(hasYamlKey({ targetPath: `${wd}/has-yaml-key-list.yaml`, yamlKey: 'key' })).toBe(false)
  })

})
