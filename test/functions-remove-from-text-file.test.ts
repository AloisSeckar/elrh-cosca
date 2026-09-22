import { beforeEach, describe, expect, test, vi } from 'vitest'
import { removeFromTextFile } from '../src/main'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test removeFromTextFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(removeFromTextFile).toBeDefined()
  })
  
  test('should fail because of non-existent file', async () => {
    await expect(removeFromTextFile({ targetFile: `${wd}/unknown`, searchText: 'Row 1', force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should remove the matching line', async () => {
    await removeFromTextFile({ targetFile: `${wd}/text-file-2.txt`, searchText: 'Row 1', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-1.txt')
  })

  test('should remove another matching line', async () => {
    await removeFromTextFile({ targetFile: `${wd}/text-file-2.txt`, searchText: 'Row 2', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should not modify file when no line matches', async () => {
    await removeFromTextFile({ targetFile: `${wd}/text-file-2.txt`, searchText: 'NonExistent', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should remove line by partial match', async () => {
    await removeFromTextFile({ targetFile: `${wd}/text-file-2.txt`, searchText: 'Test', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-3.txt')
  })
      
  test('should do nothing when user aborts', async () => {
    setPromptSpy(['n'])
    await removeFromTextFile({ targetFile: `${wd}/text-file-2.txt`, searchText: 'something' })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))
  })
    
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile({ targetFile: `a`, searchText: 'b' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will remove/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile({ targetFile: `a`, searchText: 'b', force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
