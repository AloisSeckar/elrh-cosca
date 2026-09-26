import { beforeEach, describe, expect, expectTypeOf, test, vi } from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { updateJsonFile } from '../src/main'
import type { UpdateJsonFileOptions } from '../src/main'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test updateJsonFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateJsonFile).toBeDefined()
  })

  test('should require one options object with targetFile, jsonKey and patch', () => {
    expectTypeOf(updateJsonFile).parameters.toEqualTypeOf<[opts: UpdateJsonFileOptions]>()
    expectTypeOf<string>().not.toExtend<UpdateJsonFileOptions>()
    expectTypeOf<Omit<UpdateJsonFileOptions, 'targetFile'>>().not.toExtend<UpdateJsonFileOptions>()
    expectTypeOf<Omit<UpdateJsonFileOptions, 'jsonKey'>>().not.toExtend<UpdateJsonFileOptions>()
    expectTypeOf<Omit<UpdateJsonFileOptions, 'patch'>>().not.toExtend<UpdateJsonFileOptions>()
    expectTypeOf<{ targetFile: string; jsonKey: string; patch: null }>().toExtend<UpdateJsonFileOptions>()
  })

  test('should fail because of non-existent file', async () => {
    await expect(updateJsonFile({ targetFile: `${wd}/uknown`, jsonKey: 'cosca', patch: { testKey1: 0 }, force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should fail because of non-existent file when createMissing is false', async () => {
    await expect(updateJsonFile({ targetFile: `${wd}/uknown`, jsonKey: 'cosca', patch: { testKey1: 0 }, createMissing: false, force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should create non-existent file when createMissing is true', async () => {
    await updateJsonFile({ targetFile: `${wd}/new-json/created.json`, jsonKey: 'cosca', patch: { testKey1: 'value' }, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))

    expect(readNormalizedFile(wd, 'new-json/created.json')).toBe('{\n  "cosca": {\n    "testKey1": "value"\n  }\n}\n')
  })

  test('should not create non-existent file when user declines', async () => {
    setPromptSpy(['y', 'n'])
    await updateJsonFile({ targetFile: `${wd}/new-json/declined.json`, jsonKey: 'cosca', patch: { testKey1: 'value' }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Creation of .* skipped/))
    expect(existsSync(join(wd, 'new-json/declined.json'))).toBe(false)
  })

  test('should create non-existent file when user confirms', async () => {
    setPromptSpy(['y', 'y'])
    await updateJsonFile({ targetFile: `${wd}/new-json/confirmed.json`, jsonKey: 'cosca', patch: 'value', createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    expect(readNormalizedFile(wd, 'new-json/confirmed.json')).toBe('{\n  "cosca": "value"\n}\n')
  })

  test('should fail because of invalid JSON', async () => {
    await expect(updateJsonFile({ targetFile: `${wd}/text-file.txt`, jsonKey: 'cosca', patch: { testKey1: 0 }, force: true })).rejects.toThrow(/Could not parse/)
  })

  test('should add the new key and values', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca', patch: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-1.json')
  })

  test('should not add new same value in key again', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca', patch: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-1.json')
  })

  test('should add the new value under existing key', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca', patch: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-2.json')
  })

  test('should add nested key', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca', patch: { testKey5: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-3.json')
  })

  test('should add primitive value correctly', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca2', patch: 'primitive value', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-4.json')
  })

  test('should add array correctly', async () => {
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca3', patch: ['value1', 'value2'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-5.json')
  })
    
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca', patch: { testKey6: 0 } })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-5.json')
  })
  
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateJsonFile({ targetFile: `a`, jsonKey: 'b', patch: { testKey6: 0 } })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will update/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateJsonFile({ targetFile: `a`, jsonKey: 'b', patch: { testKey6: 0 }, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

  test('should accept a custom prompt without specifying force', async () => {
    const promptSpy = getPromptUserSpy()
    const opts: UpdateJsonFileOptions = { targetFile: 'a', jsonKey: 'b', patch: null, prompt: 'Apply changes?' }
    await updateJsonFile(opts)
    expect(promptSpy).toHaveBeenCalledWith({ question: 'Apply changes?' })
  })

  test('should bypass prompts when force is true', async () => {
    const promptSpy = getPromptUserSpy()
    await updateJsonFile({ targetFile: `${wd}/json-file.json`, jsonKey: 'cosca3', patch: ['value1', 'value2'], force: true })
    expect(promptSpy).not.toHaveBeenCalled()
  })

})
