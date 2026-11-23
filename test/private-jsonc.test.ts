import { describe, expect, test } from 'vitest'
import {
  createJsoncNode, deleteObjectKey, getObjectNode, isJsoncArray, isJsoncObject,
  isJsoncPrimitive, jsoncToValue, parseJsoncDocument, setObjectNode, stringifyJsoncDocument,
} from '../src/_private/jsonc'

describe('Test jsonc parser and serializer', () => {

  test('should parse and stringify standard JSON identically to JSON.stringify', () => {
    const raw = '{"str":"hello\\n\\"world\\"\\u0041","num":-12.5e+2,"zero":0,"bool":[true,false,null],"emptyObj":{},"emptyArr":[]}'
    const doc = parseJsoncDocument(raw)
    const parsed = JSON.parse(raw)
    expect(jsoncToValue(doc.root)).toEqual(parsed)
    expect(stringifyJsoncDocument(doc)).toBe(JSON.stringify(parsed, null, 2) + '\n')
  })

  test('should preserve line comments, block comments, inline comments and inner comments', () => {
    const input = [
      '// file header',
      '{',
      '  // before a',
      '  "a": 1, // inline a',
      '  /* before b */',
      '  "b": [',
      '    // before item 1',
      '    "x", // inline x',
      '    "y",',
      '    // trailing array comment',
      '  ],',
      '  "c": "https://example.com /* not a comment */",',
      '  // trailing object comment',
      '}',
      '// file footer',
    ].join('\n')

    const doc = parseJsoncDocument(input)
    expect(jsoncToValue(doc.root)).toEqual({
      a: 1,
      b: ['x', 'y'],
      c: 'https://example.com /* not a comment */',
    })

    expect(stringifyJsoncDocument(doc)).toBe([
      '// file header',
      '{',
      '  // before a',
      '  "a": 1, // inline a',
      '  /* before b */',
      '  "b": [',
      '    // before item 1',
      '    "x", // inline x',
      '    "y"',
      '    // trailing array comment',
      '  ],',
      '  "c": "https://example.com /* not a comment */"',
      '  // trailing object comment',
      '}',
      '// file footer',
      '',
    ].join('\n'))
  })

  test('should handle comments around colons, inline block comments, and multi-line block comments', () => {
    const input = [
      '{',
      '  "a" /* before colon */ : /* after colon */ 1 /* before comma */, /* after comma */',
      '  "b": 2, /* belongs to c */ "c": 3',
      '}',
    ].join('\n')

    const doc = parseJsoncDocument(input)
    expect(jsoncToValue(doc.root)).toEqual({ a: 1, b: 2, c: 3 })
    const out = stringifyJsoncDocument(doc)
    expect(out).toContain('/* before colon */')
    expect(out).toContain('/* after colon */')
    expect(out).toContain('/* before comma */ /* after comma */')
    expect(out).toContain('/* belongs to c */')
  })

  test('should handle empty objects and arrays containing comments', () => {
    const input = '{\n  "obj": {\n    // empty obj\n  },\n  "arr": [\n    /* empty arr */\n  ]\n}\n'
    const doc = parseJsoncDocument(input)
    expect(jsoncToValue(doc.root)).toEqual({ obj: {}, arr: [] })
    expect(stringifyJsoncDocument(doc)).toBe(input)
  })

  test('should resolve duplicate keys with last-write-wins', () => {
    const doc = parseJsoncDocument('{\n  // first\n  "a": 1,\n  // second\n  "a": 2 // last\n}')
    expect(jsoncToValue(doc.root)).toEqual({ a: 2 })
    const out = stringifyJsoncDocument(doc)
    expect(out).toContain('// first')
    expect(out).toContain('// second')
    expect(out).toContain('// last')
    expect(out).toContain('"a": 2')
  })

  test('should handle comma on next line after value', () => {
    const doc = parseJsoncDocument('{\n  "a": 1\n  ,\n  "b": 2\n}')
    expect(jsoncToValue(doc.root)).toEqual({ a: 1, b: 2 })
  })

  test('should support AST helper functions', () => {
    const obj = createJsoncNode({ a: 1, b: ['x'] })
    expect(isJsoncObject(obj)).toBe(true)
    expect(isJsoncArray(obj)).toBe(false)
    expect(isJsoncPrimitive(obj)).toBe(false)

    if (isJsoncObject(obj)) {
      const a = getObjectNode(obj, 'a')
      const b = getObjectNode(obj, 'b')
      expect(isJsoncPrimitive(a)).toBe(true)
      expect(isJsoncArray(b)).toBe(true)

      setObjectNode(obj, 'a', createJsoncNode(2))
      setObjectNode(obj, 'c', createJsoncNode(null))
      expect(jsoncToValue(obj)).toEqual({ a: 2, b: ['x'], c: null })

      expect(deleteObjectKey(obj, 'c')).toBe(true)
      expect(deleteObjectKey(obj, 'missing')).toBe(false)
      expect(jsoncToValue(obj)).toEqual({ a: 2, b: ['x'] })
    }
  })

  test.each([
    ['empty input', ''],
    ['comments only', '// just a comment'],
    ['trailing garbage', '{} extra'],
    ['unterminated object', '{"a": 1'],
    ['unterminated array', '[1, 2'],
    ['unquoted key', '{ a: 1 }'],
    ['missing colon', '{ "a" 1 }'],
    ['missing value', '{ "a": }'],
    ['missing comma in object', '{ "a": 1 "b": 2 }'],
    ['missing comma in array', '[1 2]'],
    ['double comma in array', '[1,,2]'],
    ['leading comma in object', '{, "a": 1}'],
    ['unterminated string', '"hello'],
    ['unescaped control char', '"hello\nworld"'],
    ['unterminated escape', '"hello\\'],
    ['invalid escape', '"\\x"'],
    ['invalid unicode escape', '"\\u123g"'],
    ['unterminated block comment', '/* no end'],
    ['leading zero number', '01'],
    ['bare minus', '-'],
    ['trailing dot number', '1.'],
    ['incomplete exponent', '1e+'],
    ['invalid literal true', 'tru'],
    ['invalid literal false', 'fals'],
    ['invalid literal null', 'nul'],
    ['unexpected token', '@'],
  ])('should throw SyntaxError on invalid input: %s', (_label, input) => {
    expect(() => parseJsoncDocument(input)).toThrow(SyntaxError)
  })

})
