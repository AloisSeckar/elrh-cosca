import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createFileFromTemplate } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test createFileFromTemplate function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(createFileFromTemplate).toBeDefined()
  })
  
  test('should fail because of invalid path', async () => {
    await expect(createFileFromTemplate({ templateFile: `path`, targetFile: `${wd}/local-file-copy.txt`, force: true })).rejects.toThrow(/Invalid input/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should fail because of uknown path', async () => {
    await expect(createFileFromTemplate({ templateFile: `elrh-cosca:path`, targetFile: `${wd}/local-file-copy.txt`, force: true })).rejects.toThrow(/Template file not found at/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should create the file from local source', async () => {
    // path must be - package name:relative/path/to/file
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetFile: `${wd}/local-file-copy.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'local-file-copy.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  test('should create the file even in non-existent directory', async () => {
    await createFileFromTemplate({ templateFile: `elrh-cosca:test/fixtures/text-file.txt`, targetFile: `${wd}/first/second/file.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'first/second/file.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should create the file from NPM source', async () => {
    await createFileFromTemplate({ templateFile: `vitest:README.md`, targetFile: `${wd}/npm-file-copy.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await createFileFromTemplate({ templateFile: `vitest:README.md`, targetFile: `${wd}/npm-file-copy-2.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not created
    expect(existsSync(`${wd}/local-file-copy-2.txt`)).toBe(false)
  })

  test('should do nothing when user aborts overwriting', async () => {
    setPromptSpy(['y', 'n'])
    await createFileFromTemplate({ templateFile: `vitest:LICENSE.md`, targetFile: `${wd}/npm-file-copy.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Aborted/))

    // file not changed
    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate({ templateFile: `a`, targetFile: `b` })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will create/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate({ templateFile: `a`, targetFile: `b`, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })
  
})
