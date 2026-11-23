import readline from 'node:readline'
import { PassThrough } from 'node:stream'
import { describe, expect, test, vi } from 'vitest'
import { promptQuestionPolar } from '../src/_private/prompt-question-polar'
import { setPromptSpy } from './cosca-test-utils'

describe('Test private promptQuestionPolar helper', () => {

  test('should use default input and output streams', async () => {
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    try {
      setPromptSpy(['y'])
      expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(true)
      expect(createInterfaceSpy).toHaveBeenCalledWith({ input: process.stdin, output: process.stdout })
    } finally {
      createInterfaceSpy.mockRestore()
    }
  })

  test('should return true for yes variants and false otherwise', async () => {
    setPromptSpy(['y'])
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(true)
    setPromptSpy(['YES'])
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(true)
    setPromptSpy(['n'])
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(false)
    setPromptSpy([''])
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(false)
  })

  test('should print linesBefore and linesAfter to output', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const writeSpy = vi.spyOn(output, 'write')
    try {
      setPromptSpy(['y'])
      expect(await promptQuestionPolar({ question: 'Continue?', input, output, linesBefore: 1, linesAfter: 2 })).toBe(true)
      expect(writeSpy).toHaveBeenCalledWith('\n')
      expect(writeSpy).toHaveBeenCalledWith('\n\n')
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should close the interface upon SIGINT', () => {
    const input = new PassThrough()
    const output = new PassThrough()
    const createInterfaceSpy = vi.spyOn(readline, 'createInterface')
    const questionSpy = vi.spyOn(readline.Interface.prototype, 'question').mockImplementation(() => {})
    try {
      createInterfaceSpy.mockClear()
      void promptQuestionPolar({ question: 'Continue?', input, output })
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
