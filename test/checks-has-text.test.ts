import { beforeEach, describe, expect, test, vi } from 'vitest'
import { hasText } from '../src/main'

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
    expect(hasText).toBeDefined()
  })
  
  test('should fail because of non-existent file', async () => {
    expect(() => hasText(`${wd}/unknown`, 'Row 1')).toThrow(/cannot check its contents/)
  })
  
  test('should find the existing row', async () => {
    expect(hasText(`${wd}/text-file.txt`, 'Row 1')).toBe(true)
  })
  
  test('should find the existing row after trimming white spaces', async () => {
    expect(hasText(`${wd}/text-file.txt`, '  Row 1  ')).toBe(true)
  })
  
  test('should not find the non-existent row', async () => {
    expect(hasText(`${wd}/text-file.txt`, 'Row 11')).toBe(false)
  })

  test('should not find the incomplete row', async () => {
    expect(hasText(`${wd}/text-file.txt`, 'Row')).toBe(false)
  })
  
})
