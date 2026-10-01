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

  test('should fail because of non-existent file', async () => {
    await expect(hasYamlKey({ targetFile: `${wd}/unknown`, yamlKey: 'string-key' })).rejects.toThrow(/cannot check its keys/)
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(hasYamlKey({ targetFile: 'a', yamlKey: 'string-key' })).rejects.toThrow(/Invalid path/)
  })

  test('should fail because of invalid YAML', async () => {
    writeFileSync(join(wd, 'has-yaml-key-invalid.yaml'), 'key: [unclosed\n')
    await expect(hasYamlKey({ targetFile: `${wd}/has-yaml-key-invalid.yaml`, yamlKey: 'key' })).rejects.toThrow(/Could not parse/)
  })

  test('should find the existing key', async () => {
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'string-key' })).toBe(true)
  })

  test('should not find the non-existent key', async () => {
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'non-existent-key' })).toBe(false)
  })

  test('should find the nested key', async () => {
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.nested-key' })).toBe(true)
  })

  test('should not find the non-existent nested key', async () => {
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'object-key.non-existent-key' })).toBe(false)
  })

  test('should not find nested key under non-map value', async () => {
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'string-key.nested-key' })).toBe(false)
    expect(await hasYamlKey({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'array-key.0' })).toBe(false)
  })

  test('should not find key in empty file', async () => {
    writeFileSync(join(wd, 'has-yaml-key-empty.yaml'), '')
    expect(await hasYamlKey({ targetFile: `${wd}/has-yaml-key-empty.yaml`, yamlKey: 'key' })).toBe(false)
  })

  test('should not find key when root is not a map', async () => {
    writeFileSync(join(wd, 'has-yaml-key-list.yaml'), '- key\n')
    expect(await hasYamlKey({ targetFile: `${wd}/has-yaml-key-list.yaml`, yamlKey: 'key' })).toBe(false)
  })

})
