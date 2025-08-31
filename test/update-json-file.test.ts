import { beforeEach, describe, expect, test } from 'vitest'
import { updateJsonFile } from '../src/main'
import { getConsoleSpy, readNormalizedFile } from './cosca-test-utils'

describe('Test updateJsonFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateJsonFile).toBeDefined()
  })

  test('should add the new key and values', async () => {
    await updateJsonFile(`${wd}/json-file.json`, 'cosca', { testKey1: 'value', testKey2: 2, testKey3: true }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-1.json')
  })

  test('should not add new same value in key again', async () => {
    await updateJsonFile(`${wd}/json-file.json`, 'cosca', { testKey1: 'value' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-1.json')
  })

  test('should add the new value under existing key', async () => {
    await updateJsonFile(`${wd}/json-file.json`, 'cosca', { testKey4: 'value2' }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-2.json')
  })

})
