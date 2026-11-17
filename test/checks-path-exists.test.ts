import { beforeEach, describe, expect, test, vi } from 'vitest'
import { pathExists } from '../src/main'
import { checkPath } from '../src/_private/check-path'

// required to avoid CWD containment in tests
vi.mock('../src/_private/check-path', async () => (await import('./cosca-test-mocks')).mockCheckPath())

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
