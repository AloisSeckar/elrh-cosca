import { beforeEach, describe, expect, test, vi } from 'vitest'
import { fileExists } from '../src/main'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test hasText checker', () => {

  let wd: string = ''

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
  })

  test('should be defined', () => {
    expect(fileExists).toBeDefined()
  })
  test('should find the existing file', async () => {
    expect(fileExists(`${wd}/text-file.txt`)).toBe(true)
  })
  
  test('should not find the non-existent file', async () => {
    expect(fileExists(`${wd}/unknown-file.txt`)).toBe(false)
  })

})
