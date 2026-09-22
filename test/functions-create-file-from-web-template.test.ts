import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { createFileFromWebTemplate } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

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
    await createFileFromWebTemplate({ url: `https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/templates/vitest.config.ts.template`, targetFile: `${wd}/first/second/file.txt`, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'first/second/file.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
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
