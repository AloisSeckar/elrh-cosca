import { PassThrough } from 'node:stream'
import { CANCEL_SYMBOL, cancel, confirm, multiselect } from '@clack/prompts'
import { afterEach, describe, expect, expectTypeOf, test, vi } from 'vitest'
import { promptUser } from '../src/main'
import type { PromptUserMultiOptions, PromptUserOptions, PromptUserPolarOptions } from '../src/main'

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts')
  return {
    ...actual,
    confirm: vi.fn(),
    multiselect: vi.fn(),
    cancel: vi.fn(),
  }
})

describe('Test promptUser terminal helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should be defined', () => {
    expect(promptUser).toBeDefined()
  })

  test('should accept a plain question string', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(true)
    expect(await promptUser('Continue?')).toBe(true)
    expect(confirm).toHaveBeenCalledWith({
      message: 'Continue?',
      initialValue: true,
      input: undefined,
      output: undefined,
    })
  })

  test('should accept one options object with a required question', () => {
    expectTypeOf(promptUser).toBeCallableWith('Continue?')
    expectTypeOf(promptUser).toBeCallableWith({ question: 'Continue?' })
    expectTypeOf(promptUser).toBeCallableWith({ question: 'Pick:', multiChoice: ['A', 'B'] })
    expectTypeOf<{}>().not.toExtend<PromptUserOptions>()
    expectTypeOf<{ question: string }>().toExtend<PromptUserOptions>()
    expectTypeOf<{ message: string }>().not.toExtend<PromptUserOptions>()
    expectTypeOf<{ question: string, multiChoice: string[] }>().toExtend<PromptUserMultiOptions>()
    expectTypeOf<{ question: string }>().toExtend<PromptUserPolarOptions>()
    expectTypeOf((opts: string) => promptUser(opts)).returns.toEqualTypeOf<Promise<boolean>>()
    expectTypeOf((opts: PromptUserPolarOptions) => promptUser(opts)).returns.toEqualTypeOf<Promise<boolean>>()
    expectTypeOf((opts: PromptUserMultiOptions) => promptUser(opts)).returns.toEqualTypeOf<Promise<number[]>>()
    expectTypeOf((opts: PromptUserOptions) => promptUser(opts)).returns.toEqualTypeOf<Promise<boolean | number[]>>()
  })

  test('should forward custom input and output directly in opts', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      vi.mocked(confirm).mockResolvedValueOnce(true)
      const opts: PromptUserOptions = { question: 'Continue?', input, output }
      expect(await promptUser(opts)).toBe(true)
      expect(confirm).toHaveBeenCalledWith({
        message: 'Continue?',
        initialValue: true,
        input,
        output,
      })
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should prompt the user for input and return true or false', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(true)
    expect(await promptUser({ question: 'Is it today?' })).toBe(true)
    vi.mocked(confirm).mockResolvedValueOnce(false)
    expect(await promptUser({ question: 'Is it today?' })).toBe(false)
  })

  test('should print the question in the given color', async () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    try {
      vi.mocked(confirm).mockResolvedValueOnce(true)
      expect(await promptUser({ question: 'Continue?', color: 'red' })).toBe(true)
      expect(confirm).toHaveBeenCalledWith({
        message: '\u001b[31mContinue?\u001b[39m',
        initialValue: true,
        input: undefined,
        output: undefined,
      })
    } finally {
      if (previous === undefined) delete process.env.FORCE_COLOR
      else process.env.FORCE_COLOR = previous
    }
  })

  test('should cancel and exit with code 0 when cancelled', async () => {
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit')
    }) as never)
    try {
      vi.mocked(confirm).mockResolvedValueOnce(CANCEL_SYMBOL)
      await expect(promptUser({ question: 'Continue?' })).rejects.toThrow('process.exit')
      expect(cancel).toHaveBeenCalledWith('User abort', { output: undefined })
      expect(exitSpy).toHaveBeenCalledWith(0)
    } finally {
      exitSpy.mockRestore()
    }
  })

  test('should divert to multi-choice prompt when multiChoice is provided', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      vi.mocked(multiselect).mockResolvedValueOnce([2, 1])
      expect(await promptUser({ question: 'Pick:', multiChoice: ['Alpha', 'Beta'], input, output })).toEqual([1, 2])
      expect(multiselect).toHaveBeenCalledWith({
        message: 'Pick:',
        options: [
          { value: 1, label: 'Alpha' },
          { value: 2, label: 'Beta' },
        ],
        required: false,
        input,
        output,
      })
    } finally {
      input.destroy()
      output.destroy()
    }
  })

  test('should throw when multiChoice is an empty array', async () => {
    await expect(promptUser({ question: 'Pick:', multiChoice: [] }))
      .rejects.toThrow('multiChoice must contain at least one option')
  })
})
