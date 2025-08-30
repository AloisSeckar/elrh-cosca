import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { beforeEach, describe, expect, test, vi } from 'vitest'
import { updateTextFile } from '../src/main'

// move to helper file if more test files use it
function readFileContents(dir: string, file: string): string[] {
    const source = join(dir, file)
    const content = readFileSync(source, 'utf8')
    return content.replace(/\r\n/g, '\n').split('\n')
}

describe('Test updateTextFile function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  test('should be defined', () => {
    expect(updateTextFile).toBeDefined()
  })

  test('should add the new line', () => {
    updateTextFile(`${wd}/test-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file updated/))

    const lines = readFileContents(wd, 'test-file.txt')
    expect(lines).toHaveLength(5) // function adds +1 new line
    expect(lines[3]).toBe('Row 3')
  })

  test('should not add new same line again', () => {
    updateTextFile(`${wd}/test-file.txt`, ['Row 3'], true)

    expect(spy).toHaveBeenCalledWith(expect.stringMatching(/file already up to date/))

    const lines = readFileContents(wd, 'test-file.txt')
    expect(lines).toHaveLength(5)
    expect(lines[3]).toBe('Row 3')
  })

})
