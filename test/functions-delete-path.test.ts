import { beforeEach, describe, expect, test, vi } from 'vitest'
import { deletePath } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getConsoleSpy, getPromptUserSpy, setPromptSpy } from './cosca-test-utils'
import { existsSync } from 'node:fs'
import { join } from 'node:path'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test deletePath function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(deletePath).toBeDefined()
  })

  /*
  test('should be rejected due to invalid path', async () => {
    await expect(deletePath(`a/b:c`, true)).rejects.toThrow(/Invalid path/)
    await expect(deletePath(`../a`, true)).rejects.toThrow(/Path traversal/)
    await expect(deletePath(`a/../../b`, true)).rejects.toThrow(/Path traversal/)
    await expect(deletePath(`/a`, true)).rejects.toThrow(/Path outside of CWD/)
  })
  */

  test('should work but do nothing on non-existent file', async () => {
    await deletePath({ targetPath: join(wd, 'unknown'), force: true })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/nothing to delete/))
  })

  test('should delete file', async () => {
    await expect(deletePath({ targetPath: join(wd, 'del', 'test.file1'), force: true })).resolves.not.toThrow()
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/deleted from project/))
    expect(existsSync(join(wd, 'del', 'test.file1'))).toBe(false)
  })

  test('should delete folder with all contents', async () => {
    await expect(deletePath({ targetPath: join(wd, 'del'), force: true })).resolves.not.toThrow()
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/deleted from project/))
    expect(existsSync(join(wd, 'del', 'a', 'test.file1'))).toBe(false)
    expect(existsSync(join(wd, 'del', 'test.file2'))).toBe(false)
    expect(existsSync(join(wd, 'del'))).toBe(false)
  })

  test('should be rejected when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(deletePath({ targetPath: 'a', force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should do nothing when user aborts deleting', async () => {
    setPromptSpy(['n'])
    await deletePath({ targetPath: join(wd, 'json-file.json') })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))
    expect(existsSync(join(wd, 'json-file.json'))).toBe(true)
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await deletePath({ targetPath: 'a' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will delete/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await deletePath({ targetPath: 'a', force: false, prompt: 'Custom prompt' })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
