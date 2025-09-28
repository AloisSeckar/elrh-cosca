import { describe, expect, test } from "vitest"
import { checkPath } from "../src/_private/check-path"
import { join } from "path"

describe('Test checkPath function', () => {
  test('simple file is a valid path', async () => {
    const check = checkPath('a')
    expect(check.valid).toBe(true)
    expect(check.error).toBeUndefined()
  })

  test('nested file is a valid path', async () => {
    const check = checkPath(join('a', 'b'))
    expect(check.valid).toBe(true)
    expect(check.error).toBeUndefined()
  })

  test('empty file is an invalid path', async () => {
    const check = checkPath('')
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path cannot be empty`)
  })

  test('unix absolute path is an invalid path', async () => {
    const check = checkPath('/a')
    expect(check.error).toBeDefined()
    expect(check.error).toContain(`Path must be relative to CWD`)
  })

  test('windows drive absolute path is an invalid path', async () => {
    const check = checkPath('C:\\a')
    expect(check.error).toBeDefined()
    expect(check.error).toContain(`Path must be relative to CWD`)
  })

  test('mixed separators is an invalid path', async () => {
    const check = checkPath('a/b\\c')
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path contains mixed separators`)
  })

  test('colon in path is an invalid path', async () => {
    const check = checkPath(join('a', 'b:c'))
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path contains illegal characters`)
  })

  test('questionmark in path is an invalid path', async () => {
    const check = checkPath(join('a', 'b?c'))
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path contains illegal characters`)
  })

  test('obvious path traversal is an invalid path', async () => {
    const check = checkPath(join('..', 'a'))
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path traversal not allowed`)
  })

  test('nested path traversal is an invalid path', async () => {
    const check = checkPath(join('a', '..', '..', 'b'))
    expect(check.valid).toBe(false)
    expect(check.error).toContain(`Path traversal not allowed`)
  })
  
}) 
