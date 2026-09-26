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
    await expect(updateTextFile({ targetFile: `${wd}/unknown`, rowsToAdd: ['Row 3'], force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should add the new line', async () => {
    await updateTextFile({ targetFile: `${wd}/text-file.txt`, rowsToAdd: ['Row 3'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-1.txt')
  })

  test('should not add same line again', async () => {
    await updateTextFile({ targetFile: `${wd}/text-file.txt`, rowsToAdd: ['Row 3'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-1.txt')
  })

  test('should add new line but ignore existing', async () => {
    await updateTextFile({ targetFile: `${wd}/text-file.txt`, rowsToAdd: ['Row 4', 'Row 3'], force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-2.txt')
  })
      
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateTextFile({ targetFile: `${wd}/text-file.json`, rowsToAdd: ['Row 5'] })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-2.txt')
  })

  test('should add existing lines again when duplicates allowed', async () => {
    await updateTextFile({ targetFile: `${wd}/text-file.txt`, rowsToAdd: ['Row 3', 'Row 4', 'Row 4'], allowDuplicates: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-3.txt')
  })

  test('should not add existing lines when duplicates explicitly disallowed', async () => {
    await updateTextFile({ targetFile: `${wd}/text-file.txt`, rowsToAdd: ['Row 3', 'Row 4'], allowDuplicates: false, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file-3.txt')
  })
    
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateTextFile({ targetFile: `a`, rowsToAdd: ['b'] })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will update/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateTextFile({ targetFile: `a`, rowsToAdd: ['b'], force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
