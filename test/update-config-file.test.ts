import { beforeEach, describe, expect, test } from 'vitest'
import { updateConfigFile } from '../src/main'
import { getConsoleSpy, readNormalizedFile } from './cosca-test-utils'

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

})
