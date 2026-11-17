import { describe, expect, test } from 'vitest'
import { parseKey } from '../src/_private/parse-key'

describe('Test parseKey helper', () => {

  test('should split by dots', () => {
    expect(parseKey('a.b.c')).toEqual(['a', 'b', 'c'])
    expect(parseKey('a')).toEqual(['a'])
  })

  test('should keep escaped dots in the segment', () => {
    expect(parseKey('chat\\.tools\\.autoApprove')).toEqual(['chat.tools.autoApprove'])
    expect(parseKey('a.b\\.c.d')).toEqual(['a', 'b.c', 'd'])
  })

  test('should unescape backslashes', () => {
    expect(parseKey('a\\\\.b')).toEqual(['a\\', 'b'])
    expect(parseKey('a\\\\\\.b')).toEqual(['a\\.b'])
  })

  test('should keep other and trailing backslashes as they are', () => {
    expect(parseKey('a\\b.c')).toEqual(['a\\b', 'c'])
    expect(parseKey('a\\')).toEqual(['a\\'])
  })

  test('should keep empty segments', () => {
    expect(parseKey('')).toEqual([''])
    expect(parseKey('a..b')).toEqual(['a', '', 'b'])
    expect(parseKey('.a.')).toEqual(['', 'a', ''])
  })
})
