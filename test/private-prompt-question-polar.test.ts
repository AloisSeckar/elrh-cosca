import { PassThrough } from 'node:stream'
import { CANCEL_SYMBOL, cancel, confirm } from '@clack/prompts'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { promptQuestionPolar } from '../src/_private/prompt-question-polar'

vi.mock('@clack/prompts', async () => {
  const actual = await vi.importActual<typeof import('@clack/prompts')>('@clack/prompts')
  return {
    ...actual,
    confirm: vi.fn(),
    cancel: vi.fn(),
  }
})

describe('Test private promptQuestionPolar helper', () => {

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('should call Clack confirm with initialValue true and return boolean answer', async () => {
    vi.mocked(confirm).mockResolvedValueOnce(true)
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(true)
    expect(confirm).toHaveBeenCalledWith({
      message: 'Continue?',
      initialValue: true,
      input: undefined,
      output: undefined,
    })

    vi.mocked(confirm).mockResolvedValueOnce(false)
    expect(await promptQuestionPolar({ question: 'Continue?' })).toBe(false)
  })

  test('should forward custom input and output streams to Clack confirm', async () => {
    const input = new PassThrough()
    const output = new PassThrough()
    try {
      vi.mocked(confirm).mockResolvedValueOnce(true)
      expect(await promptQuestionPolar({ question: 'Continue?', input, output })).toBe(true)
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

  test('should style the question when color is set', async () => {
    const previous = process.env.FORCE_COLOR
    process.env.FORCE_COLOR = '1'
    try {
      vi.mocked(confirm).mockResolvedValueOnce(true)
      expect(await promptQuestionPolar({ question: 'Continue?', color: 'red' })).toBe(true)
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

  test('should cancel and exit with code 0 when prompt is cancelled', async () => {
    const output = new PassThrough()
    const exitSpy = vi.spyOn(process, 'exit').mockImplementation((() => {
      throw new Error('process.exit')
    }) as never)
    try {
      vi.mocked(confirm).mockResolvedValueOnce(CANCEL_SYMBOL)
      await expect(promptQuestionPolar({ question: 'Continue?', output })).rejects.toThrow('process.exit')
      expect(cancel).toHaveBeenCalledWith('User abort', { output })
      expect(exitSpy).toHaveBeenCalledWith(0)
    } finally {
      exitSpy.mockRestore()
      output.destroy()
    }
  })
})
