import type { PromptUserMultiOptions, PromptUserOptions, PromptUserPolarOptions } from '../types/functions.js'
import { promptQuestionMulti } from '../_private/prompt-question-multi.js'
import { promptQuestionPolar } from '../_private/prompt-question-polar.js'

/**
 * Prompts the user with a yes/no confirmation (defaulting to yes) or, when `multiChoice` is provided,
 * a multi-select list via Clack Prompts, and returns their response.
 * Exits the process with a cancel message if the user cancels the prompt.
 *
 * @param {string | PromptUserOptions} opts - The question as a plain string, or an options object.
 * @param {string} opts.question - The question to ask the user.
 * @param {string[]} [opts.multiChoice] - List of options for a multi-choice prompt. If present, it must contain at least one item. When omitted, a yes/no prompt is shown.
 * @param {Readable} [opts.input] - Custom input stream (default: process.stdin).
 * @param {Writable} [opts.output] - Custom output stream (default: process.stdout).
 * @param {InspectColor} [opts.color] - Optional color/style for the question text, as accepted by `styleText` from `node:util` (default: no color).
 * @returns {Promise<boolean | number[]>} For a polar question, true if the user confirmed and false otherwise. For a multi-choice question, a sorted array of unique 1-based option numbers (empty when nothing is selected).
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
