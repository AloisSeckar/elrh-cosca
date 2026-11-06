import type { ShowTextOptions } from '../types/functions.js'
import { showMessage } from './show-message.js'

/**
 * Prints message into stdout in green color. Shortcut for `showMessage` with `color: 'green'`.
 * 
 * @param {string | ShowTextOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the message (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the message's own newline (default: 0).
 */
export function showSuccess(opts: string | ShowTextOptions): void {
  const options: ShowTextOptions = typeof opts === 'string' ? { message: opts } : opts
  showMessage({ ...options, color: 'green' })
}
