import { beforeEach, describe, expect, test, vi } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { removeFromJsonFile } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getStdoutSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test removeFromJsonFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getStdoutSpy()
  })

  test('should be defined', () => {
    expect(removeFromJsonFile).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(removeFromJsonFile({ targetPath: 'a', jsonKey: 'cosca', force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should do nothing for nested key under non-existent or non-object parent', async () => {
    const file = join(wd, 'remove-json-nested.json')
    const content = JSON.stringify({ str: 'x', arr: [1] }, null, 2)
    writeFileSync(file, content)
    spy.mockClear()
    for (const jsonKey of ['missing.key', 'str.key', 'arr.key']) {
      await removeFromJsonFile({ targetPath: file, jsonKey, force: true })
    }

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/already up to date/))
    expect(readFileSync(file, 'utf8')).toBe(content)
  })

  test('should handle keys shadowing Object.prototype methods and non-object roots', async () => {
    const file = join(wd, 'remove-json-shadow.json')
    writeFileSync(file, JSON.stringify({ hasOwnProperty: 'x', a: { hasOwnProperty: 1, b: 2 } }))
    await removeFromJsonFile({ targetPath: file, jsonKey: 'a.b', force: true })
    await removeFromJsonFile({ targetPath: file, jsonKey: 'hasOwnProperty', force: true })
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ a: { hasOwnProperty: 1 } })

    for (const content of ['null', '[1]', '"x"']) {
      writeFileSync(file, content)
      await expect(removeFromJsonFile({ targetPath: file, jsonKey: 'a.b', force: true })).resolves.not.toThrow()
      expect(readFileSync(file, 'utf8')).toBe(content)
    }
  })

  test('should fail because of non-existent file', async () => {
    await expect(removeFromJsonFile({ targetPath: `${wd}/uknown`, jsonKey: 'cosca', force: true })).rejects.toThrow(/No .* found/)
  })

  test('should fail because of invalid JSON', async () => {
    await expect(removeFromJsonFile({ targetPath: `${wd}/text-file.txt`, jsonKey: 'cosca', force: true })).rejects.toThrow(/Could not parse/)
  })

  test('should remove top level key', async () => {
    await removeFromJsonFile({ targetPath: `${wd}/json-file-2.json`, jsonKey: 'string-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should handle removing non-existent key and do nothing', async () => {
    await expect(removeFromJsonFile({ targetPath: `${wd}/json-file-2.json`, jsonKey: 'non-existent-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should remove nested key', async () => {
    await removeFromJsonFile({ targetPath: `${wd}/json-file-2.json`, jsonKey: 'object-key.nested-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })

  test('should handle removing non-existent nested key and do nothing', async () => {
    await expect(removeFromJsonFile({ targetPath: `${wd}/json-file-2.json`, jsonKey: 'object-key.nested-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
    
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await removeFromJsonFile({ targetPath: `${wd}/json-file-2.json`, jsonKey: 'cosca' })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
  
  test('should not log when silent is true', async () => {
    spy.mockClear()
    const file = join(wd, 'remove-json-silent.json')
    writeFileSync(file, '{\n  "a": 1,\n  "b": 2\n}\n')
    await removeFromJsonFile({ targetPath: file, jsonKey: 'a', force: true, silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ b: 2 })

    setPromptSpy(['n'])
    await removeFromJsonFile({ targetPath: file, jsonKey: 'b', silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(JSON.parse(readFileSync(file, 'utf8'))).toEqual({ b: 2 })
  })

  test('should log when silent is false', async () => {
    spy.mockClear()
    const file = join(wd, 'remove-json-silent-2.json')
    writeFileSync(file, '{\n  "a": 1\n}\n')
    await removeFromJsonFile({ targetPath: file, jsonKey: 'missing', force: true, silent: false })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/already up to date/))
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile({ targetPath: `a`, jsonKey: 'b' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will delete/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile({ targetPath: `a`, jsonKey: 'b', force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
