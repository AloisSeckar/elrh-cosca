import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Prints message into stdout followed by a newline and optional extra newlines.
 * 
 * @param {string} opts.message - The message text to display.
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the message's own newline (default: 0).
 */
export function showMessage(opts: ShowMessageOptions): void {
  const { message, linesAfter = 0 } = opts
  process.stdout.write(message)
  process.stdout.write('\n')
  for (let i = 0; i < linesAfter; i++) {
    process.stdout.write('\n')
  }
}
