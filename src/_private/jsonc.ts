import type { DataArray, DataObject, DataPrimitive, DataValue } from '../types/data.js'

export interface JsoncPrimitive {
  kind: 'primitive'
  value: DataPrimitive
  leadingComments?: string[]
  trailingComment?: string
}

export interface JsoncProperty {
  key: string
  value: JsoncNode
  leadingComments?: string[]
  trailingComment?: string
}

export interface JsoncObject {
  kind: 'object'
  items: JsoncProperty[]
  leadingComments?: string[]
  trailingComment?: string
  innerComments?: string[]
}

export interface JsoncArray {
  kind: 'array'
  items: JsoncNode[]
  leadingComments?: string[]
  trailingComment?: string
  innerComments?: string[]
}

export type JsoncNode = JsoncPrimitive | JsoncObject | JsoncArray

export interface JsoncDocument {
  root: JsoncNode
  leadingComments?: string[]
  trailingComments?: string[]
}

/**
 * Type guard checking whether a node is a JSONC object.
 *
 * @param {JsoncNode | undefined} node - The node to check.
 * @returns {boolean} True if the node is a `JsoncObject`.
 */
export function isJsoncObject(node: JsoncNode | undefined): node is JsoncObject {
  return node?.kind === 'object'
}

/**
 * Type guard checking whether a node is a JSONC array.
 *
 * @param {JsoncNode | undefined} node - The node to check.
 * @returns {boolean} True if the node is a `JsoncArray`.
 */
export function isJsoncArray(node: JsoncNode | undefined): node is JsoncArray {
  return node?.kind === 'array'
}

/**
 * Type guard checking whether a node is a JSONC primitive.
 *
 * @param {JsoncNode | undefined} node - The node to check.
 * @returns {boolean} True if the node is a `JsoncPrimitive`.
 */
export function isJsoncPrimitive(node: JsoncNode | undefined): node is JsoncPrimitive {
  return node?.kind === 'primitive'
}

/**
 * Gets the value node for a key in a JSONC object.
 *
 * @param {JsoncObject} obj - The object node to search.
 * @param {string} key - The property key to look up.
 * @returns {JsoncNode | undefined} The matching value node, or `undefined` if not found.
 */
export function getObjectNode(obj: JsoncObject, key: string): JsoncNode | undefined {
  return obj.items.find(item => item.key === key)?.value
}

/**
 * Sets or replaces a key in a JSONC object while preserving existing property comments.
 *
 * @param {JsoncObject} obj - The object node to update.
 * @param {string} key - The property key to set.
 * @param {JsoncNode} value - The new value node.
 */
export function setObjectNode(obj: JsoncObject, key: string, value: JsoncNode): void {
  const existing = obj.items.find(item => item.key === key)
  if (existing) {
    existing.value = value
  } else {
    obj.items.push({ key, value })
  }
}

/**
 * Deletes a key from a JSONC object.
 *
 * @param {JsoncObject} obj - The object node to update.
 * @param {string} key - The property key to remove.
 * @returns {boolean} True if the key existed and was removed, false otherwise.
 */
export function deleteObjectKey(obj: JsoncObject, key: string): boolean {
  const idx = obj.items.findIndex(item => item.key === key)
  if (idx === -1) {
    return false
  }
  obj.items.splice(idx, 1)
  return true
}

/**
 * Converts a plain `DataValue` into a JSONC AST node.
 *
 * @param {DataValue} value - The plain JS value to wrap.
 * @returns {JsoncNode} The created AST node.
 */
export function createJsoncNode(value: DataValue): JsoncNode {
  if (value === null || typeof value !== 'object') {
    return { kind: 'primitive', value }
  }
  if (Array.isArray(value)) {
    return { kind: 'array', items: value.map(createJsoncNode) }
  }
  return {
    kind: 'object',
    items: Object.entries(value).map(([key, val]) => ({ key, value: createJsoncNode(val) })),
  }
}

/**
 * Converts a JSONC AST node into a plain `DataValue`.
 *
 * @param {JsoncNode} node - The AST node to convert.
 * @returns {DataValue} The plain JS value.
 */
export function jsoncToValue(node: JsoncNode): DataValue {
  if (node.kind === 'primitive') {
    return node.value
  }
  if (node.kind === 'array') {
    const arr: DataArray = node.items.map(jsoncToValue)
    return arr
  }
  const obj: DataObject = {}
  for (const prop of node.items) {
    // defineProperty avoids invoking __proto__ setter while keeping Object.prototype for isDeepStrictEqual
    Object.defineProperty(obj, prop.key, {
      value: jsoncToValue(prop.value),
      enumerable: true,
      writable: true,
      configurable: true,
    })
  }
  return obj
}

