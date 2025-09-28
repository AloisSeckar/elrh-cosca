import { beforeEach, describe, expect, test } from 'vitest'
import { deletePath } from '../src/main'
import { getConsoleSpy} from './cosca-test-utils'
import { existsSync } from 'fs'
import { join } from 'path'
import { vi } from 'vitest'

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
    await deletePath(join(wd, 'unknown'), true)
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/nothing to delete/))
  })

  test('should delete file', async () => {
    await expect(deletePath(join(wd, 'del', 'test.file1'), true)).resolves.not.toThrow()
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/deleted from project/))
    expect(existsSync(join(wd, 'del', 'test.file1'))).toBe(false)
  })

  test('should delete folder with all contents', async () => {
    await expect(deletePath(join(wd, 'del'), true)).resolves.not.toThrow()
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/deleted from project/))
    expect(existsSync(join(wd, 'del', 'a', 'test.file1'))).toBe(false)
    expect(existsSync(join(wd, 'del', 'test.file2'))).toBe(false)
    expect(existsSync(join(wd, 'del'))).toBe(false)
  })

})
