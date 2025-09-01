import { beforeEach, describe, expect, test } from 'vitest'
import { createFileFromTemplate } from '../src/main'
import { getConsoleSpy, readNormalizedFile } from './cosca-test-utils'

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

  test('should create the file from local source', async () => {
    // path must be - package name:relative/path/to/file
    await createFileFromTemplate(`elrh-cosca:test/fixtures/text-file.txt`, `${wd}/local-file-copy.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'local-file-copy.txt')).toMatchFileSnapshot('snapshots/created-local-file.txt')
  })

  // vitest must be installed (but this is a requirement for running vitest tests)
  test('should create the file from NPM source', async () => {
    // path must be - package name:relative/path/to/file
    await createFileFromTemplate(`vitest:README.md`, `${wd}/npm-file-copy.txt`, true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/successfully created/))

    await expect(readNormalizedFile(wd, 'npm-file-copy.txt')).toMatchFileSnapshot('snapshots/created-npm-file.txt')
  })

})
