import type { DataObject, DataValue } from '../types/data.js'
import { isDeepStrictEqual } from 'node:util'
import { PROTOTYPE_POLLUTION_KEYS } from './file-helpers.js'

const IDENTIFIER_RE = /^[A-Za-z_$][A-Za-z0-9_$]*$/

interface TextEdit {
  start: number
  end: number
  text: string
}

interface ObjectProperty {
  key: string | null
  keyStart: number
  valStart: number
  valEnd: number
  hasTrailingComma: boolean
}

interface ArrayElement {
  elStart: number
  elEnd: number
  hasTrailingComma: boolean
  parsed: { ok: true; value: DataValue } | { ok: false }
}

/**
 * Safely parses and deep-merges `newConfig` into the exported config object of a JS/TS module source string.
 *
 * Security guarantees:
 * 1. Linear-time character scanner (no `eval`, no code execution, no backtracking regexes, guards against prototype pollution).
 * 2. Strict data literal serialization (validates identifiers and escapes strings/keys so arbitrary code cannot be injected).
 */
export function mergeConfig(
  source: string,
  newConfig: Record<string | number | symbol, any>,
  targetFile: string,
): { code: string; modified: boolean } {
  validateConfigObject(newConfig)
  const { start, end } = findConfigObjectSpan(source, targetFile)
  const updated = updateObjectLiteral(source, start, end, newConfig)
  if (!updated.modified) {
    return { code: source, modified: false }
  }
  return {
    code: source.slice(0, start) + updated.code + source.slice(end),
    modified: true,
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

function validateConfigObject(obj: unknown): asserts obj is DataObject {
  if (!isPlainObject(obj)) {
    throw new Error('Invalid newConfig: expected a plain object.')
  }
  if (Object.getOwnPropertySymbols(obj).length > 0) {
    throw new Error('Invalid newConfig: symbol keys are not supported.')
  }
  for (const [key, value] of Object.entries(obj)) {
    if (PROTOTYPE_POLLUTION_KEYS.has(key)) {
      throw new Error(`Invalid config key '${key}'.`)
    }
    validateConfigValue(value)
  }
}

function validateConfigValue(value: unknown): asserts value is DataValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error('Invalid newConfig: non-finite numbers are not supported.')
    }
    return
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      validateConfigValue(item)
    }
    return
  }
  if (isPlainObject(value)) {
    validateConfigObject(value)
    return
  }
  throw new Error(`Invalid newConfig: unsupported value type '${typeof value}'.`)
}

function findConfigObjectSpan(src: string, targetFile: string): { start: number; end: number } {
  let defaultExportExpr: number | undefined
  const namedExportExprs: number[] = []
  let cjsExportExpr: number | undefined

  let i = 0
  const end = src.length
  while (i < end) {
    i = skipTrivia(src, i, end)
    if (i >= end) break
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      i = skipString(src, i, end)
    } else if (ch === '`') {
      i = skipTemplate(src, i, end)
    } else if (ch === '{' || ch === '(' || ch === '[') {
      i = skipBalanced(src, i, end)
    } else if (isWordStart(ch)) {
      const wordEnd = readWord(src, i, end)
      const word = src.slice(i, wordEnd)
      i = wordEnd
      if (word === 'export') {
        i = skipTrivia(src, i, end)
        const kwEnd = readWord(src, i, end)
        const kw = src.slice(i, kwEnd)
        if (kw === 'default') {
          defaultExportExpr = skipTrivia(src, kwEnd, end)
          i = defaultExportExpr
        } else if (kw === 'const' || kw === 'let' || kw === 'var') {
          i = skipTrivia(src, kwEnd, end)
          const idEnd = readWord(src, i, end)
          if (idEnd > i) {
            i = skipTrivia(src, idEnd, end)
            if (src[i] === ':') {
              i = skipUntilEquals(src, i + 1, end)
            }
            if (src[i] === '=' && src[i + 1] !== '=') {
              const exprPos = skipTrivia(src, i + 1, end)
              namedExportExprs.push(exprPos)
              i = exprPos
            }
          }
        }
      } else if (word === 'module') {
        const dotPos = skipTrivia(src, i, end)
        if (src[dotPos] === '.') {
          const propStart = skipTrivia(src, dotPos + 1, end)
          const propEnd = readWord(src, propStart, end)
          if (src.slice(propStart, propEnd) === 'exports') {
            const eqPos = skipTrivia(src, propEnd, end)
            if (src[eqPos] === '=' && src[eqPos + 1] !== '=') {
              cjsExportExpr = skipTrivia(src, eqPos + 1, end)
              i = cjsExportExpr
            }
          }
        }
      }
    } else {
      i++
    }
  }

  const exprStart = defaultExportExpr
    ?? (namedExportExprs.length === 1 ? namedExportExprs[0] : undefined)
    ?? cjsExportExpr

  if (exprStart === undefined) {
    throw new Error(`No suitable config export found in ${targetFile}`)
  }

  return extractObjectSpan(src, exprStart, targetFile)
}

