import { confirm } from '@clack/prompts'
import type { PromptUserOptions } from '../types/functions.js'
import { exitIfCancelled, formatTerminalText } from './terminal-helpers.js'

/**
 * Prompts the user with a yes/no confirmation (defaulting to yes) via Clack Prompts and returns their response.
 * Exits the process with a cancel message if the user cancels the prompt.
 *
 * @param {PromptUserOptions} opts - Prompt options.
 * @returns {Promise<boolean>} True if the user confirmed, false otherwise.
 */
export async function promptQuestionPolar(opts: PromptUserOptions): Promise<boolean> {
  const { question, input, output, color } = opts
  const out = output ?? process.stdout
  const answer = await confirm({
    message: formatTerminalText(question, out, color),
    initialValue: true,
    input,
    output,
  })
  return exitIfCancelled(answer, output)
}
