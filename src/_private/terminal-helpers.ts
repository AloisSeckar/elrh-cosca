import type { Writable } from 'node:stream'
import type { InspectColor } from 'node:util'
import { styleText } from 'node:util'
import { cancel, isCancel, type CANCEL_SYMBOL, type LogMessageOptions } from '@clack/prompts'
import type { ShowMessageOptions } from '../types/functions.js'

/**
 * Formats terminal text with an optional `styleText` color for the given output stream.
 *
 * @param {string} text - Text to format.
 * @param {Writable} output - Target output stream used for color capability detection.
 * @param {InspectColor} [color] - Optional `styleText` color/style.
 * @returns {string} Styled or plain text.
 */
export function formatTerminalText(text: string, output: Writable, color?: InspectColor): string {
  return color ? styleText(color, text, { stream: output as NodeJS.WriteStream }) : text
}

/**
 * Normalizes `show*` options and writes the formatted message through a Clack `log.*` method.
 *
 * @param {(message: string, opts?: LogMessageOptions) => void} logFn - Clack log function to invoke.
 * @param {string | ShowMessageOptions} opts - Plain message string or options object.
 * @param {{ output?: Writable, color?: InspectColor }} [defaults] - Fallback output stream and color when not set in `opts`.
 */
export function writeLog(
  logFn: (message: string, opts?: LogMessageOptions) => void,
  opts: string | ShowMessageOptions,
  defaults: { output?: Writable, color?: InspectColor } = {},
): void {
  const { message, output = defaults.output ?? process.stdout, color = defaults.color }: ShowMessageOptions = typeof opts === 'string' ? { message: opts } : opts
  logFn(formatTerminalText(message, output, color), { output })
}

/**
 * Exits the process with a Clack cancel message if the prompt was cancelled, otherwise returns the answer.
 *
 * @param {T} answer - Value returned by a Clack prompt.
 * @param {Writable} [output] - Custom output stream for the cancel message.
 * @returns {Exclude<T, typeof CANCEL_SYMBOL>} The non-cancelled prompt answer.
 */
export function exitIfCancelled<T>(answer: T, output?: Writable): Exclude<T, typeof CANCEL_SYMBOL> {
  if (isCancel(answer)) {
    cancel('User abort', { output })
    process.exit(0)
  }
  // Clack prompts returns `T | typeof CANCEL_SYMBOL`
  // cancel was already ruled out by the isCancel check
  return answer as Exclude<T, typeof CANCEL_SYMBOL>
}
