/**
 * Splits a dot-notation key path into its segments. A backslash escapes the next character
 * if it is a dot (`\.` is a literal dot) or a backslash (`\\` is a literal backslash).
 * Any other backslash is kept as is.
 *
 * @param {string} keyPath - The key path, e.g. `a.b.c` or `chat.tools\.autoApprove`.
 * @returns {string[]} The unescaped key segments (a path without unescaped dots yields a single segment).
 */
export function parseKey(keyPath: string): string[] {
  const segments = ['']
  for (let i = 0; i < keyPath.length; i++) {
    const char = keyPath[i]
    const next = keyPath[i + 1]
    if (char === '\\' && (next === '.' || next === '\\')) {
      segments[segments.length - 1] += next
      i++
    } else if (char === '.') {
      segments.push('')
    } else {
      segments[segments.length - 1] += char
    }
  }
  return segments
}
