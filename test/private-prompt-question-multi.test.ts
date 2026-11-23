import readline from 'node:readline'
import { PassThrough } from 'node:stream'
import { describe, expect, test, vi } from 'vitest'
import { promptQuestionMulti } from '../src/_private/prompt-question-multi'
import { setPromptSpy } from './cosca-test-utils'

describe('Test private promptQuestionMulti helper', () => {

  test('should throw when multiChoice is empty', async () => {
    await expect(promptQuestionMulti({ question: 'Pick:', multiChoice: [] }))
      .rejects.toThrow('multiChoice must contain at least one option')
  })

  test('should use default input and output streams', async () => {
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    const stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true)
    try {
      setPromptSpy(['1'])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['Alpha', 'Beta'] })).toEqual([1])
      expect(createInterfaceSpy).toHaveBeenCalledWith({ input: process.stdin, output: process.stdout })
      expect(stdoutSpy).toHaveBeenCalledWith('Pick:\n')
      expect(stdoutSpy).toHaveBeenCalledWith('  1) Alpha\n')
      expect(stdoutSpy).toHaveBeenCalledWith('  2) Beta\n')
    } finally {
      createInterfaceSpy.mockRestore()
      stdoutSpy.mockRestore()
    }
  })

  test('should return empty array for empty or whitespace input', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      setPromptSpy([''])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B'], input, output })).toEqual([])
      setPromptSpy(['   '])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B'], input, output })).toEqual([])
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should return deduplicated sorted 1-based numbers for comma and space separated inputs', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      setPromptSpy(['3, 1, 3, 2'])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B', 'C'], input, output })).toEqual([1, 2, 3])
      setPromptSpy(['2 1'])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B', 'C'], input, output })).toEqual([1, 2])
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should reprompt on invalid input and print an error message', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const writeSpy = vi.spyOn(output, 'write')
    try {
      setPromptSpy(['0', '4', 'abc', '1.5', '2'])
      expect(await promptQuestionMulti({ question: 'Pick:', multiChoice: ['A', 'B', 'C'], input, output })).toEqual([2])
      expect(writeSpy).toHaveBeenCalledWith("Invalid choice '0'.\n")
      expect(writeSpy).toHaveBeenCalledWith("Invalid choice '4'.\n")
      expect(writeSpy).toHaveBeenCalledWith("Invalid choice 'abc'.\n")
      expect(writeSpy).toHaveBeenCalledWith("Invalid choice '1.5'.\n")
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should print linesBefore, linesAfter and styled question', async () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    const input = new PassThrough()
    const output = new PassThrough()
    const writeSpy = vi.spyOn(output, 'write')
    try {
      setPromptSpy(['1'])
      expect(await promptQuestionMulti({
        question: 'Pick:',
        multiChoice: ['A'],
        input,
        output,
        linesBefore: 2,
        linesAfter: 3,
        color: 'red',
      })).toEqual([1])
      expect(writeSpy).toHaveBeenCalledWith('\n\n')
      expect(writeSpy).toHaveBeenCalledWith('\u001b[31mPick:\u001b[39m\n')
      expect(writeSpy).toHaveBeenCalledWith('  1) A\n')
      expect(writeSpy).toHaveBeenCalledWith('\n\n\n')
    } finally {
      input.destroy()
      output.destroy()
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
  })

  test('should close the interface upon SIGINT', () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    const questionSpy = vi.spyOn(readline.Interface.prototype, 'question').mockImplementation(() => {})
    try {
      createInterfaceSpy.mockClear()
      void promptQuestionMulti({ question: 'Pick:', multiChoice: ['A'], input, output })
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
