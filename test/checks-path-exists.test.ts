import { beforeEach, describe, expect, test, vi } from 'vitest'
import { pathExists } from '../src/main'
import { checkPath } from '../src/_private/check-path'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test pathExists checker', () => {

  let wd: string = ''

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
  })

  test('should be defined', () => {
    expect(pathExists).toBeDefined()
  })

  test('should fail when path check fails', () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    expect(() => pathExists({ targetPath: 'a' })).toThrow(/Invalid path/)
  })

  test('should find the existing file', async () => {
    expect(pathExists({ targetPath: `${wd}/text-file.txt` })).toBe(true)
  })
  
  test('should not find the non-existent file', async () => {
    expect(pathExists({ targetPath: `${wd}/unknown-file.txt` })).toBe(false)
  })

})
