import { beforeEach, describe, expect, test } from 'vitest'
import { updateJsonFile } from '../src/main'
import { getConsoleSpy, readNormalizedFile, setPromptSpy } from './cosca-test-utils'

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

  test('should fail because of non-existent file', async () => {
    await expect(updateJsonFile(`${wd}/uknown`, 'cosca', { testKey1: 0 }, true)).rejects.toThrow(/skipping updates/)
  })

  test('should fail because of invalid JSON', async () => {
    await expect(updateJsonFile(`${wd}/text-file.txt`, 'cosca', { testKey1: 0 }, true)).rejects.toThrow(/Could not parse/)
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

  test('should add nested key', async () => {
    await updateJsonFile(`${wd}/json-file.json`, 'cosca', { testKey5: { nestedKey: 'nested' } }, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-3.json')
  })
    
  test('should do nothing when user aborts creating', async () => {
    setPromptSpy(['n'])
    await updateJsonFile(`${wd}/json-file.json`, 'cosca', { testKey6: 0 })

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/skipped/))

    // file not updated
    await expect(readNormalizedFile(wd, 'json-file.json')).toMatchFileSnapshot('snapshots/updated-json-file-3.json')
  })

})
