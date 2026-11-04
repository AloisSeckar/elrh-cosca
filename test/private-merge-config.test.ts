import { describe, expect, test } from 'vitest'
import { mergeConfig } from '../src/_private/merge-config'

describe('Test mergeConfig function', () => {

  test('should support all four config export patterns', () => {
    const patch = { added: 'yes', list: ['a', 'b'] }

    // 1. export default { ... }
    const res1 = mergeConfig("export default {\n  list: ['a'],\n}\n", patch, 'c1.ts')
    expect(res1.modified).toBe(true)
    expect(res1.code).toBe("export default {\n  list: ['a', 'b'],\n  added: 'yes',\n}\n")

    // 2. export default defineConfig({ ... }) (including member call and generic type arg)
    const res2 = mergeConfig("export default vite.defineConfig<Config>({\n  list: ['a'],\n})\n", patch, 'c2.ts')
    expect(res2.modified).toBe(true)
    expect(res2.code).toBe("export default vite.defineConfig<Config>({\n  list: ['a', 'b'],\n  added: 'yes',\n})\n")

    // 3. export const x = { ... } (including TS type annotation)
    const res3 = mergeConfig("export const cfg: Record<string, unknown> = {\n  list: ['a'],\n}\n", patch, 'c3.ts')
    expect(res3.modified).toBe(true)
    expect(res3.code).toBe("export const cfg: Record<string, unknown> = {\n  list: ['a', 'b'],\n  added: 'yes',\n}\n")

    // 4. module.exports = { ... }
    const res4 = mergeConfig("module.exports = {\n  list: ['a'],\n}\n", patch, 'c4.cjs')
    expect(res4.modified).toBe(true)
    expect(res4.code).toBe("module.exports = {\n  list: ['a', 'b'],\n  added: 'yes',\n}\n")
  })

  test('should ignore top-level strings, templates, blocks, and non-export statements before export', () => {
    const src = [
      '/* header comment */',
      "const str = 'export default {}'",
      'const tpl = `module.exports = ${1 + 2}`',
      'const obj = { a: 1 }',
      'export { obj }',
      'module.other = 1',
      'module.exports == null',
      'export const noInit;',
      'export const cmp == 1',
      'export let config = {',
      '  a: 1,',
      '}',
    ].join('\n')

    const res = mergeConfig(src, { a: 2 }, 'cfg.ts')
    expect(res.modified).toBe(true)
    expect(res.code).toContain('  a: 2,')
  })

  test('should handle primitive, array, and object value replacements and no-ops', () => {
    const src = [
      'export default {',
      '  ...spreadObj,',
      '  shorthand,',
      '  [computedKey]: 1,',
      '  tpl: `hello \\`world\\``,' ,
      "  'quoted-key': 'hello\\n\\r\\t\\u0041\\u{42}\\'\"',",
      '  num: 10,',
      '  boolT: true,',
      '  boolF: false,',
      '  nil: null,',
      '  arrSingleEmpty: [],',
      "  arrSingleComma: ['x', ],",
      '  arrMulti: [',
      "    'm1'",
      '  ],',
      '  arrMultiEmpty: [',
      '  ],',
      '  arrExpr: [fn(), [fn()], { ...spread }, { k: fn() }, { k: 1 }, [2]],',
      '  notArr: 123,',
      '  singleLineObj: { x: 1 },',
      '}',
    ].join('\n')

    // No-op when values match existing literals
    const noop = mergeConfig(src, {
      'quoted-key': 'hello\n\r\tAB\'"',
      num: 10,
      boolT: true,
      boolF: false,
      nil: null,
      arrExpr: [{ k: 1 }, [2]],
    }, 'cfg.ts')
    expect(noop.modified).toBe(false)

    // Replacements and merges
    const updated = mergeConfig(src, {
      'quoted-key': "line1\nline2\r\t'\"\\\x00",
      'special-key': -0,
      newNil: null,
      arrSingleEmpty: ['a', 'a'],
      arrSingleComma: ['y'],
      arrMulti: ['m2'],
      arrMultiEmpty: ['m3'],
      notArr: ['u', 'u'],
      emptyArr: [],
      emptyObj: {},
      singleLineObj: { y: 2 },
    }, 'cfg.ts')
    expect(updated.modified).toBe(true)
    expect(updated.code).toContain("'quoted-key': 'line1\\nline2\\r\\t\\'\"\\\\\\u0000'")
    expect(updated.code).toContain("'special-key': 0,")
    expect(updated.code).toContain('newNil: null,')
    expect(updated.code).toContain("arrSingleEmpty: ['a'],")
    expect(updated.code).toContain("arrSingleComma: ['x',  'y'],")
    expect(updated.code).toContain("arrMulti: [\n    'm1',\n    'm2',\n  ],")
    expect(updated.code).toContain("arrMultiEmpty: [\n    'm3',\n  ],")
    expect(updated.code).toContain("notArr: [\n    'u',\n  ],")
    expect(updated.code).toContain('emptyArr: [],')
    expect(updated.code).toContain('emptyObj: {},')
    expect(updated.code).toContain('singleLineObj: { x: 1,\n    y: 2,\n  },')
  })

  test('should handle TS generic type arguments with nested brackets and comparisons', () => {
    const src = 'export default defineConfig<Map<string, () => Array<{ a: string }>>>({\n  fn: (a) => a >= 1,\n})\n'
    const res = mergeConfig(src, { added: true }, 'cfg.ts')
    expect(res.modified).toBe(true)
    expect(res.code).toContain('added: true,')
  })

  test('should handle type annotations with strings and generics on named export', () => {
    const src = "export var cfg: 'a' | Config<'a'> = {\n  a: 1,\n}\n"
    const res = mergeConfig(src, { b: 2 }, 'cfg.ts')
    expect(res.modified).toBe(true)
    expect(res.code).toContain('b: 2,')
  })

  test('should reject invalid newConfig inputs and prototype pollution keys (security rules)', () => {
    const validSrc = 'export default {}\n'

    expect(() => mergeConfig(validSrc, null as any, 'cfg.ts')).toThrow(/expected a plain object/)
    expect(() => mergeConfig(validSrc, [] as any, 'cfg.ts')).toThrow(/expected a plain object/)
    expect(() => mergeConfig(validSrc, new Date() as any, 'cfg.ts')).toThrow(/expected a plain object/)
    expect(() => mergeConfig(validSrc, { [Symbol('s')]: 1 }, 'cfg.ts')).toThrow(/symbol keys are not supported/)

    // Prototype pollution keys
    const protoPayload = JSON.parse('{"__proto__": {"polluted": true}}')
    expect(() => mergeConfig(validSrc, protoPayload, 'cfg.ts')).toThrow(/Invalid config key '__proto__'/)
    expect(() => mergeConfig(validSrc, { constructor: {} }, 'cfg.ts')).toThrow(/Invalid config key 'constructor'/)
    expect(() => mergeConfig(validSrc, { nested: { prototype: {} } }, 'cfg.ts')).toThrow(/Invalid config key 'prototype'/)

    // Unsupported value types
    expect(() => mergeConfig(validSrc, { n: Number.NaN }, 'cfg.ts')).toThrow(/non-finite numbers/)
    expect(() => mergeConfig(validSrc, { n: Number.POSITIVE_INFINITY }, 'cfg.ts')).toThrow(/non-finite numbers/)
    expect(() => mergeConfig(validSrc, { fn: () => {} }, 'cfg.ts')).toThrow(/unsupported value type 'function'/)
    expect(() => mergeConfig(validSrc, { u: undefined }, 'cfg.ts')).toThrow(/unsupported value type 'undefined'/)
  })

  test('should fail on malformed syntax in target file', () => {
    expect(() => mergeConfig('export default { /* unclosed', { a: 1 }, 'cfg.ts')).toThrow(/Unterminated block comment/)
    expect(() => mergeConfig("export default { a: 'unclosed\n}", { a: 1 }, 'cfg.ts')).toThrow(/Unterminated string literal/)
    expect(() => mergeConfig("export default { a: 'unclosed", { a: 1 }, 'cfg.ts')).toThrow(/Unterminated string literal/)
    expect(() => mergeConfig('export default { a: `unclosed', { a: 1 }, 'cfg.ts')).toThrow(/Unterminated template literal/)
    expect(() => mergeConfig('export default { a: [1 }', { a: 1 }, 'cfg.ts')).toThrow(/Unexpected closing delimiter/)
    expect(() => mergeConfig('export default { a: [1 ', { a: 1 }, 'cfg.ts')).toThrow(/Unterminated '\{'/)
    expect(() => mergeConfig('export default { @ }', { a: 1 }, 'cfg.ts')).toThrow(/Unexpected token '@'/)
    expect(() => mergeConfig('export default { a: , }', { a: 1 }, 'cfg.ts')).toThrow(/Missing value before comma/)
    expect(() => mergeConfig('export default { a: }', { a: 1 }, 'cfg.ts')).toThrow(/Missing value in expression/)
    expect(() => mergeConfig('export default foo.bar', { a: 1 }, 'cfg.ts')).toThrow(/Could not access config object/)
  })

})
