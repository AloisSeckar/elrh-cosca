import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createFileFromWebTemplate } from '../src/main'
import { checkPath } from '../src/_private/check-path'
import { fetchFile } from '../src/_private/fetch-file'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

// wrap the real implementations so single calls can be stubbed
vi.mock('../src/_private/fetch-file', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/_private/fetch-file')>()
  return { ...actual, fetchFile: vi.fn(actual.fetchFile) }
})
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return { ...actual, writeFileSync: vi.fn(actual.writeFileSync) }
})

describe('Test createFileFromWebTemplate function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(createFileFromWebTemplate).toBeDefined()
  })

  test('should fail when path check fails', async () => {
    vi.mocked(fetchFile).mockResolvedValueOnce('content')
    vi.mocked(checkPath).mockReturnValueOnce({ valid: false, error: 'Invalid path' })
    await expect(createFileFromWebTemplate({ url: `https://example.com/file.txt`, targetFile: 'a', force: true })).rejects.toThrow(/Invalid path/)
  })

  test('should fail when the file is not created', async () => {
    vi.mocked(fetchFile).mockResolvedValueOnce('content')
    vi.mocked(writeFileSync).mockImplementationOnce(() => {})
    await expect(createFileFromWebTemplate({ url: `https://example.com/file.txt`, targetFile: `${wd}/web-file-missing.txt`, force: true })).rejects.toThrow(/Failed to create/)
  })

  test('should overwrite existing file when user confirms', async () => {
    writeFileSync(`${wd}/web-file-overwrite.txt`, 'old')
    vi.mocked(fetchFile).mockResolvedValueOnce('new content')
    setPromptSpy(['y', 'y'])
    await createFileFromWebTemplate({ url: `https://example.com/file.txt`, targetFile: `${wd}/web-file-overwrite.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))
    expect(readFileSync(`${wd}/web-file-overwrite.txt`, 'utf8')).toBe('new content')
  })
  
  test('should fail because of invalid path', async () => {
    await expect(createFileFromWebTemplate({ url: `path`, targetFile: `${wd}/web-file-copy.txt`, force: true })).rejects.toThrow(/Failed to fetch template from external source/)
    
    expect(existsSync(`${wd}/web-file-copy.txt`)).toBe(false)
  })

  test('should create the file from web source', async () => {
    // data must be available via node:https.get
    await createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/web-file-copy.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'web-file-copy.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })

  test('should create the file even in non-existent directory', async () => {
    await createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/web-first/second/file.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'web-first/second/file.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })

  test('should follow redirects', async () => {
    // github.com/.../raw/... redirects to raw.githubusercontent.com
    await createFileFromWebTemplate({ url: `https://github.com/AloisSeckar/nuxt-spec/raw/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/web-file-redirected.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'web-file-redirected.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })

  test('should fail on 4xx response', async () => {
    await expect(createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/does-not-exist.txt`, targetFile: `${wd}/web-file-404.txt`, force: true })).rejects.toThrow(/Failed to fetch file: 404/)

    expect(existsSync(`${wd}/web-file-404.txt`)).toBe(false)
  })

  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/web-file-copy-2.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not created
    expect(existsSync(`${wd}/web-file-copy-2.txt`)).toBe(false)
  })

  test('should do nothing when user aborts overwriting', async () => {
    setPromptSpy(['y', 'n'])
    await createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/web-file-copy.txt` })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Aborted/))

    // file not changed
    await expect(readNormalizedFile(wd, 'web-file-copy.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })
  
  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromWebTemplate({ url: `a`, targetFile: `b` })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will create/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromWebTemplate({ url: `a`, targetFile: `b`, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
