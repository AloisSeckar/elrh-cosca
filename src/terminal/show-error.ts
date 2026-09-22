import type { ShowErrorOptions } from '../types/functions.js'

/**
 * Prints error message into stderr with specified number of newlines after it.
 * 
 * @param {ShowErrorOptions} opts - Options for this operation.
 * @param {string} opts.message - The error message text to display.
 * @param {number} opts.linesAfter - The number of newlines to print after the message (default is 1).
 */
export function showError(opts: ShowErrorOptions): void {
  const { message, linesAfter = 1 } = opts
  process.stderr.write(message)
  for (let i = 0; i < linesAfter; i++) {
    process.stderr.write('\n')
  }
}
