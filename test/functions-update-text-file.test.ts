import { beforeEach, describe, expect, test, vi } from 'vitest'
import { updateTextFile } from '../src/main'
import { getConsoleSpy, getPromptUserSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test updateTextFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateTextFile).toBeDefined()
  })
  
  test('should fail because of non-existent file', async () => {
    await expect(updateTextFile(`${wd}/unknown`, ['Row 3'], true)).rejects.toThrow(/cannot update its contents/)
  })

  test('should add the new line', async () => {
    await updateTextFile(`${wd}/text-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-1.txt')
  })

  test('should not add same line again', async () => {
    await updateTextFile(`${wd}/text-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-1.txt')
  })

  test('should add new line but ignore existing', async () => {
    await updateTextFile(`${wd}/text-file.txt`, ['Row 4', 'Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-2.txt')
  })
      
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateTextFile(`${wd}/text-file.json`, ['Row 5'])

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-2.txt')
  })
    
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateTextFile(`a`, ['b'])
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/This will update/))
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateTextFile(`a`, ['b'], false, "Custom prompt")
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/Custom prompt/))
  })

})
