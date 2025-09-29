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
    await expect(removeFromJsonFile(`${wd}/uknown`, 'cosca', true)).rejects.toThrow(/No .* found/)
  })

  test('should fail because of invalid JSON', async () => {
    await expect(removeFromJsonFile(`${wd}/text-file.txt`, 'cosca', true)).rejects.toThrow(/Could not parse/)
  })

  test('should remove top level key', async () => {
    await removeFromJsonFile(`${wd}/json-file-2.json`, 'string-key', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should handle removing non-existent key and do nothing', async () => {
    await expect(removeFromJsonFile(`${wd}/json-file-2.json`, 'non-existent-key', true)).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-1.json')
  })

  test('should remove nested key', async () => {
    await removeFromJsonFile(`${wd}/json-file-2.json`, 'object-key.nested-key', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))
    

    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })

  test('should handle removing non-existent nested key and do nothing', async () => {
    await expect(removeFromJsonFile(`${wd}/json-file-2.json`, 'object-key.nested-key', true)).resolves.not.toThrow()

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    // file is still the same
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
    
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await removeFromJsonFile(`${wd}/json-file-2.json`, 'cosca')

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'json-file-2.json')).toMatchFileSnapshot('snapshots/removed-from-json-file-2.json')
  })
  
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile(`a`, 'b')
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/This will delete/))
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromJsonFile(`a`, 'b', false, "Custom prompt")
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/Custom prompt/))
  })

})
