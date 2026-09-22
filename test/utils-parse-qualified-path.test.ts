import { describe, expect, test } from 'vitest'
import { parseQualifiedPath } from '../src/main'

describe('Test parseQualifiedPath util function', () => {

  test('should be defined', () => {
    expect(parseQualifiedPath).toBeDefined()
  })

  test('should parse basic package path', () => {
    expect(parseQualifiedPath({ path: 'package:path/to/file' })).toEqual({
      pkg: 'package',
      file: 'path/to/file'
    })
  })

  test('should parse scoped package path', () => {
    expect(parseQualifiedPath({ path: '@scope/package:path/to/file' })).toEqual({
      pkg: '@scope/package',
      file: 'path/to/file'
    })
  })

  test('should throw an error for invalid paths', () => {
    expect(() => parseQualifiedPath({ path: 'path' })).toThrowError(
      'Invalid input "path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath({ path: 'package:package:path' })).toThrowError(
      'Invalid input "package:package:path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath({ path: 'package:' })).toThrowError(
      'Invalid input "package:". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath({ path: ':path' })).toThrowError(
      'Invalid input ":path". Expected format is "package:relative/path/to/file".'
    )
    expect(() => parseQualifiedPath({ path: 'package/:path' })).toThrowError(
      'Invalid package name in input: "package/".'
    )
    expect(() => parseQualifiedPath({ path: 'pack age:path' })).toThrowError(
      'Invalid package name in input: "pack age".'
    )
  })
})
