import { multiselect } from '@clack/prompts'
import type { PromptUserMultiOptions } from '../types/functions.js'
import { exitIfCancelled, formatTerminalText } from './terminal-helpers.js'

/**
 * Prompts the user with a multi-select list of options via Clack Prompts and returns the picked 1-based numbers sorted in ascending order.
 * Exits the process with a cancel message if the user cancels the prompt.
 *
 * @param {PromptUserMultiOptions} opts - Prompt options including the non-empty `multiChoice` array.
 * @returns {Promise<number[]>} Sorted array of unique 1-based option numbers, or an empty array when nothing is selected.
 */
export async function promptQuestionMulti(opts: PromptUserMultiOptions): Promise<number[]> {
  const { question, multiChoice, input, output, color } = opts
  if (multiChoice.length === 0) {
    throw new Error('multiChoice must contain at least one option')
  }

  const out = output ?? process.stdout
  const answer = await multiselect({
    message: formatTerminalText(question, out, color),
    options: multiChoice.map((label, index) => ({ value: index + 1, label })),
    required: false,
    input,
    output,
  })
  return [...exitIfCancelled(answer, output)].sort((a, b) => a - b)
}
