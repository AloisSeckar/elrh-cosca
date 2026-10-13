import { beforeEach, describe, expect, expectTypeOf, test, vi } from 'vitest'
import { existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { updateYamlFile } from '../src/main'
import type { UpdateYamlFileOptions } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test updateYamlFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateYamlFile).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(updateYamlFile({ targetFile: 'a', yamlKey: 'cosca', patch: 1, force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should require one options object with targetFile, yamlKey and patch', () => {
    expectTypeOf(updateYamlFile).parameters.toEqualTypeOf<[opts: UpdateYamlFileOptions]>()
    expectTypeOf<string>().not.toExtend<UpdateYamlFileOptions>()
    expectTypeOf<Omit<UpdateYamlFileOptions, 'targetFile'>>().not.toExtend<UpdateYamlFileOptions>()
    expectTypeOf<Omit<UpdateYamlFileOptions, 'yamlKey'>>().not.toExtend<UpdateYamlFileOptions>()
    expectTypeOf<Omit<UpdateYamlFileOptions, 'patch'>>().not.toExtend<UpdateYamlFileOptions>()
    expectTypeOf<{ targetFile: string; yamlKey: string; patch: null }>().toExtend<UpdateYamlFileOptions>()
  })

  test('should fail because of non-existent file', async () => {
    await expect(updateYamlFile({ targetFile: `${wd}/uknown`, yamlKey: 'cosca', patch: { testKey1: 0 }, force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should create non-existent file when createMissing is true', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/created.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value' }, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    expect(readNormalizedFile(wd, 'new-yaml/created.yaml')).toBe('cosca:\n  testKey1: value\n')
  })

  test('should not create non-existent file when user declines', async () => {
    setPromptSpy(['y', 'n'])
    await updateYamlFile({ targetFile: `${wd}/new-yaml/declined.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value' }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Creation of .* skipped/))
    expect(existsSync(join(wd, 'new-yaml/declined.yaml'))).toBe(false)
  })

  test('should create non-existent file when user confirms', async () => {
    setPromptSpy(['y', 'y'])
    await updateYamlFile({ targetFile: `${wd}/new-yaml/confirmed.yaml`, yamlKey: 'cosca', patch: 'value', createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    expect(readNormalizedFile(wd, 'new-yaml/confirmed.yaml')).toBe('cosca: value\n')
  })

  test('should fail because of invalid YAML', async () => {
    writeFileSync(join(wd, 'invalid.yaml'), 'key: [unclosed\n')
    await expect(updateYamlFile({ targetFile: `${wd}/invalid.yaml`, yamlKey: 'cosca', patch: { testKey1: 0 }, force: true })).rejects.toThrow(/Could not parse/)
  })

  test('should fail because root is not a map', async () => {
    writeFileSync(join(wd, 'list.yaml'), '- a\n- b\n')
    await expect(updateYamlFile({ targetFile: `${wd}/list.yaml`, yamlKey: 'cosca', patch: 1, force: true })).rejects.toThrow(/not a YAML map/)
  })

  test('should add the new key and values', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-1.yaml')
  })

  test('should not add new same value in key again', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-1.yaml')
  })

  test('should add the new value under existing key', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'object-key', patch: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-2.yaml')
  })

  test('should add nested key', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca', patch: { testKey5: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-3.yaml')
  })

  test('should replace primitive value and keep its inline comment', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'string-key', patch: 'changed', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-4.yaml')
  })

  test('should add array correctly', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca3', patch: ['value1', 'value2'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-5.yaml')
  })

  test('should not update array with the same values when overwriteArrays is true', async () => {
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca3', patch: ['value1', 'value2'], overwriteArrays: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
  })

  test('should replace existing primitive value with object patch', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/primitive.yaml`, yamlKey: 'cosca', patch: 'primitive', createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/primitive.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'new-yaml/primitive.yaml')).toBe('cosca:\n  testKey1: value\n')
  })

  test('should replace existing array value with object patch', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array.yaml`, yamlKey: 'cosca', patch: ['a', 'b'], createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array.yaml`, yamlKey: 'cosca', patch: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'new-yaml/array.yaml')).toBe('cosca:\n  testKey1: value\n')
  })

  test('should append array patch to existing sequence', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-append.yaml`, yamlKey: 'cosca', patch: ['a', 'b'], createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-append.yaml`, yamlKey: 'cosca', patch: ['c'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'new-yaml/array-append.yaml')).toBe('cosca:\n  - a\n  - b\n  - c\n')
  })

  test('should append arrays inside object patch to existing sequences', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-append-nested.yaml`, yamlKey: 'cosca', patch: { list: ['a'] }, createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-append-nested.yaml`, yamlKey: 'cosca', patch: { list: ['b'] }, force: true })

    expect(readNormalizedFile(wd, 'new-yaml/array-append-nested.yaml')).toBe('cosca:\n  list:\n    - a\n    - b\n')
  })

  test('should keep sequence comments when appending', async () => {
    writeFileSync(join(wd, 'array-comment.yaml'), 'cosca:\n  # comment\n  - a # item\n')
    await updateYamlFile({ targetFile: `${wd}/array-comment.yaml`, yamlKey: 'cosca', patch: ['b'], force: true })

    expect(readNormalizedFile(wd, 'array-comment.yaml')).toBe('cosca:\n  # comment\n  - a # item\n  - b\n')
  })

  test('should set value of existing key without value node', async () => {
    writeFileSync(join(wd, 'explicit-key.yaml'), '? cosca\nother: 1\n')
    await updateYamlFile({ targetFile: `${wd}/explicit-key.yaml`, yamlKey: 'cosca', patch: 'value', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'explicit-key.yaml')).toBe('cosca: value\nother: 1\n')
  })

  test('should not update file when appending empty array', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-append.yaml`, yamlKey: 'cosca', patch: [], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
  })

  test('should overwrite existing sequence when overwriteArrays is true', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-overwrite.yaml`, yamlKey: 'cosca', patch: ['a', 'b'], createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/array-overwrite.yaml`, yamlKey: 'cosca', patch: ['c'], overwriteArrays: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'new-yaml/array-overwrite.yaml')).toBe('cosca:\n  - c\n')
  })

  test('should set null value', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/null.yaml`, yamlKey: 'cosca', patch: null, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    expect(readNormalizedFile(wd, 'new-yaml/null.yaml')).toBe('cosca: null\n')
  })

  test('should create nested keys using dot notation', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested.yaml`, yamlKey: 'a.b.c', patch: { key: 'value' }, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    expect(readNormalizedFile(wd, 'new-yaml/nested.yaml')).toBe('a:\n  b:\n    c:\n      key: value\n')
  })

  test('should update existing nested key using dot notation', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested.yaml`, yamlKey: 'a.b', patch: { other: 1 }, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested.yaml`, yamlKey: 'a.b.c.key', patch: 'changed', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    expect(readNormalizedFile(wd, 'new-yaml/nested.yaml')).toBe('a:\n  b:\n    c:\n      key: changed\n    other: 1\n')
  })

  test('should not update nested key with the same value', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested.yaml`, yamlKey: 'a.b.c', patch: { key: 'changed' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))
  })

  test('should replace non-map intermediate values using dot notation', async () => {
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested-replace.yaml`, yamlKey: 'a', patch: { b: 'primitive', c: [1] }, createMissing: true, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested-replace.yaml`, yamlKey: 'a.b.x', patch: 1, force: true })
    await updateYamlFile({ targetFile: `${wd}/new-yaml/nested-replace.yaml`, yamlKey: 'a.c.y', patch: 2, force: true })

    expect(readNormalizedFile(wd, 'new-yaml/nested-replace.yaml')).toBe('a:\n  b:\n    x: 1\n  c:\n    y: 2\n')
  })

  test.each(['a..b', '.a', 'a.', '__proto__.polluted', 'a.constructor.prototype'])('should reject invalid key \'%s\'', async (yamlKey: string) => {
    await expect(updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey, patch: { polluted: true }, force: true })).rejects.toThrow(/Invalid YAML key/)
    expect(({} as any).polluted).toBeUndefined()
  })

  test('should do nothing when user aborts updating', async () => {
    setPromptSpy(['n'])
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca', patch: { testKey6: 0 } })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'yaml-file.yaml')).toMatchFileSnapshot('snapshots/updated-yaml-file-5.yaml')
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateYamlFile({ targetFile: `a`, yamlKey: 'b', patch: { testKey6: 0 } })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will update/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateYamlFile({ targetFile: `a`, yamlKey: 'b', patch: { testKey6: 0 }, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

  test('should bypass prompts when force is true', async () => {
    const promptSpy = getPromptUserSpy()
    await updateYamlFile({ targetFile: `${wd}/yaml-file.yaml`, yamlKey: 'cosca3', patch: ['value1', 'value2'], force: true })
    expect(promptSpy).not.toHaveBeenCalled()
  })

})
