import readline from 'node:readline'
import { PassThrough } from 'node:stream'
import { describe, expect, expectTypeOf, test, vi } from 'vitest'
import { promptUser } from '../src/main'
import type { PromptUserOptions } from '../src/main'
import { setPromptSpy } from './cosca-test-utils'

describe('Test promptUser terminal helper', () => {

  test('should be defined', () => {
    expect(promptUser).toBeDefined()
  })

  test('should accept a plain question string', async () => {
    setPromptSpy(['y'])
    expect(await promptUser('Continue?')).toBe(true)
  })

  test('should accept one options object with a required question', () => {
    expectTypeOf(promptUser).parameters.toEqualTypeOf<[opts: string | PromptUserOptions]>()
    expectTypeOf<{}>().not.toExtend<PromptUserOptions>()
    expectTypeOf<{ question: string }>().toExtend<PromptUserOptions>()
    expectTypeOf<{ message: string }>().not.toExtend<PromptUserOptions>()
    expectTypeOf<{ question: string, linesBefore: number, linesAfter: number }>().toExtend<PromptUserOptions>()
  })

  test('should use default input and output streams', async () => {
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    try {
      setPromptSpy(['y'])
      expect(await promptUser({ question: 'Continue?' })).toBe(true)
      expect(createInterfaceSpy).toHaveBeenCalledWith({ input: process.stdin, output: process.stdout })
    } finally {
      createInterfaceSpy.mockRestore()
    }
  })

  test('should accept custom input and output directly in opts', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    try {
      setPromptSpy(['yes'])
      const opts: PromptUserOptions = { question: 'Continue?', input, output }
      expect(await promptUser(opts)).toBe(true)
      expect(createInterfaceSpy).toHaveBeenCalledWith({ input, output })
    } finally {
      createInterfaceSpy.mockRestore()
      input.destroy()
      output.destroy()
    }
  })

  test('should prompt the user for input and return true', async () => {
    setPromptSpy(['y'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
  })
  
  
  test('should prompt the user for input and return false', async () => {
    setPromptSpy(['n'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(false)
  })

  test('should accept different variants of yes', async () => {
    setPromptSpy(['Y'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
    setPromptSpy(['yes'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
    setPromptSpy(['Yes'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
    setPromptSpy(['YES'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
    // should not accept those though
    setPromptSpy(['Ye'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(false)
    setPromptSpy(['Yess'])
    expect(await promptUser({ question: 'Is it today?' })).toBe(false)
  })

  test('should print linesBefore and linesAfter to output', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const writeSpy = vi.spyOn(output, 'write')
    try {
      setPromptSpy(['y'])
      expect(await promptUser({ question: 'Continue?', input, output, linesBefore: 2, linesAfter: 3 })).toBe(true)
      expect(writeSpy).toHaveBeenCalledWith('\n\n')
      expect(writeSpy).toHaveBeenCalledWith('\n\n\n')
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should print the question in the given color', async () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const questionSpy = vi.spyOn(readline.Interface.prototype, 'question').mockImplementation(((_: string, cb: (answer: string) => void) => cb('y')) as any)
    try {
      expect(await promptUser({ question: 'Continue?', color: 'red' })).toBe(true)
      expect(questionSpy).toHaveBeenCalledWith('\u001b[31mContinue? (y/N): \u001b[39m', expect.any(Function))
    } finally {
      questionSpy.mockRestore()
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
  })

  test('should print the question without styling when no color is given', async () => {
    const questionSpy = vi.spyOn(readline.Interface.prototype, 'question').mockImplementation(((_: string, cb: (answer: string) => void) => cb('y')) as any)
    try {
      expect(await promptUser('Continue?')).toBe(true)
      expect(questionSpy).toHaveBeenCalledWith('Continue? (y/N): ', expect.any(Function))
    } finally {
      questionSpy.mockRestore()
    }
  })

  test('should close the interface upon SIGINT', () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    const questionSpy = vi.spyOn(readline.Interface.prototype, 'question').mockImplementation(() => {})
    try {
      createInterfaceSpy.mockClear()
      // the promise stays pending as the question is never answered
      void promptUser({ question: 'Continue?', input, output })
      const rl = createInterfaceSpy.mock.results[0].value as readline.Interface
      const closeSpy = vi.spyOn(rl, 'close')
      rl.emit('SIGINT')
      expect(closeSpy).toHaveBeenCalled()
    } finally {
      questionSpy.mockRestore()
      createInterfaceSpy.mockRestore()
      input.destroy()
      output.destroy()
    }
  })
})
