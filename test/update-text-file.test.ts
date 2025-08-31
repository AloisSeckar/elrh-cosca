import { beforeEach, describe, expect, test } from 'vitest'
import { updateTextFile } from '../src/main'
import { getConsoleSpy, readNormalizedFile } from './cosca-test-utils'

describe('Test updateTextFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(updateTextFile).toBeDefined()
  })

  test('should add the new line', async () => {
    await updateTextFile(`${wd}/text-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file.txt')
  })

  test('should not add new same line again', async () => {
    await updateTextFile(`${wd}/text-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    await expect(readNormalizedFile(wd, 'text-file.txt')).toMatchFileSnapshot('snapshots/updated-text-file.txt')
  })

})