function extractObjectSpan(src: string, exprStart: number, targetFile: string): { start: number; end: number } {
  const end = src.length
  let i = skipTrivia(src, exprStart, end)
  if (i < end && src[i] === '{') {
    return { start: i, end: skipBalanced(src, i, end) }
  }
  if (i < end && isWordStart(src[i])) {
    i = readWord(src, i, end)
    while (i < end) {
      i = skipTrivia(src, i, end)
      if (src[i] === '.') {
        i = skipTrivia(src, i + 1, end)
        i = readWord(src, i, end)
      } else {
        break
      }
    }
    if (i < end && src[i] === '<') {
      i = skipBalanced(src, i, end)
      i = skipTrivia(src, i, end)
    }
    if (i < end && src[i] === '(') {
      const callEnd = skipBalanced(src, i, end)
      const argStart = skipTrivia(src, i + 1, callEnd - 1)
      if (argStart < callEnd - 1 && src[argStart] === '{') {
        const objEnd = skipBalanced(src, argStart, callEnd - 1)
        return { start: argStart, end: objEnd }
      }
    }
  }
  throw new Error(`Could not access config object in ${targetFile}`)
}

function updateObjectLiteral(
  src: string,
  objStart: number,
  objEnd: number,
  patch: DataObject,
): { code: string; modified: boolean } {
  const props = parseObjectProperties(src, objStart, objEnd)
  const propMap = new Map<string, ObjectProperty>()
  for (const prop of props) {
    if (prop.key !== null && !PROTOTYPE_POLLUTION_KEYS.has(prop.key)) {
      propMap.set(prop.key, prop)
    }
  }

  const baseIndent = getLineIndent(src, objStart)
  const propIndent = detectPropIndent(src, objStart, props, baseIndent)

  const edits: TextEdit[] = []
  const newEntries: Array<[string, DataValue]> = []
  let modified = false

  for (const [key, newVal] of Object.entries(patch)) {
    const existing = propMap.get(key)
    if (!existing) {
      newEntries.push([key, newVal])
      modified = true
      continue
    }

    const lineIndent = getLineIndent(src, existing.keyStart)
    if (isPlainObject(newVal)) {
      if (src[existing.valStart] === '{' && skipBalanced(src, existing.valStart, existing.valEnd) === existing.valEnd) {
        const nested = updateObjectLiteral(src, existing.valStart, existing.valEnd, newVal as DataObject)
        if (nested.modified) {
          edits.push({ start: existing.valStart, end: existing.valEnd, text: nested.code })
          modified = true
        }
      } else {
        edits.push({ start: existing.valStart, end: existing.valEnd, text: serializeValue(newVal as DataObject, lineIndent) })
        modified = true
      }
    } else if (Array.isArray(newVal)) {
      if (src[existing.valStart] === '[' && skipBalanced(src, existing.valStart, existing.valEnd) === existing.valEnd) {
        const nestedArr = updateArrayLiteral(src, existing.valStart, existing.valEnd, newVal)
        if (nestedArr.modified) {
          edits.push({ start: existing.valStart, end: existing.valEnd, text: nestedArr.code })
          modified = true
        }
      } else {
        edits.push({ start: existing.valStart, end: existing.valEnd, text: serializeValue(newVal, lineIndent) })
        modified = true
      }
    } else {
      const parsed = tryParseLiteral(src, existing.valStart, existing.valEnd)
      if (!(parsed.ok && isDeepStrictEqual(parsed.value, newVal))) {
        edits.push({ start: existing.valStart, end: existing.valEnd, text: serializeValue(newVal, lineIndent) })
        modified = true
      }
    }
  }

  if (newEntries.length > 0) {
    if (props.length > 0) {
      const lastProp = props[props.length - 1]
      if (!lastProp.hasTrailingComma) {
        edits.push({ start: lastProp.valEnd, end: lastProp.valEnd, text: ',' })
      }
    }
    const formattedProps = newEntries
      .map(([k, v]) => `${propIndent}${formatKey(k)}: ${serializeValue(v, propIndent)},`)
      .join('\n')
    insertBeforeClosingBracket(src, objStart, objEnd - 1, baseIndent, formattedProps, edits)
  }

  return {
    code: applyEdits(src, objStart, objEnd, edits),
    modified,
  }
}

