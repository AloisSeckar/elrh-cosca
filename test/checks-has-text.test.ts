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
    expect(() => hasText({ targetFile: `${wd}/unknown`, pattern: 'Row 1' })).toThrow(/cannot check its contents/)
  })
  
  test('should find the existing row', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: 'Row 1' })).toBe(true)
  })
  
  test('should find the existing row after trimming white spaces', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: '  Row 1  ' })).toBe(true)
  })
  
  test('should not find the non-existent row', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: 'Row 11' })).toBe(false)
  })

  test('should find the partial match by default', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: 'Row' })).toBe(true)
  })

  test('should allow partial matches when exact is false', () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: 'Row', exact: false })).toBe(true)
  })

  test('should not find the partial match if exact match is required', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: 'Row', exact: true })).toBe(false)
  })

  test('should find the existing regular expression match', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: /R.w/ })).toBe(true)
  })

  test('should not find the non-existent regular expression match', async () => {
    expect(hasText({ targetFile: `${wd}/text-file.txt`, pattern: /R..w/ })).toBe(false)
  })
  
})
