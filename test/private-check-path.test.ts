import { describe, expect, test, vi } from "vitest"
import { checkPath } from "../src/_private/check-path"
import { join, resolve, sep } from "path"
import { mkdirSync, mkdtempSync, rmSync, symlinkSync } from "node:fs"
import { tmpdir } from "node:os"

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

  test('path resolved outside of CWD is an invalid path', async () => {
    // CWD changing between the calls simulates a path escaping the working directory
    const cwdSpy = vi.spyOn(process, 'cwd')
      .mockReturnValueOnce(resolve(sep, 'cosca-a'))
      .mockReturnValueOnce(resolve(sep, 'cosca-b'))
    try {
      const check = checkPath('a')
      expect(check.valid).toBe(false)
      expect(check.error).toContain(`Path outside of CWD not allowed`)
    } finally {
      cwdSpy.mockRestore()
    }
  })

  describe('Verify symlinks resolution', () => {
    function withLinks(run: (cwd: string) => void) {
      const base = mkdtempSync(join(tmpdir(), 'cosca-link-'))
      const cwd = join(base, 'project')
      const outside = join(base, 'outside')
      mkdirSync(cwd)
      mkdirSync(join(outside, 'sub'), { recursive: true })
      mkdirSync(join(cwd, 'real'))
      // junction needs no elevated rights on Windows and is ignored elsewhere
      symlinkSync(outside, join(cwd, 'link'), 'junction')
      symlinkSync(join(cwd, 'real'), join(cwd, 'inner-link'), 'junction')
      symlinkSync(join(base, 'missing'), join(cwd, 'dangling'), 'junction')
      const cwdSpy = vi.spyOn(process, 'cwd').mockReturnValue(cwd)
      try {
        run(cwd)
      } finally {
        cwdSpy.mockRestore()
        rmSync(base, { recursive: true, force: true })
      }
    }

    test('path through a symlink leading outside of CWD is invalid', () => {
      withLinks(() => {
        for (const path of ['link', 'link/sub', 'link/new/file.txt']) {
          const check = checkPath(path)
          expect(check.valid).toBe(false)
          expect(check.error).toContain('Path resolves outside of CWD via symlink')
        }
      })
    })

    test('dangling symlink is an invalid path', () => {
      withLinks(() => {
        expect(checkPath('dangling').valid).toBe(false)
        expect(checkPath('dangling/file.txt').valid).toBe(false)
      })
    })

    test('symlink staying inside of CWD and non-existent paths are valid', () => {
      withLinks(() => {
        expect(checkPath('inner-link/file.txt').valid).toBe(true)
        expect(checkPath('real').valid).toBe(true)
        expect(checkPath('not/yet/created.txt').valid).toBe(true)
      })
    })
  })

}) 
