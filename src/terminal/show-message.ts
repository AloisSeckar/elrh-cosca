import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Prints message into stdout with specified number of newlines after it.
 * 
 * @param {ShowMessageOptions} opts - Options for this operation.
 * @param {string} opts.message - The message text to display.
 * @param {number} opts.linesAfter - The number of newlines to print after the message (default is 1).
 */
export function showMessage(opts: ShowMessageOptions): void {
  const { message, linesAfter = 1 } = opts
  process.stdout.write(message)
  for (let i = 0; i < linesAfter; i++) {
    process.stdout.write('\n')
  }
}
