import readline from 'node:readline'
import { readFileSync } from 'node:fs'
import { join } from 'node:path';
import { vi } from 'vitest';

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
 * Mocks user input for the `readline.question` method.
 * @param input value expected from the user
 * @returns mocked terminal input
 */
export function getPromptSpy(input: string) {
  return vi.spyOn(readline.Interface.prototype, 'question')
  .mockImplementation((_, cb) => { 
    const fn = cb as (answer: string) => void // explicit typecast required
    fn(input)
    return this
  })
}
