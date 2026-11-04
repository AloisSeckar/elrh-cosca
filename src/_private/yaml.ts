import type { DataArray, DataObject, DataPrimitive, DataValue } from '../types/data.js'

const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype'])

const YAML_RESERVED_SCALAR_RE = /^(?:null|Null|NULL|~|true|True|TRUE|false|False|FALSE)$/
const YAML_NUMBER_LOOKING_RE = /^[+-]?(?:\d|\.\d)/
const YAML_STRICT_NUMBER_RE = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/
const YAML_INDICATOR_START_RE = /^[-?:,[\]{}#&*!|>'"%@`]/
const YAML_UNSUPPORTED_START_RE = /^[&*!|>%@`]/

export interface YamlScalar {
  kind: 'scalar'
  value: DataPrimitive
  raw?: string
  commentBefore?: string[]
  comment?: string
}

export interface YamlPair {
  key: string
  rawKey?: string
  value: YamlNode
  commentBefore?: string[]
  comment?: string
}

export interface YamlMap {
  kind: 'map'
  items: YamlPair[]
  commentBefore?: string[]
  comment?: string
}

export interface YamlSeq {
  kind: 'seq'
  items: YamlNode[]
  commentBefore?: string[]
  comment?: string
}

export type YamlNode = YamlScalar | YamlMap | YamlSeq

export interface YamlDocument {
  contents: YamlNode | null
  commentBefore?: string[]
  commentAfter?: string[]
}

interface ParseState {
  lines: string[]
  lineIdx: number
}

export function isYamlMap(node: YamlNode | null | undefined): node is YamlMap {
  return node?.kind === 'map'
}

export function isYamlSeq(node: YamlNode | null | undefined): node is YamlSeq {
  return node?.kind === 'seq'
}

export function isYamlScalar(node: YamlNode | null | undefined): node is YamlScalar {
  return node?.kind === 'scalar'
}

export function hasMapKey(map: YamlMap, key: string): boolean {
  return map.items.some(item => item.key === key)
}

export function getMapNode(map: YamlMap, key: string): YamlNode | undefined {
  return map.items.find(item => item.key === key)?.value
}

export function setMapNode(map: YamlMap, key: string, value: YamlNode): void {
  const existing = map.items.find(item => item.key === key)
  if (existing) {
    existing.value = value
  } else {
    map.items.push({ key, value })
  }
}

export function deleteMapKey(map: YamlMap, key: string): boolean {
  const idx = map.items.findIndex(item => item.key === key)
  if (idx === -1) {
    return false
  }
  map.items.splice(idx, 1)
  return true
}

export function createYamlNode(value: DataValue): YamlNode {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return { kind: 'scalar', value }
  }
  if (typeof value === 'number') {
    return { kind: 'scalar', value: Object.is(value, -0) ? 0 : value }
  }
  if (Array.isArray(value)) {
    return {
      kind: 'seq',
      items: value.map(item => createYamlNode(item)),
    }
  }
  const items: YamlPair[] = []
  for (const [key, val] of Object.entries(value)) {
    if (FORBIDDEN_KEYS.has(key)) {
      throw new Error(`Invalid YAML key '${key}'.`)
    }
    items.push({ key, value: createYamlNode(val) })
  }
  return { kind: 'map', items }
}

export function yamlNodeToJson(node: YamlNode): DataValue {
  if (node.kind === 'scalar') {
    return node.value
  }
  if (node.kind === 'seq') {
    const arr: DataArray = node.items.map(item => yamlNodeToJson(item))
    return arr
  }
  const obj: DataObject = {}
  for (const pair of node.items) {
    if (!FORBIDDEN_KEYS.has(pair.key)) {
      obj[pair.key] = yamlNodeToJson(pair.value)
    }
  }
  return obj
}

/**
 * Parses a single-document YAML string into a comment-preserving AST.
 * Supports block mappings, block sequences, flow collections, and plain/quoted scalars.
 */
export function parseYamlDocument(source: string): YamlDocument {
  const normalized = source.replace(/\r\n?/g, '\n')
  const lines = normalized.split('\n')
  if (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop()
  }

  const state: ParseState = { lines, lineIdx: 0 }
  const next = peekNextContentLine(state, 0)
  if (!next) {
    const comments = collectCommentsUntil(state, lines.length)
    return {
      contents: null,
      commentBefore: comments.length > 0 ? comments : undefined,
    }
  }

  if (next.indent > 0) {
    throw new SyntaxError(`Unexpected indentation on line ${next.lineIdx + 1}.`)
  }

  const contents = parseBlockNode(state, 0)

  const trailingNext = peekNextContentLine(state, state.lineIdx)
  if (trailingNext) {
    throw new SyntaxError(`Unexpected content on line ${trailingNext.lineIdx + 1}.`)
  }

  const commentAfter = collectCommentsUntil(state, lines.length)
  return {
    contents,
    commentAfter: commentAfter.length > 0 ? commentAfter : undefined,
  }
}

function parseBlockNode(state: ParseState, indent: number): YamlNode {
  const next = peekNextContentLine(state, state.lineIdx)!
  const rest = next.rest
  if (isSequenceLine(rest)) {
    return parseBlockSeq(state, indent)
  }
  if (isMappingLine(rest)) {
    return parseBlockMap(state, indent)
  }

  const commentBefore = collectCommentsUntil(state, next.lineIdx)
  state.lineIdx = next.lineIdx + 1
  const node = parseInlineValue(rest, next.lineIdx + 1)
  if (commentBefore.length > 0) {
    node.commentBefore = commentBefore
  }
  return node
}

function parseBlockMap(state: ParseState, mapIndent: number): YamlMap {
  const items: YamlPair[] = []

  while (state.lineIdx < state.lines.length) {
    const next = peekNextContentLine(state, state.lineIdx)
    if (!next || next.indent < mapIndent) {
      break
    }
    if (next.indent > mapIndent) {
      throw new SyntaxError(`Unexpected indentation on line ${next.lineIdx + 1}.`)
    }
    if (isSequenceLine(next.rest)) {
      throw new SyntaxError(`Unexpected sequence item in mapping on line ${next.lineIdx + 1}.`)
    }

    const commentBefore = collectCommentsUntil(state, next.lineIdx)
    const pair = parseMapPairAtLine(state, next.rest, mapIndent, next.lineIdx + 1)
    if (commentBefore.length > 0) {
      pair.commentBefore = commentBefore
    }
    items.push(pair)
  }

  return { kind: 'map', items }
}

function parseMapPairAtLine(
  state: ParseState,
  rest: string,
  mapIndent: number,
  lineNum: number,
): YamlPair {
  if (rest === '?' || rest.startsWith('? ')) {
    const rawExplicitKey = rest.slice(1).trim()
    if (!rawExplicitKey) {
      throw new SyntaxError(`Empty explicit key on line ${lineNum}.`)
    }
    const { key } = parseScalarKeyOnly(rawExplicitKey, lineNum)
    state.lineIdx++

    const next = peekNextContentLine(state, state.lineIdx)
    if (next && next.indent === mapIndent && (next.rest === ':' || next.rest.startsWith(': '))) {
      state.lineIdx = next.lineIdx + 1
      const afterColon = next.rest.slice(1).trimStart()
      const value = resolveValueAfterColon(state, afterColon, mapIndent, next.lineIdx + 1)
      return { key, value: value.node, comment: value.keyComment }
    }
    return { key, value: { kind: 'scalar', value: null } }
  }

  const { key, rawKey, afterColon } = splitMappingKeyAndValue(rest, lineNum)
  state.lineIdx++
  const value = resolveValueAfterColon(state, afterColon, mapIndent, lineNum)
  return {
    key,
    rawKey,
    value: value.node,
    comment: value.keyComment,
  }
}

function resolveValueAfterColon(
  state: ParseState,
  afterColon: string,
  mapIndent: number,
  lineNum: number,
): { node: YamlNode; keyComment?: string } {
  if (afterColon === '' || afterColon.startsWith('#')) {
    const keyComment = afterColon.startsWith('#') ? afterColon : undefined
    const next = peekNextContentLine(state, state.lineIdx)
    if (next) {
      if (next.indent > mapIndent) {
        return { node: parseBlockNode(state, next.indent), keyComment }
      }
      if (next.indent === mapIndent && isSequenceLine(next.rest)) {
        return { node: parseBlockSeq(state, next.indent), keyComment }
      }
    }
    return { node: { kind: 'scalar', value: null }, keyComment }
  }

  return { node: parseInlineValue(afterColon, lineNum) }
}

function parseBlockSeq(state: ParseState, seqIndent: number): YamlSeq {
  const items: YamlNode[] = []

  while (state.lineIdx < state.lines.length) {
    const next = peekNextContentLine(state, state.lineIdx)
    if (!next || next.indent < seqIndent) {
      break
    }
    if (next.indent > seqIndent) {
      throw new SyntaxError(`Unexpected indentation on line ${next.lineIdx + 1}.`)
    }
    if (!isSequenceLine(next.rest)) {
      break
    }

    const commentBefore = collectCommentsUntil(state, next.lineIdx)
    const lineNum = next.lineIdx + 1
    const afterDashRaw = next.rest.slice(1)
    let spacesAfterDash = 0
    while (spacesAfterDash < afterDashRaw.length && afterDashRaw[spacesAfterDash] === ' ') {
      spacesAfterDash++
    }
    const afterDash = afterDashRaw.slice(spacesAfterDash)

    let itemNode: YamlNode
    if (afterDash === '' || afterDash.startsWith('#')) {
      const dashComment = afterDash.startsWith('#') ? afterDash : undefined
      state.lineIdx++
      const childNext = peekNextContentLine(state, state.lineIdx)
      if (childNext && childNext.indent > seqIndent) {
        itemNode = parseBlockNode(state, childNext.indent)
        if (dashComment && !itemNode.comment) {
          itemNode.comment = dashComment
        }
      } else {
        itemNode = { kind: 'scalar', value: null, comment: dashComment }
      }
    } else if (isCompactMapInSeq(afterDash)) {
      const compactIndent = seqIndent + 1 + spacesAfterDash
      const firstPair = parseMapPairAtLine(state, afterDash, compactIndent, lineNum)
      const moreMap = parseBlockMap(state, compactIndent)
      itemNode = {
        kind: 'map',
        items: [firstPair, ...moreMap.items],
      }
    } else {
      state.lineIdx++
      itemNode = parseInlineValue(afterDash, lineNum)
    }

    if (commentBefore.length > 0) {
      itemNode.commentBefore = [...commentBefore, ...(itemNode.commentBefore ?? [])]
    }
    items.push(itemNode)
  }

  return { kind: 'seq', items }
}

function isSequenceLine(rest: string): boolean {
  return rest === '-' || rest.startsWith('- ')
}

function isMappingLine(rest: string): boolean {
  if (rest === '?' || rest.startsWith('? ')) {
    return true
  }
  return findMappingColon(rest) !== -1
}

function isCompactMapInSeq(afterDash: string): boolean {
  if (afterDash.startsWith('{') || afterDash.startsWith('[')) {
    return false
  }
  return findMappingColon(afterDash) !== -1
}

function findMappingColon(rest: string): number {
  if (rest.startsWith("'") || rest.startsWith('"')) {
    const closeIdx = scanQuotedStringEnd(rest, 0)
    if (closeIdx === -1) {
      return -1
    }
    let k = closeIdx
    while (k < rest.length && rest[k] === ' ') {
      k++
    }
    if (k < rest.length && rest[k] === ':' && (k + 1 === rest.length || rest[k + 1] === ' ')) {
      return k
    }
    return -1
  }

  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (ch === '#' && (i === 0 || rest[i - 1] === ' ')) {
      return -1
    }
    if (ch === ':' && (i + 1 === rest.length || rest[i + 1] === ' ')) {
      return i
    }
  }
  return -1
}

function splitMappingKeyAndValue(
  rest: string,
  lineNum: number,
): { key: string; rawKey: string; afterColon: string } {
  const colonIdx = findMappingColon(rest)
  if (colonIdx === -1) {
    throw new SyntaxError(`Invalid mapping entry on line ${lineNum}.`)
  }
  const rawKey = rest.slice(0, colonIdx).trimEnd()
  const { key } = parseScalarKeyOnly(rawKey, lineNum)
  const afterColon = rest.slice(colonIdx + 1).trimStart()
  return { key, rawKey, afterColon }
}

function parseScalarKeyOnly(rawKey: string, lineNum: number): { key: string } {
  if (!rawKey || YAML_UNSUPPORTED_START_RE.test(rawKey)) {
    throw new SyntaxError(`Invalid YAML key '${rawKey}' on line ${lineNum}.`)
  }
  if (rawKey.startsWith("'") || rawKey.startsWith('"')) {
    const endIdx = scanQuotedStringEnd(rawKey, 0)
    if (endIdx !== rawKey.length) {
      throw new SyntaxError(`Invalid quoted key on line ${lineNum}.`)
    }
    return { key: unquoteString(rawKey, lineNum) }
  }
  if (rawKey.startsWith('[') || rawKey.startsWith('{')) {
    throw new SyntaxError(`Complex collection keys are not supported on line ${lineNum}.`)
  }
  return { key: rawKey }
}

function parseInlineValue(raw: string, lineNum: number): YamlNode {
  if (YAML_UNSUPPORTED_START_RE.test(raw)) {
    throw new SyntaxError(`Unsupported YAML feature '${raw[0]}' on line ${lineNum}.`)
  }

  if (raw.startsWith('{')) {
    const closeIdx = scanBalancedFlow(raw, 0, lineNum)
    const comment = extractTrailingComment(raw.slice(closeIdx), lineNum)
    const map = parseFlowMap(raw.slice(1, closeIdx - 1), lineNum)
    map.comment = comment
    return map
  }

  if (raw.startsWith('[')) {
    const closeIdx = scanBalancedFlow(raw, 0, lineNum)
    const comment = extractTrailingComment(raw.slice(closeIdx), lineNum)
    const seq = parseFlowSeq(raw.slice(1, closeIdx - 1), lineNum)
    seq.comment = comment
    return seq
  }

  if (raw.startsWith("'") || raw.startsWith('"')) {
    const closeIdx = scanQuotedStringEnd(raw, 0)
    if (closeIdx === -1) {
      throw new SyntaxError(`Unterminated quoted string on line ${lineNum}.`)
    }
    const rawQuoted = raw.slice(0, closeIdx)
    const comment = extractTrailingComment(raw.slice(closeIdx), lineNum)
    return {
      kind: 'scalar',
      value: unquoteString(rawQuoted, lineNum),
      raw: rawQuoted,
      comment,
    }
  }

  const { valuePart, comment } = splitPlainScalarAndComment(raw)
  if (findMappingColon(valuePart) !== -1) {
    throw new SyntaxError(`Unexpected mapping colon in scalar on line ${lineNum}.`)
  }
  return {
    kind: 'scalar',
    value: parsePlainScalarValue(valuePart),
    raw: valuePart,
    comment,
  }
}

function parseFlowMap(inner: string, lineNum: number): YamlMap {
  const parts = splitFlowItems(inner, lineNum)
  const items: YamlPair[] = []
  for (const part of parts) {
    const { key, rawKey, afterColon } = splitMappingKeyAndValue(part, lineNum)
    if (!afterColon) {
      items.push({ key, rawKey, value: { kind: 'scalar', value: null } })
    } else {
      items.push({ key, rawKey, value: parseInlineValue(afterColon, lineNum) })
    }
  }
  return { kind: 'map', items }
}

function parseFlowSeq(inner: string, lineNum: number): YamlSeq {
  const parts = splitFlowItems(inner, lineNum)
  const items: YamlNode[] = parts.map(part => parseInlineValue(part, lineNum))
  return { kind: 'seq', items }
}

function splitFlowItems(inner: string, lineNum: number): string[] {
  const trimmed = inner.trim()
  if (trimmed === '') {
    return []
  }

  const items: string[] = []
  let start = 0
  let i = 0
  while (i < trimmed.length) {
    const ch = trimmed[i]
    if (ch === "'" || ch === '"') {
      i = scanQuotedStringEnd(trimmed, i)
    } else if (ch === '{' || ch === '[') {
      i = scanBalancedFlow(trimmed, i, lineNum)
    } else if (ch === ',') {
      const segment = trimmed.slice(start, i).trim()
      if (!segment) {
        throw new SyntaxError(`Empty flow item on line ${lineNum}.`)
      }
      items.push(segment)
      start = i + 1
      i++
    } else {
      i++
    }
  }

  const last = trimmed.slice(start).trim()
  if (last) {
    items.push(last)
  }
  return items
}

function scanBalancedFlow(src: string, start: number, lineNum: number): number {
  const stack: string[] = [src[start] === '{' ? '}' : ']']
  let i = start + 1
  while (i < src.length && stack.length > 0) {
    const ch = src[i]
    if (ch === "'" || ch === '"') {
      const endQuote = scanQuotedStringEnd(src, i)
      if (endQuote === -1) {
        throw new SyntaxError(`Unterminated quoted string on line ${lineNum}.`)
      }
      i = endQuote
      continue
    }
    if (ch === '{') {
      stack.push('}')
    } else if (ch === '[') {
      stack.push(']')
    } else if (ch === '}' || ch === ']') {
      const expected = stack.pop()
      if (ch !== expected) {
        throw new SyntaxError(`Mismatched flow bracket '${ch}' on line ${lineNum}.`)
      }
    }
    i++
  }

  if (stack.length > 0) {
    throw new SyntaxError(`Unclosed flow collection on line ${lineNum}.`)
  }
  return i
}

function scanQuotedStringEnd(src: string, start: number): number {
  const quote = src[start]
  let i = start + 1
  while (i < src.length) {
    const ch = src[i]
    if (quote === "'") {
      if (ch === "'") {
        if (src[i + 1] === "'") {
          i += 2
          continue
        }
        return i + 1
      }
      i++
    } else {
      if (ch === '\\') {
        if (i + 1 >= src.length) {
          return -1
        }
        i += 2
        continue
      }
      if (ch === '"') {
        return i + 1
      }
      i++
    }
  }
  return -1
}

function unquoteString(rawQuoted: string, lineNum: number): string {
  const quote = rawQuoted[0]
  const inner = rawQuoted.slice(1, -1)
  if (quote === "'") {
    return inner.replace(/''/g, "'")
  }
  let out = ''
  for (let i = 0; i < inner.length; i++) {
    const ch = inner[i]
    if (ch !== '\\') {
      out += ch
      continue
    }
    i++
    const esc = inner[i]
    if (esc === 'n') out += '\n'
    else if (esc === 'r') out += '\r'
    else if (esc === 't') out += '\t'
    else if (esc === '0') out += '\0'
    else if (esc === '"' || esc === '\\' || esc === '/') out += esc
    else if (esc === 'x') {
      const hex = inner.slice(i + 1, i + 3)
      if (!/^[0-9a-fA-F]{2}$/.test(hex)) {
        throw new SyntaxError(`Invalid hex escape on line ${lineNum}.`)
      }
      out += String.fromCharCode(parseInt(hex, 16))
      i += 2
    } else if (esc === 'u') {
      const hex = inner.slice(i + 1, i + 5)
      if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
        throw new SyntaxError(`Invalid unicode escape on line ${lineNum}.`)
      }
      out += String.fromCharCode(parseInt(hex, 16))
      i += 4
    } else {
      throw new SyntaxError(`Unsupported escape sequence '\\${esc}' on line ${lineNum}.`)
    }
  }
  return out
}

function extractTrailingComment(trailing: string, lineNum: number): string | undefined {
  const trimmed = trailing.trim()
  if (trimmed === '') {
    return undefined
  }
  if (!trimmed.startsWith('#')) {
    throw new SyntaxError(`Unexpected trailing content '${trimmed}' on line ${lineNum}.`)
  }
  return trimmed
}

function splitPlainScalarAndComment(raw: string): { valuePart: string; comment?: string } {
  for (let i = 0; i < raw.length; i++) {
    if (raw[i] === '#' && (i === 0 || raw[i - 1] === ' ' || raw[i - 1] === '\t')) {
      return {
        valuePart: raw.slice(0, i).trimEnd(),
        comment: raw.slice(i).trimEnd(),
      }
    }
  }
  return { valuePart: raw.trimEnd() }
}

function parsePlainScalarValue(raw: string): DataPrimitive {
  if (raw === '' || raw === 'null' || raw === 'Null' || raw === 'NULL' || raw === '~') {
    return null
  }
  if (raw === 'true' || raw === 'True' || raw === 'TRUE') {
    return true
  }
  if (raw === 'false' || raw === 'False' || raw === 'FALSE') {
    return false
  }
  if (YAML_STRICT_NUMBER_RE.test(raw)) {
    return Number(raw)
  }
  return raw
}

function peekNextContentLine(
  state: ParseState,
  fromIdx: number,
): { lineIdx: number; indent: number; rest: string } | undefined {
  for (let idx = fromIdx; idx < state.lines.length; idx++) {
    const line = state.lines[idx]
    let indent = 0
    while (indent < line.length && line[indent] === ' ') {
      indent++
    }
    if (indent < line.length && line[indent] === '\t') {
      throw new SyntaxError(`Tab indentation is not allowed on line ${idx + 1}.`)
    }
    const rest = line.slice(indent).trimEnd()
    if (rest === '' || rest.startsWith('#')) {
      continue
    }
    if (rest === '---' || rest === '...') {
      throw new SyntaxError(`Unsupported YAML document marker '${rest}' on line ${idx + 1}.`)
    }
    return { lineIdx: idx, indent, rest }
  }
  return undefined
}

function collectCommentsUntil(state: ParseState, targetLineIdx: number): string[] {
  const comments: string[] = []
  while (state.lineIdx < targetLineIdx) {
    const trimmed = state.lines[state.lineIdx].trim()
    comments.push(trimmed)
    state.lineIdx++
  }
  return comments
}

/**
 * Serializes a parsed/modified `YamlDocument` back into YAML text.
 */
export function stringifyYamlDocument(doc: YamlDocument): string {
  const chunks: string[] = []

  if (doc.commentBefore && doc.commentBefore.length > 0) {
    chunks.push(doc.commentBefore.join('\n'))
    if (doc.contents !== null) {
      chunks.push('')
    }
  }

  if (doc.contents !== null) {
    chunks.push(serializeRootNode(doc.contents))
  }

  if (doc.commentAfter && doc.commentAfter.length > 0) {
    chunks.push(doc.commentAfter.join('\n'))
  }

  if (chunks.length === 0) {
    return ''
  }
  return chunks.join('\n') + '\n'
}

function serializeRootNode(node: YamlNode): string {
  const lines: string[] = []

  if (node.commentBefore) {
    lines.push(...node.commentBefore)
  }

  if (node.kind === 'scalar') {
    const valStr = node.raw ?? formatYamlScalar(node.value)
    const cmt = node.comment ? ` ${node.comment}` : ''
    lines.push(`${valStr}${cmt}`)
    return lines.join('\n')
  }

  if (node.kind === 'map') {
    if (node.items.length === 0) {
      const cmt = node.comment ? ` ${node.comment}` : ''
      lines.push(`{}${cmt}`)
      return lines.join('\n')
    }
    lines.push(serializeMapItems(node.items, 0))
    return lines.join('\n')
  }

  if (node.items.length === 0) {
    const cmt = node.comment ? ` ${node.comment}` : ''
    lines.push(`[]${cmt}`)
    return lines.join('\n')
  }
  lines.push(serializeSeqItems(node.items, 0))
  return lines.join('\n')
}

function serializeMapItems(items: YamlPair[], indent: number): string {
  const prefix = ' '.repeat(indent)
  const lines: string[] = []

  for (const pair of items) {
    if (pair.commentBefore) {
      for (const c of pair.commentBefore) {
        lines.push(c === '' ? '' : `${prefix}${c}`)
      }
    }
    lines.push(serializePair(pair, indent, prefix))
  }

  return lines.join('\n')
}

function serializePair(pair: YamlPair, indent: number, firstLinePrefix: string): string {
  const keyStr = pair.rawKey ?? formatYamlKey(pair.key)
  const val = pair.value

  if (val.kind === 'scalar') {
    const valStr = val.raw ?? formatYamlScalar(val.value)
    const cmt = val.comment ? ` ${val.comment}` : pair.comment ? ` ${pair.comment}` : ''
    return `${firstLinePrefix}${keyStr}: ${valStr}${cmt}`
  }

  if (val.kind === 'map') {
    if (val.items.length === 0) {
      const cmt = val.comment ? ` ${val.comment}` : pair.comment ? ` ${pair.comment}` : ''
      return `${firstLinePrefix}${keyStr}: {}${cmt}`
    }
    const headerCmt = pair.comment ? ` ${pair.comment}` : ''
    return `${firstLinePrefix}${keyStr}:${headerCmt}\n${serializeMapItems(val.items, indent + 2)}`
  }

  if (val.items.length === 0) {
    const cmt = val.comment ? ` ${val.comment}` : pair.comment ? ` ${pair.comment}` : ''
    return `${firstLinePrefix}${keyStr}: []${cmt}`
  }
  const headerCmt = pair.comment ? ` ${pair.comment}` : ''
  return `${firstLinePrefix}${keyStr}:${headerCmt}\n${serializeSeqItems(val.items, indent + 2)}`
}

function serializeSeqItems(items: YamlNode[], indent: number): string {
  const prefix = ' '.repeat(indent)
  const lines: string[] = []

  for (const item of items) {
    if (item.commentBefore) {
      for (const c of item.commentBefore) {
        lines.push(c === '' ? '' : `${prefix}${c}`)
      }
    }

    if (item.kind === 'scalar') {
      const valStr = item.raw ?? formatYamlScalar(item.value)
      const cmt = item.comment ? ` ${item.comment}` : ''
      lines.push(`${prefix}- ${valStr}${cmt}`)
    } else if (item.kind === 'map') {
      if (item.items.length === 0) {
        const cmt = item.comment ? ` ${item.comment}` : ''
        lines.push(`${prefix}- {}${cmt}`)
      } else {
        const [first, ...rest] = item.items
        if (!first.commentBefore || first.commentBefore.length === 0) {
          lines.push(serializePair(first, indent + 2, `${prefix}- `))
          if (rest.length > 0) {
            lines.push(serializeMapItems(rest, indent + 2))
          }
        } else {
          lines.push(`${prefix}-`)
          lines.push(serializeMapItems(item.items, indent + 2))
        }
      }
    } else {
      if (item.items.length === 0) {
        const cmt = item.comment ? ` ${item.comment}` : ''
        lines.push(`${prefix}- []${cmt}`)
      } else {
        lines.push(`${prefix}-`)
        lines.push(serializeSeqItems(item.items, indent + 2))
      }
    }
  }

  return lines.join('\n')
}

function formatYamlScalar(value: DataPrimitive): string {
  if (value === null) return 'null'
  if (typeof value === 'boolean') return String(value)
  if (typeof value === 'number') return Object.is(value, -0) ? '0' : String(value)
  return needsQuotingScalar(value) ? quoteDoubleString(value) : value
}

function formatYamlKey(key: string): string {
  if (needsQuotingScalar(key) || /[:[\]{},]/.test(key)) {
    return quoteDoubleString(key)
  }
  return key
}

function needsQuotingScalar(str: string): boolean {
  if (str === '' || str.trim() !== str) return true
  if (/[\r\n\t\x00-\x1f\x7f]/.test(str)) return true
  if (YAML_RESERVED_SCALAR_RE.test(str)) return true
  if (YAML_NUMBER_LOOKING_RE.test(str)) return true
  if (YAML_INDICATOR_START_RE.test(str)) return true
  if (str.includes(': ') || str.includes(' #') || str.endsWith(':')) return true
  return false
}

function quoteDoubleString(str: string): string {
  let out = '"'
  for (let i = 0; i < str.length; i++) {
    const ch = str[i]
    const code = str.charCodeAt(i)
    if (ch === '\\') out += '\\\\'
    else if (ch === '"') out += '\\"'
    else if (ch === '\n') out += '\\n'
    else if (ch === '\r') out += '\\r'
    else if (ch === '\t') out += '\\t'
    else if (code < 0x20 || code === 0x7f) {
      out += '\\u' + code.toString(16).padStart(4, '0')
    } else {
      out += ch
    }
  }
  return out + '"'
}