/**
 * Parses a JSON or JSONC string into a comment-preserving `JsoncDocument`.
 * Supports `//` line comments, `/* ... *\/` block comments and trailing commas.
 *
 * @param {string} text - The JSON/JSONC source text.
 * @returns {JsoncDocument} The parsed document.
 * @throws {SyntaxError} When the input is not valid JSONC.
 */
export function parseJsoncDocument(text: string): JsoncDocument {
  const parser = new JsoncParser(text)
  return parser.parse()
}

/**
 * Serializes a `JsoncDocument` back to 2-space indented JSON/JSONC with a trailing newline,
 * preserving comments.
 *
 * @param {JsoncDocument} doc - The document to serialize.
 * @returns {string} The serialized text.
 */
export function stringifyJsoncDocument(doc: JsoncDocument): string {
  const parts: string[] = []
  if (doc.leadingComments?.length) {
    for (const comment of doc.leadingComments) {
      parts.push(comment)
    }
  }
  parts.push(stringifyNode(doc.root, 0))
  if (doc.trailingComments?.length) {
    for (const comment of doc.trailingComments) {
      parts.push(comment)
    }
  }
  return parts.join('\n') + '\n'
}

function stringifyNode(node: JsoncNode, depth: number): string {
  if (node.kind === 'primitive') {
    return JSON.stringify(node.value)
  }

  const indent = '  '.repeat(depth)
  const childIndent = '  '.repeat(depth + 1)

  if (node.kind === 'object') {
    if (node.items.length === 0 && !node.innerComments?.length) {
      return '{}'
    }
    const lines: string[] = ['{']
    for (let i = 0; i < node.items.length; i++) {
      const prop = node.items[i]
      if (prop.leadingComments?.length) {
        for (const comment of prop.leadingComments) {
          lines.push(`${childIndent}${comment}`)
        }
      }
      const comma = i < node.items.length - 1 ? ',' : ''
      const trailing = prop.trailingComment ? ` ${prop.trailingComment}` : ''
      lines.push(`${childIndent}${JSON.stringify(prop.key)}: ${stringifyNode(prop.value, depth + 1)}${comma}${trailing}`)
    }
    if (node.innerComments?.length) {
      for (const comment of node.innerComments) {
        lines.push(`${childIndent}${comment}`)
      }
    }
    lines.push(`${indent}}`)
    return lines.join('\n')
  }

  if (node.items.length === 0 && !node.innerComments?.length) {
    return '[]'
  }
  const lines: string[] = ['[']
  for (let i = 0; i < node.items.length; i++) {
    const item = node.items[i]
    if (item.leadingComments?.length) {
      for (const comment of item.leadingComments) {
        lines.push(`${childIndent}${comment}`)
      }
    }
    const comma = i < node.items.length - 1 ? ',' : ''
    const trailing = item.trailingComment ? ` ${item.trailingComment}` : ''
    lines.push(`${childIndent}${stringifyNode(item, depth + 1)}${comma}${trailing}`)
  }
  if (node.innerComments?.length) {
    for (const comment of node.innerComments) {
      lines.push(`${childIndent}${comment}`)
    }
  }
  lines.push(`${indent}]`)
  return lines.join('\n')
}

class JsoncParser {
  private readonly text: string
  private readonly len: number
  private pos = 0

  constructor(text: string) {
    this.text = text
    this.len = text.length
  }

  parse(): JsoncDocument {
    const leadingComments = this.skipTrivia()
    if (this.pos >= this.len) {
      this.fail('Unexpected end of JSON input')
    }
    const root = this.parseValue()
    const trailingComments = this.skipTrivia()
    if (this.pos < this.len) {
      this.fail(`Unexpected token '${this.text[this.pos]}'`)
    }
    const doc: JsoncDocument = { root }
    if (leadingComments.length) {
      doc.leadingComments = leadingComments
    }
    if (trailingComments.length) {
      doc.trailingComments = trailingComments
    }
    return doc
  }

  private parseValue(): JsoncNode {
    const ch = this.text[this.pos]
    if (ch === '{') return this.parseObject()
    if (ch === '[') return this.parseArray()
    if (ch === '"') return { kind: 'primitive', value: this.parseString() }
    if (ch === '-' || (ch >= '0' && ch <= '9')) return { kind: 'primitive', value: this.parseNumber() }
    if (ch === 't') return this.parseLiteral('true', true)
    if (ch === 'f') return this.parseLiteral('false', false)
    if (ch === 'n') return this.parseLiteral('null', null)
    this.fail(`Unexpected token '${ch ?? 'EOF'}'`)
  }

