import { beforeEach, describe, expect, test } from 'vitest'
import { updateConfigFile } from '../src/main'
import { getConsoleSpy, setPromptSpy, readNormalizedFile, getPromptUserSpy } from './cosca-test-utils'

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
    await expect(updateConfigFile(`${wd}/uknown`, { testKey1: 0 }, true)).rejects.toThrow(/No .* found/)
  })

  test('should fail because of CJS format', async () => {
    await expect(updateConfigFile(`${wd}/config-file.cjs`, { testKey1: 0 }, true)).rejects.toThrow(/currently not possible to handle CommonJS/)
  })

  test('should add the new key and values (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey1: 'value', testKey2: 2, testKey3: true }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should not add new same value in key again (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey1: 'value' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-1.ts')
  })

  test('should add the new value under existing key (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey4: 'value2' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-2.ts')
  })

  test('should add the nested key under existing (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey4: { nestedKey: 'nested' } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should not add the nested key under existing again (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey4: { nestedKey: 'nested' } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-3.ts')
  })

  test('should replace nested key (default export)', async () => {
    await updateConfigFile(`${wd}/config-file-default.ts`, { testKey4: { nestedKey: { deeper: true } } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-default.ts')).toMatchFileSnapshot('snapshots/updated-config-file-default-4.ts')
  })

  test('should add the new key and values (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey1: 'value', testKey2: 2, testKey3: true }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should not add new same value in key again (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey1: 'value' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-1.ts')
  })

  test('should add the new value under existing key (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey4: 'value2' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-2.ts')
  })

  test('should add the nested key under existing (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey4: { nestedKey: 'nested' } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should not add the nested key under existing again (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey4: { nestedKey: 'nested' } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-3.ts')
  })

  test('should replace nested key (named export)', async () => {
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey4: { nestedKey: { deeper: true } } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateConfigFile(`${wd}/config-file-named.ts`, { testKey5: 0 })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'config-file-named.ts')).toMatchFileSnapshot('snapshots/updated-config-file-named-4.ts')
  })
  
  // test prompting
  
  test('should not display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile(`a`, { testKey5: 0 })
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/This will update/))
  })

  test('should display custom prompt', async () => {
    const uSpy = getPromptUserSpy()
    await updateConfigFile(`a`, { testKey5: 0 }, false, "Custom prompt")
    expect(uSpy).toHaveBeenCalledWith(expect.stringMatching(/Custom prompt/))
  })

})
