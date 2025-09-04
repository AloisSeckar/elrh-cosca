import { beforeEach, describe, expect, test } from 'vitest'
import { parseQualifiedPath } from '../src/main'
import { getConsoleSpy } from './cosca-test-utils'

describe('Test parseQualifiedPath function', () => {

  let wd: string = ''
  let spy: any

  beforeEach(() => {
    wd = process.env.WORKSPACE_DIR!
    spy = getConsoleSpy('log')
  })

  test('should be defined', () => {
    expect(parseQualifiedPath).toBeDefined()
  })

  test('should parse basic package path', () => {
    expect(parseQualifiedPath('package:path/to/file')).toEqual({
      pkg: 'package',
      file: 'path/to/file'
    })
  })

  test('should parse scoped package path', () => {
    expect(parseQualifiedPath('@scope/package:path/to/file')).toEqual({
      pkg: '@scope/package',
      file: 'path/to/file'
    })
  })

  test('should throw an error for invalid paths', () => {
    expect(() => parseQualifiedPath('path')).toThrowError(
      'Invalid input "path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath('package:package:path')).toThrowError(
      'Invalid input "package:package:path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath('package:')).toThrowError(
      'Invalid input "package:". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath(':path')).toThrowError(
      'Invalid input ":path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath('package/:path')).toThrowError(
      'Invalid package name in input: "package/".'
    )
    expect(() => parseQualifiedPath('pack age:path')).toThrowError(
      'Invalid package name in input: "pack age".'
    )
  })
})
