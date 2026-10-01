import { beforeEach, describe, expect, test, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { removeFromYamlFile } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test removeFromYamlFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(removeFromYamlFile).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(removeFromYamlFile({ targetFile: 'a', yamlKey: 'cosca', force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should do nothing for nested key under non-map value', async () => {
    const file = join(wd, 'remove-yaml-nested.yaml')
    writeFileSync(file, 'str: x\n')
    spy.mockClear()
    await removeFromYamlFile({ targetFile: file, yamlKey: 'str.a.b', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/already up to date/))
    expect(readFileSync(file, 'utf8')).toBe('str: x\n')
  })

  test('should fail because of non-existent file', async () => {
    await expect(removeFromYamlFile({ targetFile: `${wd}/uknown`, yamlKey: 'cosca', force: true })).rejects.toThrow(/No .* found/)
  })

  test('should fail because of invalid YAML', async () => {
    writeFileSync(join(wd, 'remove-from-yaml-invalid.yaml'), 'key: [unclosed\n')
    await expect(removeFromYamlFile({ targetFile: `${wd}/remove-from-yaml-invalid.yaml`, yamlKey: 'key', force: true })).rejects.toThrow(/Could not parse/)
  })

  test('should remove top level key', async () => {
    await removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'string-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-1.yaml')
  })

  test('should handle removing non-existent key and do nothing', async () => {
    await expect(removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'non-existent-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-1.yaml')
  })

  test('should remove nested key', async () => {
    await removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'object-key.nested-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-2.yaml')
  })

  test('should handle removing non-existent nested key and do nothing', async () => {
    await expect(removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'object-key.nested-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-2.yaml')
  })

  test('should not remove nested key under non-map value', async () => {
    await removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'array-key.0', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-2.yaml')
  })

  test('should do nothing when root is not a map', async () => {
    writeFileSync(join(wd, 'remove-from-yaml-list.yaml'), '- key\n')
    await removeFromYamlFile({ targetFile: `${wd}/remove-from-yaml-list.yaml`, yamlKey: 'key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
    expect(readNormalizedFile(wd, 'remove-from-yaml-list.yaml')).toBe('- key\n')
  })

  test('should do nothing when user aborts updating', async () => {
    setPromptSpy(['n'])
    await removeFromYamlFile({ targetFile: `${wd}/yaml-file-2.yaml`, yamlKey: 'number-key' })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'yaml-file-2.yaml')).toMatchFileSnapshot('snapshots/removed-from-yaml-file-2.yaml')
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromYamlFile({ targetFile: `a`, yamlKey: 'b' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will delete/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromYamlFile({ targetFile: `a`, yamlKey: 'b', force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
