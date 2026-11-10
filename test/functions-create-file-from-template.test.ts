import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createFileFromTemplate } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { getStdoutSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

// wraps the real `copyFileSync` so a single call can be stubbed
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, copyFileSync: vi.fn(actual.copyFileSync) }
})

describe('Test createFileFromTemplate function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getStdoutSpy()
  })

  test('should be defined', () => {
    expect(createFileFromTemplate).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: 'a', force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should fail when the file is not created', async () => {
    vi.mocked(copyFileSync).mockImplementationOnce(() => {})
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/local-file-missing.txt`, force: true })).rejects.toThrow(/Failed to create/)
  })

  test('should overwrite existing file when user confirms', async () => {
    writeFileSync(`${wd}/local-file-overwrite.txt`, 'old')
    setPromptSpy(['y', 'y'])
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/local-file-overwrite.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))
    expect(readFileSync(`${wd}/local-file-overwrite.txt`, 'utf8')).toContain('Row 1')
  })
  
  test('should fail because of invalid path', async () => {
    await expect(createFileFromTemplate({ templateFile: `path`, targetPath: `${wd}/local-file-copy.txt`, force: true })).rejects.toThrow(/Invalid input/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should fail when template path escapes the package', async () => {
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:../../outside.txt`, targetPath: `${wd}/escape-copy.txt`, force: true })).rejects.toThrow(/must be inside the package/)
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:test/../../outside.txt`, targetPath: `${wd}/escape-copy.txt`, force: true })).rejects.toThrow(/must be inside the package/)

    expect(existsSync(`${wd}/escape-copy.txt`)).toBe(false)
  })

  test('should fail when package name is a traversal', async () => {
    await expect(createFileFromTemplate({ templateFile: `..:package.json`, targetPath: `${wd}/escape-copy.txt`, force: true })).rejects.toThrow(/Invalid package name/)

    expect(existsSync(`${wd}/escape-copy.txt`)).toBe(false)
  })

  test('should fail because of uknown path', async () => {
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:path`, targetPath: `${wd}/local-file-copy.txt`, force: true })).rejects.toThrow(/Template file not found at/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should create the file from local source', async () => {
    // path must be - package name:relative/path/to/file
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/local-file-copy.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'local-file-copy.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  test('should create the file even in non-existent directory', async () => {
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/first/second/file.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'first/second/file.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should create the file from NPM source', async () => {
    await createFileFromTemplate({ templateFile: `vitest:README.md`, targetPath: `${wd}/npm-file-copy.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await createFileFromTemplate({ templateFile: `vitest:README.md`, targetPath: `${wd}/npm-file-copy-2.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not created
    expect(existsSync(`${wd}/local-file-copy-2.txt`)).toBe(false)
  })

  test('should do nothing when user aborts overwriting', async () => {
    setPromptSpy(['y', 'n'])
    await createFileFromTemplate({ templateFile: `vitest:LICENSE.md`, targetPath: `${wd}/npm-file-copy.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Aborted/))

    // file not changed
    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  test('should not log when silent is true', async () => {
    spy.mockClear()
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/silent-local-file.txt`, force: true, silent: true })
    expect(spy).not.toHaveBeenCalled()
    expect(existsSync(`${wd}/silent-local-file.txt`)).toBe(true)

    setPromptSpy(['n'])
    await createFileFromTemplate({ templateFile: `vitest:README.md`, targetPath: `${wd}/silent-local-file-2.txt`, silent: true })
    expect(spy).not.toHaveBeenCalled()
  })

  test('should log when silent is false', async () => {
    spy.mockClear()
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetPath: `${wd}/silent-local-file-3.txt`, force: true, silent: false })
    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate({ templateFile: `a`, targetPath: `b` })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will create/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate({ templateFile: `a`, targetPath: `b`, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })
  
})