function updateArrayLiteral(
  src: string,
  arrStart: number,
  arrEnd: number,
  newItems: DataValue[],
): { code: string; modified: boolean } {
  const elements = parseArrayElements(src, arrStart, arrEnd)
  const addedItems: DataValue[] = []
  for (const item of newItems) {
    const existsInSource = elements.some(el => el.parsed.ok && isDeepStrictEqual(el.parsed.value, item))
    const existsInAdded = addedItems.some(added => isDeepStrictEqual(added, item))
    if (!existsInSource && !existsInAdded) {
      addedItems.push(item)
    }
  }

  if (addedItems.length === 0) {
    return { code: src.slice(arrStart, arrEnd), modified: false }
  }

  const baseIndent = getLineIndent(src, arrStart)
  const isMultiline = src.slice(arrStart, arrEnd).includes('\n')

  if (!isMultiline) {
    const formattedItems = addedItems.map(item => serializeValue(item, baseIndent)).join(', ')
    if (elements.length === 0) {
      return { code: `[${formattedItems}]`, modified: true }
    }
    const lastEl = elements[elements.length - 1]
    const edits: TextEdit[] = lastEl.hasTrailingComma
      ? [{ start: arrEnd - 1, end: arrEnd - 1, text: ` ${formattedItems}` }]
      : [{ start: lastEl.elEnd, end: lastEl.elEnd, text: `, ${formattedItems}` }]
    return { code: applyEdits(src, arrStart, arrEnd, edits), modified: true }
  }

  const elIndent = elements.length > 0
    ? getLineIndent(src, elements[elements.length - 1].elStart)
    : baseIndent + '  '
  const edits: TextEdit[] = []
  if (elements.length > 0 && !elements[elements.length - 1].hasTrailingComma) {
    edits.push({ start: elements[elements.length - 1].elEnd, end: elements[elements.length - 1].elEnd, text: ',' })
  }
  const formattedLines = addedItems
    .map(item => `${elIndent}${serializeValue(item, elIndent)},`)
    .join('\n')
  insertBeforeClosingBracket(src, arrStart, arrEnd - 1, baseIndent, formattedLines, edits)

  return {
    code: applyEdits(src, arrStart, arrEnd, edits),
    modified: true,
  }
}

