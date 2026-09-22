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

  test('should accept one options object with a required question', () => {
    expectTypeOf(promptUser).parameters.toEqualTypeOf<[opts: PromptUserOptions]>()
    expectTypeOf<{}>().not.toExtend<PromptUserOptions>()
    expectTypeOf<{ question: string }>().toExtend<PromptUserOptions>()
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
})
