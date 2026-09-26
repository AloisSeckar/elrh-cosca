import { beforeEach, describe, expect, test, vi} from 'vitest'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { updateConfigFile } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

// `checkPath` function must be mocked as it disallows paths outside of CWD
// which is not possible because tests run in temporary folder
vi.mock('../src/_private/check-path', () => ({
  checkPath: vi.fn((_path: string) => {
    return { valid: true }
  })
}))

describe('Test updateConfigFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateConfigFile).toBeDefined()
  })

  test('should fail because of non-existent file', async () => {
    await expect(updateConfigFile({ targetFile: `${wd}/uknown`, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/No .* found/)
  })

  test('should fail because of non-existent file when createMissing is false', async () => {
    await expect(updateConfigFile({ targetFile: `${wd}/uknown`, newConfig: { testKey1: 0 }, createMissing: false, force: true })).rejects.toThrow(/No .* found/)
  })

  test('should create non-existent file when createMissing is true', async () => {
    await updateConfigFile({ targetFile: `${wd}/new-config/created.ts`, newConfig: { testKey1: 'value', testKey2: { nestedKey: true } }, createMissing: true, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))

    await expect(readNormalizedFile(wd, 'new-config/created.ts')).toMatchFileSnapshot('snapshots/created-config-file.ts')
  })

  test('should not create non-existent file when user declines', async () => {
    setPromptSpy(['y', 'n'])
    await updateConfigFile({ targetFile: `${wd}/new-config/declined.ts`, newConfig: { testKey1: 'value' }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/Creation of .* skipped/))
    expect(existsSync(join(wd, 'new-config/declined.ts'))).toBe(false)
  })

  test('should create non-existent file when user confirms', async () => {
    setPromptSpy(['y', 'y'])
    await updateConfigFile({ targetFile: `${wd}/new-config/confirmed.ts`, newConfig: { testKey1: 'value', testKey2: { nestedKey: true } }, createMissing: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file created/))
    await expect(readNormalizedFile(wd, 'new-config/confirmed.ts')).toMatchFileSnapshot('snapshots/created-config-file.ts')
  })

  test('should fail because of CJS format', async () => {
    await expect(updateConfigFile({ targetFile: `${wd}/config-file.cjs`, newConfig: { testKey1: 0 }, force: true })).rejects.toThrow(/currently not possible to handle CommonJS/)
  })

  test('should add the new key and values (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should not add new same value in key again (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should add the new value under existing key (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-2.ts')
  })

  test('should add the nested key under existing (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should not add the nested key under existing again (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should replace nested key (default export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-default.ts`, newConfig: { testKey4: { nestedKey: { deeper: true } } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-4.ts')
  })

  test('should add the new key and values (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey1: 'value', testKey2: 2, testKey3: true }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should not add new same value in key again (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey1: 'value' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should add the new value under existing key (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey4: 'value2' }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-2.ts')
  })

  test('should add the nested key under existing (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should not add the nested key under existing again (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: 'nested' } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should replace nested key (named export)', async () => {
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey4: { nestedKey: { deeper: true } } }, force: true })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateConfigFile({ targetFile: `${wd}/config-file-named.ts`, newConfig: { testKey5: 0 } })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  // test prompting
  
  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile({ targetFile: `a`, newConfig: { testKey5: 0 } })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/This will update/) })
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile({ targetFile: `a`, newConfig: { testKey5: 0 }, force: false, prompt: "Custom prompt" })
    expect(uSpy).toHaveBeenCalledWith({ question: expect.stringMatching(/Custom prompt/) })
  })

})