function insertBeforeClosingBracket(
  src: string,
  openPos: number,
  closePos: number,
  baseIndent: string,
  formattedLines: string,
  edits: TextEdit[],
): void {
  let k = closePos
  while (k > openPos + 1 && (src[k - 1] === ' ' || src[k - 1] === '\t')) {
    k--
  }
  if (k > openPos + 1 && (src[k - 1] === '\n' || src[k - 1] === '\r')) {
    edits.push({ start: k, end: k, text: `${formattedLines}\n` })
  } else {
    edits.push({ start: k, end: closePos, text: `\n${formattedLines}\n${baseIndent}` })
  }
}

function applyEdits(src: string, spanStart: number, spanEnd: number, edits: TextEdit[]): string {
  edits.sort((a, b) => b.start - a.start || b.end - a.end)
  let result = src.slice(spanStart, spanEnd)
  for (const edit of edits) {
    const relStart = edit.start - spanStart
    const relEnd = edit.end - spanStart
    result = result.slice(0, relStart) + edit.text + result.slice(relEnd)
  }
  return result
}

function parseObjectProperties(src: string, objStart: number, objEnd: number): ObjectProperty[] {
  const props: ObjectProperty[] = []
  const limit = objEnd - 1
  let i = objStart + 1

  while (i < limit) {
    i = skipTrivia(src, i, limit)
    if (i >= limit) break

    if (src.startsWith('...', i)) {
      const expr = scanExpression(src, i + 3, limit)
      props.push({ key: null, keyStart: i, valStart: i, valEnd: expr.valEnd, hasTrailingComma: expr.hasTrailingComma })
      i = expr.nextPos
      continue
    }

    const keyStart = i
    let key: string | null = null
    if (src[i] === "'" || src[i] === '"') {
      const keyEnd = skipString(src, i, limit)
      key = unescapeString(src.slice(i, keyEnd))
      i = keyEnd
    } else if (src[i] === '[') {
      i = skipBalanced(src, i, limit)
    } else if (isKeyChar(src[i])) {
      const keyEnd = readWord(src, i, limit)
      key = src.slice(i, keyEnd)
      i = keyEnd
    } else {
      throw new Error(`Unexpected token '${src[i]}' in object literal`)
    }

    i = skipTrivia(src, i, limit)
    if (src[i] === ':') {
      const valStart = skipTrivia(src, i + 1, limit)
      const expr = scanExpression(src, valStart, limit)
      props.push({ key, keyStart, valStart, valEnd: expr.valEnd, hasTrailingComma: expr.hasTrailingComma })
      i = expr.nextPos
    } else {
      const expr = scanExpression(src, keyStart, limit)
      props.push({ key: null, keyStart, valStart: keyStart, valEnd: expr.valEnd, hasTrailingComma: expr.hasTrailingComma })
      i = expr.nextPos
    }
  }

  return props
}

function parseArrayElements(src: string, arrStart: number, arrEnd: number): ArrayElement[] {
  const elements: ArrayElement[] = []
  const limit = arrEnd - 1
  let i = arrStart + 1

  while (i < limit) {
    i = skipTrivia(src, i, limit)
    if (i >= limit) break
    const elStart = i
    const expr = scanExpression(src, elStart, limit)
    const parsed = tryParseLiteral(src, elStart, expr.valEnd)
    elements.push({
      elStart,
      elEnd: expr.valEnd,
      hasTrailingComma: expr.hasTrailingComma,
      parsed,
    })
    i = expr.nextPos
  }

  return elements
}

function scanExpression(
  src: string,
  start: number,
  limit: number,
): { valEnd: number; hasTrailingComma: boolean; nextPos: number } {
  let i = start
  let lastTokenEnd = start

  while (i < limit) {
    i = skipTrivia(src, i, limit)
    if (i >= limit) break
    const ch = src[i]
    if (ch === ',') {
      if (lastTokenEnd === start) {
        throw new Error('Missing value before comma')
      }
      return { valEnd: lastTokenEnd, hasTrailingComma: true, nextPos: i + 1 }
    }
    if (ch === "'" || ch === '"') {
      i = skipString(src, i, limit)
    } else if (ch === '`') {
      i = skipTemplate(src, i, limit)
    } else if (ch === '{' || ch === '(' || ch === '[') {
      i = skipBalanced(src, i, limit)
    } else {
      i++
    }
    lastTokenEnd = i
  }

  if (lastTokenEnd === start) {
    throw new Error('Missing value in expression')
  }
  return { valEnd: lastTokenEnd, hasTrailingComma: false, nextPos: i }
}

