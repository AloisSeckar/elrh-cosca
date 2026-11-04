import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Prints error message into stderr followed by a newline and optional extra newlines.
 * 
 * @param {string} opts.message - The error message text to display.
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the message's own newline (default: 0).
 */
export function showError(opts: ShowMessageOptions): void {
  const { message, linesAfter = 0 } = opts
  process.stderr.write(message)
  process.stderr.write('\n')
  for (let i = 0; i < linesAfter; i++) {
    process.stderr.write('\n')
  }
}
