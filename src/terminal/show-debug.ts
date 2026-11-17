import type { ShowMessageOptions } from '../types/functions.js'
import { showMessage } from './show-message.js'

/**
 * Prints message into stdout in gray color (unless `opts.color` is set). Shortcut for `showMessage` with `color: 'gray'`.
 * 
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the output (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the output (default: 0).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout; process.stderr for `showError`).
 * @param {InspectColor} [opts.color] - The color/style of the text, as accepted by `styleText` from `node:util` (default: gray).
 */
export function showDebug(opts: string | ShowMessageOptions): void {
  const options: ShowMessageOptions = typeof opts === 'string' ? { message: opts } : opts
  showMessage({ ...options, color: options.color ?? 'gray' })
}