function tryParseLiteral(
  src: string,
  start: number,
  end: number,
): { ok: true; value: DataValue } | { ok: false } {
  const raw = src.slice(start, end)
  if (raw === 'true') return { ok: true, value: true }
  if (raw === 'false') return { ok: true, value: false }
  if (raw === 'null') return { ok: true, value: null }
  if (/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(raw)) {
    return { ok: true, value: Number(raw) }
  }
  if ((src[start] === "'" || src[start] === '"') && skipString(src, start, end) === end) {
    return { ok: true, value: unescapeString(raw) }
  }
  if (src[start] === '[' && skipBalanced(src, start, end) === end) {
    const elements = parseArrayElements(src, start, end)
    const values: DataValue[] = []
    for (const el of elements) {
      if (!el.parsed.ok) return { ok: false }
      values.push(el.parsed.value)
    }
    return { ok: true, value: values }
  }
  if (src[start] === '{' && skipBalanced(src, start, end) === end) {
    const props = parseObjectProperties(src, start, end)
    const obj: DataObject = {}
    for (const prop of props) {
      if (prop.key === null || PROTOTYPE_POLLUTION_KEYS.has(prop.key)) return { ok: false }
      const valParsed = tryParseLiteral(src, prop.valStart, prop.valEnd)
      if (!valParsed.ok) return { ok: false }
      obj[prop.key] = valParsed.value
    }
    return { ok: true, value: obj }
  }
  return { ok: false }
}

function serializeValue(value: DataValue, indent: string): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean' || typeof value === 'number') {
    return Object.is(value, -0) ? '0' : String(value)
  }
  if (typeof value === 'string') {
    return formatString(value)
  }
  if (Array.isArray(value)) {
    const unique: DataValue[] = []
    for (const item of value) {
      if (!unique.some(existing => isDeepStrictEqual(existing, item))) {
        unique.push(item)
      }
    }
    if (unique.length === 0) return '[]'
    const childIndent = indent + '  '
    const lines = unique.map(item => `${childIndent}${serializeValue(item, childIndent)},`)
    return `[\n${lines.join('\n')}\n${indent}]`
  }
  const entries = Object.entries(value)
  if (entries.length === 0) return '{}'
  const childIndent = indent + '  '
  const lines = entries.map(([k, v]) => `${childIndent}${formatKey(k)}: ${serializeValue(v, childIndent)},`)
  return `{\n${lines.join('\n')}\n${indent}}`
}

function formatKey(key: string): string {
  return IDENTIFIER_RE.test(key) ? key : formatString(key)
}

function formatString(str: string): string {
  return `'${JSON.stringify(str).slice(1, -1).replace(/\\"|'/g, m => (m === "'" ? "\\'" : '"'))}'`
}

function unescapeString(raw: string): string {
  const normalized = raw
    .slice(1, -1)
    .replace(/\\(?:u\{([0-9a-fA-F]+)\}|(.))|"/g, (match, codePoint, escaped) => {
      if (codePoint !== undefined) return JSON.stringify(String.fromCodePoint(parseInt(codePoint, 16))).slice(1, -1)
      if (escaped !== undefined) return /^["\\/bfnrtu]$/.test(escaped) ? match : escaped
      return '\\"'
    })
  return JSON.parse(`"${normalized}"`)
}

