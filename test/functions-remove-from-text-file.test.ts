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
    await expect(removeFromTextFile(`${wd}/unknown`, 'Row 1', true)).rejects.toThrow(/cannot update its contents/)
  })

  test('should remove the matching line', async () => {
    await removeFromTextFile(`${wd}/text-file-2.txt`, 'Row 1', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-1.txt')
  })

  test('should remove another matching line', async () => {
    await removeFromTextFile(`${wd}/text-file-2.txt`, 'Row 2', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should not modify file when no line matches', async () => {
    await removeFromTextFile(`${wd}/text-file-2.txt`, 'NonExistent', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should remove line by partial match', async () => {
    await removeFromTextFile(`${wd}/text-file-2.txt`, 'Test', true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-3.txt')
  })
      
  test('should do nothing when user aborts', async () => {
    setPromptSpy(['n'])
    await removeFromTextFile(`${wd}/text-file-2.txt`, 'something')

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))
  })
    
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile(`a`, 'b')
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/This will remove/))
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile(`a`, 'b', false, "Custom prompt")
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/Custom prompt/))
  })

})
