import { describe, expect, test } from 'vitest'
import {
  createYamlNode, deleteMapKey, getMapNode, hasMapKey,
  isYamlMap, isYamlScalar, isYamlSeq, parseYamlDocument,
  setMapNode, stringifyYamlDocument, yamlNodeToJson,
} from '../src/_private/yaml'

describe('Test custom YAML parser and serializer', () => {

  test('should handle empty and comment-only documents', () => {
    const emptyDoc = parseYamlDocument('')
    expect(emptyDoc.contents).toBeNull()
    expect(stringifyYamlDocument(emptyDoc)).toBe('')

    const commentDoc = parseYamlDocument('# header 1\n\n# header 2\n')
    expect(commentDoc.contents).toBeNull()
    expect(commentDoc.commentBefore).toEqual(['# header 1', '', '# header 2'])
    expect(stringifyYamlDocument(commentDoc)).toBe('# header 1\n\n# header 2\n')
  })

  test('should parse and serialize root scalars, flow collections, and trailing comments', () => {
    const scalarDoc = parseYamlDocument('# before scalar\n"hello\\nworld\\r\\t\\0\\"\\\\\\/\\x41\\u0042" # inline\n# after scalar\n')
    expect(isYamlScalar(scalarDoc.contents)).toBe(true)
    expect(yamlNodeToJson(scalarDoc.contents!)).toBe('hello\nworld\r\t\0"\\/AB')
    expect(stringifyYamlDocument(scalarDoc)).toContain('# before scalar\n"hello')
    expect(stringifyYamlDocument(scalarDoc)).toContain('# after scalar\n')

    const emptyMapDoc = parseYamlDocument('{} # empty map\n')
    expect(isYamlMap(emptyMapDoc.contents)).toBe(true)
    expect(yamlNodeToJson(emptyMapDoc.contents!)).toEqual({})
    expect(stringifyYamlDocument(emptyMapDoc)).toBe('{} # empty map\n')

    const emptySeqDoc = parseYamlDocument('[] # empty seq\n')
    expect(isYamlSeq(emptySeqDoc.contents)).toBe(true)
    expect(yamlNodeToJson(emptySeqDoc.contents!)).toEqual([])
    expect(stringifyYamlDocument(emptySeqDoc)).toBe('[] # empty seq\n')

    const rootSeqDoc = parseYamlDocument('- a\n- b\n')
    expect(isYamlSeq(rootSeqDoc.contents)).toBe(true)
    expect(stringifyYamlDocument(rootSeqDoc)).toBe('- a\n- b\n')
  })

  test('should parse flow maps, flow sequences, quoted keys, and explicit keys', () => {
    const src = [
      "'single''quoted': 'it''s fine' # c1",
      '"double\\"key": { a: 1, "qk": "qv", b: [true, false, null, ~, -3.5e2], emptyVal:, } # c2',
      'indentlessSeq: # key comment',
      '- item1',
      '- # dash comment on block',
      '  # comment before nested seq',
      '  - nestedSeqItem',
      '-',
      '  # comment before map first key',
      '  k1: v1',
      '  k2: v2',
      '- k3: v3',
      '  k4: v4',
      '- # empty item with comment',
      '? explicitWithVal',
      ': 42',
      'emptyKeyAtEnd:',
    ].join('\n')

    const doc = parseYamlDocument(src)
    expect(isYamlMap(doc.contents)).toBe(true)
    const json = yamlNodeToJson(doc.contents!) as Record<string, unknown>
    expect(json["single'quoted"]).toBe("it's fine")
    expect(json['double"key']).toEqual({
      a: 1,
      qk: 'qv',
      b: [true, false, null, null, -350],
      emptyVal: null,
    })
    expect(json.indentlessSeq).toEqual([
      'item1',
      ['nestedSeqItem'],
      { k1: 'v1', k2: 'v2' },
      { k3: 'v3', k4: 'v4' },
      null,
    ])
    expect(json.explicitWithVal).toBe(42)
    expect(json.emptyKeyAtEnd).toBeNull()

    const out = stringifyYamlDocument(doc)
    expect(out).toContain("'single''quoted': 'it''s fine' # c1")
    expect(out).toContain('indentlessSeq: # key comment')
    expect(out).toContain('explicitWithVal: 42')
  })

  test('should serialize special strings, numbers, empty collections, and comments', () => {
    const node = createYamlNode({
      emptyStr: '',
      padded: ' a ',
      multiline: 'a\nb\rc\td\\e"f\x01\x7f',
      reserved: 'true',
      numStr: '123',
      indicator: '-lead',
      colonSpace: 'a: b',
      spaceHash: 'a # b',
      trailingColon: 'key:',
      negZero: -0,
      emptyMap: {},
      emptySeq: [],
      seqOfEmpty: [{}, []],
      'key:with:colon': 1,
    })

    const doc = { contents: node }
    const text = stringifyYamlDocument(doc)
    expect(text).toContain('emptyStr: ""')
    expect(text).toContain('padded: " a "')
    expect(text).toContain('multiline: "a\\nb\\rc\\td\\\\e\\"f\\u0001\\u007f"')
    expect(text).toContain('reserved: "true"')
    expect(text).toContain('numStr: "123"')
    expect(text).toContain('indicator: "-lead"')
    expect(text).toContain('colonSpace: "a: b"')
    expect(text).toContain('spaceHash: "a # b"')
    expect(text).toContain('trailingColon: "key:"')
    expect(text).toContain('negZero: 0')
    expect(text).toContain('emptyMap: {}')
    expect(text).toContain('emptySeq: []')
    expect(text).toContain('  - {}\n  - []')
    expect(text).toContain('"key:with:colon": 1')

    // Round-trip verification
    const reparsed = parseYamlDocument(text)
    expect(yamlNodeToJson(reparsed.contents!)).toEqual(yamlNodeToJson(node))
  })

  test('should manipulate map keys and reject prototype pollution keys', () => {
    const map = createYamlNode({ a: 1 })
    expect(isYamlMap(map)).toBe(true)
    if (isYamlMap(map)) {
      expect(hasMapKey(map, 'a')).toBe(true)
      expect(hasMapKey(map, 'b')).toBe(false)
      setMapNode(map, 'a', createYamlNode(2))
      setMapNode(map, 'b', createYamlNode(3))
      expect(yamlNodeToJson(getMapNode(map, 'a')!)).toBe(2)
      expect(deleteMapKey(map, 'b')).toBe(true)
      expect(deleteMapKey(map, 'b')).toBe(false)
    }

    const protoObj = JSON.parse('{"__proto__": {"polluted": true}}')
    expect(() => createYamlNode(protoObj)).toThrow(/Invalid YAML key '__proto__'/)
    expect(() => createYamlNode({ constructor: 1 })).toThrow(/Invalid YAML key 'constructor'/)
    expect(() => createYamlNode({ prototype: 1 })).toThrow(/Invalid YAML key 'prototype'/)
  })

  test('should reject invalid or unsupported YAML syntax', () => {
    expect(() => parseYamlDocument('  indentedRoot: 1')).toThrow(/Unexpected indentation/)
    expect(() => parseYamlDocument('\tkey: 1')).toThrow(/Tab indentation is not allowed/)
    expect(() => parseYamlDocument('---\na: 1')).toThrow(/Unsupported YAML document marker/)
    expect(() => parseYamlDocument('a: 1\n...\n')).toThrow(/Unsupported YAML document marker/)
    expect(() => parseYamlDocument('"scalar"\na: 1')).toThrow(/Unexpected content/)
    expect(() => parseYamlDocument('a:\n  b: 1\n    c: 2')).toThrow(/Unexpected indentation/)
    expect(() => parseYamlDocument('a: 1\n- item')).toThrow(/Unexpected sequence item in mapping/)
    expect(() => parseYamlDocument('a:\n  - x\n    - y')).toThrow(/Unexpected indentation/)
    expect(() => parseYamlDocument('? \na: 1')).toThrow(/Empty explicit key/)
    expect(() => parseYamlDocument('a: 1\ninvalid line')).toThrow(/Invalid mapping entry/)
    expect(() => parseYamlDocument('&anchor: 1')).toThrow(/Invalid YAML key/)
    expect(() => parseYamlDocument('a: 1\n"unclosed: 1')).toThrow(/Invalid mapping entry/)
    expect(() => parseYamlDocument('a: 1\n"quoted" noColon')).toThrow(/Invalid mapping entry/)
    expect(() => parseYamlDocument('? "bad"extra')).toThrow(/Invalid quoted key/)
    expect(() => parseYamlDocument('[a, b]: 1')).toThrow(/Complex collection keys are not supported/)
    expect(() => parseYamlDocument('a: &anchor val')).toThrow(/Unsupported YAML feature/)
    expect(() => parseYamlDocument('a: *alias')).toThrow(/Unsupported YAML feature/)
    expect(() => parseYamlDocument('a: !tag val')).toThrow(/Unsupported YAML feature/)
    expect(() => parseYamlDocument('a: |\n  block')).toThrow(/Unsupported YAML feature/)
    expect(() => parseYamlDocument("a: 'unclosed")).toThrow(/Unterminated quoted string/)
    expect(() => parseYamlDocument('a: "unclosed\\')).toThrow(/Unterminated quoted string/)
    expect(() => parseYamlDocument('a: "bad\\qescape"')).toThrow(/Unsupported escape sequence/)
    expect(() => parseYamlDocument('a: "bad\\x1Z"')).toThrow(/Invalid hex escape/)
    expect(() => parseYamlDocument('a: "bad\\u123Z"')).toThrow(/Invalid unicode escape/)
    expect(() => parseYamlDocument('a: "str" trailing')).toThrow(/Unexpected trailing content/)
    expect(() => parseYamlDocument('a: val: nested')).toThrow(/Unexpected mapping colon in scalar/)
    expect(() => parseYamlDocument('a: [1, , 2]')).toThrow(/Empty flow item/)
    expect(() => parseYamlDocument('a: ["unclosed]')).toThrow(/Unterminated quoted string/)
    expect(() => parseYamlDocument('a: [1, { b: 2 ]')).toThrow(/Mismatched flow bracket/)
    expect(() => parseYamlDocument('a: [1, [2]]\n')).not.toThrow()
    expect(() => parseYamlDocument('a: [{ "k": "unclosed }]\n')).toThrow(/Unterminated quoted string/)
  })

})