function skipTrivia(src: string, pos: number, end: number): number {
  let i = pos
  while (i < end) {
    const ch = src[i]
    if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
      i++
    } else if (ch === '/' && src[i + 1] === '/') {
      i += 2
      while (i < end && src[i] !== '\n') i++
    } else if (ch === '/' && src[i + 1] === '*') {
      i += 2
      while (i + 1 < end && !(src[i] === '*' && src[i + 1] === '/')) i++
      if (i + 1 >= end) {
        throw new Error('Unterminated block comment')
      }
      i += 2
    } else {
      break
    }
  }
  return i
}

function skipString(src: string, pos: number, end: number): number {
  const quote = src[pos]
  let i = pos + 1
  while (i < end) {
    const ch = src[i]
    if (ch === '\\') {
      i += 2
    } else if (ch === quote) {
      return i + 1
    } else if (ch === '\n' || ch === '\r') {
      break
    } else {
      i++
    }
  }
  throw new Error('Unterminated string literal')
}

function skipTemplate(src: string, pos: number, end: number): number {
  let i = pos + 1
  while (i < end) {
    const ch = src[i]
    if (ch === '\\') {
      i += 2
    } else if (ch === '`') {
      return i + 1
    } else if (ch === '$' && src[i + 1] === '{') {
      i = skipBalanced(src, i + 1, end)
    } else {
      i++
    }
  }
  throw new Error('Unterminated template literal')
}

function skipBalanced(src: string, pos: number, end: number): number {
  const open = src[pos]
  const closeMap: Record<string, string> = { '{': '}', '(': ')', '[': ']', '<': '>' }
  const stack: string[] = [closeMap[open]]
  let i = pos + 1

  while (i < end && stack.length > 0) {
    i = skipTrivia(src, i, end)
    if (i >= end) break
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      i = skipString(src, i, end)
    } else if (ch === '`') {
      i = skipTemplate(src, i, end)
    } else if (ch === '{' || ch === '(' || ch === '[') {
      stack.push(closeMap[ch])
      i++
    } else if (ch === '}' || ch === ')' || ch === ']') {
      if (stack[stack.length - 1] !== ch) {
        throw new Error(`Unexpected closing delimiter '${ch}'`)
      }
      stack.pop()
      i++
    } else if (open === '<' && (ch === '<' || ch === '>')) {
      if (ch === '<') {
        stack.push('>')
      } else if (src[i - 1] !== '=') {
        stack.pop()
      }
      i++
    } else {
      i++
    }
  }

  if (stack.length > 0) {
    throw new Error(`Unterminated '${open}'`)
  }
  return i
}

function skipUntilEquals(src: string, pos: number, end: number): number {
  let i = pos
  while (i < end) {
    i = skipTrivia(src, i, end)
    if (i >= end || src[i] === '=') break
    const ch = src[i]
    if (ch === '{' || ch === '(' || ch === '[' || ch === '<') {
      i = skipBalanced(src, i, end)
    } else if (ch === "'" || ch === '"') {
      i = skipString(src, i, end)
    } else {
      i++
    }
  }
  return i
}

function isWordStart(ch: string): boolean {
  return /[A-Za-z_$]/.test(ch)
}

function isKeyChar(ch: string): boolean {
  return /[A-Za-z0-9_$]/.test(ch)
}

function readWord(src: string, pos: number, end: number): number {
  let i = pos
  while (i < end && isKeyChar(src[i])) i++
  return i
}

function getLineIndent(src: string, pos: number): string {
  let lineStart = pos
  while (lineStart > 0 && src[lineStart - 1] !== '\n') {
    lineStart--
  }
  let indentEnd = lineStart
  while (indentEnd < pos && (src[indentEnd] === ' ' || src[indentEnd] === '\t')) {
    indentEnd++
  }
  return src.slice(lineStart, indentEnd)
}

function detectPropIndent(src: string, objStart: number, props: ObjectProperty[], baseIndent: string): string {
  for (const prop of props) {
    if (src.slice(objStart, prop.keyStart).includes('\n')) {
      return getLineIndent(src, prop.keyStart)
    }
  }
  return baseIndent + '  '
}
