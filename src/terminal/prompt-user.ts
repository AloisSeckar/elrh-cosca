import type { PromptUserMultiOptions, PromptUserOptions, PromptUserPolarOptions } from '../types/functions.js'
import { promptQuestionMulti } from '../_private/prompt-question-multi.js'
import { promptQuestionPolar } from '../_private/prompt-question-polar.js'

/**
 * Prompts the user with a yes/no question (` (y/N): ` is appended) or, when `multiChoice` is provided,
 * a numbered multi-choice question, and returns their response.
 *
 * @param {string | PromptUserOptions} opts - The question as a plain string, or an options object.
 * @param {string} opts.question - The question to ask the user.
 * @param {string[]} [opts.multiChoice] - List of options for a multi-choice prompt. If present, it must contain at least one item. When omitted, a yes/no prompt is shown.
 * @param {number} [opts.linesBefore] - The number of newlines to print before the output (default: 0).
 * @param {number} [opts.linesAfter] - The number of extra newlines to print after the output (default: 0).
 * @param {NodeJS.ReadableStream} [opts.input] - Custom input stream (default: process.stdin).
 * @param {NodeJS.WritableStream} [opts.output] - Custom output stream (default: process.stdout; process.stderr for `showError`).
 * @param {InspectColor} [opts.color] - The color/style of the text, as accepted by `styleText` from `node:util` (default: no color).
 * @returns {Promise<boolean | number[]>} For a polar question, true if the user answered yes (`y` or `yes`, case-insensitive) and false otherwise. For a multi-choice question, a sorted array of unique 1-based option numbers (empty when no choice is entered).
 */
export async function promptUser(opts: PromptUserMultiOptions): Promise<number[]>
export async function promptUser(opts: string | PromptUserPolarOptions): Promise<boolean>
export async function promptUser(opts: string | PromptUserOptions): Promise<boolean | number[]>
export async function promptUser(opts: string | PromptUserOptions): Promise<boolean | number[]> {
  const normalizedOpts: PromptUserOptions = typeof opts === 'string' ? { question: opts } : opts
  if (normalizedOpts.multiChoice !== undefined) {
    return promptQuestionMulti(normalizedOpts as PromptUserMultiOptions)
  }
  return promptQuestionPolar(normalizedOpts)
}
