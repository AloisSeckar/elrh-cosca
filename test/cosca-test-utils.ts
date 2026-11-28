import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi } from 'vitest'

import * as promptPolarModule from '../src/_private/prompt-question-polar'
import * as promptModule from '../src/terminal/prompt-user'

/**
 * Reads a (text) file into the string array.
 * @param dir path to directory
 * @param file name of the (text) file (must exist in `dir`)
 * @returns file contents with normalized line endings
 */
export function readNormalizedFile(dir: string, file: string): string {
  const source = join(dir, file)
  const content = readFileSync(source, 'utf8')
  return content.replace(/\r\n/g, '\n')
}

/**
 * Mocks user input(s) for polar confirmation prompts.
 * @param inputs array of 1+ expected values from the user (`y`/`yes` resolves to `true`, anything else to `false`)
 * @returns mocked polar prompt function
 */
export function setPromptSpy(inputs: string[]) {
  let call = 0
  return vi.spyOn(promptPolarModule, 'promptQuestionPolar').mockImplementation(async () => {
    const answer = (inputs[call++] ?? '').trim().toLowerCase()
    return /^y(es)?$/.test(answer)
  })
}

/**
 * Mocks logging into stdout to spy on the passed arguments.
 * @returns mocked stdout log method
 */
export function getStdoutSpy() {
  return vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
}

/**
 * Mocks logging into stderr to spy on the passed arguments.
 * @returns mocked stderr log method
 */
export function getStderrSpy() {
  return vi.spyOn(process.stderr, 'write').mockImplementation(() => true)
}

/**
 * Mocks call of the promptUser function to capture the displayed question.
 * @param expectedResult how should the prompt being resolved (default: false)
 * @returns mocked promptUser function
 */
export function getPromptUserSpy(expectedResult: boolean = false) {
  return vi.spyOn(promptModule, 'promptUser').mockImplementation(() => Promise.resolve(expectedResult))
}
