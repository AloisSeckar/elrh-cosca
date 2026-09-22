import { beforeEach, describe, expect, test, vi } from 'vitest'
import { removeFromJsonFile } from '../src/main'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

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
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(removeFromJsonFile).toBeDefined()
  })

  test('should fail because of non-existent file', async () => {
    await expect(removeFromJsonFile({ targetFile: `${wd}/uknown`, jsonKey: 'cosca', force: true })).rejects.toThrow(/No .* found/)
  })

  test('should fail because of invalid JSON', async () => {
    await expect(removeFromJsonFile({ targetFile: `${wd}/text-file.txt`, jsonKey: 'cosca', force: true })).rejects.toThrow(/Could not parse/)
  })

  test('should remove top level key', async () => {
    await removeFromJsonFile({ targetFile: `${wd}/json-file-2.json`, jsonKey: 'string-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should handle removing non-existent key and do nothing', async () => {
    await expect(removeFromJsonFile({ targetFile: `${wd}/json-file-2.json`, jsonKey: 'non-existent-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should remove nested key', async () => {
    await removeFromJsonFile({ targetFile: `${wd}/json-file-2.json`, jsonKey: 'object-key.nested-key', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })

  test('should handle removing non-existent nested key and do nothing', async () => {
    await expect(removeFromJsonFile({ targetFile: `${wd}/json-file-2.json`, jsonKey: 'object-key.nested-key', force: true })).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
    
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await removeFromJsonFile({ targetFile: `${wd}/json-file-2.json`, jsonKey: 'cosca' })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
  
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile({ targetFile: `a`, jsonKey: 'b' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will delete/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile({ targetFile: `a`, jsonKey: 'b', force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