  private parseObject(): JsoncObject {
    this.pos++ // '{'
    const items: JsoncProperty[] = []
    let innerComments: string[] | undefined

    while (true) {
      const leading = this.skipTrivia()
      if (this.pos >= this.len) {
        this.fail('Unterminated object')
      }
      if (this.text[this.pos] === '}') {
        this.pos++
        if (leading.length) {
          innerComments = leading
        }
        break
      }
      if (this.text[this.pos] !== '"') {
        this.fail(`Expected property name or '}'`)
      }

      const key = this.parseString()
      const beforeColon = this.skipTrivia()
      if (this.text[this.pos] !== ':') {
        this.fail(`Expected ':' after property name`)
      }
      this.pos++
      const afterColon = this.skipTrivia()
      if (this.pos >= this.len) {
        this.fail('Expected property value')
      }
      const value = this.parseValue()

      const propLeading = [...leading, ...beforeColon, ...afterColon]
      const trailingComment = this.consumeSeparator('}')

      const existing = items.find(item => item.key === key)
      if (existing) {
        // last key wins, matching JSON.parse semantics
        existing.value = value
        if (propLeading.length) {
          existing.leadingComments = [...(existing.leadingComments ?? []), ...propLeading]
        }
        if (trailingComment) {
          existing.trailingComment = trailingComment
        }
      } else {
        const prop: JsoncProperty = { key, value }
        if (propLeading.length) {
          prop.leadingComments = propLeading
        }
        if (trailingComment) {
          prop.trailingComment = trailingComment
        }
        items.push(prop)
      }
    }

    const obj: JsoncObject = { kind: 'object', items }
    if (innerComments) {
      obj.innerComments = innerComments
    }
    return obj
  }

  private parseArray(): JsoncArray {
    this.pos++ // '['
    const items: JsoncNode[] = []
    let innerComments: string[] | undefined

    while (true) {
      const leading = this.skipTrivia()
      if (this.pos >= this.len) {
        this.fail('Unterminated array')
      }
      if (this.text[this.pos] === ']') {
        this.pos++
        if (leading.length) {
          innerComments = leading
        }
        break
      }

      const item = this.parseValue()
      if (leading.length) {
        item.leadingComments = leading
      }

      const trailingComment = this.consumeSeparator(']')
      if (trailingComment) {
        item.trailingComment = trailingComment
      }
      items.push(item)
    }

    const arr: JsoncArray = { kind: 'array', items }
    if (innerComments) {
      arr.innerComments = innerComments
    }
    return arr
  }

  // consumes an optional comma and any inline comment on the same line, or validates the closing delimiter
  private consumeSeparator(closing: '}' | ']'): string | undefined {
    let trailingComment = this.readInlineComment(false)
    this.skipHorizontalSpaces()

    if (this.text[this.pos] === ',') {
      this.pos++
      const afterComma = this.readInlineComment(true)
      if (afterComma) {
        trailingComment = trailingComment ? `${trailingComment} ${afterComma}` : afterComma
      }
      return trailingComment
    }

    // no comma on this line; check what follows after trivia
    const saved = this.pos
    this.skipTrivia()
    if (this.text[this.pos] === ',') {
      this.pos++
      const afterComma = this.readInlineComment(true)
      if (afterComma) {
        trailingComment = trailingComment ? `${trailingComment} ${afterComma}` : afterComma
      }
      return trailingComment
    }
    if (this.text[this.pos] === closing) {
      // restore so the enclosing loop captures any comments before the closing delimiter as innerComments
      this.pos = saved
      return trailingComment
    }
    this.fail(`Expected ',' or '${closing}'`)
  }

  private parseString(): string {
    const start = this.pos
    this.pos++ // opening '"'
    while (this.pos < this.len) {
      const code = this.text.charCodeAt(this.pos)
      if (code === 0x22) { // '"'
        this.pos++
        return JSON.parse(this.text.slice(start, this.pos))
      }
      if (code < 0x20) {
        this.fail('Unescaped control character in string')
      }
      if (code === 0x5c) { // '\'
        this.pos++
        if (this.pos >= this.len) {
          this.fail('Unterminated string escape')
        }
        const esc = this.text[this.pos]
        if (esc === 'u') {
          const hex = this.text.slice(this.pos + 1, this.pos + 5)
          if (!/^[0-9a-fA-F]{4}$/.test(hex)) {
            this.fail('Invalid Unicode escape sequence')
          }
          this.pos += 5
        } else if ('"\\/bfnrt'.includes(esc)) {
          this.pos++
        } else {
          this.fail(`Invalid escape character '\\${esc}'`)
        }
        continue
      }
      this.pos++
    }
    this.fail('Unterminated string')
  }

