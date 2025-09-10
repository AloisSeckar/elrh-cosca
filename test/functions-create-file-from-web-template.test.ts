import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, test } from 'vitest'
import { createFileFromWebTemplate } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile } from './cosca-test-utils'

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
    await expect(createFileFromWebTemplate(`path`, `${wd}/web-file-copy.txt`, true)).rejects.toThrow(/Failed to fetch template from external source/)
    
    expect(existsSync(`${wd}/web-file-copy.txt`)).toBe(false)
  })

  test('should create the file from web source', async () => {
    // data must be available via node:https.get
    await createFileFromWebTemplate(`https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/vitest.config.ts.template`, `${wd}/web-file-copy.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'web-file-copy.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })

  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await createFileFromWebTemplate(`https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/vitest.config.ts.template`, `${wd}/web-file-copy-2.txt`)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not created
    expect(existsSync(`${wd}/web-file-copy-2.txt`)).toBe(false)
  })

  test('should do nothing when user aborts overwriting', async () => {
    setPromptSpy(['y', 'n'])
    await createFileFromWebTemplate(`https://raw.githubusercontent.com/AloisSeckar/nuxt-spec/refs/heads/main/config/vitest.config.ts.template`, `${wd}/web-file-copy.txt`)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Aborted/))

    // file not changed
    await expect(readNormalizedFile(wd, 'web-file-copy.txt')).toMatchFileSnapshot('snapshots/created-web-file.txt')
  })

})
