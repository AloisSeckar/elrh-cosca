import { existsSync } from 'node:fs'
import { beforeEach, describe, expect, test } from 'vitest'
import { createFileFromTemplate } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

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
    await expect(createFileFromTemplate(`path`, `${wd}/local-file-copy.txt`, true)).rejects.toThrow(/Invalid input/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should fail because of uknown path', async () => {
    await expect(createFileFromTemplate(`elrh-cosca:path`, `${wd}/local-file-copy.txt`, true)).rejects.toThrow(/Template file not found at/)
    
    expect(existsSync(`${wd}/local-file-copy.txt`)).toBe(false)
  })

  test('should create the file from local source', async () => {
    // path must be - package name:relative/path/to/file
    await createFileFromTemplate(`elrh-cosca:test/fixtures/text-file.txt`, `${wd}/local-file-copy.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'local-file-copy.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  test('should create the file even in non-existent directory', async () => {
    await createFileFromTemplate(`elrh-cosca:test/fixtures/text-file.txt`, `${wd}/first/second/file.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'first/second/file.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should create the file from NPM source', async () => {
    await createFileFromTemplate(`vitest:README.md`, `${wd}/npm-file-copy.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await createFileFromTemplate(`vitest:README.md`, `${wd}/npm-file-copy-2.txt`)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not created
    expect(existsSync(`${wd}/local-file-copy-2.txt`)).toBe(false)
  })

  test('should do nothing when user aborts overwriting', async () => {
    setPromptSpy(['y', 'n'])
    await createFileFromTemplate(`vitest:LICENSE.md`, `${wd}/npm-file-copy.txt`)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Aborted/))

    // file not changed
    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

  // test prompting

  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate(`a`, `b`)
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/This will create/))
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await createFileFromTemplate(`a`, `b`, false, "Custom prompt")
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/Custom prompt/))
  })
  
})