  private parseNumber(): number {
    const start = this.pos
    if (this.text[this.pos] === '-') {
      this.pos++
    }
    if (this.pos >= this.len) {
      this.fail('Invalid number')
    }
    if (this.text[this.pos] === '0') {
      this.pos++
    } else if (this.text[this.pos] >= '1' && this.text[this.pos] <= '9') {
      while (this.pos < this.len && this.text[this.pos] >= '0' && this.text[this.pos] <= '9') {
        this.pos++
      }
    } else {
      this.fail('Invalid number')
    }

    if (this.text[this.pos] === '.') {
      this.pos++
      if (this.pos >= this.len || this.text[this.pos] < '0' || this.text[this.pos] > '9') {
        this.fail('Invalid number fraction')
      }
      while (this.pos < this.len && this.text[this.pos] >= '0' && this.text[this.pos] <= '9') {
        this.pos++
      }
    }

    if (this.text[this.pos] === 'e' || this.text[this.pos] === 'E') {
      this.pos++
      if (this.text[this.pos] === '+' || this.text[this.pos] === '-') {
        this.pos++
      }
      if (this.pos >= this.len || this.text[this.pos] < '0' || this.text[this.pos] > '9') {
        this.fail('Invalid number exponent')
      }
      while (this.pos < this.len && this.text[this.pos] >= '0' && this.text[this.pos] <= '9') {
        this.pos++
      }
    }

    return Number(this.text.slice(start, this.pos))
  }

  private parseLiteral(word: string, value: boolean | null): JsoncPrimitive {
    if (this.text.startsWith(word, this.pos)) {
      this.pos += word.length
      return { kind: 'primitive', value }
    }
    this.fail(`Unexpected token '${this.text[this.pos]}'`)
  }

  private skipHorizontalSpaces(): void {
    while (this.pos < this.len && (this.text[this.pos] === ' ' || this.text[this.pos] === '\t')) {
      this.pos++
    }
  }

  // reads a single inline comment on the current line; after a comma, block comments are only
  // treated as trailing if nothing else appears on the same line (otherwise they belong to the next item)
  private readInlineComment(afterComma: boolean): string | undefined {
    const saved = this.pos
    this.skipHorizontalSpaces()
    if (this.text[this.pos] === '/' && this.text[this.pos + 1] === '/') {
      return this.readLineComment()
    }
    if (this.text[this.pos] === '/' && this.text[this.pos + 1] === '*') {
      const commentStart = this.pos
      const comment = this.readBlockComment()
      if (comment.includes('\n') || comment.includes('\r')) {
        this.pos = saved
        return undefined
      }
      if (afterComma) {
        const afterBlock = this.pos
        this.skipHorizontalSpaces()
        const next = this.text[this.pos]
        if (this.pos < this.len && next !== '\n' && next !== '\r' && next !== '}' && next !== ']') {
          this.pos = commentStart
          return undefined
        }
        this.pos = afterBlock
      }
      return comment
    }
    this.pos = saved
    return undefined
  }

  private skipTrivia(): string[] {
    const comments: string[] = []
    while (this.pos < this.len) {
      const ch = this.text[this.pos]
      if (ch === ' ' || ch === '\t' || ch === '\r' || ch === '\n') {
        this.pos++
        continue
      }
      if (ch === '/' && this.text[this.pos + 1] === '/') {
        comments.push(this.readLineComment())
        continue
      }
      if (ch === '/' && this.text[this.pos + 1] === '*') {
        comments.push(this.readBlockComment())
        continue
      }
      break
    }
    return comments
  }

  private readLineComment(): string {
    const start = this.pos
    this.pos += 2
    while (this.pos < this.len && this.text[this.pos] !== '\n' && this.text[this.pos] !== '\r') {
      this.pos++
    }
    return this.text.slice(start, this.pos)
  }

  private readBlockComment(): string {
    const start = this.pos
    this.pos += 2
    while (this.pos < this.len - 1) {
      if (this.text[this.pos] === '*' && this.text[this.pos + 1] === '/') {
        this.pos += 2
        return this.text.slice(start, this.pos)
      }
      this.pos++
    }
    this.fail('Unterminated block comment')
  }

  private fail(message: string): never {
    let line = 1
    let col = 1
    for (let i = 0; i < this.pos; i++) {
      if (this.text[i] === '\n') {
        line++
        col = 1
      } else {
        col++
      }
    }
    throw new SyntaxError(`${message} at position ${this.pos} (line ${line} column ${col})`)
  }
}
