import type { ShowMessageOptions } from '../types/functions.js'
import { showMessage } from './show-message.js'

/**
 * Prints a debug message to stdout in gray color (unless `opts.color` is set). Shortcut for `showMessage` with `color: 'gray'`.
 *
 * @param {string | ShowMessageOptions} opts - The message as a plain string, or an options object.
 * @param {string} opts.message - The message text to display.
 * @param {Writable} [opts.output] - Custom output stream (default: process.stdout).
 * @param {InspectColor} [opts.color] - Optional color/style for the text, as accepted by `styleText` from `node:util` (default: gray).
 */
export function showDebug(opts: string | ShowMessageOptions): void {
  const options: ShowMessageOptions = typeof opts === 'string' ? { message: opts } : opts
  showMessage({ ...options, color: options.color ?? 'gray' })
}
