import { beforeEach, describe, expect, test, vi } from 'vitest'
import { writeFileSync } from 'node:fs'
import { removeFromTextFile } from '../src/main'
import { checkPath } from '../src/_private/check-path'
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

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(removeFromTextFile({ targetPath: 'a', searchText: 'Row 1', force: true })).rejects.toThrow(/Invalid path/)
  })
  
  test('should fail because of non-existent file', async () => {
    await expect(removeFromTextFile({ targetPath: `${wd}/unknown`, searchText: 'Row 1', force: true })).rejects.toThrow(/cannot update its contents/)
  })

  test('should remove the matching line', async () => {
    await removeFromTextFile({ targetPath: `${wd}/text-file-2.txt`, searchText: 'Row 1', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-1.txt')
  })

  test('should remove another matching line', async () => {
    await removeFromTextFile({ targetPath: `${wd}/text-file-2.txt`, searchText: 'Row 2', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should not modify file when no line matches', async () => {
    await removeFromTextFile({ targetPath: `${wd}/text-file-2.txt`, searchText: 'NonExistent', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-2.txt')
  })

  test('should remove line by partial match', async () => {
    await removeFromTextFile({ targetPath: `${wd}/text-file-2.txt`, searchText: 'Test', force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file-2.txt')).toMatchFileSnapshot('snapshots/removed-from-text-file-3.txt')
  })
      
  test('should do nothing when user aborts', async () => {
    setPromptSpy(['n'])
    await removeFromTextFile({ targetPath: `${wd}/text-file-2.txt`, searchText: 'something' })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))
  })
    
  test('should not log when silent is true', async () => {
    spy.mockClear()
    const file = `${wd}/silent-text.txt`
    writeFileSync(file, 'Row A\nRow B\n')
    await removeFromTextFile({ targetPath: file, searchText: 'Row A', force: true, silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(readNormalizedFile(wd, 'silent-text.txt')).toBe('Row B\n')

    setPromptSpy(['n'])
    await removeFromTextFile({ targetPath: file, searchText: 'Row B', silent: true })
    expect(spy).not.toHaveBeenCalled()
  })

  test('should log when silent is false', async () => {
    spy.mockClear()
    const file = `${wd}/silent-text-2.txt`
    writeFileSync(file, 'Row C\n')
    await removeFromTextFile({ targetPath: file, searchText: 'Row X', force: true, silent: false })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/already up to date/))
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile({ targetPath: `a`, searchText: 'b' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will remove/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await removeFromTextFile({ targetPath: `a`, searchText: 'b', force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
