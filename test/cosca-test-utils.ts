import readline from 'node:readline'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { vi } from 'vitest'

import * as promptModule from '../src/terminal/prompt-user'

/**
 * Reads a (text) file into the string array.
 * @param dir path to directory
 * @param file name of the (text) file (must exist in `dir`)
 * @returns array of read lines 
 */
export function readNormalizedFile(dir: string, file: string): string {
  const source = join(dir, file)
  const content = readFileSync(source, 'utf8')
  return content.replace(/\r\n/g, '\n')
}

/**
 * Mocks console logging methods in order to spy on the passed arguments.
 * @param logLevel which console log method should be mocked
 * @returns mocked console log method
 */
export function getConsoleSpy(logLevel: 'log' | 'debug' |'info' | 'warn' | 'error') {
  return vi.spyOn(console, logLevel).mockImplementation(() => {})
}

/**
 * Mocks user input(s) for the `readline.question` method.
 * @param input array of 1+ expected values from the user
 * @returns mocked terminal input
 */
export function setPromptSpy(inputs: string[]) {
  let call = 0
  vi.spyOn(readline.Interface.prototype, 'question')
  .mockImplementation((_, cb) => { 
    const fn = cb as (answer: string) => void // explicit typecast required
    fn(inputs[call++])
    // @ts-expect-error should add proper type
    return this
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
