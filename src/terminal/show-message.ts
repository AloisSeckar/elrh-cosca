import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Prints message into stdout followed by a newline and optional extra newlines.
 * 
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the message (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the message's own newline (default: 0).
 */
export function showMessage(opts: string | ShowMessageOptions): void {
  const { message, linesBefore = 0, linesAfter = 0 }: ShowMessageOptions = typeof opts === 'string' ? { message: opts } : opts
  for (let i = 0; i < linesBefore; i++) {
    process.stdout.write('\n')
  }
  process.stdout.write(message)
  process.stdout.write('\n')
  for (let i = 0; i < linesAfter; i++) {
    process.stdout.write('\n')
  }
}
